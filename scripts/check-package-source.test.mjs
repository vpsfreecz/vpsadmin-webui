import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkPackageSource } from './check-package-source.mjs';

const required = [
  'package.json', 'package-lock.json', 'vite.config.ts', 'build/buildInfo.ts',
  'bff/package.json', 'bff/package-lock.json', 'docs/design/README.md',
  'docs/design/IMPLEMENTATION_INVENTORY.md', 'public/config.local.js.example',
  'scripts/audit-design-docs.mjs', 'scripts/design-inventory.mjs',
  'src/routes/router.tsx', 'src/lib/api/haveapi.ts', 'UI_REDESIGN.md',
];

function fixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'webui-package-source-'));
  try {
    for (const relative of required) {
      const file = path.join(root, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'fixture\n');
    }
    callback(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('accepts a Gitless complete source with the linked local configuration example', () => {
  fixture((root) => assert.equal(checkPackageSource(root).requiredFiles, required.length));
});

test('rejects missing documentation and routes instead of hiding audit inputs', () => {
  fixture((root) => {
    fs.rmSync(path.join(root, 'docs/design/IMPLEMENTATION_INVENTORY.md'));
    assert.throws(() => checkPackageSource(root), /Missing source file: docs\/design\/IMPLEMENTATION_INVENTORY.md/);
  });
});

test('rejects generated, private and symlink entries', () => {
  fixture((root) => {
    fs.mkdirSync(path.join(root, 'node_modules'));
    fs.writeFileSync(path.join(root, '.env.production'), 'secret');
    fs.symlinkSync(path.join(root, 'package.json'), path.join(root, 'linked-package.json'));
    assert.throws(() => checkPackageSource(root), (error) => {
      assert.match(error.message, /Generated directory in source: node_modules/);
      assert.match(error.message, /Private environment\/configuration file in source: .env.production/);
      assert.match(error.message, /Source symlink is not supported: linked-package.json/);
      return true;
    });
  });
});

test('rejects an external source symlink before a build can follow it', () => {
  fixture((root) => {
    const external = path.join(os.tmpdir(), `webui-external-${path.basename(root)}`);
    fs.writeFileSync(external, 'external content');
    try {
      fs.symlinkSync(external, path.join(root, 'docs/design/external.md'));
      assert.throws(() => checkPackageSource(root), /Source symlink is not supported: docs\/design\/external.md/);
    } finally {
      fs.rmSync(external, { force: true });
    }
  });
});
