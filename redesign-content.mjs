// @ts-check
import {parseContent, escapeHtml as h, imageUrl, linkUrl, newest} from './content-schema.mjs';

/** @typedef {import('./content-schema.mjs').SiteContent} SiteContent */
/** @typedef {import('./content-schema.mjs').JsonValue} JsonValue */

/** @param {string} selector @param {ParentNode} root @returns {HTMLElement} */
function element(selector, root) {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new TypeError(`Missing content element: ${selector}`);
  return node;
}

/** @param {string} selector @param {string} value @returns {void} */
function writeText(selector, value) {
  for (const node of document.querySelectorAll(selector)) node.textContent = value;
}

/** @param {string} selector @param {string} html @returns {void} */
function writeHtml(selector, html) { element(selector, document).innerHTML = html; }

/** @param {number} index @returns {string} */
function serial(index) { return String(index + 1).padStart(2, '0'); }

/** @param {string} source @param {string} title @returns {string} */
function picture(source, title) {
  return source ? `<img src="${h(imageUrl(source, location.href))}" alt="${h(title)}">` : '';
}

/** @param {string} id @param {string} title @param {string} body @returns {string} */
function detail(id, title, body) { return `<template id="${id}"><h2>${h(title)}</h2>${body}</template>`; }

/** @param {string} html @param {string} empty @returns {string} */
function contentOrEmpty(html, empty) { return html || `<p class="empty-content">${h(empty)}</p>`; }

/** @param {SiteContent} data @returns {void} */
function renderHome(data) {
  writeHtml('#hero-title', h(data.heroTitle).replace(/AI/g, '<span>AI</span>'));
  writeText('.hero-subtitle', data.heroSubtitle);
  writeText('.hero-line, #hub-node-intro small', data.heroLine);
  writeText('.about-reading > p', data.about.subtitle);
  writeHtml('.about-values', data.about.stats.map(item => `<span><b>${h(item.value)}</b>${h(item.label)}</span>`).join('') + '<a href="about.html">阅读协会介绍 ↗</a>');
  writeText('[data-text="clubIntro"]', data.clubIntro);
  const directionIcons = new Map(['book', 'project', 'trophy', 'idea'].map((name, index) => [name, document.querySelectorAll('.direction-item')[index]?.querySelector('svg')?.outerHTML || '']));
  writeHtml('[data-list="features"]', data.features.map(item => `<span class="direction-item">${directionIcons.get(item.icon) || ''}${h(item.title)}</span>`).join(''));
  const notices = newest(data.announcements);
  const activities = newest(data.activities);
  writeHtml('[data-list="announcements"]', contentOrEmpty(notices.slice(0, 4).map((item, index) => `<button class="notice-item" id="notice-${index}" data-dialog="notice-detail-${index}" type="button"><span class="tag">${h(item.tag)}</span><strong>${h(item.title)}</strong><time>${h(item.date)}</time></button>`).join(''), '暂无公告'));
  writeHtml('[data-list="activities"]', contentOrEmpty(activities.slice(0, 3).map((item, index) => `<button class="activity-item" id="activity-${index}" data-dialog="activity-detail-${index}" type="button">${picture(item.image, item.title)}<span><strong>${h(item.title)}</strong><small>${h(item.date)} · ${h(item.place)}</small></span></button>`).join(''), '暂无活动'));
  writeHtml('#hub-panel-notices .file-heading', `<span class="file-kicker">01 / BULLETIN</span><a href="announcements.html">全部 ${notices.length} 条公告 →</a>`);
  writeHtml('#hub-panel-events .file-heading', `<span class="file-kicker">03 / ACTIVITIES</span><a href="activities.html">全部 ${activities.length} 场活动 →</a>`);
  writeText('#hub-node-notices small', `${notices.length} 条公告${notices.length ? ` / 最近更新 ${notices[0].date}` : ''}`);
  writeText('#hub-node-events small', `${activities.length} 场活动 / 技术与实践`);
  writeHtml('.member-summary', data.memberProfiles.slice(0, 3).map((item, index) => `<li><span>${serial(index)}</span><div><b>${h(item.name)}</b><em>${h(item.title)}</em><small>${h(item.awards)}</small></div></li>`).join(''));
  writeText('.moments-link', `${data.clubMoments.map(item => item.title).slice(0, 3).join(' · ')} 查看社团风采 ↗`);
  const images = data.achievements.map(item => ({...item, category: '照片展示', detail: item.note, award: ''}));
  const archives = [...images, ...data.projects];
  const imageArtwork = Array.from(document.querySelectorAll('.archive-visual svg'), node => node.outerHTML);
  const projectArtwork = Array.from(document.querySelectorAll('.project-blueprint svg'), node => node.outerHTML);
  writeHtml('#dial-items', archives.map((item, index) => `<button type="button" class="dial-item" id="dial-item-${index}" data-dial-index="${index}" aria-controls="archive-${index}" aria-pressed="${index === 0}"><span class="finger-hole">${serial(index)}</span><span class="dial-name">${h(item.title)}<small>${h(item.category)}</small></span></button>`).join(''));
  writeHtml('[data-list="home-projects"]', contentOrEmpty(archives.map((item, index) => {
    const projectIndex = index - images.length;
    const artwork = projectIndex < 0 ? imageArtwork[index] : projectArtwork[projectIndex];
    const illustrated = item.image.startsWith('data:image/svg+xml;') && artwork;
    const visual = illustrated && projectIndex >= 0
      ? `<div class="project-blueprint">${artwork}<span>PROJECT / ${serial(projectIndex)}</span></div>`
      : `<div class="archive-visual ${illustrated ? 'generated-image' : ''}">${picture(item.image, item.title)}${illustrated ? artwork : ''}</div>`;
    return `<article id="archive-${index}" class="archive-detail ${projectIndex >= 0 ? 'project-detail' : ''}" data-archive="${index}" ${index ? 'hidden inert' : ''}><div class="archive-topline"><span>【${serial(index)} 号档案】</span><span>${serial(index)} / ${archives.length}</span></div>${visual}<div class="archive-info"><div><span class="file-kicker">${h(item.category)}</span><h3>${h(item.title)}</h3></div><button type="button" id="archive-open-${index}" class="inspect-button" data-dialog="archive-detail-${index}">查看详情 ↗</button></div>${projectIndex >= 0 ? `<p class="project-description">${h(item.detail)}</p><p class="project-award">${h(item.award)}</p>` : ''}</article>`;
  }).join(''), '暂无成果或项目'));
  writeHtml('#dynamic-details',
    notices.slice(0, 4).map((item, index) => detail(`notice-detail-${index}`, item.title, `<p>${h(item.tag)} / ${h(item.date)}</p><p>${h(item.detail)}</p>${item.link ? `<a href="${h(linkUrl(item.link, location.href))}" target="_blank" rel="noopener noreferrer">查看相关链接 ↗</a>` : ''}`)).join('') +
    activities.slice(0, 3).map((item, index) => detail(`activity-detail-${index}`, item.title, `<p>${h(item.date)} · ${h(item.place)}</p><p>${h(item.detail)}</p>${picture(item.image, item.title)}`)).join('') +
    archives.map((item, index) => detail(`archive-detail-${index}`, item.title, `${picture(item.image, item.title)}<p>${h(item.detail)}</p><p>${h(item.award)}</p>`)).join('') +
    detail('hero-image-detail', data.heroTitle, picture(data.heroImage, data.heroTitle)));
}

/** @param {SiteContent} data @returns {void} */
function renderAbout(data) {
  const about = data.about;
  writeText('[data-about-title]', about.title);
  writeText('[data-about-subtitle]', about.subtitle);
  writeText('[data-about-mission]', about.missionTitle);
  writeText('#about-record-2 .order-content > p', data.clubIntro);
  writeHtml('[data-about-paragraphs]', about.paragraphs.map(text => `<p>${h(text)}</p>`).join(''));
  writeHtml('.direction-records', data.features.map((item, index) => `<div class="direction-record"><span>${serial(index)}</span><strong>${h(item.title)}</strong></div>`).join(''));
  writeHtml('#about-record-2 .order-numeral', `${data.features.length}<small>DIRECTIONS</small>`);
  const memberStat = about.stats[0];
  const projectStat = about.stats[1];
  writeHtml('#about-record-3 .order-numeral', `${memberStat ? h(memberStat.value) : '—'}<small>MEMBERS</small>`);
  writeHtml('#about-record-4 .order-numeral', `${projectStat ? h(projectStat.value) : '—'}<small>PROJECTS</small>`);
  writeText('#about-record-3 .member-stat', memberStat ? `${memberStat.value} ${memberStat.label} ↗` : '查看成员 ↗');
  writeHtml('[data-about-stats]', about.stats.map((item, index) => `<a class="member-stat" href="${index ? 'projects.html' : 'members.html'}">${h(item.value)} ${h(item.label)} ↗</a>`).join(''));
  writeHtml('[data-about-charts]', about.charts.map(chart => {
    const total = chart.items.reduce((sum, item) => sum + item.value, 0);
    return `<article class="distribution-chart"><h3>${h(chart.title)}</h3>${chart.items.map(item => {
      const percentage = total ? item.value / total * 100 : 0;
      return `<div class="distribution-row"><span>${h(item.label)}</span><b>${Math.round(percentage)}%</b><i style="--distribution:${percentage}%"></i></div>`;
    }).join('')}</article>`;
  }).join(''));
  writeHtml('.project-records', data.projects.map(item => `<li><span>${h(item.category)}</span><h3>${h(item.title)}</h3><p>${h(item.detail)}</p><small>${h(item.award)}</small></li>`).join(''));
  writeHtml('#dynamic-details', detail('about-image-detail', about.title, picture(about.image, about.title)));
  writeHtml('[data-logo-slot="unified"]', picture(data.logo, data.siteName));
}

/** @param {SiteContent} data @returns {void} */
function renderMembers(data) {
  writeText('[aria-labelledby="profiles-title"] .section-rule > span', `${data.memberProfiles.length} / MEMBERS`);
  writeText('#observed-record', data.memberProfiles.length ? 'MBR-01 // CALIBRATED' : '暂无成员档案');
  writeHtml('[data-member-profiles]', contentOrEmpty(data.memberProfiles.map((item, index) => `<button class="member-profile-card" id="member-${index}" type="button" data-observe="MBR-${serial(index)}" data-angle="${index * 35 - 20}" data-phase-dialog="member-detail-${index}"><span class="member-portrait">${picture(item.image, item.name)}</span><span class="member-name"><small>MBR-${serial(index)}</small><strong>${h(item.name)}</strong><span>${h(item.title)}</span></span><span class="member-awards">${h(item.awards)}</span><span class="member-arrow" aria-hidden="true">↗</span></button>`).join(''), '暂无成员档案'));
  writeHtml('[data-club-moments]', contentOrEmpty(data.clubMoments.map((item, index) => `<button id="moment-${index}" class="moment-card" type="button" data-observe="OBS-${serial(index)}" data-angle="${index * 30 + 55}" data-phase-dialog="moment-detail-${index}"><span class="moment-frame">${picture(item.image, item.title)}<span class="moment-index">OBS-${serial(index)} / VIEW ↗</span></span><strong>${h(item.title)}</strong><span>${h(item.text)}</span></button>`).join(''), '暂无活动风采'));
  writeHtml('#dynamic-details', data.memberProfiles.map((item, index) => detail(`member-detail-${index}`, item.name, `<p>${h(item.title)}</p><p>${h(item.awards)}</p>${picture(item.image, item.name)}`)).join('') + data.clubMoments.map((item, index) => detail(`moment-detail-${index}`, item.title, `<p>${h(item.text)}</p>${picture(item.image, item.title)}`)).join(''));
}

/** @param {SiteContent} data @returns {void} */
function renderJoin(data) {
  const join = data.join;
  /** @type {ReadonlyArray<readonly [string, string]>} */
  const bindings = [['title', join.title], ['subtitle', join.subtitle], ['address', join.address], ['email', join.email], ['phone', join.phone], ['intro', join.intro], ['recruit-title', join.recruitTitle], ['recruit-info', join.recruitInfo]];
  for (const [key, value] of bindings) writeText(`[data-join-${key}]`, value);
  element('[data-join-email]', document).setAttribute('href', `mailto:${encodeURIComponent(join.email).replace(/%40/g, '@')}`);
  element('[data-join-phone]', document).setAttribute('href', `tel:${encodeURIComponent(join.phone)}`);
  element('#copy-email', document).dataset.email = join.email;
  writeHtml('#join-identity', picture(join.visualImage, data.siteName));
}

/** @returns {Promise<SiteContent>} */
async function loadContent() {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch('/api/content', {cache: 'no-store', signal: AbortSignal.timeout(10000)});
      const body = await response.text();
      if (!response.ok) throw new Error(`GET /api/content failed: HTTP ${response.status}; response=${body}`);
      return parseContent(/** @type {JsonValue} */ (JSON.parse(body)));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError && error.message !== 'Failed to fetch') throw error;
      if (attempt === 3) throw error;
      console.warn('content_request_retry', {url: '/api/content', method: 'GET', attempt, error});
      await new Promise(resolve => setTimeout(resolve, attempt * 300));
    }
  }
  throw new Error('Content request exhausted its attempts.');
}

/** @returns {Promise<void>} */
async function startContent() {
  try {
    const data = await loadContent();
    if (!/^#[\da-f]{6}$/i.test(data.themeColor)) throw new TypeError('content.themeColor must be a six-digit hex color.');
    document.documentElement.style.setProperty('--accent-diagram-blue', data.themeColor);
    writeText('.brand-plaque > b', `// ${data.siteName}`);
    writeHtml('.secret-logo-button', picture(data.logo, data.siteName));
    if (document.querySelector('#scroll-story')) renderHome(data);
    if (document.body.dataset.phase2 === 'about') renderAbout(data);
    if (document.body.dataset.phase2 === 'members') renderMembers(data);
    if (document.body.dataset.phase2 === 'join') renderJoin(data);
    document.body.dataset.contentState = 'ready';
    element('#content-status', document).hidden = true;
    element('#main', document).removeAttribute('aria-busy');
    window.dispatchEvent(new Event('zhihang:content-ready'));
  } catch (error) {
    document.body.dataset.contentState = 'error';
    writeText('#content-status', '内容加载失败，请刷新重试。');
    console.error('content_load_failed', {url: '/api/content', error});
    throw error;
  }
}

await startContent();
