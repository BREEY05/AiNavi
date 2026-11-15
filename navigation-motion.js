// @ts-check

/** @returns {boolean} */
function pageMotionDisabled() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches || document.body?.dataset.motionState === 'paused';
}

window.addEventListener('pageswap', event => {
  if (pageMotionDisabled()) event.viewTransition?.skipTransition();
});
window.addEventListener('pagereveal', event => {
  const transition = event.viewTransition;
  if (!transition) return;
  const fullIntro = location.pathname.endsWith('/join.html') && localStorage.getItem('zhihang.phase2.creation-intro.seen') !== 'seen';
  if (pageMotionDisabled() || fullIntro) { transition.skipTransition(); return; }
  const activation = window.navigation?.activation;
  if (activation?.from && activation.from.index > activation.entry.index) transition.types.add('backward');
  transition.ready.then(() => {
    // Let SVG rasterization finish before it can consume the fade timeline.
    const animations = document.getAnimations().filter(animation => animation.effect instanceof KeyframeEffect && animation.effect.pseudoElement?.startsWith('::view-transition-'));
    for (const animation of animations) { animation.pause(); animation.currentTime = 0; }
    let frame = 0;
    /** @returns {void} */
    function revealPreparedPage() {
      frame = requestAnimationFrame(() => {
        for (const animation of animations) if (animation.playState === 'paused') animation.play();
      });
    }
    const paint = new PerformanceObserver(entries => {
      if (entries.getEntries().some(entry => entry.name === 'first-contentful-paint')) {
        paint.disconnect();
        revealPreparedPage();
      }
    });
    if (PerformanceObserver.supportedEntryTypes.includes('paint') && performance.getEntriesByName('first-contentful-paint').length === 0) paint.observe({type:'paint',buffered:true});
    else revealPreparedPage();
    transition.finished.then(() => { paint.disconnect(); cancelAnimationFrame(frame); });
  }, error => {
    if (!(error instanceof DOMException) || error.name !== 'AbortError') throw error;
  });
});

/** @returns {void} */
function interruptPageTransition() { document.activeViewTransition?.skipTransition(); }
window.addEventListener('pointerdown', interruptPageTransition, {passive:true});
window.addEventListener('wheel', interruptPageTransition, {passive:true});
window.addEventListener('touchstart', interruptPageTransition, {passive:true});
window.addEventListener('keydown', interruptPageTransition);

/** @returns {void} */
function mountNavigationPrefetch() {
  const shared = ['navigation-motion.js','demo.css','story.css','global-nav.css','demo.js','global-nav.js'];
  /** @type {ReadonlyMap<string, ReadonlyArray<string>>} */
  const assets = new Map([
    ['index.html', [...shared, 'story.js']],
    ['about.html', [...shared, 'phase2.css', 'phase2.js']],
    ['members.html', [...shared, 'phase2.css', 'phase2.js']],
    ['join.html', [...shared, 'phase2.css', 'join-halo.js', 'phase2.js']],
    ['login.html', ['navigation-motion.js','global-nav.css','styles.css','auth.css','archive-placeholder.css','site-data.js','auth.js']],
  ]);
  const directory = new URL('./', location.href);
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  const requested = new Set([...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(node => {
    if (node instanceof HTMLScriptElement) return node.src;
    if (node instanceof HTMLLinkElement) return node.href;
    throw new TypeError('Navigation assets must be script or stylesheet elements.');
  }));

  /** @param {URL} url @returns {void} */
  function prefetchResource(url) {
    if (requested.has(url.href)) return;
    requested.add(url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = url.href;
    hint.dataset.navigationPrefetch = 'loading';
    hint.addEventListener('load', () => { hint.dataset.navigationPrefetch = 'ready'; }, {once:true});
    hint.addEventListener('error', () => {
      hint.dataset.navigationPrefetch = 'failed';
      console.error('navigation_prefetch_failed', {url:url.href, reason:'The browser could not fetch this navigation resource.'});
    }, {once:true});
    document.head.append(hint);
  }

  /** @param {HTMLAnchorElement} link @returns {void} */
  function prepareDestination(link) {
    if (link.hasAttribute('download') || link.target === '_blank') return;
    const url = new URL(link.href);
    const file = url.pathname.split('/').pop() || 'index.html';
    const resources = assets.get(file);
    if (url.origin !== location.origin || new URL('./', url).href !== directory.href || file === currentFile || !resources) return;
    url.hash = '';
    prefetchResource(url);
    for (const resource of resources) prefetchResource(new URL(resource, directory));
  }

  /** @param {Event} event @returns {void} */
  function prepareFromIntent(event) {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (link instanceof HTMLAnchorElement) prepareDestination(link);
  }
  document.addEventListener('pointerover', prepareFromIntent, {passive:true});
  document.addEventListener('pointerdown', prepareFromIntent, {passive:true});
  document.addEventListener('focusin', prepareFromIntent);
  /** @returns {void} */
  function prepareNavigation() {
    for (const link of document.querySelectorAll('.main-nav a[href],.auth-brand[href]')) {
      if (link instanceof HTMLAnchorElement) prepareDestination(link);
    }
  }
  window.addEventListener('load', () => {
    requestIdleCallback(prepareNavigation, {timeout:2000});
  }, {once:true});
}

document.addEventListener('DOMContentLoaded', mountNavigationPrefetch, {once:true});
