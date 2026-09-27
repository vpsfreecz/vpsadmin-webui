import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { resolvePlaywrightCli } from './playwright-cli.mjs';

function fixture(t, { pin = '1.61.0', lock = '1.61.0', installed = '1.61.0' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-cli-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'e2e'));
  fs.mkdirSync(path.join(root, 'node_modules/@playwright/test'), { recursive: true });
  fs.writeFileSync(path.join(root, 'e2e/PLAYWRIGHT_VERSION'), `${pin}\n`);
  fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/@playwright/test': { version: lock } } }));
  fs.writeFileSync(path.join(root, 'node_modules/@playwright/test/package.json'), JSON.stringify({ version: installed }));
  fs.writeFileSync(path.join(root, 'node_modules/@playwright/test/cli.js'), '');
  return root;
}

test('uses the installed CLI only when pin, lock and installed package agree', t => {
  const root = fixture(t);
  assert.equal(resolvePlaywrightCli(root), path.join(root, 'node_modules/@playwright/test/cli.js'));
  assert.throws(() => resolvePlaywrightCli(root, '1.60.0'), /Playwright version mismatch/);
});

test('rejects drift between the version file, lock and installed package', t => {
  for (const versions of [{ pin: '1.60.0' }, { lock: '1.60.0' }, { installed: '1.60.0' }]) {
    const root = fixture(t, versions);
    assert.throws(() => resolvePlaywrightCli(root), /Playwright version mismatch/);
  }
});

test('rejects a missing local CLI', t => {
  const root = fixture(t);
  fs.rmSync(path.join(root, 'node_modules/@playwright/test/cli.js'));
  assert.throws(() => resolvePlaywrightCli(root), /Playwright CLI is missing/);
});
