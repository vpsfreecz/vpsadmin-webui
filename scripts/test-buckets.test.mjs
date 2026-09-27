import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : entry.isFile() && entry.name.endsWith('.test.mjs') ? [full] : [];
  });
}

test('every script test belongs to exactly one nonbrowser or browser bucket', () => {
  assert.equal(scripts['test:scripts'], 'node --test scripts/*.test.mjs');
  assert.equal(scripts['test:scripts:browser'], 'node --test scripts/browser-tests/*.test.mjs');
  const all = walk(path.join(root, 'scripts')).map((file) => path.relative(root, file).replaceAll(path.sep, '/'));
  const nonbrowser = all.filter((file) => /^scripts\/[^/]+\.test\.mjs$/.test(file));
  const browser = all.filter((file) => /^scripts\/browser-tests\/[^/]+\.test\.mjs$/.test(file));
  assert.deepEqual([...nonbrowser, ...browser].sort(), all.sort());
  assert(browser.includes('scripts/browser-tests/live-vps-certification-browser-proxy.test.mjs'));
});
