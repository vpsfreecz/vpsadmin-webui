import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { auditE2eTypeCoverage } from './e2e-type-coverage.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inventoryPath = 'scripts/fixtures/e2e-type-coverage.json';
const baselinePath = 'scripts/fixtures/e2e-type-baseline.json';
const inventory = JSON.parse(fs.readFileSync(path.join(repo, inventoryPath), 'utf8'));
const initialDeferred = inventory.deferred[0].path;
const initialAdopted = inventory.adopted[0];

function copySource(root, pathname) {
  const destination = path.join(root, pathname);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(repo, pathname), destination);
}

function fixtureRoot(withGit) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-type-coverage-'));
  for (const pathname of [...inventory.adopted, ...inventory.deferred.map((entry) => entry.path)]) {
    copySource(root, pathname);
  }
  copySource(root, inventoryPath);
  copySource(root, baselinePath);
  if (withGit) fs.mkdirSync(path.join(root, '.git'));
  return root;
}

function editInventory(root, change) {
  const filename = path.join(root, inventoryPath);
  const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
  change(value);
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function assertRejectedInBothSources(label, change, expected) {
  for (const withGit of [true, false]) {
    test(`${label} fails ${withGit ? 'checkout' : 'Gitless archive'} coverage`, () => {
      const root = fixtureRoot(withGit);
      try {
        assert.deepEqual(auditE2eTypeCoverage(root, { program: false }).errors, []);
        change(root);
        assert.match(auditE2eTypeCoverage(root, { program: false }).errors.join('\n'), expected);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
}

test('the real compiler import closure contains exactly 30 adopted E2E files', () => {
  assert.deepEqual(auditE2eTypeCoverage(repo), { errors: [], adopted: 30, deferred: 218 });
});

test('the complete gate works from a Gitless source copy with installed dependencies', () => {
  const root = fixtureRoot(false);
  try {
    copySource(root, 'tsconfig.json');
    copySource(root, 'tsconfig.e2e.json');
    copySource(root, 'src/types/vpsadmin.d.ts');
    fs.symlinkSync(path.join(repo, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    assert.deepEqual(auditE2eTypeCoverage(root), { errors: [], adopted: 30, deferred: 218 });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

assertRejectedInBothSources(
  'new source',
  (root) => {
    const pathname = path.join(root, 'e2e/specs/new.spec.ts');
    fs.writeFileSync(pathname, 'export {};\n');
  },
  /New E2E source must be adopted: e2e\/specs\/new\.spec\.ts/
);

assertRejectedInBothSources(
  'edited deferred source with a refreshed manifest hash',
  (root) => {
    const filename = path.join(root, initialDeferred);
    fs.appendFileSync(filename, '\n// new source must be adopted\n');
    editInventory(root, (value) => {
      value.deferred[0].sha256 = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    });
  },
  /Deferred E2E hash differs from initial source/
);

assertRejectedInBothSources(
  'missing adopted root',
  (root) => {
    editInventory(root, (value) => {
      value.adopted = value.adopted.filter((pathname) => pathname !== initialAdopted);
    });
  },
  /Required E2E core root is missing/
);

assertRejectedInBothSources(
  'attempted reduction below the eleven-file minimum',
  (root) => {
    editInventory(root, (value) => {
      value.adopted = value.adopted.filter((pathname) => pathname !== initialAdopted);
      value.deferred.unshift({
        path: initialAdopted,
        sha256: createHash('sha256')
          .update(fs.readFileSync(path.join(root, initialAdopted)))
          .digest('hex'),
        owner: 'WebUI maintainers',
        reason: 'unapproved downgrade',
        removalCondition: 'later',
      });
    });
  },
  /New deferred E2E path is not approved/
);

assertRejectedInBothSources(
  'deleted deferred source',
  (root) => {
    fs.rmSync(path.join(root, initialDeferred));
  },
  /Stale or deleted E2E coverage path/
);

assertRejectedInBothSources(
  'duplicate deferred entry',
  (root) => {
    editInventory(root, (value) => {
      value.deferred.splice(1, 0, { ...value.deferred[0] });
    });
  },
  /Deferred E2E paths must be sorted and unique/
);

assertRejectedInBothSources(
  'source symlink',
  (root) => {
    fs.symlinkSync(initialDeferred, path.join(root, 'e2e/specs/linked.spec.ts'));
  },
  /E2E source symlink is not allowed/
);
