import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

import { validateCatalogs } from './audit-i18n.mjs';

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(enFiles, csFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-i18n-'));
  roots.push(root);
  for (const [lang, files] of [['en', enFiles], ['cs', csFiles]]) {
    for (const [name, source] of Object.entries(files)) {
      const file = path.join(root, 'src/i18n/locales', lang, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, source);
    }
  }
  return validateCatalogs(root);
}

test('accepts both quote styles and literal modules before barrel spreads', () => {
  const report = fixture(
    {
      'leaf.ts': `export const enLeaf = { 'hello': 'Hello {name}', "items.one": "{count} item", 'items.other': '{count} items' } as const;`,
      'barrel.ts': `import { enLeaf } from './leaf'; export const enBarrel = { ...enLeaf } as const;`,
    },
    {
      'leaf.ts': `export const csLeaf = { "hello": "Ahoj {name}", 'items.one': '{count} položka', "items.other": "{count} položek" } as const;`,
      'barrel.ts': `import { csLeaf } from './leaf'; export const csBarrel = { ...csLeaf } as const;`,
    },
  );
  assert.equal(report.enCount, 3);
  assert.deepEqual(report.issues, []);
});

test('reports duplicates within and across leaf modules, before spreads overwrite them', () => {
  const report = fixture(
    {
      'a.ts': `export const a = { 'same': 'First', "same": "Second" } as const;`,
      'b.ts': `export const b = { 'same': 'Third' } as const;`,
      'barrel.ts': `import { a } from './a'; import { b } from './b'; export const barrel = { ...a, ...b } as const;`,
    },
    { 'a.ts': `export const a = { 'same': 'Stejné' } as const;` },
  );
  assert.equal(report.issues.filter((issue) => issue.includes('duplicate en key "same"')).length, 2);
});

test('checks leaf modules even when a barrel does not import them', () => {
  const report = fixture(
    {
      'barrel.ts': `export const barrel = { 'shared': 'Shared' } as const;`,
      'forgotten.ts': `export const forgotten = { "unreferenced": "Still audited" } as const;`,
    },
    { 'barrel.ts': `export const barrel = { 'shared': 'Sdílené' } as const;` },
  );
  assert.deepEqual(report.missingInCs, ['unreferenced']);
});

test('reports missing keys and placeholder and plural category mismatches', () => {
  const report = fixture(
    { 'a.ts': `export const a = { 'en.only': 'Only', 'greeting': 'Hi {name}', 'count.one': '{count} item', 'count.other': '{count} items' } as const;` },
    { 'a.ts': `export const a = { 'cs.only': 'Pouze', 'greeting': 'Ahoj {person}', 'count.one': '{count} položka', 'count.few': '{count} položky' } as const;` },
  );
  assert.deepEqual(report.missingInCs, ['count.other', 'en.only']);
  assert.deepEqual(report.missingInEn, ['count.few', 'cs.only']);
  assert(report.issues.some((issue) => issue.includes('placeholder mismatch "greeting"')));
  assert(report.issues.some((issue) => issue.includes('plural category mismatch "count"')));
});

test('rejects nonliteral declarations, dynamic entries, spreads, and syntax errors', () => {
  const report = fixture(
    {
      'computed.ts': `export const computed = buildCatalog();`,
      'entry.ts': `export const entry = { 'key': computeValue() };`,
      'spread.ts': `export const spread = { ...buildCatalog() };`,
      'hidden.ts': `const dynamic = buildCatalog(); export const hidden = { ...dynamic };`,
      'syntax.ts': `export const syntax = { 'broken': ; };`,
    },
    { 'literal.ts': `export const literal = { 'key': 'value' };` },
  );
  assert(report.issues.some((issue) => issue.includes('unsupported catalog declaration')));
  assert(report.issues.some((issue) => issue.includes('unsupported catalog entry')));
  assert(report.issues.some((issue) => issue.includes('unsupported catalog spread')));
  assert(report.issues.some((issue) => issue.includes('source must be a literal export')));
  assert(report.issues.some((issue) => issue.includes('Expression expected')));
});
