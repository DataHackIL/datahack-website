import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost } from './functions/api/contact.js';

const origin = 'https://example.test';
function submit(fields, env = {}, from = origin) {
  const body = new URLSearchParams(fields);
  return onRequestPost({
    request: new Request(origin + '/api/contact', {
      method: 'POST', body,
      headers: { Origin: from, 'Content-Length': String(body.toString().length) },
    }),
    env,
  });
}
const message = { name: 'Test', email: 'test@example.test', message: 'Delivery check' };

test('rejects cross-origin, honeypot and malformed submissions', async () => {
  assert.equal((await submit(message, {}, 'https://other.test')).status, 403);
  assert.equal((await submit({ ...message, website: 'spam' })).status, 400);
  assert.equal((await submit({ ...message, email: 'invalid' })).status, 400);
});
test('does not claim success without a delivery configuration', async () => {
  assert.equal((await submit(message)).status, 503);
});
test('only acknowledges successful handoff to the configured relay', async (t) => {
  const env = { CONTACT_WEBHOOK: 'https://script.google.com/macros/s/test/exec', CONTACT_TOKEN: 'test-only' };
  const relay = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.href, env.CONTACT_WEBHOOK);
    assert.deepEqual(JSON.parse(options.body), { token: 'test-only', ...message });
    return Response.json({ ok: true });
  });
  assert.equal((await submit(message, env)).status, 200);
  assert.equal(relay.mock.callCount(), 1);
  relay.mock.mockImplementation(async () => Response.json({ ok: false }));
  assert.equal((await submit(message, env)).status, 502);
});

test('follows the Apps Script output redirect without forwarding the submission', async (t) => {
  const env = { CONTACT_WEBHOOK: 'https://script.google.com/macros/s/test/exec', CONTACT_TOKEN: 'test-only' };
  let seen = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (++seen === 1) return Response.redirect('https://script.googleusercontent.com/test', 302);
    assert.equal(new URL(url).origin, 'https://script.googleusercontent.com');
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    return Response.json({ ok: true });
  });
  assert.equal((await submit(message, env)).status, 200);
  assert.equal(seen, 2);
});

test('does not follow a relay redirect to another origin', async (t) => {
  const env = { CONTACT_WEBHOOK: 'https://script.google.com/macros/s/test/exec', CONTACT_TOKEN: 'test-only' };
  const relay = t.mock.method(globalThis, 'fetch', async () =>
    Response.redirect('https://other.test/unexpected', 302));
  assert.equal((await submit(message, env)).status, 502);
  assert.equal(relay.mock.callCount(), 1);
});
