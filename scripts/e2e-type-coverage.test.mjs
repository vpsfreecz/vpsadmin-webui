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

test('the real compiler import closure contains exactly 53 adopted E2E files', () => {
  assert.deepEqual(auditE2eTypeCoverage(repo), { errors: [], adopted: 53, deferred: 205 });
