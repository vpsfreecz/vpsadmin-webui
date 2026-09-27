#!/usr/bin/env node

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildPlaywrightEnvironment,
  relaxChromiumUrlBlocklist,
  shouldRelaxChromiumPolicy,
} from './e2e-harness.mjs';
import { resolvePlaywrightCli } from './playwright-cli.mjs';

function installedCli() {
  const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  return resolvePlaywrightCli(repository, process.env.PLAYWRIGHT_VERSION?.trim());
}

function usage() {
  console.log(`
Pinned Playwright runner.

Usage:
  node scripts/playwright.mjs install [args...]
  node scripts/playwright.mjs test [args...]
  node scripts/playwright.mjs test --container [args...]

Runner-only test flags:
  --container                  Use system Chromium, disable artifacts, and temporarily relax local URLBlocklist policy.
  --auto-system-chromium       Set E2E_CHROMIUM_EXECUTABLE_PATH from common Chromium paths when unset.
  --no-artifacts               Set E2E_RECORD_ARTIFACTS=0 when unset.
  --relax-chromium-policy      Temporarily remove blocking '*' entries from Chromium URLBlocklist policies.

Notes:
  - e2e/PLAYWRIGHT_VERSION, package-lock and the installed CLI must agree.
  - The installed CLI runs directly; this wrapper does not download packages.
`);
}

const [action, ...args] = process.argv.slice(2);

if (!action || action === '-h' || action === '--help') {
  usage();
  process.exit(action ? 0 : 2);
}

if (action !== 'install' && action !== 'test') {
  console.error(`Unknown action: ${action}`);
  usage();
  process.exit(2);
}

const harness = buildPlaywrightEnvironment({ action, args });
for (const note of harness.notes) console.error(`[e2e] ${note}`);
for (const warning of harness.warnings) console.error(`[e2e] Warning: ${warning}`);

let restoreChromiumPolicy = () => [];
if (shouldRelaxChromiumPolicy({ action, options: harness.options, env: harness.env })) {
  const relaxed = relaxChromiumUrlBlocklist({});
  restoreChromiumPolicy = relaxed.restore;
  if (relaxed.changed === 0 && relaxed.warnings.length === 0) {
    console.error('[e2e] No blocking Chromium URLBlocklist policy found.');
  }
  for (const note of relaxed.notes) console.error(`[e2e] ${note}`);
  for (const warning of relaxed.warnings) console.error(`[e2e] Warning: ${warning}`);
}

let res;
try {
  const cli = installedCli();
  res = spawnSync(process.execPath, [cli, action, ...harness.playwrightArgs], {
    stdio: 'inherit',
    env: harness.env,
  });
} catch (error) {
  console.error(`[e2e] ${error.message}`);
  process.exitCode = 2;
} finally {
  for (const warning of restoreChromiumPolicy()) console.error(`[e2e] Warning: ${warning}`);
}

if (process.exitCode) process.exit(process.exitCode);

if (res?.error) {
  console.error(`[e2e] Failed to run Playwright: ${res.error.message}`);
  process.exit(1);
}

if (res?.signal) {
  const signalExitCode = res.signal === 'SIGINT' ? 130 : res.signal === 'SIGTERM' ? 143 : 1;
  process.exit(signalExitCode);
}

process.exit(res?.status ?? 1);
