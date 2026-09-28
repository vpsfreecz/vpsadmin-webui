import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { normalizePlaywrightArgs } from './e2e-harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { program } = require('../node_modules/playwright/lib/program.js');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function scriptArgs(name) {
  const script = manifest.scripts[name];
  assert.equal(typeof script, 'string');
  const runner = script.match(/\bnode scripts\/playwright\.mjs test (.+)$/);
  assert(runner, `${name} must use the pinned Playwright wrapper`);
  return runner[1].split(' ');
}

function step(source, name) {
  const marker = `      - name: ${name}\n`;
  const start = source.indexOf(marker);
  assert(start >= 0, `missing ${name} step`);
  const next = source.indexOf('      - name: ', start + marker.length);
  return source.slice(start, next < 0 ? undefined : next);
}

test('PR desktop and mobile select two workers with a working one-worker override', async () => {
  const previousArtifacts = process.env['E2E_RECORD_ARTIFACTS'];
  delete process.env['E2E_RECORD_ARTIFACTS'];
  let config;
  try {
    ({ default: config } = await import('../playwright.config.ts'));
  } finally {
    if (previousArtifacts === undefined) delete process.env['E2E_RECORD_ARTIFACTS'];
    else process.env['E2E_RECORD_ARTIFACTS'] = previousArtifacts;
  }
  assert.equal(config.workers, 2);
  assert.equal(config.use.trace, 'retain-on-failure');
  assert.equal(config.use.screenshot, 'only-on-failure');
  assert.equal(config.use.video, 'retain-on-failure');
  const command = program.commands.find((item) => item.name() === 'test');
  assert(command);

  for (const [name, shortcut, project] of [
    ['e2e:pr:desktop', '--pr-smoke', '--project=chromium'],
    ['e2e:pr:mobile', '--pr-smoke-mobile', '--project=mobile-chrome'],
  ]) {
    const args = scriptArgs(name);
    assert(args.includes(shortcut));
    assert(args.includes(project));
    assert.deepEqual(
      args.filter((arg) => arg.startsWith('--workers')),
      ['--workers=2']
    );
    const normal = normalizePlaywrightArgs(args).playwrightArgs;
    command.parseOptions(normal);
    assert.equal(command.opts().workers, '2');

    // npm appends diagnostic flags after the script's defaults. Parse them with
    // the installed Playwright CLI option parser, without collecting tests.
    const diagnostic = normalizePlaywrightArgs([...args, '--workers=1', '--retries=0']).playwrightArgs;
    command.parseOptions(diagnostic);
    assert.equal(command.opts().workers, '1');
    assert.equal(command.opts().retries, '0');
  }
});

test('CI uploads the HTML report and failed-attempt results after passing retries', () => {
  for (const [filename, retention, desktopScript, mobileScript] of [
    ['e2e-smoke.yml', 7, 'e2e:pr:desktop', 'e2e:pr:mobile'],
    ['e2e-broad-smoke.yml', 14, 'e2e:smoke', 'e2e:smoke:mobile'],
    ['e2e-nightly.yml', 14, 'e2e:full', 'e2e:smoke:mobile'],
  ]) {
    const source = fs.readFileSync(path.join(root, '.github/workflows', filename), 'utf8');
    assert.match(source, /fail-fast: false/);
    assert.match(source, /matrix:\s*include:/);
    assert.match(source, new RegExp(`project: chromium\\s+script: ${desktopScript}`));
    assert.match(source, new RegExp(`project: mobile-chrome\\s+script: ${mobileScript}`));
    assert.doesNotMatch(source, /E2E_RECORD_ARTIFACTS=0|--no-artifacts|--container/);
    for (const [name, artifactPath] of [
      ['Upload Playwright report', 'playwright-report'],
      ['Upload Playwright traces', 'e2e/test-results'],
    ]) {
      const upload = step(source, name);
      assert.match(upload, /^\s+if: always\(\)$/m);
      assert.match(upload, new RegExp(`^\\s+path: ${artifactPath}$`, 'm'));
      assert.match(upload, /^\s+if-no-files-found: ignore$/m);
      assert.match(upload, new RegExp(`^\\s+retention-days: ${retention}$`, 'm'));
    }
    assert.match(
      step(
        source,
        filename === 'e2e-smoke.yml'
          ? 'Write PR smoke summary'
          : filename === 'e2e-broad-smoke.yml'
            ? 'Write broad smoke summary'
            : 'Write nightly summary'
      ),
      /uploaded on completion/
    );
  }
});
