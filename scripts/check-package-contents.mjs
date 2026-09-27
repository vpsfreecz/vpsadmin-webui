import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendFiles = JSON.parse(fs.readFileSync(new URL('../packages/frontend-public-files.json', import.meta.url), 'utf8'));
const bffFiles = JSON.parse(fs.readFileSync(new URL('../packages/bff-runtime-files.json', import.meta.url), 'utf8'));
const fullSha = /^[0-9a-f]{40}$/;
const assetExtension = /\.(?:css|js|png|jpe?g|svg|webp|ico|woff2?)$/;

function fail(message) { throw new Error(message); }

function entries(directory) {
  return fs.readdirSync(directory).sort();
}

function assertEntries(directory, expected, label) {
  const actual = entries(directory);
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) {
    fail(`${label} entries differ: expected ${[...expected].sort().join(', ')}, got ${actual.join(', ')}`);
  }
}

function assertRegular(file, label) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a regular file`);
}

function readProvenance(file) {
  assertRegular(file, 'Build provenance');
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  const keys = ['commit', 'dirty', 'schemaVersion', 'shortCommit', 'source'];
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify(keys)) fail('Unexpected build provenance fields');
  if (value.schemaVersion !== 1 || typeof value.dirty !== 'boolean') fail('Invalid build provenance schema');
  if (value.source !== 'environment' && value.source !== 'unavailable') fail('Invalid package provenance source');
  if (value.commit !== 'unknown' && !fullSha.test(value.commit)) fail('Package provenance needs a full SHA or unknown');
  if (value.shortCommit !== (value.commit === 'unknown' ? 'unknown' : value.commit.slice(0, 12))) {
    fail('Invalid short build provenance');
  }
  if (!value.dirty && (value.commit === 'unknown' || value.source !== 'environment')) {
    fail('Clean release provenance needs a full known source revision');
  }
  if (value.commit === 'unknown' && value.source !== 'unavailable') fail('Unknown revision must be unavailable');
  return value;
}

function checkAssets(directory) {
  const files = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const relative = path.relative(directory, full);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) fail(`Public asset symlink is forbidden: ${relative}`);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile() && assetExtension.test(entry.name) && !entry.name.endsWith('.map')) files.push(relative);
      else fail(`Unexpected public asset: ${relative}`);
    }
  }
  walk(directory);
  if (!files.some((file) => file.endsWith('.js')) || !files.some((file) => file.endsWith('.css'))) {
    fail('Public assets need JavaScript and CSS');
  }
  return files.length;
}

function checkFrontend(root) {
  assertEntries(root, [...frontendFiles, 'assets'], 'Public root');
  for (const file of frontendFiles) assertRegular(path.join(root, file), `Public ${file}`);
  if (!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('/assets/')) {
    fail('Public index has no packaged asset reference');
  }
  return { info: readProvenance(path.join(root, 'build-info.json')), assets: checkAssets(path.join(root, 'assets')) };
}

function checkBff(root) {
  assertEntries(root, ['bin', 'lib', 'share'], 'BFF root');
  assertEntries(path.join(root, 'bin'), ['vpsadmin-webui-bff'], 'BFF binary');
  assertEntries(path.join(root, 'lib'), ['vpsadmin-webui-bff'], 'BFF library');
  assertEntries(path.join(root, 'share'), ['vpsadmin-webui-bff'], 'BFF metadata directory');
  assertEntries(path.join(root, 'share/vpsadmin-webui-bff'), ['build-info.json'], 'BFF metadata');

  const runtime = path.join(root, 'lib/vpsadmin-webui-bff');
  assertEntries(runtime, [...bffFiles, 'package.json', 'node_modules'], 'BFF runtime');
  for (const file of bffFiles) {
    const full = path.join(runtime, file);
    assertRegular(full, `BFF runtime ${file}`);
    const contents = fs.readFileSync(full, 'utf8');
    for (const match of contents.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)) {
      const dependency = match[1].endsWith('.js') ? match[1] : `${match[1]}.js`;
      if (!bffFiles.includes(dependency)) fail(`Unpackaged BFF runtime import: ${file} -> ${dependency}`);
    }
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(runtime, 'package.json'), 'utf8'));
  if (manifest.name !== 'vpsadmin-webui-bff' || manifest.devDependencies) fail('Invalid production BFF manifest');
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (!fs.existsSync(path.join(runtime, 'node_modules', dependency, 'package.json'))) {
      fail(`Missing production BFF dependency: ${dependency}`);
    }
  }
  const wrapper = path.join(root, 'bin/vpsadmin-webui-bff');
  assertRegular(wrapper, 'BFF executable');
  if (!(fs.statSync(wrapper).mode & 0o111)) fail('BFF executable is not executable');
  const wrapperText = fs.readFileSync(wrapper, 'utf8');
  if (!wrapperText.includes('nodejs-slim-24') || !wrapperText.includes('/bin/node') || !wrapperText.includes('/server.js')) {
    fail('BFF executable must launch the packaged server with pinned slim Node');
  }
  return readProvenance(path.join(root, 'share/vpsadmin-webui-bff/build-info.json'));
}

export function checkPackageContents(frontend, bff) {
  const publicResult = checkFrontend(path.resolve(frontend));
  const bffInfo = checkBff(path.resolve(bff));
  if (Object.keys(bffInfo).some((key) => publicResult.info[key] !== bffInfo[key])) {
    fail('Frontend and BFF build provenance differ');
  }
  return { provenance: bffInfo, assets: publicResult.assets };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const frontend = process.argv[process.argv.indexOf('--frontend') + 1];
  const bff = process.argv[process.argv.indexOf('--bff') + 1];
  try {
    if (!frontend || !bff) fail('Usage: check-package-contents --frontend PATH --bff PATH');
    const result = checkPackageContents(frontend, bff);
    console.log(`Package contents OK: ${result.assets} public assets, matching ${result.provenance.commit} provenance`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Package contents check failed');
    process.exitCode = 1;
  }
}
