const form = document.querySelector('#contact-form');
const button = form.querySelector('button[type=submit]');
const status = document.querySelector('#contact-status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (button.disabled) return;
  const fields = new URLSearchParams(new FormData(form));
  status.hidden = false;
  if (!fields.get('cf-turnstile-response')) {
    status.textContent = 'Please wait for the security check, then try again.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Sending...';
  try {
    const response = await fetch(form.action, { method: 'POST', body: fields });
    status.textContent = (await response.text()).trim();
    if (response.ok) form.reset();
  } catch {
    status.textContent = 'We could not confirm delivery. Please email contact@datahack.org.il.';
  } finally {
    window.turnstile?.reset();
    button.disabled = false;
  }
});
