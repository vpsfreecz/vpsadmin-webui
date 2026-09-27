import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { evaluateStructural, perFileViolations } from './structural-budget-model.mjs';

const revision = 'e7ce3d73e799fc60e5933fe23bdb3a979eb4d6b9';
const script = fileURLToPath(new URL('./audit-structural-budgets.mjs', import.meta.url));
const hash = (text) => createHash('sha256').update(text).digest('hex');

function fixture() {
  const a = 'src/a.ts';
  const b = 'src/b.tsx';
  const metrics = {
    files: { [a]: { lines: 511, asAny: 2 }, [b]: { lines: 501, asAny: 1 } },
    hashes: { [a]: hash('a'), [b]: hash('b') },
    totals: { asAny: 3, filesOver500: 2, filesOver1000: 0 },
  };
  const baseline = {
    limits: { asAny: 1, filesOver500: 1, filesOver1000: 0 },
    files: { [a]: { lines: 505, asAny: 1 } },
  };
  const raw = perFileViolations(metrics, baseline);
  const exceptions = raw.map((item) => ({
    path: item.path, rule: item.rule, sourceRevision: revision,
    contentHash: metrics.hashes[item.path], old: item.old, allowance: item.current,
    rationale: `Inherited ${item.rule} in ${item.path}; extract and retest this file.`,
    owner: 'WebUI implementation lead',
    removeWhen: {
      metric: item.rule.includes('any') ? 'asAny' : 'lines',
      atMost: item.rule === 'crossed-500' ? 500 : item.old,
    },
  }));
  return { metrics, baseline, ledger: { version: 1, review: { status: 'accepted', acceptedBy: 'lead' }, exceptions } };
}

const evaluate = (f) => evaluateStructural(f.metrics, f.baseline, f.ledger, revision);

test('reports every rule with old/current/excess and keeps accepted debt separate', () => {
  const f = fixture();
  const result = evaluate(f);
  assert.equal(result.passed, true);
  assert.deepEqual(result.rawViolations.map(({ rule, path, old, current, excess }) =>
    ({ rule, path, old, current, excess })), [
    { rule: 'increased-as-any', path: 'src/a.ts', old: 1, current: 2, excess: 1 },
    { rule: 'grown-over-500', path: 'src/a.ts', old: 505, current: 511, excess: 6 },
    { rule: 'new-as-any', path: 'src/b.tsx', old: 0, current: 1, excess: 1 },
    { rule: 'crossed-500', path: 'src/b.tsx', old: 0, current: 501, excess: 1 },
    { rule: 'total-as-any', path: null, old: 1, current: 3, excess: 2 },
    { rule: 'total-over-500', path: null, old: 1, current: 2, excess: 1 },
  ]);
  assert.equal(result.acceptedExceptions.length, 4);
  assert.equal(result.unacceptedViolations.length, 0);
});

test('valid but unreviewed entries stay proposed and cannot make the gate green', () => {
  const f = fixture();
  f.ledger.review = { status: 'pending', acceptedBy: null };
  const result = evaluate(f);
  assert.equal(result.passed, false);
  assert.match(result.reviewFailure, /lead acceptance/);
  assert.equal(result.proposedExceptions.length, 4);
  assert.equal(result.acceptedExceptions.length, 0);
  assert.equal(result.unacceptedViolations.length, 4);
  assert.deepEqual(result.aggregateFailures.map((v) => v.rule), ['total-as-any', 'total-over-500']);
});

test('changed, duplicate, stale and spare-capacity entries each fail', () => {
  for (const mutation of [
    (f) => { f.metrics.hashes['src/a.ts'] = hash('changed'); },
    (f) => { f.ledger.exceptions.push({ ...f.ledger.exceptions[0] }); },
    (f) => { f.ledger.exceptions[0].rule = 'crossed-1000'; },
    (f) => { f.ledger.exceptions[0].allowance += 1; },
    (f) => { f.ledger.exceptions[0].sourceRevision = 'other'; },
    (f) => { f.ledger.exceptions.push(null); },
  ]) {
    const f = fixture();
    mutation(f);
    const result = evaluate(f);
    assert.equal(result.passed, false);
    assert.ok(result.invalidExceptions.length > 0);
  }
});

test('deleted and resolved paths fail; the removal threshold expires an exception', () => {
  const deleted = fixture();
  delete deleted.metrics.hashes['src/b.tsx'];
  assert.match(evaluate(deleted).invalidExceptions.join(' '), /deleted path/);

  const resolved = fixture();
  resolved.metrics.files['src/a.ts'] = { lines: 505, asAny: 1 };
  assert.match(evaluate(resolved).invalidExceptions.join(' '), /removal condition met/);

  const belowBudget = fixture();
  delete belowBudget.metrics.files['src/b.tsx'];
  assert.match(evaluate(belowBudget).invalidExceptions.join(' '), /removal condition met/);
});

test('new debt cannot use another path allowance or hide in aggregate adjustment', () => {
  const f = fixture();
  f.metrics.files['src/c.ts'] = { lines: 20, asAny: 2 };
  f.metrics.hashes['src/c.ts'] = hash('c');
  f.metrics.totals.asAny = 5;
  const result = evaluate(f);
  assert.equal(result.passed, false);
  assert.deepEqual(result.unacceptedViolations.filter((v) => v.path === 'src/c.ts').map((v) => v.rule), ['new-as-any']);
  assert.equal(result.totals.asAny.remainingExcess, 2);
  assert.deepEqual(result.aggregateFailures.map((v) => v.rule), ['total-as-any']);
});

test('crossing 1000 lines and growth are independent rules', () => {
  const f = fixture();
  f.metrics.files['src/a.ts'].lines = 1001;
  const rules = perFileViolations(f.metrics, f.baseline).filter((v) => v.path === 'src/a.ts').map((v) => v.rule);
  assert.deepEqual(rules, ['increased-as-any', 'crossed-1000', 'grown-over-500']);
});

test('CLI writes complete machine-readable inventory, including the ninth file', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'structural-audit-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'src'));
  for (let i = 0; i < 9; i++) fs.writeFileSync(path.join(dir, 'src', `${i}.ts`), 'const a = 1 as any;\n');
  const baseline = path.join(dir, 'baseline.json');
  const ledger = path.join(dir, 'ledger.json');
  const report = path.join(dir, 'report.json');
  fs.writeFileSync(baseline, JSON.stringify({ version: 1, root: 'src', limits: { asAny: 0, filesOver500: 0, filesOver1000: 0 }, files: {} }));
  fs.writeFileSync(ledger, JSON.stringify({ version: 1, exceptions: [] }));
  const run = spawnSync(process.execPath, [script, '--baseline', baseline, '--ledger', ledger, '--report', report], { cwd: dir, encoding: 'utf8' });
  assert.equal(run.status, 1);
  const result = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(result.unacceptedViolations.length, 9);
  assert.equal(result.rawViolations.length, 10);
  assert.ok(result.unacceptedViolations.some((item) => item.path === 'src/8.ts'));
});
