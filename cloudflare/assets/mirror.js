(() => {
  'use strict';

  const anchors = {
    'anchors-ly18i8jx': ['vision', 'comp-lxx8gfc1'],
    'anchors-miq58bb4': ['programs', 'comp-mipwnkif'],
    'anchors-miq5ah6r': ['partners', 'comp-mipxfkfp'],
    'anchors-miq6zem3': ['contact', 'comp-ly5jjydz'],
  };
  const sections = Object.fromEntries(Object.values(anchors));
  const home = location.pathname === '/' || location.pathname === '/index.html';
  const focusTarget = (element) => {
    if (!element) return;
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    element.focus({ preventScroll: true });
  };
  const goToSection = (name) => {
    const section = document.getElementById(sections[name]);
    if (!section) return false;
    section.scrollIntoView({ block: 'start' });
    focusTarget(section);
    return true;
  };

  document.querySelectorAll('a[data-anchor]').forEach((link) => {
    const destination = anchors[link.dataset.anchor];
    if (!destination) return;
    link.setAttribute('href', `/#${destination[0]}`);
    link.removeAttribute('target');
  });

  const openButton = document.querySelector('.wixui-hamburger-open-button');
  const overlay = document.querySelector('[data-hook="hamburger-overlay-root"]');
  const closeButton = overlay?.querySelector('.wixui-hamburger-close-button');
  let menuOpen = false;
  let previousOverflow = '';
  let inertStates = [];
  const focusable = () => [...overlay.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter((element) => element.getClientRects().length && !element.closest('[inert], [hidden], [aria-hidden="true"]'));
  const closeMenu = (restoreFocus = true) => {
    if (!menuOpen) return;
    menuOpen = false;
    overlay.dataset.visible = 'false';
    overlay.hidden = true;
    overlay.style.display = 'none';
    openButton.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = previousOverflow;
    inertStates.forEach(([element, wasInert]) => { element.inert = wasInert; });
    inertStates = [];
    if (restoreFocus) openButton.focus();
  };
  if (openButton && overlay && closeButton) {
    if (!overlay.id) overlay.id = 'mirror-mobile-menu';
    openButton.setAttribute('aria-controls', overlay.id);
    openButton.setAttribute('aria-expanded', 'false');
    overlay.hidden = true;
    overlay.style.display = 'none';
    openButton.addEventListener('click', () => {
      if (menuOpen) return closeMenu();
      menuOpen = true;
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      inertStates = [...overlay.parentElement.children].filter((element) => element !== overlay)
        .map((element) => [element, element.inert]);
      inertStates.forEach(([element]) => { element.inert = true; });
      overlay.hidden = false;
      overlay.style.removeProperty('display');
      overlay.style.visibility = 'visible';
      overlay.style.zIndex = '9999';
      overlay.dataset.visible = 'true';
      openButton.setAttribute('aria-expanded', 'true');
      (focusable()[0] || overlay).focus();
    });
    closeButton.addEventListener('click', () => closeMenu());
    overlay.querySelector('[data-hook="hamburger-overlay-dialog"]')?.addEventListener('click', () => closeMenu());
    document.addEventListener('keydown', (event) => {
      if (!menuOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); overlay.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    });
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (menuOpen && overlay.contains(link)) closeMenu(false);
    const url = new URL(link.href, location.href);
    const name = url.hash.slice(1);
    if (home && url.origin === location.origin && url.pathname === '/' && sections[name] && goToSection(name)) {
      event.preventDefault();
      if (location.hash !== url.hash) history.pushState(null, '', `/#${name}`);
    }
  });
  const scrollHash = () => { if (home && sections[location.hash.slice(1)]) goToSection(location.hash.slice(1)); };
  window.addEventListener('hashchange', scrollHash);
  if (home && location.hash) requestAnimationFrame(scrollHash);

  document.querySelector('#SKIP_TO_CONTENT_BTN')?.addEventListener('click', () => {
    const main = document.querySelector('main');
    if (main) { main.scrollIntoView({ block: 'start' }); focusTarget(main); }
  });
  document.querySelectorAll('[data-mirror-back-to-top], a[href="#SCROLL_TO_TOP"]').forEach((control) => {
    control.addEventListener('click', (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0 });
      focusTarget(document.getElementById('SCROLL_TO_TOP') || document.querySelector('header'));
    });
  });

  const newsletter = [...document.querySelectorAll('input[type="checkbox"]')].find((input) =>
    /newsletter/i.test(input.closest('label')?.textContent || ''));
  const signup = [...document.querySelectorAll('a[href]')].find((link) =>
    link.hostname === 'datahack-il.us12.list-manage.com' && link.pathname === '/subscribe');
  if (newsletter) {
    const label = newsletter.closest('label');
    const link = document.createElement('a');
    link.href = signup?.href || 'https://datahack-il.us12.list-manage.com/subscribe?u=de6927f58980fe1c8f3b78cf7&id=d70a19b217';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Sign up for our newsletter (opens in a new tab)';
    label.replaceWith(link);
  }
})();
