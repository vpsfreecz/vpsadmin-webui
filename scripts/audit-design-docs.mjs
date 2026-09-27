import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const directory = path.join(root, 'docs/design');
const SOURCE_EXTENSIONS = new Set(['.md', '.ts', '.tsx', '.css']);
const PRUNED_DIRECTORIES = new Set([
  '.git', 'node_modules', 'dist', '.vite', 'work', 'artifacts',
  'playwright-report',
]);

function sourceFiles(parent = root) {
  const files = [];
  const entries = fs.readdirSync(parent, { withFileTypes: true });
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of entries) {
    const full = path.join(parent, entry.name);
    const relative = path.relative(root, full).replaceAll(path.sep, '/');
    const pruned = PRUNED_DIRECTORIES.has(entry.name) || relative === 'e2e/test-results';
    if (pruned && entry.isDirectory()) continue;
    if (entry.isSymbolicLink()) {
      if (pruned) continue;
      throw new Error(`Unsupported source symlink: ${relative}`);
    }
    if (entry.isDirectory()) {
      files.push(...sourceFiles(full));
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const files = fs.readdirSync(directory).filter(f => f.endsWith('.md')).sort().map(f => path.join(directory, f));
files.push(...['README.md', 'UI_REDESIGN.md', 'SPEC.md', 'docs/README.md', 'docs/CANONICAL_DOCS.md', 'WORK_LOG.md'].map(f => path.join(root, f)));
const errors = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const match of text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    const destination = path.resolve(path.dirname(file), decodeURIComponent(target));
    if (!destination.startsWith(root + path.sep) || !fs.existsSync(destination)) {
      errors.push(`${path.relative(root, file)}: missing or external local link ${target}`);
    }
  }
}
// Historical mentions may remain, but no document/source may direct readers
// outside this repository. Inspect untracked files and Gitless Nix sources too.
for (const file of sourceFiles()) {
  const relative = path.relative(root, file);
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(/(?:\.\.\/)+UI_REDESIGN\.md/g)) {
    const destination = path.resolve(path.dirname(file), match[0]);
    if (destination !== path.join(root, 'UI_REDESIGN.md')) {
      errors.push(`${relative}: obsolete external redesign reference ${match[0]}`);
    }
  }
}
const register = fs.readFileSync(path.join(directory, 'REQUIREMENTS.md'), 'utf8');
const ids = [...register.matchAll(/^\| (REQ-\d{3}) \|/gm)].map(m => m[1]);
if (!ids.length || new Set(ids).size !== ids.length) errors.push('Requirement IDs are empty or duplicated');
for (const file of files.filter(f => f.startsWith(directory))) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/\bREQ-\d{3}\b/g)) {
    if (!ids.includes(match[0])) errors.push(`${path.basename(file)}: unknown ${match[0]}`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
execFileSync(process.execPath, ['scripts/design-inventory.mjs'], { stdio: 'inherit' });
console.log(`Design docs: ${files.length} documents checked, ${ids.length} unique requirements`);
