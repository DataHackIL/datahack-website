(() => {
  'use strict';

  const all = (root, selector) => Array.from(root.querySelectorAll(selector));
  const activate = (element, handler) => {
    element.addEventListener('click', handler);
    if (element.tagName !== 'BUTTON' && element.getAttribute('role') === 'button') {
      element.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handler(event);
        }
      });
    }
  };

  function menu(root) {
    const toggle = root.querySelector('#MENU_AS_CONTAINER_TOGGLE');
    const panel = root.querySelector('#MENU_AS_CONTAINER');
    if (!toggle || !panel) return;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '\u00d7';
    close.setAttribute('aria-label', 'Close navigation menu');
    Object.assign(close.style, { position: 'absolute', top: '12px', right: '16px', zIndex: '10', border: '0', background: 'transparent', fontSize: '32px', cursor: 'pointer' });
    panel.querySelector('#container-MENU_AS_CONTAINER')?.append(close);
    toggle.setAttribute('aria-expanded', 'false');
    const setOpen = open => {
      panel.toggleAttribute('data-undisplayed', !open);
      panel.style.setProperty('display', open ? 'block' : 'none', 'important');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (open) panel.querySelector('a,button')?.focus();
      else toggle.focus();
    };
    activate(toggle, () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    close.addEventListener('click', () => setOpen(false));
    panel.querySelector('#overlay-MENU_AS_CONTAINER')?.addEventListener('click', () => setOpen(false));
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    });
    panel.addEventListener('click', event => {
      if (event.target.closest('a')) setOpen(false);
    });
  }

  function curriculum(root) {
    const button = root.querySelector('#comp-lwric6go5 button');
    const description = root.querySelector('#comp-lwric6gp4');
    if (!button || !description) return;
    button.setAttribute('aria-expanded', 'true');
    const label = button.querySelector('[data-testid="stylablebutton-label"]');
    if (label) label.textContent = 'Read Less';
    button.setAttribute('aria-label', 'Read Less');
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      description.hidden = !open;
      description.style.display = open ? '' : 'none';
      const text = open ? 'Read Less' : 'Read More';
      button.setAttribute('aria-label', text);
      if (label) label.textContent = text;
    });
  }

  function slideshow(region) {
    const wrapper = region.querySelector('[data-testid="slidesWrapper"]');
    if (!wrapper) return;
    const slides = Array.from(wrapper.children);
    if (slides.length < 2) return;
    const dots = all(region, 'a[href*="#"]');
    let index = Math.max(0, slides.findIndex(slide => !slide.hidden && getComputedStyle(slide).display !== 'none'));
    const show = next => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.hidden = i !== index;
        slide.style.display = i === index ? '' : 'none';
        if (i === index) {
          slide.style.opacity = '1';
          slide.style.transform = 'none';
          slide.style.visibility = 'visible';
        }
        slide.setAttribute('aria-hidden', String(i !== index));
      });
      dots.forEach(dot => dot.setAttribute('aria-current', String(dot.hash.slice(1) === slides[index].id)));
    };
    region.querySelector('[data-testid="prevButton"]')?.addEventListener('click', () => show(index - 1));
    region.querySelector('[data-testid="nextButton"]')?.addEventListener('click', () => show(index + 1));
    dots.forEach(dot => dot.addEventListener('click', event => {
      const target = slides.findIndex(slide => slide.id === dot.hash.slice(1));
      if (target >= 0) { event.preventDefault(); show(target); }
    }));
    show(index);
  }

  function faq(root) {
    all(root, '[data-hook="faq-root"]').forEach(widget => {
      const tabs = all(widget, '[role="tab"]');
      const items = all(widget, '[data-interaction-faq-item]');
      const search = widget.querySelector('input[data-hook="faq-search"]');
      let category = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
      if (category < 0) category = 0;
      const filter = () => {
        const query = (search?.value || '').trim().toLocaleLowerCase();
        items.forEach(item => {
          const itemCategory = item.dataset.faqCategory;
          const matchesCategory = query || itemCategory === String(category);
          const visible = matchesCategory && item.textContent.toLocaleLowerCase().includes(query);
          item.hidden = !visible;
          item.style.display = visible ? '' : 'none';
        });
      };
      tabs.forEach((tab, i) => {
        const select = () => {
          category = i;
          tabs.forEach((other, j) => {
            other.setAttribute('aria-selected', String(i === j));
            other.setAttribute('data-tab-active', String(i === j));
            other.tabIndex = i === j ? 0 : -1;
            other.classList.toggle('oW7Yi2b--isActive', i === j);
          });
          all(widget, '[role="tabpanel"]').forEach((panel, j) => { panel.hidden = i !== j; });
          filter();
        };
        tab.addEventListener('click', select);
        tab.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const next = (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next].focus(); tabs[next].click();
          }
        });
      });
      items.forEach(item => {
        const button = item.querySelector('[data-hook="accordion-item-header"]');
        const content = item.querySelector('[data-hook="accordion-item-content"]');
        if (!button || !content) return;
        button.addEventListener('click', () => {
          const open = button.getAttribute('aria-expanded') !== 'true';
          button.setAttribute('aria-expanded', String(open));
          content.setAttribute('aria-hidden', String(!open));
          const fade = content.parentElement;
          const container = fade?.parentElement;
          if (fade) fade.style.opacity = open ? '1' : '0';
          if (container) { container.style.height = open ? 'auto' : '0px'; container.style.overflow = 'hidden'; }
        });
      });
      search?.addEventListener('input', filter);
      filter();
    });
  }

  function initialize(data) {
    all(document, '.capture-desktop, .capture-mobile').forEach(root => {
      const mobile = root.classList.contains('capture-mobile');
      const captured = data?.[mobile ? 'mobile' : 'desktop'];
      if (captured) {
        Object.entries(captured.slides).forEach(([id, slides]) => {
          const wrapper = root.querySelector('#' + id + ' [data-testid="slidesWrapper"]');
          if (!wrapper) return;
          wrapper.innerHTML = slides.join('');
          all(wrapper, 'a[href]').forEach(link => {
            try {
              const url = new URL(link.href);
              if (url.hostname === 'www.datacoach.org.il' || url.hostname === 'datacoach.org.il') {
                link.href = url.pathname + url.search + url.hash;
              }
            } catch (_) { /* Keep the captured link unchanged. */ }
          });
        });
        const widget = root.querySelector('[data-hook="faq-root"]');
        const accordion = widget?.querySelector('[data-hook^="accordion-one-column-"]');
        if (accordion) {
          accordion.innerHTML = '';
          const categories = [captured.faq[0], data.desktop.faq[1]];
          categories.forEach((items, category) => items.forEach(html => {
            const item = document.createElement('div');
            item.dataset.interactionFaqItem = '';
            item.dataset.faqCategory = String(category);
            item.innerHTML = html;
            accordion.append(item);
          }));
        }
      }
      menu(root);
      curriculum(root);
      all(root, '[aria-label="Slideshow"]').forEach(slideshow);
      faq(root);
    });
  }
  const source = document.currentScript?.src || '/assets/site.js';
  const dataScript = document.createElement('script');
  dataScript.src = new URL('interaction-data.js', source).href;
  dataScript.onload = () => initialize(window.DataCoachInteractions);
  dataScript.onerror = () => initialize(null);
  document.head.append(dataScript);
})();
