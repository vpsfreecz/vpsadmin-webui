#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { evaluateStructural } from './structural-budget-model.mjs';

const SRC_DIR = path.resolve('src');
const TS_EXT = new Set(['.ts', '.tsx']);
const DEFAULT_BASELINE_PATH = path.resolve('scripts/fixtures/structural-baseline.json');
const DEFAULT_LEDGER_PATH = path.resolve('scripts/fixtures/structural-debt-ledger.json');
const DEFAULT_REPORT_PATH = path.resolve('work/audits/structural.json');
const INHERITED_REVISION = 'e7ce3d73e799fc60e5933fe23bdb3a979eb4d6b9';
const OVER_500_LIMIT = 500;
const OVER_1000_LIMIT = 1000;

function readArgValue(name) {
  const args = process.argv.slice(2);
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  return undefined;
}

function hasArg(name) {
  return process.argv.slice(2).includes(name);
}

const baselinePath = path.resolve(readArgValue('--baseline') ?? DEFAULT_BASELINE_PATH);
const ledgerPath = path.resolve(readArgValue('--ledger') ?? DEFAULT_LEDGER_PATH);
const reportPath = path.resolve(readArgValue('--report') ?? DEFAULT_REPORT_PATH);
const writeBaseline = hasArg('--write-baseline');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function collectMetrics() {
  const files = walk(SRC_DIR)
    .filter((f) => TS_EXT.has(path.extname(f)))
    .sort((a, b) => a.localeCompare(b));

  const byFile = {};
  const hashes = {};
  let asAny = 0;
  let filesOver500 = 0;
  let filesOver1000 = 0;

  for (const full of files) {
    const rel = path.relative(process.cwd(), full).replace(/\\/g, '/');
    const text = fs.readFileSync(full, 'utf8');
    hashes[rel] = createHash('sha256').update(text).digest('hex');
    const asAnyCount = (text.match(/\sas\s+any\b/g) ?? []).length;
    const lines = text.split('\n').length;
    const over500 = lines > OVER_500_LIMIT;
    const over1000 = lines > OVER_1000_LIMIT;

    if (asAnyCount > 0 || over500 || over1000) {
      byFile[rel] = { lines, asAny: asAnyCount };
    }

    asAny += asAnyCount;
    if (over500) filesOver500 += 1;
    if (over1000) filesOver1000 += 1;
  }

  return {
    totals: { asAny, filesOver500, filesOver1000 },
    files: byFile,
    hashes,
  };
}

function buildBaseline(metrics) {
  return {
    version: 1,
    root: 'src',
    limits: metrics.totals,
    note:
      'Structural debt ratchet baseline. Lower counts are allowed; any new or expanded over-budget file, or added as-any cast, fails audit:structural.',
    files: metrics.files,
  };
}

function loadBaseline(file) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing structural baseline at ${path.relative(process.cwd(), file)}. ` +
        'Run `node scripts/audit-structural-budgets.mjs --write-baseline` after reviewing the baseline intentionally.'
    );
  }
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (parsed.version !== 1 || !parsed.limits || !parsed.files) {
    throw new Error(`Unsupported structural baseline format in ${path.relative(process.cwd(), file)}`);
  }
  return parsed;
}

const metrics = collectMetrics();

if (writeBaseline) {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  fs.writeFileSync(baselinePath, `${JSON.stringify(buildBaseline(metrics), null, 2)}\n`);
  console.log(`Structural baseline written: ${path.relative(process.cwd(), baselinePath)}`);
  console.log(`- as any count: ${metrics.totals.asAny}`);
  console.log(`- files >500 lines: ${metrics.totals.filesOver500}`);
  console.log(`- files >1000 lines: ${metrics.totals.filesOver1000}`);
  process.exit(0);
}

let baseline;
let ledger;
try {
  baseline = loadBaseline(baselinePath);
  ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const result = evaluateStructural(metrics, baseline, ledger, INHERITED_REVISION);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`);
if (hasArg('--json')) console.log(JSON.stringify(result));
const log = result.passed ? console.log : console.error;
log(`Structural budgets ${result.passed ? 'OK' : 'FAILED'}: ${result.rawViolations.length} raw violations, ${result.proposedExceptions.length} proposed exceptions, ${result.acceptedExceptions.length} accepted exceptions, ${result.unacceptedViolations.length} unaccepted violations, ${result.invalidExceptions.length} invalid exceptions, ${result.aggregateFailures.length} aggregate failures`);
log(`Full inventory: ${path.relative(process.cwd(), reportPath)}`);
if (result.reviewFailure) log(`- ${result.reviewFailure}`);
for (const item of result.unacceptedViolations) log(`- ${item.path} [${item.rule}]: ${item.current} > ${item.old} (excess ${item.excess})`);
for (const item of result.invalidExceptions) log(`- ${item}`);
for (const item of result.aggregateFailures) log(`- ${item.rule}: ${item.current} > ${item.old} (excess ${item.excess})`);
if (!result.passed) process.exitCode = 1;
