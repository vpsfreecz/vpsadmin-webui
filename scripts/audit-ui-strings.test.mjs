import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./audit-ui-strings.mjs', import.meta.url));

test('test fixture JSX is ignored while matching product JSX is reported', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-string-audit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src'));
  const fixture = path.join(dir, 'src', 'Panel.test.tsx');
  const product = path.join(dir, 'src', 'Panel.tsx');
  const report = path.join(dir, 'report.md');
  const literal = '<button aria-label="Skip to main content">Replace externally</button>\n';
  fs.writeFileSync(fixture, literal);
  fs.writeFileSync(product, literal);
  const run = () => spawnSync(process.execPath, [script, '--fail', '--write', report], { cwd: dir, encoding: 'utf8' });
  assert.equal(run().status, 1);
  let contents = fs.readFileSync(report, 'utf8');
  assert.match(contents, /src\/Panel\.tsx/);
  assert.doesNotMatch(contents, /src\/Panel\.test\.tsx/);
  fs.rmSync(product);
  assert.equal(run().status, 0);
  contents = fs.readFileSync(report, 'utf8');
  assert.match(contents, /Findings: \*\*0\*\*/);
});
