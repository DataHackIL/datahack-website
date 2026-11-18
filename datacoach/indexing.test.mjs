import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { onRequest } from './functions/_middleware.js';

async function request(url, method = 'GET') {
  let called = false;
  const response = await onRequest({
    request: new Request(url, { method }),
    next: async () => {
      called = true;
      return new Response(method === 'HEAD' ? null : 'original', {
        status: 403, headers: { 'X-Robots-Tag': 'noindex, nofollow', 'X-Test': 'kept' },
      });
    },
  });
  return { response, called };
}

test('www GET and HEAD redirect to apex with path and query intact', async () => {
  for (const method of ['GET', 'HEAD']) {
    const { response, called } = await request('https://www.datacoach.org.il/faq?x=1&x=2', method);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('Location'), 'https://datacoach.org.il/faq?x=1&x=2');
    assert.equal(called, false);
  }
});

test('POST is never redirected or replayed, and downstream response is preserved', async () => {
  for (const host of ['www.datacoach.org.il', 'datacoach.org.il', 'datacoach-review.pages.dev']) {
    const { response, called } = await request(`https://${host}/api/contact`, 'POST');
    assert.equal(called, true);
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Location'), null);
    assert.equal(response.headers.get('X-Test'), 'kept');
    assert.equal(await response.text(), 'original');
  }
});

test('only apex is indexable and nonproduction responses remain noindex', async () => {
  for (const host of ['datacoach-review.pages.dev', 'branch.datacoach-review.pages.dev', 'www.datacoach.org.il']) {
    const { response } = await request(`https://${host}/api/contact`, 'POST');
    assert.match(response.headers.get('X-Robots-Tag'), /noindex/);
  }
  const { response } = await request('https://datacoach.org.il/about');
  assert.equal(response.headers.get('X-Robots-Tag'), null);
  assert.equal(response.headers.get('X-Test'), 'kept');
});

test('apex robots allows crawling, including HEAD; previews retain static robots', async () => {
  const get = await request('https://datacoach.org.il/robots.txt');
  assert.match(await get.response.text(), /Allow: \//);
  assert.equal(get.called, false);
  const head = await request('https://datacoach.org.il/robots.txt', 'HEAD');
  assert.equal(await head.response.text(), '');
  assert.equal(head.called, false);
  assert.match(readFileSync(new URL('./design/robots.txt', import.meta.url), 'utf8'), /Disallow: \//);
  assert.equal((await request('https://datacoach-review.pages.dev/robots.txt')).called, true);
});

test('built public pages each have their own apex canonical', () => {
  for (const route of ['', 'about', 'curriculum', 'contact', 'faq']) {
    const file = new URL(`./dist/${route ? route + '/' : ''}index.html`, import.meta.url);
    const html = readFileSync(file, 'utf8');
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes(`rel="canonical" href="https://datacoach.org.il/${route ? route + '/' : ''}"`));
  }
});
