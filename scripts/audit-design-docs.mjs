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
// Include change records and both historical/current operational guides.
files.push(...sourceFiles().filter(file => file.endsWith('.md') &&
  /^(docs\/(work-log|operations)\/|deploy\/|bff\/README\.md$)/.test(path.relative(root, file).replaceAll(path.sep, '/'))));
const errors = [];
// The handbook uses ATX headings and optional explicit HTML anchors. Duplicate
// headings receive GitHub-style numeric suffixes. This is link lint, not a
// general Markdown renderer or a semantic documentation completeness proof.
function anchors(file) {
  const content = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  const found = new Set();
  for (const match of content.matchAll(/^#{1,6} +(.+?) *#*$/gm)) {
    const base = match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]*>/g, '').toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M} _-]/gu, '').replace(/ /g, '-');
    let slug = base;
    for (let n = 1; found.has(slug); n++) slug = `${base}-${n}`;
    found.add(slug);
  }
  for (const match of content.matchAll(/<(?:a|h[1-6])\s+[^>]*(?:id|name)=["']([^"']+)["']/g)) found.add(match[1]);
  return found;
}
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const match of text.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const [target, fragment] = match[1].split('#');
    if (/^[a-z]+:/i.test(target)) continue;
    const destination = target ? path.resolve(path.dirname(file), decodeURIComponent(target)) : file;
    if (!destination.startsWith(root + path.sep) || !fs.existsSync(destination)) {
      errors.push(`${path.relative(root, file)}: missing or external local link ${target}`);
    } else if (fragment && destination.endsWith('.md') && !anchors(destination).has(decodeURIComponent(fragment))) {
      errors.push(`${path.relative(root, file)}: missing local anchor ${match[1]}`);
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
const evidenceFile = path.join(directory, 'EVIDENCE_MATRIX.md');
const evidence = fs.existsSync(evidenceFile) ? fs.readFileSync(evidenceFile, 'utf8') : '';
const coverage = (evidence.split('## Requirement coverage\n')[1] ?? '').split(/^## /m)[0];
const evidenceIds = [...coverage.matchAll(/^\| (REQ-\d{3}) \|/gm)].map(m => m[1]);
for (const id of ids) {
  if (evidenceIds.filter(value => value === id).length !== 1) errors.push(`Evidence matrix must contain exactly one coverage row for ${id}`);
}
for (const id of evidenceIds) {
  if (!ids.includes(id)) errors.push(`Evidence matrix has unknown ${id}`);
}
for (const file of files.filter(f => f.startsWith(directory))) {
  for (const match of fs.readFileSync(file, 'utf8').matchAll(/\bREQ-\d{3}\b/g)) {
    if (!ids.includes(match[0])) errors.push(`${path.basename(file)}: unknown ${match[0]}`);
  }
}
// Reverse traceability catches a new adapter being inventoried but never assigned
// to behavioral documentation. Helper/type modules still need an explicit home.
const domainFile = path.join(directory, 'DOMAIN_COVERAGE.md');
const domainText = fs.existsSync(domainFile) ? fs.readFileSync(domainFile, 'utf8') : '';
const moduleCoverage = (domainText.split('## Module coverage\n')[1] ?? '').split(/^## /m)[0];
const assignedModules = [...moduleCoverage.matchAll(/\]\(\.\.\/\.\.\/src\/lib\/api\/([^/()]+\.ts)\)/g)].map(m => m[1]);
const actualModules = fs.readdirSync(path.join(root, 'src/lib/api'))
  .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
for (const file of actualModules) {
  if (assignedModules.filter(value => value === file).length !== 1) errors.push(`Domain coverage must assign exactly once: ${file}`);
}
for (const file of assignedModules) {
  if (!actualModules.includes(file)) errors.push(`Domain coverage has unknown module: ${file}`);
}
if (errors.length) throw new Error(errors.join('\n'));
execFileSync(process.execPath, ['scripts/design-inventory.mjs'], { stdio: 'inherit' });
console.log(`Design docs: ${files.length} documents checked, ${ids.length} unique requirements`);
