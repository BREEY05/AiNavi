// @ts-check

/** @typedef {Readonly<{ width: number, height: number, ratio: number }>} CanvasSize */
/** @typedef {Readonly<{ x: number, y: number, size: number, opacity: number, color: string }>} Mote */

/** @param {number} index @param {number} elapsed @param {CanvasSize} size @returns {Mote} */
function locateMote(index, elapsed, size) {
  const speed = .15 + (index % 5) * .05;
  const x = ((index * 137.51 + 79) % size.width) + Math.sin(elapsed / 7000 + index) * 11;
  const y = ((index * 83.17 + size.height - elapsed * speed / (1000 / 60)) % size.height + size.height) % size.height;
  return { x, y, size: 1.5 + (index % 4) * .5, opacity: .15 + (index % 3) * .08, color: index % 2 === 0 ? '#FFFFFF' : '#3152D7' };
}

/** @returns {CanvasSize} */
function measureCanvas() {
  return { width: window.innerWidth, height: window.innerHeight, ratio: Math.min(window.devicePixelRatio, 2) };
}

/** @param {CanvasRenderingContext2D} context @param {CanvasSize} size @param {number} elapsed @returns {void} */
function paintMotes(context, size, elapsed) {
  context.clearRect(0, 0, size.width, size.height);
  for (let index = 0; index < 32; index += 1) {
    const mote = locateMote(index, elapsed, size);
    context.globalAlpha = mote.opacity;
    context.fillStyle = mote.color;
    context.fillRect(mote.x, mote.y, mote.size, mote.size);
    if (index % 4 === 0) {
      context.fillRect(mote.x - 2, mote.y + mote.size / 2, mote.size + 4, .6);
      context.fillRect(mote.x + mote.size / 2, mote.y - 2, .6, mote.size + 4);
    }
  }
  context.globalAlpha = 1;
}

/** @returns {void} */
function mountDemo() {
  const canvas = document.querySelector('#sanctuary-particles');
  const toggle = document.querySelector('#motion-toggle');
  const motionLabel = document.querySelector('[data-motion-label]');
  const motionIcon = document.querySelector('.motion-icon');
  const menuToggle = document.querySelector('#menu-toggle');
  const navigation = document.querySelector('#primary-navigation');
  if (!(canvas instanceof HTMLCanvasElement) || !(toggle instanceof HTMLButtonElement) || !(motionLabel instanceof HTMLElement) || !(motionIcon instanceof HTMLElement) || !(menuToggle instanceof HTMLButtonElement) || !(navigation instanceof HTMLElement)) {
    throw new TypeError('The visual demo requires its canvas, motion controls, and navigation elements.');
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A Canvas 2D context could not be created for ambient motes.');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = preference.matches;
  let size = measureCanvas();
  let frameId = 0;
  let elapsed = 0;
  let lastFrame = 0;

  /** @returns {void} */
  function stopFrames() {
    window.cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
  }

  /** @param {number} time @returns {void} */
  function frame(time) {
    if (lastFrame > 0) elapsed += Math.min(time - lastFrame, 50);
    lastFrame = time;
    paintMotes(context, size, elapsed);
    frameId = window.requestAnimationFrame(frame);
  }

  /** @returns {void} */
  function synchronizeMotion() {
    stopFrames();
    document.body.dataset.motionState = paused || document.hidden ? 'paused' : 'playing';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? '开启动效' : '暂停动效');
    motionLabel.textContent = preference.matches ? '静态模式' : paused ? '继续动态' : '暂停动态';
    motionIcon.textContent = paused ? '▷' : 'Ⅱ';
    toggle.disabled = preference.matches;
    if (!paused && !document.hidden) frameId = window.requestAnimationFrame(frame);
    paintMotes(context, size, elapsed);
  }

  /** @returns {void} */
  function resizeCanvas() {
    size = measureCanvas();
    canvas.width = Math.round(size.width * size.ratio);
    canvas.height = Math.round(size.height * size.ratio);
    context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
    paintMotes(context, size, elapsed);
  }

  /** @returns {void} */
  function closeMenu() {
    navigation.dataset.open = 'false';
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '展开导航');
  }

  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    navigation.dataset.open = String(open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  });
  navigation.addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuToggle.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (event.target instanceof Node && !navigation.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });
  toggle.addEventListener('click', () => { paused = !paused; synchronizeMotion(); });
  preference.addEventListener('change', () => { paused = preference.matches; synchronizeMotion(); });
  document.addEventListener('visibilitychange', synchronizeMotion);
  window.addEventListener('pagehide', stopFrames);
  window.addEventListener('pageshow', synchronizeMotion);
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  synchronizeMotion();
}

mountDemo();
