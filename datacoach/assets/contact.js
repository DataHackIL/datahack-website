(() => {
  const sitekey = '0x4AAAAAAGG1-qTJDZKK7qdk';
  const statuses = new WeakMap();
  function status(form, text) {
    if (!statuses.has(form)) {
      const existing = form.querySelector('[id="comp-jxbob617"],[id="comp-jtshg6l3"]');
      const out = existing || document.createElement('p');
      out.setAttribute('role', 'status');
      out.classList.add('dc-form-status');
      out.style.cssText += ';visibility:visible!important;opacity:1!important;font:16px/1.35 Arial,sans-serif;text-align:center;';
      if (!existing) form.after(out);
      statuses.set(form, out);
    }
    statuses.get(form).textContent = text;
  }
  let loading;
  function loadChallenge() {
    if (!loading) loading = new Promise((resolve, reject) => {
      const js = document.createElement('script');
      window.datacoachChallengeReady = resolve;
      js.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=datacoachChallengeReady';
      js.onerror = () => { loading = null; reject(new Error('unavailable')); };
      document.head.append(js);
    });
    return loading;
  }
  for (const form of document.forms) {
    form.method = 'post';
    const message = form.querySelector('textarea');
    const email = form.querySelector('input[type=email]');
    if (!email) continue;
    email.required = true;
    email.maxLength = 254;
    if (!message) {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.reportValidity() || form.dataset.sending) return;
        form.dataset.sending = 'true';
        const button = form.querySelector('button');
        button.disabled = true;
        try {
          const response = await fetch(form.action, {method: 'POST', credentials: 'omit',
            body: new URLSearchParams(new FormData(form)), signal: AbortSignal.timeout(15000)});
          const result = await response.json();
          if (!response.ok || result.success !== true) throw new Error('Signup not acknowledged');
          form.reset();
          status(form, 'Check your email to confirm your DataCoach subscription.');
        } catch {
          status(form, 'We could not confirm your request. ');
          const fallback = document.createElement('a');
          fallback.href = form.action; fallback.textContent = 'Open the DataCoach signup form.';
          statuses.get(form).append(fallback);
        } finally {
          delete form.dataset.sending; button.disabled = false;
        }
      });
      continue;
    }
    form.action = '/api/contact';
    const name = form.querySelector('[name="your-name"]');
    const subject = form.querySelector('[name=subject]');
    name.maxLength = 100; name.required = true;
    subject.maxLength = 150;
    message.maxLength = 3800; message.required = true;
    let widget, waiting;
    const prepare = () => {
      if (!waiting) waiting = loadChallenge().then(() => {
        const slot = document.createElement('div');
        form.after(slot);
        widget = turnstile.render(slot, { sitekey, action: 'contact', appearance: 'interaction-only' });
      }).catch(() => { waiting = null; status(form, 'Security check unavailable. Please email contact@datahack.org.il.'); });
      return waiting;
    };
    form.addEventListener('focusin', prepare, { once: true });
    const onScreen = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { onScreen.disconnect(); prepare(); }
    });
    onScreen.observe(form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity() || form.dataset.sending) return;
      await prepare();
      const proof = widget !== undefined && window.turnstile?.getResponse(widget);
      if (!proof) { status(form, 'Please complete the security check and try again.'); return; }
      form.dataset.sending = 'true';
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const res = await fetch('/api/contact', { method: 'POST', body: new URLSearchParams({
          name: name.value, email: email.value, subject: subject.value,
          message: message.value, 'cf-turnstile-response': proof,
        }) });
        status(form, (await res.text()).trim());
        if (res.ok) form.reset();
      } catch { status(form, 'Delivery could not be confirmed. Please email contact@datahack.org.il.'); }
      finally { turnstile.reset(widget); delete form.dataset.sending; button.disabled = false; }
    });
  }
})();
