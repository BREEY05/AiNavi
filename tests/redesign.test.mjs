import assert from 'node:assert/strict';
import {spawn, execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {mkdir, mkdtemp, readdir, realpath, rm} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {parseContent, imageUrl, linkUrl} from '../content-schema.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('redesign with the real server, SQLite and Chrome', {timeout: 180000}, async t => {
  for (const file of await readdir(root)) {
    if (/\.(js|mjs)$/.test(file)) execFileSync(process.execPath, ['--check', path.join(root, file)]);
  }
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const address = socket.address();
  assert.ok(address && typeof address === 'object');
  const port = address.port;
  await new Promise(resolve => socket.close(resolve));
  const directory = await mkdtemp(path.join(tmpdir(), 'ainavi-redesign-'));
  const child = spawn(process.execPath, ['server.js'], {cwd: root, env: {...process.env, PORT: String(port), DATA_DIR: directory, DB_FILE: path.join(directory, 'site.sqlite'), UPLOAD_DIR: path.join(directory, 'uploads'), MAIL_MODE: 'console', ADMIN_QQ: '100001'}, stdio: ['ignore', 'pipe', 'pipe']});
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
    const resolved = await realpath(directory);
    assert.equal(path.dirname(resolved), await realpath(tmpdir()));
    assert.match(path.basename(resolved), /^ainavi-redesign-/);
    await rm(resolved, {recursive: true});
  });
  let output = '';
  let serverError = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { serverError += chunk; });
  await Promise.race([
    new Promise(resolve => child.stdout.on('data', chunk => { if (chunk.includes('website running')) resolve(); })),
    new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => reject(new Error(`Server exited before startup: ${code}; stderr=${serverError}`))); }),
  ]);
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  t.after(() => browser.close());
  const base = `http://127.0.0.1:${port}`;
  const context = await browser.newContext({baseURL: base, viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const original = parseContent(await (await context.request.get('/api/content')).json());

  await t.test('runtime content schema rejects malformed and unsafe fields', () => {
    assert.throws(() => parseContent({...original, memberProfiles: null}), /memberProfiles/);
    assert.throws(() => parseContent({...original, heroTitle: 42}), /heroTitle/);
    assert.equal('unexpected' in parseContent({...original, unexpected: 'discard'}), false);
    assert.throws(() => imageUrl('javascript:alert(1)', base), /protocol/);
    assert.throws(() => linkUrl('javascript:alert(1)', base), /protocol/);
  });

  await t.test('default pages, dialogs, deep links and mobile navigation', async () => {
    assert.equal((await context.request.post('/api/content', {data: original})).status(), 401);
    assert.equal((await context.request.get('/admin.html', {maxRedirects: 0})).status(), 302);
    for (const file of ['index.html', 'about.html', 'members.html', 'join.html']) {
      await page.goto(`/${file}`);
      await page.locator('body[data-content-state="ready"]').waitFor();
      assert.equal(await page.locator('#content-status').isVisible(), false);
    }
    await page.goto('/index.html?hub=notices#stage-hub');
    await page.locator('body[data-content-state="ready"][data-stage="2"]').waitFor();
    await page.locator('#notice-0').click();
    assert.equal(await page.locator('#detail-dialog').isVisible(), true);
    await page.locator('#detail-close').click();
    await page.locator('#chapter-3').click();
    await page.locator('#dial-next').click();
    assert.equal(await page.locator('#dial-position').textContent(), '02 / 06');
    await page.locator('#rotary-dial').focus();
    await page.keyboard.press('End');
    assert.equal(await page.locator('#dial-position').textContent(), '06 / 06');
    await page.locator('#archive-open-5').click();
    assert.equal(await page.locator('#detail-title').textContent(), original.projects[2].title);
    await page.locator('#detail-close').click();
    for (const file of ['projects.html', 'activities.html', 'announcements.html', 'login.html']) {
      await page.goto(`/${file}`);
      await page.waitForLoadState('networkidle');
    }
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/members.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    await page.locator('#menu-toggle').click();
    assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.locator('#menu-toggle').click();
    await page.locator('#member-0').click();
    assert.equal(await page.locator('#phase-detail-title').textContent(), original.memberProfiles[0].name);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#phase-detail').isVisible(), false);
    assert.deepEqual(errors, []);
  });

  await t.test('real registration, login, upload and administrator save reach redesigned pages', async () => {
    const registration = await context.request.post('/api/auth/register/request-code', {data: {qq: '100001', password: 'local-test-password'}});
    assert.equal(registration.status(), 200);
    const code = output.match(/code for 100001@qq.com: (\d{6})/);
    assert.ok(code);
    assert.equal((await context.request.post('/api/auth/register/verify', {data: {qq: '100001', code: code[1]}})).status(), 200);
    await page.setViewportSize({width: 1440, height: 1000});
    await page.goto('/login.html');
    await page.locator('[data-auth-form="login"] [name="qq"]').fill('100001');
    await page.locator('[data-auth-form="login"] [name="password"]').fill('local-test-password');
    await page.locator('[data-auth-form="login"] [type="submit"]').click();
    await page.waitForURL('**/admin.html');
    await page.locator('[data-panel="basic"] [name="siteName"]').fill('联调协会');
    await page.locator('[data-panel="basic"] [name="logo"]').setInputFiles(path.join(root, 'demo-logo.svg'));
    const saved = page.waitForResponse(response => response.url().endsWith('/api/content') && response.request().method() === 'POST');
    await page.locator('[data-panel="basic"] [type="submit"]').click();
    assert.equal((await saved).status(), 200);
    await page.goto('/about.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    assert.equal(await page.locator('.brand-plaque > b').textContent(), '// 联调协会');
    assert.match(await page.locator('[data-logo-slot="unified"] img').getAttribute('src'), /\/uploads\//);
    assert.deepEqual(errors, []);
  });

  await t.test('changed collection sizes, escaped text and contact data stay synchronized', async () => {
    const updated = {...original,
      heroTitle: '动态 <AI> 标题',
      announcements: [{...original.announcements[0], title: '新增公告 <script>', date: '2026-11-15', link: 'https://example.com/notice'}, ...original.announcements],
      activities: [{...original.activities[0], title: '新增活动', date: '2026-11-15'}, ...original.activities],
      projects: [...original.projects, {...original.projects[0], title: '新增项目'}],
      memberProfiles: [...original.memberProfiles, {...original.memberProfiles[0], name: '新增成员'}],
      about: {...original.about, paragraphs: ['来自后台的新使命'], stats: [{value: '88', label: '成员'}, {value: '20', label: '项目'}]},
      join: {...original.join, email: 'new@example.com', phone: '123456', recruitInfo: '第一行\n第二行'},
    };
    assert.equal((await context.request.post('/api/content', {data: updated})).status(), 200);
    await page.goto('/index.html?hub=notices#stage-hub');
    await page.locator('body[data-content-state="ready"]').waitFor();
    assert.equal(await page.locator('#hero-title').textContent(), updated.heroTitle);
    await page.locator('#notice-0').click();
    assert.equal(await page.locator('#detail-title').textContent(), updated.announcements[0].title);
    assert.equal(await page.locator('#detail-content a').getAttribute('href'), 'https://example.com/notice');
    await page.locator('#detail-close').click();
    await page.locator('#chapter-3').click();
    await page.locator('body[data-stage="3"]').waitFor();
    await page.locator('#rotary-dial').focus();
    await page.keyboard.press('End');
    assert.equal(await page.locator('#dial-position').textContent(), '07 / 07');
    await page.goto('/members.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    await page.locator('#member-3').click();
    assert.equal(await page.locator('#phase-detail-title').textContent(), '新增成员');
    await page.goto('/about.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    assert.equal(await page.locator('[data-about-paragraphs]').textContent(), '来自后台的新使命');
    await page.goto('/join.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    assert.equal(await page.locator('[data-join-email]').getAttribute('href'), 'mailto:new@example.com');
    assert.equal(await page.locator('#copy-email').getAttribute('data-email'), 'new@example.com');
    assert.deepEqual(errors, []);
  });

  await t.test('empty collections remain usable and invalid content fails visibly', async () => {
    const empty = {...original, achievements: [], projects: [], memberProfiles: [], clubMoments: [], announcements: [], activities: []};
    assert.equal((await context.request.post('/api/content', {data: empty})).status(), 200);
    for (const file of ['index.html', 'about.html', 'members.html', 'join.html']) {
      await page.goto(`/${file}`);
      await page.locator('body[data-content-state="ready"]').waitFor();
    }
    assert.deepEqual(errors, []);
    assert.equal((await context.request.post('/api/content', {data: {...original, memberProfiles: null}})).status(), 200);
    await page.goto('/members.html');
    await page.locator('body[data-content-state="error"]').waitFor();
    assert.equal(await page.locator('#content-status').isVisible(), true);
    assert.equal(await page.locator('#main').isVisible(), false);
    assert.ok(errors.some(message => message.includes('memberProfiles')));
    errors.length = 0;
    assert.equal((await context.request.post('/api/content', {data: original})).status(), 200);
  });

  await t.test('desktop and mobile layouts with normal motion', async () => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    const screenshots = path.join(root, 'tmp-verification');
    await mkdir(screenshots, {recursive: true});
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      for (const file of ['index', 'about', 'members', 'join']) {
        await page.goto(`/${file}.html`);
        await page.locator('body[data-content-state="ready"]').waitFor();
        if (file === 'join') {
          await page.locator('body[data-join-reveal="true"]').waitFor();
          await page.locator('#intro-replay').click();
          await page.locator('#intro-skip').click();
          assert.equal(await page.locator('#join-intro').isVisible(), false);
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${file}: horizontal overflow at ${width}`);
        await page.screenshot({path: path.join(screenshots, `${file}-${width}.png`)});
      }
    }
    await page.setViewportSize({width: 1440, height: 1000});
    await page.goto('/index.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    await page.locator('#primary-navigation a[href="about.html"]').click();
    await page.waitForURL('**/about.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    await page.locator('#primary-navigation a[href="members.html"]').click();
    await page.waitForURL('**/members.html');
    await page.locator('body[data-content-state="ready"]').waitFor();
    await page.goBack();
    await page.locator('body[data-content-state="ready"][data-page="about"]').waitFor();
    await page.locator('#motion-toggle').click();
    assert.equal(await page.locator('body').getAttribute('data-motion-state'), 'paused');
    assert.deepEqual(errors, []);
  });
});
