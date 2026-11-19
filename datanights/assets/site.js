(() => {
  document.querySelectorAll('[data-preview-disabled]').forEach(input => { input.disabled = false; });
  let previousScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    const hide = current > 0 && current > previousScroll;
    document.querySelectorAll('header .wixui-header.w2JesW').forEach(header => {
      header.classList.toggle('VHnL1N', hide);
      header.classList.toggle('NXBn1M', !hide);
    });
    previousScroll = current;
  }, { passive: true });
  document.querySelectorAll('.wixui-accordion__item').forEach(item => {
    const button = item.querySelector('button[aria-expanded]');
    const content = item.querySelector('.wixui-accordion__container');
    if (!button || !content) return;
    const initialOpen = button.getAttribute('aria-expanded') === 'true';
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      item.classList.toggle('AccordionContainer1266025101--isOpened', open);
      content.classList.toggle('AccordionContainer1266025101--isContentHidden', !open);
      const icon = button.querySelector('svg');
      if (icon) icon.style.transform = open === initialOpen ? '' : 'rotate(180deg)';
    });
  });
  const root = document.querySelector('.capture-mobile');
  if (!root) return;
  const panel = document.createElement('nav');
  panel.setAttribute('aria-label', 'Mobile navigation');
  panel.hidden = true;
  panel.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#1c105d;color:white;text-align:center;font:28px Arial,sans-serif';
  panel.innerHTML = '<button type="button" aria-label="Close menu" style="position:absolute;right:58px;top:15px;border:0;background:none;color:white;font-size:32px;cursor:pointer">&times;</button><div style="display:flex;flex-direction:column;align-items:center;gap:25px;padding-top:72px"><a href="/">HOME</a><a href="/blank">TEAM</a><a href="/blank-1">FAQ</a></div>';
  panel.querySelectorAll('a').forEach(link => { link.style.cssText = 'color:inherit;text-decoration:none'; });
  root.append(panel);
  const buttons = root.querySelectorAll('.wixui-hamburger-open-button');
  const close = () => { panel.hidden = true; buttons.forEach(button => button.setAttribute('aria-expanded', 'false')); };
  buttons.forEach(button => button.addEventListener('click', () => { panel.hidden = false; button.setAttribute('aria-expanded', 'true'); panel.querySelector('button').focus(); }));
  panel.querySelector('button').addEventListener('click', close);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
})();
