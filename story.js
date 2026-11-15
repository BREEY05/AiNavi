// @ts-check

/** @typedef {Readonly<{ x: number, y: number, radius: number, rotation: number }>} RingPose */
/** @typedef {Readonly<{ scale: number, left: number, top: number }>} ViewportMap */
/** @typedef {Readonly<{ id: number, startY: number, startAngle: number, moved: number }>} DialDrag */
/** @typedef {Readonly<{ start: number, end: number }>} StoryTransition */
/** @typedef {Readonly<{ start: number, visualStart: number, target: number, started: number, duration: number }>} StoryTravel */
/** @typedef {Readonly<{ top: number, height: number }>} SectionBounds */

/** @type {ReadonlyArray<StoryTransition>} */
const storyTransitions = [{ start: .12, end: .30 }, { start: .41, end: .60 }, { start: .70, end: .88 }];

/** @param {number} value @param {number} minimum @param {number} maximum @returns {number} */
function clampValue(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

/** @param {number} start @param {number} end @param {number} amount @returns {number} */
function interpolate(start, end, amount) { return start + (end - start) * amount; }

/** @param {number} value @param {number} start @param {number} end @returns {number} */
function progressBetween(value, start, end) {
  const t = clampValue((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}

/** @param {number} width @param {number} height @returns {ViewportMap} */
function viewportMap(width, height) {
  const scale = Math.min(width / 1920, height / 1080);
  return { scale, left: (width - 1920 * scale) / 2, top: (height - 1080 * scale) / 2 };
}

/** @param {number} progress @returns {RingPose} */
function ringPose(progress) {
  const [first, second, third] = storyTransitions.map(range => progressBetween(progress, range.start, range.end));
  return {
    x: 960 - 1080 * third,
    y: 560 + 120 * first - 420 * second + 280 * third,
    radius: 410 + 50 * first + 60 * second - 40 * third,
    rotation: -12 * first + 27 * second - 15 * third,
  };
}

/** @param {number} progress @returns {ReadonlyArray<number>} */
function stageVisibility(progress) {
  const [first, second, third] = storyTransitions.map(range => progressBetween(progress, range.start, range.end));
  return [1 - first, first - second, second - third, third];
}

/** @param {number} angle @param {number} count @returns {number} */
function nearestDialIndex(angle, count) { return clampValue(Math.round(-angle / 22), 0, count - 1); }

/** @type {Map<HTMLElement, ReadonlyArray<Animation>>} */
const archiveMotions = new Map();

/** @param {HTMLElement} container @returns {void} */
function settleArchivePanel(container) {
  for (const animation of archiveMotions.get(container) ?? []) animation.cancel();
  archiveMotions.delete(container);
  for (const panel of container.children) {
    if (!(panel instanceof HTMLElement)) continue;
    panel.hidden = panel.inert;
    panel.classList.remove('panel-departing');
  }
  container.classList.remove('panel-switching');
  container.dataset.panelMoving = 'false';
  container.dispatchEvent(new Event('zhihang:panel-settled', {bubbles:true}));
}

/** @param {HTMLElement} selected @returns {void} */
function revealArchivePanel(selected) {
  const container = selected.parentElement;
  if (!(container instanceof HTMLElement)) throw new TypeError('An archive panel requires its content container.');
  const panels = Array.from(container.children);
  if (!panels.every(panel => panel instanceof HTMLElement)) throw new TypeError('Archive content containers require HTML panels.');
  const outgoing = panels.find(panel => !panel.hidden && !panel.inert);
  if (outgoing === selected) return;
  const height = container.getBoundingClientRect().height;
  const oldStyle = outgoing ? getComputedStyle(outgoing) : null;
  const oldOpacity = oldStyle?.opacity ?? '1';
  const oldTransform = oldStyle?.transform ?? 'none';
  const selectedStyle = selected.hidden ? null : getComputedStyle(selected);
  const initialOpacity = selectedStyle?.opacity ?? '0';
  const initialTransform = selectedStyle?.transform ?? 'translate3d(0,16px,0)';
  const visible = oldStyle?.visibility === 'visible' && container.getBoundingClientRect().bottom > 0 && container.getBoundingClientRect().top < innerHeight;
  for (const animation of archiveMotions.get(container) ?? []) animation.cancel();
  archiveMotions.delete(container);
  for (const panel of panels) {
    panel.hidden = panel !== selected;
    panel.inert = panel !== selected;
    panel.setAttribute('aria-hidden', String(panel !== selected));
    panel.classList.remove('panel-departing');
  }
  const immediate = !outgoing || !visible || document.body.dataset.storyReady !== 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.dataset.motionState === 'paused';
  if (immediate) { settleArchivePanel(container); return; }
  const nextHeight = selected.offsetHeight;
  outgoing.hidden = false;
  outgoing.classList.add('panel-departing');
  container.classList.add('panel-switching');
  container.dataset.panelMoving = 'true';
  const departing = outgoing.animate([{opacity:oldOpacity,transform:oldTransform},{opacity:0,transform:'translate3d(0,-10px,0)'}],{duration:200,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});
  const arriving = selected.animate([{opacity:initialOpacity,transform:initialTransform},{opacity:1,transform:'translate3d(0,0,0)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
  const resizing = container.animate([{height:`${height}px`},{height:`${nextHeight}px`}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
  const animations = [departing,arriving,resizing];
  archiveMotions.set(container, animations);
  departing.onfinish = () => { if (archiveMotions.get(container) === animations) outgoing.hidden = true; };
  resizing.onfinish = () => { if (archiveMotions.get(container) === animations) settleArchivePanel(container); };
}

/** @returns {void} */
function settleAllArchivePanels() { for (const container of archiveMotions.keys()) settleArchivePanel(container); }

/** @returns {void} */
function mountStory() {
  const story = document.querySelector('#scroll-story');
  const viewport = document.querySelector('.story-viewport');
  const sharedRing = document.querySelector('#shared-orbit');
  const status = document.querySelector('#stage-status-label');
  const stages = Array.from(document.querySelectorAll('[data-story-stage]'));
  const heroLayers = Array.from(document.querySelectorAll('.hero-art'));
  const hubNodes = Array.from(document.querySelectorAll('.orbit-node'));
  const chapterButtons = Array.from(document.querySelectorAll('.chapter-nav button'));
  if (!(story instanceof HTMLElement) || !(viewport instanceof HTMLElement) || !(sharedRing instanceof SVGElement) || !(status instanceof HTMLElement) || stages.length !== 4 || !stages.every(stage => stage instanceof HTMLElement) || !heroLayers.every(layer => layer instanceof SVGElement) || hubNodes.length !== 4 || !hubNodes.every(node => node instanceof HTMLButtonElement)) {
    throw new TypeError('The four-stage demo requires four panels, four orbit entries, and a shared SVG ring.');
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 900px)');
  const instrument = sharedRing.ownerSVGElement;
  if (!instrument) throw new TypeError('The shared ring must belong to the main SVG instrument.');
  const destinations = [0, .34, .64, 1];
  const stageNames = ['01 / 天穹锁定', '02 / 协会总览', '03 / 组织档案', '04 / 成果展示'];
  let frameId = 0;
  let active = -1;
  let lastFrame = 0;
  let targetY = window.scrollY;
  let observedY = targetY;
  let renderedY = targetY;
  let direction = 0;
  let settleTimer = 0;
  let pointerDown = false;
  let storyTop = 0;
  let scrollRange = 1;
  let map = viewportMap(1920, 1080);
  let hubShift = 0;
  /** @type {ReadonlyArray<SectionBounds>} */
  let sectionBounds = [];
  /** @type {StoryTravel | null} */
  let travel = null;

  /** @param {string} key @returns {void} */
  function selectHub(key) {
    const selected = document.getElementById(`hub-panel-${key}`);
    if (!(selected instanceof HTMLElement)) throw new RangeError(`Missing archive panel: ${key}`);
    revealArchivePanel(selected);
    for (const node of hubNodes) node.setAttribute('aria-pressed', String(node.dataset.hub === key));
    document.body.dataset.hub = key;
  }

  /** @param {number} time @returns {void} */
  function paintStory(time) {
    frameId = 0;
    const immediate = reduce.matches || document.body.dataset.motionState === 'paused';
    const delta = lastFrame ? Math.min(time - lastFrame, 64) : 16.67;
    lastFrame = time;
    if (travel) {
      const phase = clampValue((time - travel.started) / travel.duration, 0, 1);
      const amount = phase * phase * phase * (phase * (phase * 6 - 15) + 10);
      targetY = interpolate(travel.start, travel.target, amount);
      window.scrollTo({ top: targetY, behavior: 'instant' });
      targetY = window.scrollY;
      renderedY = interpolate(travel.visualStart, travel.target, amount);
      if (phase === 1) travel = null;
    } else {
      renderedY = immediate || narrow.matches ? targetY : interpolate(renderedY, targetY, 1 - Math.exp(-delta / 85));
      if (Math.abs(targetY - renderedY) < .25) renderedY = targetY;
    }
    let progress = clampValue((renderedY - storyTop) / scrollRange, 0, 1);
    let nextActive = active;
    if (narrow.matches) {
      const offset = targetY - storyTop;
      let sectionIndex = 0;
      for (let index = 1; index < stages.length; index += 1) {
        if (offset >= sectionBounds[index].top - 120) sectionIndex = index;
      }
      const current = sectionBounds[sectionIndex];
      const local = clampValue((offset - current.top) / current.height, 0, 1);
      progress = interpolate(destinations[sectionIndex], destinations[Math.min(sectionIndex + 1, 3)], local);
      nextActive = sectionIndex;
    }
    const visibility = stageVisibility(progress);
    if (!narrow.matches) nextActive = visibility.indexOf(Math.max(...visibility));
    const pose = ringPose(immediate ? destinations[nextActive] : progress);
    const orbitOffset = hubShift * progressBetween(progress, .41, .60) * (1 - progressBetween(progress, .70, .88));
    sharedRing.style.transform = `translate(${pose.x}px, ${pose.y + orbitOffset}px) scale(${pose.radius / 410}) rotate(${pose.rotation}deg) translate(-960px, -560px)`;
    sharedRing.style.opacity = narrow.matches && nextActive > 0 ? '.34' : '1';
    const heroOpacity = narrow.matches ? 1 - progressBetween(targetY, 60, 520) : immediate ? Number(nextActive === 0) : visibility[0];
    for (const layer of heroLayers) {
      layer.style.opacity = String(heroOpacity);
      layer.style.visibility = heroOpacity > 0 ? 'visible' : 'hidden';
      layer.dataset.visible = String(heroOpacity > 0);
      layer.style.transform = `translateY(${immediate ? 0 : -180 * (1 - heroOpacity)}px)`;
    }
    for (const [index, stage] of stages.entries()) {
      const opacity = immediate ? Number(index === nextActive) : visibility[index];
      stage.style.opacity = String(opacity);
      stage.style.visibility = narrow.matches || opacity > 0 ? 'visible' : 'hidden';
      const incoming = index === 0 ? 1 : progressBetween(progress, storyTransitions[index - 1].start, storyTransitions[index - 1].end);
      const outgoing = index === 3 ? 0 : progressBetween(progress, storyTransitions[index].start, storyTransitions[index].end);
      stage.style.transform = `translate3d(0, ${immediate ? 0 : 24 * (1 - incoming - outgoing)}px, 0)`;
    }
    const angles = [135, 105, 75, 45];
    for (const [index, node] of hubNodes.entries()) {
      const entry = immediate || narrow.matches ? 1 : progressBetween(progress, .43 + index * .008, .57 + index * .008);
      const angle = interpolate(210 + index * 16, angles[index], entry) * Math.PI / 180;
      node.style.setProperty('--orbit-x', `${map.left + (960 + 520 * Math.cos(angle)) * map.scale}px`);
      node.style.setProperty('--orbit-y', `${map.top + (260 + hubShift + 520 * Math.sin(angle)) * map.scale}px`);
      node.style.opacity = String(entry);
    }
    if (nextActive !== active) {
      active = nextActive;
      instrument.setAttribute('aria-hidden', String(active > 0));
      status.textContent = stageNames[active];
      document.body.dataset.stage = String(active);
      for (const [index, stage] of stages.entries()) {
        stage.inert = !narrow.matches && index !== active;
        stage.dataset.active = String(narrow.matches || index === active);
        stage.setAttribute('aria-hidden', String(!narrow.matches && index !== active));
      }
      for (const [index, button] of chapterButtons.entries()) {
        if (index === active) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      }
    }
    document.body.dataset.storyMoving = String(Boolean(travel) || renderedY !== targetY);
    if (travel || renderedY !== targetY) scheduleStory();
    else lastFrame = 0;
  }

  /** @returns {void} */
  function scheduleStory() { if (!frameId) frameId = window.requestAnimationFrame(paintStory); }

  /** @param {number} top @returns {void} */
  function travelTo(top) {
    window.clearTimeout(settleTimer);
    if (travel && Math.abs(travel.target - top) < .5) return;
    if (reduce.matches || document.body.dataset.motionState === 'paused') {
      travel = null;
      window.scrollTo({ top, behavior: 'instant' });
      targetY = window.scrollY;
      renderedY = targetY;
    } else {
      travel = { start: window.scrollY, visualStart: renderedY, target: top, started: performance.now(), duration: clampValue(Math.abs(top - window.scrollY) * .38, 520, 1200) };
    }
    scheduleStory();
  }

  /** @returns {void} */
  function settleStory() {
    if (travel || narrow.matches || reduce.matches || pointerDown || document.querySelector('dialog[open]')) return;
    const progress = clampValue((targetY - storyTop) / scrollRange, 0, 1);
    const index = storyTransitions.findIndex(range => progress > range.start && progress < range.end);
    if (index < 0) return;
    const range = storyTransitions[index];
    const phase = (progress - range.start) / (range.end - range.start);
    const destination = direction > 0 ? index + 1 : direction < 0 ? index : index + Number(phase >= .5);
    travelTo(storyTop + destinations[destination] * scrollRange);
  }

  /** @returns {void} */
  function observeScroll() {
    const currentY = window.scrollY;
    if (!travel) {
      if (Math.abs(currentY - observedY) > 1) direction = Math.sign(currentY - observedY);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settleStory, 180);
    }
    observedY = currentY;
    targetY = currentY;
    scheduleStory();
  }

  /** @returns {void} */
  function interruptTravel() {
    window.clearTimeout(settleTimer);
    travel = null;
    targetY = window.scrollY;
  }

  /** @returns {void} */
  function measureStory() {
    interruptTravel();
    storyTop = story.offsetTop;
    scrollRange = Math.max(1, story.offsetHeight - viewport.clientHeight);
    map = viewportMap(viewport.clientWidth, viewport.clientHeight);
    hubShift = !narrow.matches && window.innerWidth < 1280 ? 60 : 0;
    sectionBounds = stages.map(stage => ({ top: stage.offsetTop, height: stage.offsetHeight }));
    renderedY = targetY;
    active = -1;
    scheduleStory();
    settleTimer = window.setTimeout(settleStory, 180);
  }

  /** @returns {number | null} */
  function selectRouteTarget() {
    const keys = ['#stage-sky', '#stage-about', '#stage-hub', '#stage-projects'];
    const index = window.location.hash ? keys.indexOf(window.location.hash) : 0;
    if (index < 0) return null;
    const hub = new URL(window.location.href).searchParams.get('hub');
    if (index === 2 && hub && ['notices', 'intro', 'events', 'members'].includes(hub)) selectHub(hub);
    return narrow.matches ? storyTop + sectionBounds[index].top : storyTop + destinations[index] * scrollRange;
  }

  /** @returns {void} */
  function navigateRoute() {
    const top = selectRouteTarget();
    if (top !== null) travelTo(top);
  }

  /** @returns {void} */
  function restoreRoute() {
    const top = selectRouteTarget();
    if (top === null) return;
    interruptTravel();
    window.scrollTo({top,behavior:'instant'});
    targetY = window.scrollY;
    observedY = targetY;
    renderedY = targetY;
    paintStory(performance.now());
  }

  for (const button of document.querySelectorAll('[data-go-stage]')) {
    if (!(button instanceof HTMLButtonElement)) throw new TypeError('Chapter controls must be buttons.');
    button.addEventListener('click', () => {
      const index = Number(button.dataset.goStage);
      if (!Number.isInteger(index) || index < 0 || index > 3) throw new RangeError(`Invalid chapter index: ${button.dataset.goStage}`);
      if (button.dataset.openHub) selectHub(button.dataset.openHub);
      const top = narrow.matches ? storyTop + sectionBounds[index].top : storyTop + destinations[index] * scrollRange;
      travelTo(top);
    });
  }
  for (const node of hubNodes) node.addEventListener('click', () => {
    if (!node.dataset.hub) throw new TypeError('An orbit entry has no archive key.');
    selectHub(node.dataset.hub);
  });
  window.addEventListener('scroll', observeScroll, { passive: true });
  window.addEventListener('wheel', () => { interruptTravel(); settleTimer = window.setTimeout(settleStory, 180); }, { passive: true });
  window.addEventListener('touchstart', interruptTravel, { passive: true });
  window.addEventListener('pointerdown', () => { pointerDown = true; interruptTravel(); }, { passive: true });
  window.addEventListener('pointerup', () => { pointerDown = false; window.clearTimeout(settleTimer); settleTimer = window.setTimeout(settleStory, 180); }, { passive: true });
  window.addEventListener('pointercancel', () => { pointerDown = false; }, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) interruptTravel();
  });
  window.addEventListener('resize', measureStory);
  window.addEventListener('zhihang:route', navigateRoute);
  document.addEventListener('zhihang:panel-settled', () => { if (narrow.matches) measureStory(); });
  window.addEventListener('popstate', navigateRoute);
  window.addEventListener('hashchange', navigateRoute);
  reduce.addEventListener('change', measureStory);
  narrow.addEventListener('change', measureStory);
  window.addEventListener('pageshow', event => {
    measureStory();
    if (!event.persisted) restoreRoute();
  });
  window.addEventListener('pagehide', () => { interruptTravel(); window.cancelAnimationFrame(frameId); frameId = 0; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) interruptTravel(); else measureStory(); });
  document.body.dataset.hub = 'notices';
  measureStory();
  restoreRoute();
  document.body.dataset.storyReady = 'true';
  document.fonts.ready.then(measureStory);
}

/** @returns {void} */
function mountDial() {
  const dial = document.querySelector('#rotary-dial');
  const items = Array.from(document.querySelectorAll('[data-dial-index]'));
  const archives = Array.from(document.querySelectorAll('[data-archive]'));
  const announcement = document.querySelector('#dial-announcement');
  const previous = document.querySelector('#dial-prev');
  const next = document.querySelector('#dial-next');
  const position = document.querySelector('#dial-position');
  if (!(previous instanceof HTMLButtonElement) || !(next instanceof HTMLButtonElement) || !(position instanceof HTMLElement)) throw new TypeError('The merged archive requires previous, next, and position controls.');
  if (!items.length && !archives.length) {
    previous.disabled = true;
    next.disabled = true;
    position.textContent = '00 / 00';
    if (dial instanceof HTMLElement) dial.hidden = true;
    return;
  }
  if (!(dial instanceof HTMLElement) || !(announcement instanceof HTMLElement) || !items.every(item => item instanceof HTMLButtonElement) || archives.length !== items.length || !archives.every(item => item instanceof HTMLElement)) {
    throw new TypeError('The rotary archive requires matching dial buttons and archive records.');
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let angle = 0;
  let selected = 0;
  let animationId = 0;
  let layoutFrameId = 0;
  /** @type {DialDrag | null} */
  let drag = null;
  let suppressClick = false;

  /** @returns {void} */
  function paintDial() {
    const mobile = window.innerWidth <= 900;
    const map = viewportMap(window.innerWidth, Math.max(760, window.innerHeight));
    const bounds = dial.getBoundingClientRect();
    const radius = mobile ? 175 : 480 * map.scale;
    const cx = mobile ? -70 : map.left - 120 * map.scale - bounds.left;
    const cy = mobile ? 150 : map.top + 540 * map.scale - bounds.top;
    const offsets = items.map(item => {
      const hole = item.querySelector('.finger-hole');
      if (!(hole instanceof HTMLElement)) throw new TypeError('Each dial item requires a finger hole.');
      return (item.clientWidth - hole.clientWidth) / 2;
    });
    for (const [index, item] of items.entries()) {
      const theta = (index * 22 + angle) * Math.PI / 180;
      item.style.left = `${cx + radius * Math.cos(theta) + offsets[index]}px`;
      item.style.top = `${cy + radius * Math.sin(theta)}px`;
      item.style.opacity = String(.38 + .62 * Math.max(0, Math.cos(theta)));
      item.style.scale = String(index === selected ? 1.08 : .96);
      const visible = Math.abs(index * 22 + angle) < 51;
      item.style.visibility = visible ? 'visible' : 'hidden';
      item.tabIndex = visible ? 0 : -1;
    }
    document.documentElement.style.setProperty('--dial-angle', `${-angle}deg`);
    const stopper = dial.querySelector('.dial-stopper');
    if (!(stopper instanceof HTMLElement)) throw new TypeError('The rotary dial requires a fixed stopper.');
    stopper.style.top = `${cy - 14}px`;
    stopper.style.left = `${cx + radius + (mobile ? 160 : 150)}px`;
  }

  /** @param {number} index @returns {void} */
  function showArchive(index) {
    selected = index;
    revealArchivePanel(archives[index]);
    for (const [position] of archives.entries()) {
      items[position].setAttribute('aria-pressed', String(position === index));
    }
    const name = items[index].querySelector('.dial-name');
    if (!(name instanceof HTMLElement)) throw new TypeError('Each dial item requires its archive name.');
    announcement.textContent = name.textContent;
    position.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    previous.disabled = index === 0;
    next.disabled = index === items.length - 1;
  }

  /** @param {number} index @returns {void} */
  function snapDial(index) {
    window.cancelAnimationFrame(animationId);
    const start = angle;
    const target = -index * 22;
    const started = performance.now();
    showArchive(index);
    if (reduce.matches || document.body.dataset.motionState === 'paused') { angle = target; paintDial(); return; }
    /** @param {number} time @returns {void} */
    function settle(time) {
      const t = clampValue((time - started) / 380, 0, 1);
      angle = interpolate(start, target, 1 - Math.pow(1 - t, 4));
      paintDial();
      if (t < 1) animationId = window.requestAnimationFrame(settle);
      else animationId = 0;
    }
    animationId = window.requestAnimationFrame(settle);
  }

  /** @param {PointerEvent} event @returns {void} */
  function releaseDial(event) {
    if (!drag || drag.id !== event.pointerId) return;
    suppressClick = drag.moved > 5;
    drag = null;
    dial.dataset.dragging = 'false';
    if (dial.hasPointerCapture(event.pointerId)) dial.releasePointerCapture(event.pointerId);
    if (suppressClick) snapDial(nearestDialIndex(angle, items.length));
  }

  dial.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    window.cancelAnimationFrame(animationId);
    suppressClick = false;
    drag = { id: event.pointerId, startY: event.clientY, startAngle: angle, moved: 0 };
    dial.dataset.dragging = 'true';
  });
  dial.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = event.clientY - drag.startY;
    drag = { ...drag, moved: Math.max(drag.moved, Math.abs(delta)) };
    if (drag.moved > 5 && !dial.hasPointerCapture(event.pointerId)) dial.setPointerCapture(event.pointerId);
    angle = clampValue(drag.startAngle + delta * .18, -(items.length - 1) * 22 - 8, 8);
    paintDial();
  });
  dial.addEventListener('pointerup', releaseDial);
  dial.addEventListener('pointercancel', releaseDial);
  dial.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : selected + (event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1);
    snapDial(clampValue(index, 0, items.length - 1));
  });
  for (const [index, item] of items.entries()) item.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    snapDial(index);
  });
  previous.addEventListener('click', () => snapDial(Math.max(0, selected - 1)));
  next.addEventListener('click', () => snapDial(Math.min(items.length - 1, selected + 1)));
  window.addEventListener('resize', paintDial);
  window.addEventListener('scroll', () => {
    if (document.body.dataset.stage === '3' && !layoutFrameId) layoutFrameId = window.requestAnimationFrame(() => { layoutFrameId = 0; paintDial(); });
  }, { passive: true });
  window.addEventListener('pagehide', () => { window.cancelAnimationFrame(animationId); window.cancelAnimationFrame(layoutFrameId); layoutFrameId = 0; });
  reduce.addEventListener('change', () => snapDial(selected));
  showArchive(0);
  paintDial();
}

/** @returns {void} */
function mountArchiveDialog() {
  const dialog = document.querySelector('#detail-dialog');
  const content = document.querySelector('#detail-content');
  const close = document.querySelector('#detail-close');
  if (!(dialog instanceof HTMLDialogElement) || !(content instanceof HTMLElement) || !(close instanceof HTMLButtonElement)) throw new TypeError('Archive details require a native dialog and a close control.');
  for (const button of document.querySelectorAll('[data-dialog]')) {
    if (!(button instanceof HTMLButtonElement)) throw new TypeError('Archive detail controls must be buttons.');
    button.addEventListener('click', () => {
      const template = document.getElementById(button.dataset.dialog ?? '');
      if (!(template instanceof HTMLTemplateElement)) throw new TypeError(`Missing archive detail template: ${button.dataset.dialog}`);
      content.replaceChildren(template.content.cloneNode(true));
      const heading = content.querySelector('h2');
      if (!(heading instanceof HTMLHeadingElement)) throw new TypeError('Archive detail templates require a heading.');
      heading.id = 'detail-title';
      dialog.showModal();
    });
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
}

window.addEventListener('zhihang:content-ready', () => {
  mountStory();
  mountDial();
  mountArchiveDialog();
}, {once: true});
window.addEventListener('pagehide', settleAllArchivePanels);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', settleAllArchivePanels);
new MutationObserver(() => { if (document.body.dataset.motionState === 'paused') settleAllArchivePanels(); }).observe(document.body, {attributes:true,attributeFilter:['data-motion-state']});
