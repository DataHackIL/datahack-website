const inbox = 'contact@datahack.org.il';

function reply(text, status) {
  return new Response(text + '\n', {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return reply('Please submit from the DataHack website.', 403);
  }
  const size = Number(request.headers.get('Content-Length'));
  if (!size || size > 24000) return reply('Invalid message size.', 413);
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) {
    return reply('Unsupported form encoding.', 415);
  }
  const form = new URLSearchParams(await request.text());
  const field = (key) => (form.get(key) ?? '').trim();
  const name = field('name');
  const email = field('email');
  const message = field('message');
  if (field('website')) return reply('Invalid submission.', 400);
  if (!name || name.length > 100 || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message || message.length > 4000) {
    return reply('Please check your name, email address and message.', 400);
  }
  if (!env.CONTACT_WEBHOOK || !env.CONTACT_TOKEN) {
    return reply('The contact form is not available yet. Please email ' + inbox + '.', 503);
  }
  let stage = 'configuration';
  try {
    const endpoint = new URL(env.CONTACT_WEBHOOK);
    if (endpoint.origin !== 'https://script.google.com' ||
        !/^\/macros\/s\/[\w-]+\/exec$/.test(endpoint.pathname) || endpoint.search || endpoint.hash) {
      throw new Error('Invalid Apps Script endpoint');
    }
    const signal = AbortSignal.timeout(10000);
    stage = 'relay-request';
    let result = await fetch(endpoint, {
      method: 'POST', redirect: 'manual', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: env.CONTACT_TOKEN, name, email, message }),
    });
    stage = 'relay-status-' + result.status;
    if ([302, 303].includes(result.status)) {
      const location = new URL(result.headers.get('Location'));
      if (location.origin !== 'https://script.googleusercontent.com') throw new Error('Unexpected redirect');
      stage = 'relay-result-request';
      result = await fetch(location.href, { method: 'GET', redirect: 'manual', signal });
    }
    stage = 'relay-result-status-' + result.status;
    if (!result.ok || (await result.json()).ok !== true) throw new Error('Delivery rejected');
    return reply('Thanks. Your message was sent to DataHack.', 200);
  } catch {
    console.warn('Contact delivery failed at ' + stage);
    return reply('We could not send your message. Please email ' + inbox + '.', 502);
  }
}
