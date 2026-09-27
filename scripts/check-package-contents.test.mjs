import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkPackageContents } from './check-package-contents.mjs';

const revision = '0123456789abcdef0123456789abcdef01234567';
const runtimeFiles = JSON.parse(fs.readFileSync(new URL('../packages/bff-runtime-files.json', import.meta.url), 'utf8'));

function write(root, relative, value) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
  return target;
}

function fixture(callback, info = {
  schemaVersion: 1, commit: revision, shortCommit: revision.slice(0, 12),
  dirty: false, source: 'environment',
}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'webui-package-contents-'));
  const frontend = path.join(root, 'frontend');
  const bff = path.join(root, 'bff');
  try {
    write(frontend, 'index.html', '<script src="/assets/main.js"></script>');
    write(frontend, 'build-info.json', JSON.stringify(info));
    write(frontend, 'favicon.png', 'fixture');
    write(frontend, 'assets/main.js', 'export {};');
    write(frontend, 'assets/main.css', 'body {}');
    const wrapper = write(bff, 'bin/vpsadmin-webui-bff',
      '#!/bin/sh\nexec /nix/store/fixture-nodejs-slim-24.21.0/bin/node /lib/server.js\n');
    fs.chmodSync(wrapper, 0o755);
    write(bff, 'share/vpsadmin-webui-bff/build-info.json', JSON.stringify(info));
    write(bff, 'lib/vpsadmin-webui-bff/package.json', JSON.stringify({
      name: 'vpsadmin-webui-bff', dependencies: { express: '^4.0.0' },
    }));
    write(bff, 'lib/vpsadmin-webui-bff/node_modules/express/package.json', '{"name":"express"}');
    for (const file of runtimeFiles) {
      write(bff, `lib/vpsadmin-webui-bff/${file}`,
        file === 'server.js' ? "require('./security');\n" : '// runtime\n');
    }
    callback({ frontend, bff });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('accepts separate static and production BFF outputs with matching clean full revisions', () => {
  fixture(({ frontend, bff }) => {
    const result = checkPackageContents(frontend, bff);
    assert.equal(result.assets, 2);
    assert.equal(result.provenance.commit, revision);
  });
});

test('accepts matching dirty and revisionless outputs only as non-release builds', () => {
  for (const info of [
    { schemaVersion: 1, commit: revision, shortCommit: revision.slice(0, 12), dirty: true, source: 'environment' },
    { schemaVersion: 1, commit: 'unknown', shortCommit: 'unknown', dirty: true, source: 'unavailable' },
  ]) fixture(({ frontend, bff }) => assert.equal(checkPackageContents(frontend, bff).provenance.dirty, true), info);
});

test('rejects public config examples, source maps and symlinked public assets', () => {
  fixture(({ frontend, bff }) => {
    write(frontend, 'config.local.js.example', 'not public');
    assert.throws(() => checkPackageContents(frontend, bff), /Public root entries differ/);
    fs.rmSync(path.join(frontend, 'config.local.js.example'));
    write(frontend, 'assets/main.js.map', '{}');
    assert.throws(() => checkPackageContents(frontend, bff), /Unexpected public asset/);
    fs.rmSync(path.join(frontend, 'assets/main.js.map'));
    fs.symlinkSync(path.join(frontend, 'assets/main.js'), path.join(frontend, 'assets/linked.js'));
    assert.throws(() => checkPackageContents(frontend, bff), /Public asset symlink/);
  });
});

test('rejects test files, unlisted runtime imports and missing production dependencies', () => {
  fixture(({ frontend, bff }) => {
    write(bff, 'lib/vpsadmin-webui-bff/server.test.js', 'fixture');
    assert.throws(() => checkPackageContents(frontend, bff), /BFF runtime entries differ/);
    fs.rmSync(path.join(bff, 'lib/vpsadmin-webui-bff/server.test.js'));
    write(bff, 'lib/vpsadmin-webui-bff/server.js', "require('./missing');\n");
    assert.throws(() => checkPackageContents(frontend, bff), /Unpackaged BFF runtime import/);
    write(bff, 'lib/vpsadmin-webui-bff/server.js', "require('./security');\n");
    fs.rmSync(path.join(bff, 'lib/vpsadmin-webui-bff/node_modules/express'), { recursive: true });
    assert.throws(() => checkPackageContents(frontend, bff), /Missing production BFF dependency/);
  });
});

test('rejects mismatched revisions and a clean unknown source', () => {
  fixture(({ frontend, bff }) => {
    write(bff, 'share/vpsadmin-webui-bff/build-info.json', JSON.stringify({
      schemaVersion: 1, commit: 'fedcba9876543210fedcba9876543210fedcba98',
      shortCommit: 'fedcba987654', dirty: false, source: 'environment',
    }));
    assert.throws(() => checkPackageContents(frontend, bff), /provenance differ/);
    write(frontend, 'build-info.json', JSON.stringify({
      schemaVersion: 1, commit: 'unknown', shortCommit: 'unknown', dirty: false, source: 'unavailable',
    }));
    assert.throws(() => checkPackageContents(frontend, bff), /Clean release provenance/);
  });
});
