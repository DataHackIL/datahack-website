(() => {
  const url = 'https://5f6f5ce8.sibforms.com/serve/MUIFAD_Xp6chqrR_yxAODllDypizhsVCkvp2Wxi4if9xndXPp7LkY3mZ1e0UCmzZVgH4DJf3ClkDfRy7NJ-U1CH6_PEUT4j6i8I1M9_jrKi0pKCJFXrU7uHY_8mp46E6_gftwsjba4hnkRdkvOkkH9CvXtgpeOA6j0L2NXrevt-MCs24z-u1jStf8vqHy0h3ZoYC1F5IR7MsbiGaOg==';
  document.querySelectorAll('form[aria-label="Subscribe 1"]').forEach(form => {
    const name = form.querySelector('input[aria-label="Name"]');
    const email = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[data-hook="submit-button"]');
    if (!name || !email || !button) return;
    form.action = url;
    form.method = 'post';
    name.name = 'FIRSTNAME';
    name.maxLength = 200;
    name.required = false;
    email.name = 'EMAIL';
    email.required = true;
    for (const [key, value] of [['locale', 'en'], ['html_type', 'simple']]) {
      const input = document.createElement('input');
      input.type = 'hidden'; input.name = key; input.value = value;
      form.append(input);
    }
    button.type = 'submit';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'font:14px/1.4 Arial,sans-serif;color:#fff;margin:8px 0;';
    form.append(status);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity() || button.disabled) return;
      button.disabled = true;
      status.textContent = 'Submitting...';
      try {
        const response = await fetch(url + '?isAjax=1', {
          method: 'POST',
          credentials: 'omit',
          body: new URLSearchParams(new FormData(form)),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (!response.ok || result.success !== true) throw new Error('Not acknowledged');
        form.reset();
        status.textContent = 'Please check your email and confirm your subscription.';
      } catch {
        status.textContent = 'We could not confirm your request. Please try again or ';
        const link = document.createElement('a');
        link.href = url;
        link.textContent = 'open the hosted signup form';
        link.style.cssText = 'color:#fff;text-decoration:underline;';
        status.append(link, '.');
      } finally {
        button.disabled = false;
      }
    });
  });
})();
