const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(fetch) {
  const fields = { 'input[aria-label="Name"]': {}, 'input[type="email"]': {}, 'button[data-hook="submit-button"]': {} };
  const form = {
    fields, added: [], querySelector: key => fields[key],
    append(node) { this.added.push(node); },
    addEventListener(type, fn) { assert.equal(type, 'submit'); this.submit = fn; },
    reportValidity() { return true; }, reset() { this.resetCalled = true; },
  };
  const document = {
    querySelectorAll: () => [form],
    createElement: tag => ({ tag, style: {}, children: [], setAttribute() {}, append(...items) { this.children.push(...items); } }),
  };
  vm.runInNewContext(fs.readFileSync(__dirname + '/newsletter.js', 'utf8'), {
    document, fetch, URLSearchParams, FormData: class { constructor() { return new URLSearchParams(); } }, AbortSignal,
  });
  return form;
}

test('only an acknowledged response produces confirmation', async () => {
  let request;
  const form = setup(async (...args) => { request = args; return { ok: true, json: async () => ({ success: true }) }; });
  let prevented = false;
  await form.submit({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.match(request[0], /sibforms\.com\/serve\/.*\?isAjax=1$/);
  assert.equal(request[1].method, 'POST');
  assert.equal(form.fields['input[aria-label="Name"]'].name, 'FIRSTNAME');
  assert.equal(form.fields['input[aria-label="Name"]'].required, false);
  assert.equal(form.fields['input[type="email"]'].required, true);
  assert.equal(form.resetCalled, true);
  assert.match(form.added.at(-1).textContent, /check your email/i);
  assert.equal(form.fields['button[data-hook="submit-button"]'].disabled, false);
});

for (const [label, fetch] of [
  ['provider rejection', async () => ({ ok: true, json: async () => ({ success: false }) })],
  ['HTTP failure', async () => ({ ok: false, json: async () => ({ success: true }) })],
  ['network failure', async () => { throw new Error('offline'); }],
  ['invalid JSON', async () => ({ ok: true, json: async () => { throw new Error('invalid'); } })],
]) {
  test(label + ' reports uncertainty and links to hosted form', async () => {
    const form = setup(fetch);
    await form.submit({ preventDefault() {} });
    const status = form.added.at(-1);
    assert.match(status.textContent, /could not confirm/i);
    assert.match(status.children[0].href, /^https:\/\/5f6f5ce8\.sibforms\.com\/serve\//);
    assert.equal(form.resetCalled, undefined);
    assert.equal(form.fields['button[data-hook="submit-button"]'].disabled, false);
  });
}
