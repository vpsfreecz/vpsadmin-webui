import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  checkCoverage,
  ELIGIBLE_ROOTS,
  eligiblePaths,
  formatAdopted,
  lintAdopted,
  sourceHash,
} from './scoped-quality.mjs';

const configFile = fileURLToPath(new URL('../eslint.config.mjs', import.meta.url));
const repoRoot = fileURLToPath(new URL('../', import.meta.url));

describe('scoped source quality gates', () => {
  let root;
  before(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'webui-quality-'));
    await Promise.all(ELIGIBLE_ROOTS.map((directory) => fs.mkdir(path.join(root, directory), { recursive: true })));
  });
  after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function write(relativePath, contents) {
    await fs.writeFile(path.join(root, relativePath), contents);
  }

  it('rejects a missing React Hook dependency', async () => {
    const pathname = 'src/lib/hooks/MissingDependency.tsx';
    await write(
      pathname,
      'import { useEffect } from "react"; export function Example({ value }) { useEffect(() => { console.log(value); }, []); return null; }'
    );
    await assert.rejects(lintAdopted(root, [pathname], configFile), /react-hooks\/exhaustive-deps/);
    await fs.rm(path.join(root, pathname));
  });

  it('rejects a clickable control without keyboard handling', async () => {
    const pathname = 'src/components/ui/Inaccessible.tsx';
    await write(pathname, 'export function Inaccessible() { return <div onClick={() => {}}>Open</div>; }');
    await assert.rejects(lintAdopted(root, [pathname], configFile), /jsx-a11y\/click-events-have-key-events/);
    await fs.rm(path.join(root, pathname));
  });

  it('rejects invalid ARIA and an unassociated form label', async () => {
    const pathname = 'src/components/ui/InvalidForm.tsx';
    await write(
      pathname,
      'export function InvalidForm() { return <><label>Name</label><input aria-bogus="yes" /></>; }'
    );
    await assert.rejects(lintAdopted(root, [pathname], configFile), (error) => {
      assert.match(error.message, /jsx-a11y\/aria-props/);
      assert.match(error.message, /jsx-a11y\/label-has-associated-control/);
      return true;
    });
    await fs.rm(path.join(root, pathname));
  });

  it('rejects unformatted adopted source', async () => {
    const pathname = 'src/app/Unformatted.ts';
    await write(pathname, 'export const value=  1');
    await assert.rejects(formatAdopted(root, [pathname], []), /Unformatted adopted files/);
    await fs.rm(path.join(root, pathname));
  });

  it('rejects changed or new eligible source omitted from adoption in a Gitless tree', async () => {
    const adopted = 'src/app/Adopted.ts';
    const deferred = 'src/lib/auth/Deferred.ts';
    await write(adopted, 'export const adopted = true;\n');
    await write(deferred, 'export const deferred = true;\n');
    const coverage = {
      schemaVersion: 1,
      reviewedSourceRevision: 'a'.repeat(40),
      deferredOwner: 'WebUI maintainers',
      deferredRemovalCondition: 'Adopt on source change',
      eligibleRoots: ELIGIBLE_ROOTS,
      adopted: [adopted],
      deferred: { [deferred]: await sourceHash(root, deferred) },
    };
    assert.deepEqual(await checkCoverage(root, coverage), []);

    await write(deferred, 'export const deferred = false;\n');
    assert.match((await checkCoverage(root, coverage)).join('\n'), /Changed eligible source must be adopted/);
    await write(deferred, 'export const deferred = true;\n');
    const added = 'src/lib/hooks/Added.ts';
    await write(added, 'export const added = true;\n');
    assert.match((await checkCoverage(root, coverage)).join('\n'), /New eligible source must be adopted/);
    await fs.rm(path.join(root, added));
    await fs.rm(path.join(root, deferred));
    await fs.rm(path.join(root, adopted));
  });

  it('checks the same real source inventory without Git metadata', async () => {
    const archive = await fs.mkdtemp(path.join(os.tmpdir(), 'webui-quality-archive-'));
    try {
      const paths = await eligiblePaths(repoRoot);
      for (const pathname of paths) {
        const target = path.join(archive, pathname);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(path.join(repoRoot, pathname), target);
      }
      const coverage = JSON.parse(
        await fs.readFile(path.join(repoRoot, 'scripts/fixtures/lint-coverage.json'), 'utf8')
      );
      assert.deepEqual(await eligiblePaths(archive), paths);
      assert.deepEqual(await checkCoverage(repoRoot, coverage), []);
      assert.deepEqual(await checkCoverage(archive, coverage), []);
    } finally {
      await fs.rm(archive, { recursive: true, force: true });
    }
  });
});
