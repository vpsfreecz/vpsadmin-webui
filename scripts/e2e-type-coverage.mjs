#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SOURCE_REVISION = 'abab859d94a3f364d2bb719fa09f00749fd69ef9';
const BASELINE_DIGEST = 'f2dfa66695d28ff0523e4dbc02f8d4799144d484718d005c1be776b56709dcb7';
const SUPPORT_DECLARATION = 'src/types/vpsadmin.d.ts';
export const INITIAL_ROOTS = [
  'e2e/fixtures/bootstrap.ts',
  'e2e/fixtures/haveapi.ts',
  'e2e/fixtures/index.ts',
  'e2e/fixtures/playwright.ts',
  'e2e/fixtures/trackedActionStates.ts',
  'e2e/fixtures/uiSettings.ts',
  'e2e/fixtures/url.ts',
  'e2e/fixtures/vpsadmin-window.ts',
  'e2e/helpers/horizontalOverflow.ts',
  'e2e/specs/app/authenticated_home_smoke.spec.ts',
  'e2e/specs/public/theme_language_bootstrap.spec.ts',
];

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sourceHash(filename) {
  return createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function relative(root, filename) {
  return path.relative(root, filename).replaceAll(path.sep, '/');
}

function walkE2e(root) {
  const files = [];
  function walk(directory) {
    if (!fs.lstatSync(directory).isDirectory()) throw new Error(`Expected E2E directory: ${relative(root, directory)}`);
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const filename = path.join(directory, entry.name);
      const pathname = relative(root, filename);
      if (entry.isSymbolicLink()) throw new Error(`E2E source symlink is not allowed: ${pathname}`);
      if (entry.isDirectory()) walk(filename);
      else if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(pathname);
    }
  }
  walk(path.join(root, 'e2e'));
  return files.sort();
}

function isSortedUnique(paths) {
  return (
    Array.isArray(paths) &&
    paths.every((value) => typeof value === 'string') &&
    JSON.stringify(paths) === JSON.stringify([...new Set(paths)].sort())
  );
}

function checkProgram(root, adopted, errors) {
  const configPath = path.join(root, 'tsconfig.e2e.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    errors.push('Cannot read the E2E TypeScript project');
    return;
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root, undefined, configPath);
  if (parsed.errors.length) {
    errors.push('Invalid E2E TypeScript project');
    return;
  }
  for (const flag of [
    'strict',
    'noUncheckedIndexedAccess',
    'noPropertyAccessFromIndexSignature',
    'noImplicitOverride',
    'noEmit',
  ]) {
    if (parsed.options[flag] !== true) errors.push(`E2E TypeScript must retain ${flag}`);
  }
  if (JSON.stringify(parsed.options.types) !== JSON.stringify(['node', '@playwright/test'])) {
    errors.push('E2E TypeScript must use only Node and Playwright ambient types');
  }
  if (
    JSON.stringify(parsed.options.lib) !== JSON.stringify(['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'])
  ) {
    errors.push('E2E TypeScript must retain the ES2022 and DOM libraries');
  }
  if (
    parsed.options.module !== ts.ModuleKind.ESNext ||
    parsed.options.moduleResolution !== ts.ModuleResolutionKind.Bundler
  ) {
    errors.push('E2E TypeScript must retain its Playwright ESM loader boundary');
  }
  if (JSON.stringify(configFile.config.include) !== '[]') errors.push('E2E TypeScript must use an explicit files list');
  const roots = parsed.fileNames.map((filename) => relative(root, filename)).sort();
  const expectedRoots = [...adopted, SUPPORT_DECLARATION].sort();
  if (JSON.stringify(roots) !== JSON.stringify(expectedRoots)) {
    errors.push('E2E TypeScript roots differ from adopted paths plus the support declaration');
  }
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const compiledE2e = program
    .getSourceFiles()
    .map((file) => relative(root, file.fileName))
    .filter((pathname) => pathname.startsWith('e2e/'))
    .sort();
  if (JSON.stringify(compiledE2e) !== JSON.stringify(adopted)) {
    errors.push('E2E TypeScript import closure differs from adopted paths');
  }
}

export function auditE2eTypeCoverage(root = ROOT, { program = true } = {}) {
  const errors = [];
  let sourcePaths;
  try {
    sourcePaths = walkE2e(root);
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)], adopted: 0, deferred: 0 };
  }
  const inventory = readJson(path.join(root, 'scripts/fixtures/e2e-type-coverage.json'));
  const baseline = readJson(path.join(root, 'scripts/fixtures/e2e-type-baseline.json'));
  if (inventory.schemaVersion !== 1 || baseline.schemaVersion !== 1)
    errors.push('Unsupported E2E type coverage schema');
  if (inventory.sourceRevision !== SOURCE_REVISION || baseline.sourceRevision !== SOURCE_REVISION) {
    errors.push('E2E type coverage source revision changed');
  }
  const baselineEntries = baseline.deferred;
  const baselinePaths = Array.isArray(baselineEntries) ? baselineEntries.map((entry) => entry.path) : [];
  if (!isSortedUnique(baselinePaths) || baselinePaths.length !== 228) {
    errors.push('Invalid initial E2E deferred path inventory');
  }
  const digest = createHash('sha256')
    .update(
      (Array.isArray(baselineEntries) ? baselineEntries : [])
        .map((entry) => `${entry.path}\t${entry.sha256}\n`)
        .join('')
    )
    .digest('hex');
  if (digest !== BASELINE_DIGEST) errors.push('Initial E2E deferred paths or hashes changed');
  const baselineHashes = new Map(
    (Array.isArray(baselineEntries) ? baselineEntries : []).map((entry) => [entry.path, entry.sha256])
  );

  const adopted = inventory.adopted;
  if (!isSortedUnique(adopted)) errors.push('Adopted E2E paths must be sorted and unique');
  const adoptedPaths = Array.isArray(adopted) ? adopted : [];
  const adoptedSet = new Set(adoptedPaths);
  for (const pathname of INITIAL_ROOTS) {
    if (!adoptedSet.has(pathname)) errors.push(`Required E2E core root is missing: ${pathname}`);
  }
  const deferred = inventory.deferred;
  if (!Array.isArray(deferred)) errors.push('Deferred E2E entries must be an array');
  const deferredEntries = Array.isArray(deferred) ? deferred : [];
  const deferredPaths = deferredEntries.map((entry) => entry.path);
  if (!isSortedUnique(deferredPaths)) errors.push('Deferred E2E paths must be sorted and unique');
  const deferredSet = new Set(deferredPaths);
  for (const entry of deferredEntries) {
    if (adoptedSet.has(entry.path)) errors.push(`E2E path is both adopted and deferred: ${entry.path}`);
    if (!baselineHashes.has(entry.path)) errors.push(`New deferred E2E path is not approved: ${entry.path}`);
    if (entry.sha256 !== baselineHashes.get(entry.path))
      errors.push(`Deferred E2E hash differs from initial source: ${entry.path}`);
    if (
      typeof entry.owner !== 'string' ||
      !entry.owner.trim() ||
      typeof entry.reason !== 'string' ||
      !entry.reason.trim() ||
      typeof entry.removalCondition !== 'string' ||
      !entry.removalCondition.trim()
    ) {
      errors.push(`Deferred E2E entry needs owner, reason and removal condition: ${entry.path}`);
    }
    if (sourcePaths.includes(entry.path) && sourceHash(path.join(root, entry.path)) !== entry.sha256) {
      errors.push(`Changed deferred E2E source must be adopted: ${entry.path}`);
    }
  }
  for (const pathname of sourcePaths) {
    if (!adoptedSet.has(pathname) && !deferredSet.has(pathname)) {
      errors.push(`New E2E source must be adopted: ${pathname}`);
    }
  }
  for (const pathname of [...adoptedPaths, ...deferredPaths]) {
    if (!sourcePaths.includes(pathname)) errors.push(`Stale or deleted E2E coverage path: ${pathname}`);
  }
  if (program && isSortedUnique(adoptedPaths)) checkProgram(root, adoptedPaths, errors);
  return { errors, adopted: adoptedPaths.length, deferred: deferredEntries.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditE2eTypeCoverage();
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`E2E type coverage passed: ${result.adopted} checked, ${result.deferred} deferred`);
  }
}
