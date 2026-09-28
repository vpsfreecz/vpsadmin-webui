#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const ELIGIBLE_ROOTS = ['src/app', 'src/components/ui', 'src/lib/auth', 'src/lib/hooks'];
const TOOL_FILES = [
  '.prettierrc.json',
  'bff/types/cookie-signature.d.ts',
  'eslint.config.mjs',
  'scripts/bff-queue-behavior.test.mjs',
  'scripts/bff-types.test.mjs',
  'scripts/e2e-haveapi.test.mjs',
  'scripts/e2e-type-coverage.mjs',
  'scripts/e2e-type-coverage.test.mjs',
  'scripts/e2e-types.test.mjs',
  'scripts/fixtures/e2e-type-baseline.json',
  'scripts/fixtures/e2e-type-coverage.json',
  'scripts/fixtures/e2e-types/invalid-body.ts',
  'scripts/fixtures/e2e-types/invalid-handler.ts',
  'scripts/fixtures/e2e-types/invalid-identity.ts',
  'scripts/fixtures/e2e-types/invalid-json.ts',
  'scripts/fixtures/e2e-types/invalid-option.ts',
  'scripts/fixtures/e2e-types/invalid-request.ts',
  'scripts/fixtures/e2e-types/invalid-strictness.ts',
  'scripts/fixtures/e2e-types/invalid-user.ts',
  'scripts/fixtures/e2e-types/valid.ts',
  'scripts/fixtures/bff-types/invalid-cookie.cts',
  'scripts/fixtures/bff-types/invalid-next.cts',
  'scripts/fixtures/bff-types/invalid-pending.cts',
  'scripts/fixtures/bff-types/invalid-secret.cts',
  'scripts/fixtures/bff-types/valid.cts',
  'scripts/fixtures/lint-coverage.json',
  'scripts/fixtures/tooling-types/invalid-build-info.ts',
  'scripts/fixtures/tooling-types/invalid-playwright.ts',
  'scripts/fixtures/tooling-types/valid.ts',
  'scripts/playwright-pr-contract.test.mjs',
  'scripts/scoped-quality.mjs',
  'scripts/scoped-quality.test.mjs',
  'scripts/tooling-types.test.mjs',
  'tsconfig.bff.json',
  'tsconfig.e2e.full.json',
  'tsconfig.e2e.json',
  'tsconfig.tooling.json',
];

function eligible(pathname) {
  return /\.(ts|tsx)$/.test(pathname) && !/\.(test|spec|d)\.(ts|tsx)$/.test(pathname);
}

async function walkEligible(root, relativeDirectory, output) {
  const directory = path.join(root, relativeDirectory);
  const directoryStat = await fs.lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    throw new Error(`Expected a real source directory: ${relativeDirectory}`);
  }
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      throw new Error(`Source symlink is not allowed in lint coverage: ${relativePath}`);
    }
    if (entry.isDirectory()) {
      await walkEligible(root, relativePath, output);
    } else if (entry.isFile() && eligible(relativePath)) {
      output.push(relativePath);
    }
  }
}

export async function eligiblePaths(root) {
  const output = [];
  for (const relativeDirectory of ELIGIBLE_ROOTS) {
    await walkEligible(root, relativeDirectory, output);
  }
  return output.sort();
}

export async function sourceHash(root, relativePath) {
  const contents = await fs.readFile(path.join(root, relativePath));
  return createHash('sha256').update(contents).digest('hex');
}

export async function checkCoverage(root, coverage) {
  const errors = [];
  if (coverage.schemaVersion !== 1) errors.push('Unsupported lint coverage schema version');
  if (
    !Array.isArray(coverage.eligibleRoots) ||
    JSON.stringify(coverage.eligibleRoots) !== JSON.stringify(ELIGIBLE_ROOTS)
  ) {
    errors.push('Lint coverage must retain the reviewed eligible roots');
  }
  if (!/^[0-9a-f]{40}$/.test(coverage.reviewedSourceRevision ?? '')) {
    errors.push('Lint coverage needs a full reviewed source revision');
  }
  if (typeof coverage.deferredOwner !== 'string' || !coverage.deferredOwner.trim()) {
    errors.push('Deferred lint coverage needs an owner');
  }
  if (typeof coverage.deferredRemovalCondition !== 'string' || !coverage.deferredRemovalCondition.trim()) {
    errors.push('Deferred lint coverage needs a removal condition');
  }
  const adopted = coverage.adopted;
  const deferred = coverage.deferred;
  if (!Array.isArray(adopted) || !deferred || typeof deferred !== 'object' || Array.isArray(deferred)) {
    errors.push('Lint coverage needs adopted paths and deferred source hashes');
    return errors;
  }
  const sortedAdopted = [...adopted].sort();
  const deferredPaths = Object.keys(deferred);
  if (JSON.stringify(adopted) !== JSON.stringify(sortedAdopted) || new Set(adopted).size !== adopted.length) {
    errors.push('Adopted paths must be sorted and unique');
  }
  if (JSON.stringify(deferredPaths) !== JSON.stringify([...deferredPaths].sort())) {
    errors.push('Deferred paths must be sorted');
  }

  const actual = await eligiblePaths(root);
  const actualSet = new Set(actual);
  const adoptedSet = new Set(adopted);
  for (const pathname of actual) {
    if (adoptedSet.has(pathname)) {
      if (Object.hasOwn(deferred, pathname)) errors.push(`Path is both adopted and deferred: ${pathname}`);
      continue;
    }
    if (!Object.hasOwn(deferred, pathname)) {
      errors.push(`New eligible source must be adopted: ${pathname}`);
      continue;
    }
    const expected = deferred[pathname];
    if (!/^[0-9a-f]{64}$/.test(expected)) {
      errors.push(`Invalid deferred source hash: ${pathname}`);
    } else if ((await sourceHash(root, pathname)) !== expected) {
      errors.push(`Changed eligible source must be adopted: ${pathname}`);
    }
  }
  for (const pathname of [...adopted, ...deferredPaths]) {
    if (!actualSet.has(pathname)) errors.push(`Missing or ineligible coverage path: ${pathname}`);
  }
  return errors;
}

async function readCoverage(root) {
  return JSON.parse(await fs.readFile(path.join(root, 'scripts/fixtures/lint-coverage.json'), 'utf8'));
}

export async function lintAdopted(root, adopted, configFile = path.join(root, 'eslint.config.mjs')) {
  const { ESLint } = await import('eslint');
  const eslint = new ESLint({ cwd: root, overrideConfigFile: configFile });
  const results = await eslint.lintFiles(adopted);
  const errors = results.reduce((count, result) => count + result.errorCount + result.warningCount, 0);
  if (errors) throw new Error(await (await eslint.loadFormatter('stylish')).format(results));
  return results.length;
}

export async function checkFormatSource(source, filepath, options) {
  const prettier = await import('prettier');
  return prettier.check(source, { ...options, filepath });
}

export async function formatAdopted(root, adopted, toolFiles = TOOL_FILES) {
  const prettier = await import('prettier');
  const files = [...new Set([...adopted, ...toolFiles])].sort();
  const unformatted = [];
  for (const pathname of files) {
    const absolutePath = path.join(root, pathname);
    const source = await fs.readFile(absolutePath, 'utf8');
    const options = await prettier.resolveConfig(absolutePath);
    if (!(await checkFormatSource(source, absolutePath, options ?? {}))) unformatted.push(pathname);
  }
  if (unformatted.length) throw new Error(`Unformatted adopted files:\n${unformatted.join('\n')}`);
  return files.length;
}

async function main() {
  const command = process.argv[2];
  if (!['coverage', 'lint', 'format'].includes(command)) {
    throw new Error('Usage: node scripts/scoped-quality.mjs coverage|lint|format');
  }
  const coverage = await readCoverage(REPO_ROOT);
  const errors = await checkCoverage(REPO_ROOT, coverage);
  if (errors.length) throw new Error(errors.join('\n'));
  if (command === 'lint') {
    console.log(`ESLint passed on ${await lintAdopted(REPO_ROOT, coverage.adopted)} adopted files`);
  } else if (command === 'format') {
    console.log(`Prettier passed on ${await formatAdopted(REPO_ROOT, coverage.adopted)} reviewed files`);
  } else {
    console.log(
      `Lint coverage passed: ${coverage.adopted.length} adopted, ${Object.keys(coverage.deferred).length} deferred`
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
