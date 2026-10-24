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
  'packages/haveapi-client-provenance.json',
];

function fixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'webui-package-source-'));
  try {
    for (const relative of required) {
      const file = path.join(root, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, 'fixture\n');
    }
    const provenance = JSON.parse(fs.readFileSync(new URL('../packages/haveapi-client-provenance.json', import.meta.url)));
    const xhr = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url))).packages['node_modules/xmlhttprequest'];
    const dependencies = { 'haveapi-client': provenance.version };
    fs.writeFileSync(path.join(root, 'packages/haveapi-client-provenance.json'), JSON.stringify(provenance));
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies }));
    fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify({ packages: {
      '': { dependencies },
      'node_modules/haveapi-client': {
        version: provenance.version, resolved: provenance.resolved, integrity: provenance.integrity,
        dependencies: { xmlhttprequest: 'latest' },
      },
      'node_modules/xmlhttprequest': xhr,
    } }));
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

test('rejects a substituted HaveAPI archive or integrity', () => {
  for (const [field, value] of [['resolved', 'file:vendor/client.tgz'], ['integrity', 'sha512-changed']]) {
    fixture((root) => {
      const file = path.join(root, 'package-lock.json');
      const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
      lock.packages['node_modules/haveapi-client'][field] = value;
      fs.writeFileSync(file, JSON.stringify(lock));
      assert.throws(() => checkPackageSource(root), /HaveAPI registry dependency, lock and provenance disagree/);
    });
  }
});

test('rejects floating or substituted HaveAPI transitive transport', () => {
  fixture((root) => {
    const file = path.join(root, 'package-lock.json');
    const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
    delete lock.packages['node_modules/xmlhttprequest'].integrity;
    fs.writeFileSync(file, JSON.stringify(lock));
    assert.throws(() => checkPackageSource(root), /transitive XMLHttpRequest must retain its exact registry lock/);
  });
});
