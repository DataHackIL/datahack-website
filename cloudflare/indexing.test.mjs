import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from './functions/_middleware.js';

test('indexing and redirect policy is host and method specific', async () => {
  for (const [host, method, status, robots] of [
    ['datahack.org.il', 'GET', 200, null],
    ['datahack-org-preview.pages.dev', 'GET', 200, 'noindex, nofollow'],
    ['random.pages.dev', 'GET', 200, 'noindex, nofollow'],
    ['www.datahack.org.il', 'GET', 308, null],
    ['www.datahack.org.il', 'HEAD', 308, null],
    ['www.datahack.org.il', 'POST', 200, 'noindex, nofollow'],
  ]) {
    const request = new Request(`https://${host}/team?x=1`, { method });
    const response = await onRequest({ request, next: async () => new Response('ok') });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('X-Robots-Tag'), robots);
    if (status === 308) assert.equal(response.headers.get('Location'), 'https://datahack.org.il/team?x=1');
  }
});
