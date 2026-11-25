// The original mobile composition uses a 320 CSS-pixel canvas, scaled by
// the browser. Using a device-width canvas shrinks everything on wider phones.
(() => {
  const narrow = matchMedia('(max-width: 750px)').matches;
  if (narrow && navigator.maxTouchPoints > 0) {
    document.querySelector('meta[name="viewport"]').content = 'width=320, user-scalable=yes';
  }
  const apply = () => document.body.classList.toggle('device-mobile-optimized',
    matchMedia('(max-width: 750px)').matches);
  document.addEventListener('DOMContentLoaded', () => {
    apply();
    const root = document.querySelector('.capture-mobile');
    const top = root?.querySelector('[data-testid="backToTopRoot"]');
    const quick = root?.querySelector('#QUICK_ACTION_BAR');
    const contact = quick?.querySelector('[data-aid="chat"]');
    if (contact) {
      contact.href = '/contact/';
      contact.removeAttribute('role');
      contact.setAttribute('aria-label', 'Send DataCoach a message');
      quick.querySelector('button')?.addEventListener('click', () => { location.href = '/contact/'; });
    }
    if (top) {
      top.setAttribute('role', 'button'); top.tabIndex = 0;
      top.setAttribute('aria-label', 'Back to top');
      top.onclick = () => window.scrollTo(0, 0);
      top.onkeydown = e => { if (['Enter', ' '].includes(e.key)) { e.preventDefault(); top.click(); } };
      const show = () => { top.style.display = scrollY > innerHeight / 2 ? '' : 'none'; };
      show(); window.addEventListener('scroll', show, {passive:true});
    }
  }, {once: true});
  matchMedia('(max-width: 750px)').addEventListener('change', apply);
})();
