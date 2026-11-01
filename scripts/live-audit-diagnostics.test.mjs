import assert from 'node:assert/strict';
import test from 'node:test';
import { diagnosticKind, responseMetadata } from './live-audit-diagnostics.mjs';

test('live response evidence excludes URL credentials, queries, fragments and bodies', () => {
  const raw = 'https://user:dummy-password@dev.crucio.cz/v7.0/users/42?access_token=dummy-token#dummy-fragment';
  assert.deepEqual(responseMetadata(raw, 403, 'application/json; charset=utf-8'), {
    url: 'https://dev.crucio.cz/v7.0/users/42', status: 403, contentType: 'application/json',
  });
  for (const rawUrl of ['not a URL dummy-token', 'data:text/plain,dummy-password']) {
    assert.equal(responseMetadata(rawUrl, 500, '').url, '[invalid URL]');
  }
});

test('error evidence retains a bounded category without message, stack or custom free-form text', () => {
  const error = new TypeError('dummy-password and dummy-token');
  assert.equal(diagnosticKind(error), 'TypeError');
  assert.equal(diagnosticKind({ name: 'dummy-password', message: 'secret' }), 'Error');
  assert.equal(diagnosticKind({ name: 'A'.repeat(61) }), 'Error');
  assert.equal(diagnosticKind(null), 'Error');
});
