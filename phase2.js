// @ts-check

/** @returns {void} */
function mountPhaseDialogs() {
  const dialog = document.querySelector('#phase-detail');
  const content = document.querySelector('#phase-detail-content');
  const close = document.querySelector('#phase-detail-close');
  if (!(dialog instanceof HTMLDialogElement) || !(content instanceof HTMLElement) || !(close instanceof HTMLButtonElement)) throw new TypeError('Phase 2 requires its native archive dialog.');
  for (const button of document.querySelectorAll('[data-phase-dialog]')) {
    if (!(button instanceof HTMLButtonElement)) throw new TypeError('Archive dialog triggers must be buttons.');
    button.addEventListener('click', () => {
      const template = document.getElementById(button.dataset.phaseDialog ?? '');
      if (!(template instanceof HTMLTemplateElement)) throw new TypeError(`Missing archive template: ${button.dataset.phaseDialog}`);
      content.replaceChildren(template.content.cloneNode(true));
      const heading = content.querySelector('h2');
      if (!(heading instanceof HTMLHeadingElement)) throw new TypeError('Archive templates require a title.');
      heading.id = 'phase-detail-title';
      dialog.showModal();
    });
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
}

/** @returns {void} */
function mountMemberObservation() {
  if (document.body.dataset.phase2 !== 'members') return;
  const ring = document.querySelector('#member-calibration');
  const caption = document.querySelector('#observed-record');
  const field = document.querySelector('.observer-field');
  if (!(ring instanceof SVGElement) || !(caption instanceof HTMLElement) || !(field instanceof HTMLElement)) throw new TypeError('Member observation requires its calibrated ring and record label.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let lockFrame = 0;
  for (const button of document.querySelectorAll('[data-observe]')) {
    if (!(button instanceof HTMLButtonElement)) throw new TypeError('Observed records must be accessible buttons.');
    /** @returns {void} */
    function observeRecord() {
      const angle = Number(button.dataset.angle);
      const record = button.dataset.observe;
      if (!Number.isFinite(angle) || !record) throw new TypeError('Observed records require a numeric angle and archive identifier.');
      ring.style.transitionDuration = reduce.matches ? '0s' : '750ms';
      ring.style.transform = `rotate(${angle}deg)`;
      caption.textContent = `${record} // CALIBRATED`;
      field.dataset.locked = 'false';
      cancelAnimationFrame(lockFrame);
      lockFrame = requestAnimationFrame(() => { field.dataset.locked = String(!reduce.matches); });
    }
    button.addEventListener('pointerenter', observeRecord);
    button.addEventListener('focus', observeRecord);
    button.addEventListener('click', observeRecord);
  }
  window.addEventListener('pagehide', () => cancelAnimationFrame(lockFrame));
}

/** @param {string} text @param {number} progress @param {number} seed @returns {string} */
function terminalFrame(text, progress, seed) {
  const alphabet = '0123456789ABCDEF#@%アイウエオ';
  const locked = Math.floor(text.length * progress);
  return Array.from(text, (letter, index) => index < locked || letter === ' ' ? letter : alphabet[(index * 7 + seed) % alphabet.length]).join('');
}

/** @typedef {{element: HTMLDetailsElement, summary: HTMLElement, content: HTMLElement, target: 'expanded'|'collapsed', heightMotion: Animation|null, inkMotion: Animation|null}} OrderMotion */

/** @param {MediaQueryList} reduce @returns {void} */
function mountOrderMotion(reduce) {
  /** @type {OrderMotion[]} */
  const orders = Array.from(document.querySelectorAll('.order-record'), element => {
    const summary = element.querySelector('summary');
    const content = element.querySelector('.order-content');
    if (!(element instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement) || !(content instanceof HTMLElement)) throw new TypeError('Order motion requires a native details element, summary, and content.');
    summary.id = `${element.id}-toggle`;
    content.id = `${element.id}-content`;
    summary.setAttribute('aria-controls', content.id);
    summary.setAttribute('aria-expanded', String(element.open));
    return { element, summary, content, target: element.open ? 'expanded' : 'collapsed', heightMotion: null, inkMotion: null };
  });
  /** @param {OrderMotion} order @returns {void} */
  function settleOrder(order) {
    order.heightMotion?.cancel();
    order.inkMotion?.cancel();
    order.heightMotion = null;
    order.inkMotion = null;
    order.element.open = order.target === 'expanded';
    order.element.style.height = '';
    order.element.removeAttribute('data-expanding');
    order.content.inert = !order.element.open;
  }
  /** @param {OrderMotion} order @param {'expanded'|'collapsed'} target @returns {void} */
  function animateOrder(order, target) {
    const startHeight = order.element.getBoundingClientRect().height;
    const currentInk = getComputedStyle(order.content);
    const opacity = order.element.open ? currentInk.opacity : '0';
    const transform = order.element.open ? currentInk.transform : 'translateY(-14px)';
    order.heightMotion?.cancel();
    order.inkMotion?.cancel();
    order.target = target;
    order.summary.setAttribute('aria-expanded', String(target === 'expanded'));
    order.content.inert = target === 'collapsed';
    if (reduce.matches || document.body.dataset.motionState === 'paused') { settleOrder(order); return; }
    order.element.open = true;
    order.element.style.height = '';
    const endHeight = target === 'expanded' ? order.element.getBoundingClientRect().height : order.summary.getBoundingClientRect().height;
    order.element.style.height = `${endHeight}px`;
    order.element.dataset.expanding = target;
    const duration = Math.min(620, 340 + Math.abs(endHeight - startHeight) * .45);
    const heightMotion = order.element.animate([{ height: `${startHeight}px` }, { height: `${endHeight}px` }], { duration, easing: 'cubic-bezier(.2,.88,.26,1)', fill: 'both' });
    order.heightMotion = heightMotion;
    order.inkMotion = order.content.animate([{ opacity, transform }, { opacity: target === 'expanded' ? '1' : '0', transform: target === 'expanded' ? 'translateY(0)' : 'translateY(-14px)' }], { duration: duration * .85, easing: 'cubic-bezier(.18,.8,.24,1)', fill: 'both' });
    heightMotion.onfinish = () => { if (order.heightMotion === heightMotion) settleOrder(order); };
  }
  for (const order of orders) {
    order.summary.addEventListener('click', event => {
      event.preventDefault();
      if (order.target === 'expanded') { animateOrder(order, 'collapsed'); return; }
      for (const sibling of orders) if (sibling !== order && sibling.target === 'expanded') animateOrder(sibling, 'collapsed');
      animateOrder(order, 'expanded');
    });
  }
  /** @returns {void} */
  function settleAll() { for (const order of orders) settleOrder(order); }
  const preferenceObserver = new MutationObserver(() => { if (document.body.dataset.motionState === 'paused') settleAll(); });
  preferenceObserver.observe(document.body, { attributes: true, attributeFilter: ['data-motion-state'] });
  reduce.addEventListener('change', settleAll);
  window.addEventListener('resize', settleAll);
  window.addEventListener('pagehide', settleAll);
}

/** @returns {void} */
function mountWorkbench() {
  if (document.body.dataset.phase2 !== 'about') return;
  const terminal = document.querySelector('.cmd-terminal-box');
  const lines = Array.from(document.querySelectorAll('.cmd-screen > span'));
  if (!(terminal instanceof HTMLElement) || lines.length !== 3 || !lines.every(line => line instanceof HTMLElement)) throw new TypeError('The workbench terminal requires three text lines.');
  const bench = document.querySelector('.workbench-stage');
  const drawing = document.querySelector('.workbench-svg');
  const mark = document.querySelector('[data-logo-slot="unified"]');
  if (!(bench instanceof HTMLElement) || !(drawing instanceof SVGSVGElement) || !(mark instanceof HTMLElement)) throw new TypeError('The unified mark requires its normalized workbench anchor.');
  /** @returns {void} */
  function alignMark() {
    const panel = bench.getBoundingClientRect();
    const art = drawing.getBoundingClientRect();
    const unit = Math.min(art.width, art.height) / 1000;
    const x = art.left - panel.left + art.width / 2 - 270 * unit;
    const y = art.top - panel.top + art.height / 2 - 245 * unit;
    mark.style.width = `${260 * unit}px`;
    mark.style.left = `${x - 130 * unit}px`;
    mark.style.top = `${y - 91 * unit}px`;
  }
  window.addEventListener('resize', alignMark);
  document.fonts.ready.then(alignMark);
  alignMark();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const states = ['> STATUS: CODING...      [OK]','> STATUS: SOLDERING...   [OK]','> STATUS: STUDYING...    [OK]'];
  let frame = 0;
  let index = 0;
  let egg = false;
  let eggTimer = 0;
  /** @param {HTMLElement} line @param {string} value @returns {void} */
  function typeLine(line, value) {
    cancelAnimationFrame(frame);
    const started = performance.now();
    if (reduce.matches || document.body.dataset.motionState === 'paused') { line.textContent = value; return; }
    /** @param {number} time @returns {void} */
    function paint(time) {
      const progress = Math.min(1, (time - started) / 400);
      line.textContent = terminalFrame(value, progress, Math.floor((time - started) / 35));
      if (progress < 1) frame = requestAnimationFrame(paint);
    }
    frame = requestAnimationFrame(paint);
  }
  /** @returns {void} */
  function revealEgg() {
    if (egg) return;
    egg = true;
    for (const line of lines) line.textContent = '';
    cancelAnimationFrame(frame);
    lines[0].textContent = '█';
    terminal.dataset.cursor = 'blink';
    eggTimer = window.setTimeout(() => {
      terminal.dataset.cursor = 'done';
      typeLine(lines[0], '> WHAT U WAITING? █');
      eggTimer = window.setTimeout(() => { terminal.dataset.easter = 'true'; }, reduce.matches ? 0 : 400);
    }, reduce.matches ? 0 : 450);
  }
  const cycle = window.setInterval(() => {
    if (egg || document.hidden || document.body.dataset.motionState === 'paused') return;
    typeLine(lines[index], states[index]);
    index = (index + 1) % states.length;
  }, 2200);
  const idle = window.setTimeout(revealEgg, 6000);
  terminal.addEventListener('pointerenter', revealEgg);
  terminal.addEventListener('focusin', revealEgg);
  if (reduce.matches) revealEgg();
  mountOrderMotion(reduce);
  window.addEventListener('pagehide', () => { clearInterval(cycle); clearTimeout(idle); clearTimeout(eggTimer); cancelAnimationFrame(frame); });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    egg = true;
    terminal.dataset.cursor = 'done';
    terminal.dataset.easter = 'true';
    for (const line of lines) line.textContent = '';
    lines[0].textContent = '> WHAT U WAITING? █';
    alignMark();
  });
}

/** @param {number} seed @param {number} index @returns {number} */
function faultSample(seed, index) {
  const input = (seed + Math.imul(index, 0x9E3779B9)) >>> 0;
  const first = Math.imul(input ^ (input >>> 16), 0x85EBCA6B);
  const second = Math.imul(first ^ (first >>> 13), 0xC2B2AE35);
  return ((second ^ (second >>> 16)) >>> 0) / 4294967296;
}

/** @param {HTMLElement} intro @returns {void} */
function composeFaultField(intro) {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const mobile = innerWidth < 700;
  const fragments = Array.from(intro.querySelectorAll('.collapse-slice'));
  fragments.forEach((fragment, i) => {
    if (!(fragment instanceof HTMLElement)) throw new TypeError('EX fragments must be HTML elements.');
    const width = 5 + faultSample(seed, i * 11) * 24;
    const height = i % 3 === 0 ? 1 + faultSample(seed, i * 11 + 1) * 2 : 5 + faultSample(seed, i * 11 + 1) * 20;
    const values = { sx: `${faultSample(seed, i * 11 + 2) * (100 - width)}%`, sy: `${6 + faultSample(seed, i * 11 + 3) * (88 - height)}%`, sw: `${width}vw`, sh: `${height}vh`, sd: `${faultSample(seed, i * 11 + 4) * .28}s`, dx: `${(faultSample(seed, i * 11 + 5) - .5) * 12}vw`, dy: `${(faultSample(seed, i * 11 + 6) - .5) * 9}vh`, cut: `${18 + faultSample(seed, i * 11 + 7) * 65}%`, span: `${.72 + faultSample(seed, i * 11 + 8) * .65}s` };
    for (const [key, value] of Object.entries(values)) fragment.style.setProperty(`--${key}`, value);
  });
  const anchors = [[.03,.12],[.5,.08],[.21,.41],[.59,.61],[.04,.67],[.66,.3]];
  Array.from(intro.querySelectorAll('.collapse-message')).forEach((message, i) => {
    if (!(message instanceof HTMLElement)) throw new TypeError('Fault records must be HTML elements.');
    const width = mobile ? 51 + faultSample(seed, 400 + i) * 12 : 24 + faultSample(seed, 400 + i) * 11;
    const x = Math.max(1, Math.min(99 - width, anchors[i][0] * 100 + (faultSample(seed, 420 + i) - .5) * 12));
    const y = Math.max(7, Math.min(70, anchors[i][1] * 100 + (faultSample(seed, 440 + i) - .5) * 15));
    const values = { ex: `${x}%`, ey: `${y}%`, ew: `${width}vw`, ed: `${.02 + i * .047 + faultSample(seed, 460 + i) * .12}s`, push: `${(faultSample(seed, 480 + i) - .5) * 100}px`, lift: `${25 + faultSample(seed, 500 + i) * 65}px` };
    for (const [key, value] of Object.entries(values)) message.style.setProperty(`--${key}`, value);
    const dump = message.querySelector('[data-fault-dump]');
    const wave = message.querySelector('[data-fault-wave]');
    if (!(dump instanceof HTMLElement) || !(wave instanceof SVGPathElement)) throw new TypeError('Fault records require a memory dump and waveform.');
    dump.textContent = Array.from({length:3}, (_, row) => `${(seed + i * 128 + row * 16 >>> 0).toString(16).toUpperCase().padStart(8,'0')}  ${Array.from({length:5}, (_, col) => Math.floor(faultSample(seed, 600 + i * 30 + row * 5 + col) * 65536).toString(16).toUpperCase().padStart(4,'0')).join(' ')}`).join('\n');
    wave.setAttribute('d', Array.from({length:41}, (_, point) => `${point === 0 ? 'M' : 'L'}${point * 6} ${6 + faultSample(seed, 900 + i * 41 + point) * 40}`).join(' '));
  });
}

/** @typedef {{distance: number, obstacle: number, jump: number | null}} DinoRun */

/** @param {DinoRun} state @param {number} elapsed @param {number} width @param {number} runnerLeft @returns {DinoRun} */
function advanceDinoRun(state, elapsed, width, runnerLeft) {
  const travel = elapsed * 145;
  const obstacle = state.obstacle - travel < -28 ? width + 28 : state.obstacle - travel;
  const jump = state.jump === null || state.jump + elapsed >= .82 ? null : state.jump + elapsed;
  const approaching = state.obstacle > runnerLeft + 96 && obstacle <= runnerLeft + 96;
  return { distance: state.distance + travel, obstacle, jump: jump === null && approaching ? 0 : jump };
}

/** @param {MediaQueryList} reduce @returns {void} */
function mountDinoRunner(reduce) {
  const horizon = document.querySelector('#dino-horizon');
  const dino = document.querySelector('#halo-dino');
  const ground = document.querySelector('#dino-ground');
  const cactus = document.querySelector('#dino-cactus');
  const status = document.querySelector('#dino-status');
  const help = document.querySelector('#dino-help');
  if (!(horizon instanceof HTMLElement) || !(dino instanceof HTMLButtonElement) || !(ground instanceof HTMLElement) || !(cactus instanceof SVGSVGElement) || !(status instanceof HTMLElement) || !(help instanceof HTMLElement)) throw new TypeError('The dinosaur runner requires its track, button, ground, cactus, status, and keyboard hint.');
  let width = horizon.clientWidth;
  let runnerLeft = dino.offsetLeft;
  /** @type {DinoRun} */
  let state = { distance: 0, obstacle: width + 28, jump: null };
  let visible = false;
  let suspended = false;
  let frameId = 0;
  let previousTime = 0;
  /** @returns {void} */
  function renderRunner() {
    const progress = state.jump === null ? 0 : state.jump / .82;
    dino.style.setProperty('--jump-y', `${-4 * 58 * progress * (1 - progress)}px`);
    dino.style.setProperty('--halo-lag', `${Math.sin(progress * Math.PI * 2) * 5}px`);
    dino.dataset.jumping = String(state.jump !== null);
    dino.dataset.step = String(Math.floor(state.distance / 16) % 2);
    ground.style.translate = `${-(state.distance % 80)}px 0`;
    cactus.style.translate = `${state.obstacle}px 0`;
  }
  /** @param {number} time @returns {void} */
  function advanceRunner(time) {
    const elapsed = previousTime === 0 ? 0 : Math.min((time - previousTime) / 1000, .05);
    previousTime = time;
    state = advanceDinoRun(state, elapsed, width, runnerLeft);
    renderRunner();
    frameId = requestAnimationFrame(advanceRunner);
  }
  /** @returns {void} */
  function synchronizeRunner() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
    const running = visible && !suspended && !document.hidden && !reduce.matches && document.body.dataset.motionState !== 'paused' && document.body.dataset.introRunning !== 'true';
    horizon.dataset.running = String(running);
    status.textContent = `DINO_AGENT // HALO_ACQUIRED [${running ? 'RUNNING' : 'READY TO RUN'}]`;
    help.textContent = reduce.matches ? '静态模式 · 光环小恐龙休息中' : document.body.dataset.motionState === 'paused' ? '动效已暂停 · 可在页脚继续动态' : '自动奔跑 · 悬停、点击或空格起跳';
    if (reduce.matches) { state = { ...state, jump: null }; renderRunner(); }
    if (running) frameId = requestAnimationFrame(advanceRunner);
  }
  /** @returns {void} */
  function jumpDinosaur() {
    if (horizon.dataset.running !== 'true' || state.jump !== null) return;
    state = { ...state, jump: 0 };
    renderRunner();
  }
  const visibility = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .2);
    synchronizeRunner();
  }, { threshold: [0, .2] });
  visibility.observe(horizon);
  const resize = new ResizeObserver(() => {
    const nextWidth = horizon.clientWidth;
    if (nextWidth <= 0) throw new RangeError('The dinosaur track must have a positive width.');
    state = { ...state, obstacle: state.obstacle * nextWidth / width };
    width = nextWidth;
    runnerLeft = dino.offsetLeft;
    renderRunner();
  });
  resize.observe(horizon);
  const preferences = new MutationObserver(synchronizeRunner);
  preferences.observe(document.body, { attributes: true, attributeFilter: ['data-motion-state', 'data-intro-running'] });
  reduce.addEventListener('change', synchronizeRunner);
  document.addEventListener('visibilitychange', synchronizeRunner);
  dino.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') jumpDinosaur(); });
  dino.addEventListener('click', jumpDinosaur);
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat || horizon.dataset.running !== 'true') return;
    if (event.target !== document.body && event.target !== document.documentElement && event.target !== document.querySelector('#main') && event.target !== document.querySelector('#recruitment-timeline')) return;
    event.preventDefault();
    jumpDinosaur();
  });
  window.addEventListener('pagehide', () => { suspended = true; synchronizeRunner(); });
  window.addEventListener('pageshow', () => { suspended = false; synchronizeRunner(); });
  renderRunner();
}

/** @returns {void} */
function mountRecruitment() {
  if (document.body.dataset.phase2 !== 'join') return;
  const intro = document.querySelector('#join-intro');
  const replay = document.querySelector('#intro-replay');
  const skip = document.querySelector('#intro-skip');
  const main = document.querySelector('#main');
  const timeline = document.querySelector('#recruitment-timeline');
  const copy = document.querySelector('#copy-email');
  if (!(intro instanceof HTMLDialogElement) || !(replay instanceof HTMLButtonElement) || !(skip instanceof HTMLButtonElement) || !(main instanceof HTMLElement) || !(timeline instanceof HTMLElement) || !(copy instanceof HTMLButtonElement)) throw new TypeError('Recruitment requires its intro, replay, timeline, and contact controls.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  mountDinoRunner(reduce);
  const halo = mountHaloField();
  const visitKey = 'zhihang.phase2.creation-intro.seen';
  const narrow = matchMedia('(max-width: 900px)');
  const atlas = document.querySelector('.math-atlas');
  const hands = document.querySelector('.creation-hands');
  if (!(atlas instanceof SVGSVGElement)) throw new TypeError('Recruitment requires all eight mathematical diagrams.');
  if (!(hands instanceof SVGSVGElement)) throw new TypeError('Recruitment requires its centered creation hands.');
  /** @returns {void} */
  function layoutAtlas() { atlas.setAttribute('viewBox', narrow.matches ? '-400 -800 800 1600' : '-800 -450 1600 900'); }
  narrow.addEventListener('change', layoutAtlas);
  layoutAtlas();
  /** @returns {void} */
  function calibrateFingertips() {
    if (!intro.open) return;
    const matrix = hands.getScreenCTM();
    if (!matrix || matrix.a <= 0) throw new RangeError('The creation SVG must have a positive screen scale.');
    for (const hand of hands.querySelectorAll('.creation-hand use')) hand.setAttribute('transform', `translate(${1 - 1 / matrix.a} 0)`);
  }
  window.addEventListener('resize', calibrateFingertips);
  let sequenceFrame = 0;
  let copyTimer = 0;
  let first = true;
  /** @returns {void} */
  function revealSanctuary() {
    if (document.body.dataset.joinReveal === 'true') return;
    document.body.dataset.joinReveal = 'true';
    halo.draw();
  }
  /** @returns {void} */
  function finishIntro() {
    cancelAnimationFrame(sequenceFrame);
    document.body.dataset.introRunning = 'false';
    document.documentElement.style.overflow = '';
    if (intro.open) intro.close();
    localStorage.setItem(visitKey, 'seen');
    revealSanctuary();
    if (first) main.focus({ preventScroll: true });
    else replay.focus({ preventScroll: true });
    first = false;
  }
  /** @returns {void} */
  function playIntro() {
    cancelAnimationFrame(sequenceFrame);
    halo.reset();
    composeFaultField(intro);
    document.body.dataset.joinReveal = 'false';
    document.body.dataset.introRunning = 'true';
    document.documentElement.style.overflow = 'hidden';
    intro.showModal();
    calibrateFingertips();
    skip.focus({ preventScroll: true });
    const started = document.timeline.currentTime;
    if (typeof started !== 'number') throw new TypeError('The recruitment sequence requires an active document timeline.');
    for (const animation of intro.getAnimations({ subtree: true })) animation.startTime = started;
    /** @param {number} time @returns {void} */
    function advanceSequence(time) {
      const elapsed = time - started;
      if (elapsed >= 2520 && document.body.dataset.joinReveal !== 'true') revealSanctuary();
      if (elapsed >= 3100) { finishIntro(); return; }
      sequenceFrame = requestAnimationFrame(advanceSequence);
    }
    sequenceFrame = requestAnimationFrame(advanceSequence);
  }
  replay.addEventListener('click', playIntro);
  /** @returns {void} */
  function skipIntro() { finishIntro(); halo.settle(); }
  skip.addEventListener('click', skipIntro);
  intro.addEventListener('cancel', event => { event.preventDefault(); skipIntro(); });
  reduce.addEventListener('change', () => { if (reduce.matches && intro.open) skipIntro(); });
  document.fonts.ready.then(() => {
    if (localStorage.getItem(visitKey) === 'seen' || reduce.matches) { first = false; document.body.dataset.joinReveal = 'true'; halo.settle(); }
    else playIntro();
  });
  const timelineObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { timeline.dataset.open = 'true'; timelineObserver.disconnect(); }
  }, { threshold: .15 });
  timelineObserver.observe(timeline);
  copy.addEventListener('click', async () => {
    const email = copy.dataset.email;
    if (!email) throw new TypeError('The email copy action requires a configured address.');
    await navigator.clipboard.writeText(email);
    copy.textContent = '已复制 ✓';
    clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => { copy.textContent = '复制邮箱'; }, 2200);
  });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(sequenceFrame); clearTimeout(copyTimer); timelineObserver.disconnect(); });
  window.addEventListener('pageshow', event => { if (event.persisted && intro.open) finishIntro(); });
}

window.addEventListener('zhihang:content-ready', () => {
  mountPhaseDialogs();
  mountMemberObservation();
  mountWorkbench();
  mountRecruitment();
}, {once: true});
