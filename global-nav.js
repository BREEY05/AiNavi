// @ts-check

/** @returns {void} */
function mountGlobalNavigation() {
  const navigation = document.querySelector('.main-nav');
  if (!(navigation instanceof HTMLElement)) throw new TypeError('Global routing requires the primary navigation.');
  const home = document.querySelector('#scroll-story') instanceof HTMLElement;
  for (const link of navigation.querySelectorAll('a')) {
    const target = new URL(link.href);
    if (target.pathname.endsWith('/index.html') && !target.hash) link.href = 'index.html#stage-sky';
  }
  /** @returns {void} */
  function highlightNavigation() {
    if (!home) return;
    const stage = document.body.dataset.stage;
    const hub = document.body.dataset.hub;
    for (const link of navigation.querySelectorAll('a')) {
      const url = new URL(link.href);
      const current = stage === '3' ? url.hash === '#stage-projects' : stage === '2' && (hub === 'events' || hub === 'notices') ? url.searchParams.get('hub') === hub : url.hash === '#stage-sky';
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a');
    if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download') || link.classList.contains('skip-link')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    if (home && url.pathname.endsWith('/index.html') && ['#stage-sky','#stage-about','#stage-hub','#stage-projects'].includes(url.hash)) {
      event.preventDefault();
      if (url.href !== location.href) history.pushState(null, '', url);
      window.dispatchEvent(new Event('zhihang:route'));
    } else if (url.pathname === location.pathname && url.search === location.search && url.hash) {
      const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      event.preventDefault();
      if (url.href !== location.href) history.pushState(null, '', url);
      const immediate = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.dataset.motionState === 'paused';
      target.scrollIntoView({behavior:immediate ? 'instant' : 'smooth',block:'start'});
      if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
      target.focus({preventScroll:true});
    }
  });
  const observer = new MutationObserver(highlightNavigation);
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-stage','data-hub'] });
  highlightNavigation();
}

mountGlobalNavigation();
