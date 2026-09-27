import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requiredPaths = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'build/buildInfo.ts',
  'bff/package.json',
  'bff/package-lock.json',
  'docs/design/README.md',
  'docs/design/IMPLEMENTATION_INVENTORY.md',
  'public/config.local.js.example',
  'scripts/audit-design-docs.mjs',
  'scripts/design-inventory.mjs',
  'src/routes/router.tsx',
  'src/lib/api/haveapi.ts',
  'UI_REDESIGN.md',
];
const excludedDirectories = new Set([
  '.git', '.vite', 'artifacts', 'dist', 'node_modules', 'output',
  'playwright-report', 'work',
]);

export function checkPackageSource(root) {
  const absoluteRoot = path.resolve(root);
  const failures = [];
  for (const relative of requiredPaths) {
    if (!fs.existsSync(path.join(absoluteRoot, relative))) failures.push(`Missing source file: ${relative}`);
  }

  function walk(directory, relativeDirectory = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = path.posix.join(relativeDirectory, entry.name);
      const full = path.join(directory, entry.name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) {
        failures.push(`Source symlink is not supported: ${relative}`);
      } else if (entry.name.startsWith('.env') || relative === 'public/config.local.js') {
        failures.push(`Private environment/configuration file in source: ${relative}`);
      } else if (stat.isDirectory()) {
        if (excludedDirectories.has(entry.name) || relative === 'e2e/test-results') {
          failures.push(`Generated directory in source: ${relative}`);
        } else {
          walk(full, relative);
        }
      } else if (!stat.isFile()) {
        failures.push(`Unsupported source entry: ${relative}`);
      }
    }
  }

  walk(absoluteRoot);
  if (failures.length) throw new Error(failures.join('\n'));
  return { requiredFiles: requiredPaths.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkPackageSource(process.argv[2] ?? '.');
    console.log(`Package source OK: ${result.requiredFiles} required files present`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Package source check failed');
    process.exitCode = 1;
  }
}
