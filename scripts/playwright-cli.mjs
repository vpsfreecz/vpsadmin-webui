import fs from 'node:fs';
import path from 'node:path';

export function resolvePlaywrightCli(repository, overridden) {
  const pinned = fs.readFileSync(path.join(repository, 'e2e/PLAYWRIGHT_VERSION'), 'utf8').trim();
  const locked = JSON.parse(fs.readFileSync(path.join(repository, 'package-lock.json'), 'utf8'))
    .packages?.['node_modules/@playwright/test']?.version;
  const installed = JSON.parse(fs.readFileSync(path.join(repository, 'node_modules/@playwright/test/package.json'), 'utf8')).version;
  if (!pinned || pinned !== locked || pinned !== installed || (overridden && overridden !== pinned)) {
    throw new Error(`Playwright version mismatch: file=${pinned || '(empty)'}, lock=${locked || '(missing)'}, installed=${installed}, override=${overridden || '(none)'}`);
  }
  const cli = path.join(repository, 'node_modules/@playwright/test/cli.js');
  if (!fs.existsSync(cli) || !fs.statSync(cli).isFile()) throw new Error(`Playwright CLI is missing: ${cli}`);
  return cli;
}
