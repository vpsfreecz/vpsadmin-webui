const OVER_500 = 500;
const OVER_1000 = 1000;

function violation(rule, path, oldValue, current, excess) {
  return { rule, path, old: oldValue, current, excess };
}

export function perFileViolations(metrics, baseline) {
  const found = [];
  for (const [file, current] of Object.entries(metrics.files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
    const old = baseline.files[file];
    const oldAny = Number(old?.asAny ?? 0);
    const oldLines = Number(old?.lines ?? 0);
    if (current.asAny > 0 && !old) {
      found.push(violation('new-as-any', file, 0, current.asAny, current.asAny));
    } else if (current.asAny > oldAny) {
      found.push(violation('increased-as-any', file, oldAny, current.asAny, current.asAny - oldAny));
    }
    if (current.lines > OVER_500 && oldLines <= OVER_500) {
      found.push(violation('crossed-500', file, oldLines, current.lines, current.lines - OVER_500));
    }
    if (current.lines > OVER_1000 && oldLines <= OVER_1000) {
      found.push(violation('crossed-1000', file, oldLines, current.lines, current.lines - OVER_1000));
    }
    if (old && oldLines > OVER_500 && current.lines > oldLines) {
      found.push(violation('grown-over-500', file, oldLines, current.lines, current.lines - oldLines));
    }
  }
  return found;
}

function removalCondition(violation) {
  switch (violation.rule) {
    case 'new-as-any':
    case 'increased-as-any':
      return { metric: 'asAny', atMost: violation.old };
    case 'crossed-500':
      return { metric: 'lines', atMost: OVER_500 };
    case 'crossed-1000':
      return { metric: 'lines', atMost: OVER_1000 };
    case 'grown-over-500':
      return { metric: 'lines', atMost: violation.old };
    default:
      throw new Error(`Unknown structural rule: ${violation.rule}`);
  }
}

export function evaluateStructural(metrics, baseline, ledger, sourceRevision) {
  const perFile = perFileViolations(metrics, baseline);
  const rawByKey = new Map(perFile.map((item) => [`${item.path}\0${item.rule}`, item]));
  const errors = [];
  const validatedEntries = [];
  const seen = new Set();
  const reviewed = ledger?.review?.status === 'accepted' &&
    typeof ledger.review.acceptedBy === 'string' && ledger.review.acceptedBy.trim().length > 0;
  const reviewFailure = reviewed ? null : 'Structural debt ledger awaits explicit lead acceptance';

  if (ledger?.version !== 1 || !Array.isArray(ledger.exceptions)) {
    errors.push('Unsupported structural exception ledger format');
  } else {
    for (const entry of ledger.exceptions) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push('Invalid structural exception entry; expected an object');
        continue;
      }
      const key = `${entry.path}\0${entry.rule}`;
      const prefix = `${entry.path ?? '(missing path)'} [${entry.rule ?? '(missing rule)'}]`;
      const issue = (detail) => errors.push(`${prefix}: ${detail}`);
      if (seen.has(key)) { issue('duplicate ledger entry'); continue; }
      seen.add(key);
      if (typeof entry.path !== 'string' || !/^src\/(?:[^/*]+\/)*[^/*]+\.tsx?$/.test(entry.path) || entry.path.includes('..')) {
        issue('path must name one exact TypeScript source file');
        continue;
      }
      if (!Object.hasOwn(metrics.hashes, entry.path)) { issue('deleted path'); continue; }
      const current = metrics.files[entry.path] ?? { lines: 0, asAny: 0 };
      const raw = rawByKey.get(key);
      const condition = entry.removeWhen;
      if (condition?.metric === 'lines' || condition?.metric === 'asAny') {
        if (current[condition.metric] <= condition.atMost) {
          issue('removal condition met; remove the exception');
          continue;
        }
      }
      if (!raw) { issue('stale or resolved exception; no raw violation remains'); continue; }
      if (entry.sourceRevision !== sourceRevision) { issue('wrong inherited source revision'); continue; }
      if (entry.contentHash !== metrics.hashes[entry.path]) { issue('source content hash changed; review the change or remove the exception'); continue; }
      const expectedCondition = removalCondition(raw);
      if (condition?.metric !== expectedCondition.metric || condition?.atMost !== expectedCondition.atMost) {
        issue(`invalid removal condition; expected ${JSON.stringify(expectedCondition)}`);
        continue;
      }
      if (entry.old !== raw.old || entry.allowance !== raw.current) {
        issue(`metric changed or allowance has spare capacity; expected old=${raw.old}, allowance=${raw.current}`);
        continue;
      }
      if (typeof entry.rationale !== 'string' || entry.rationale.trim().length < 25 ||
          typeof entry.owner !== 'string' || entry.owner.trim().length < 3) {
        issue('concrete rationale and owner are required');
        continue;
      }
      validatedEntries.push({
        ...raw, allowance: entry.allowance, sourceRevision: entry.sourceRevision,
        contentHash: entry.contentHash, rationale: entry.rationale, owner: entry.owner,
        removeWhen: entry.removeWhen,
      });
    }
  }

  const acceptedExceptions = reviewed ? validatedEntries : [];
  const proposedExceptions = reviewed ? [] : validatedEntries;
  const acceptedKeys = new Set(acceptedExceptions.map((item) => `${item.path}\0${item.rule}`));
  const unacceptedViolations = perFile.filter((item) => !acceptedKeys.has(`${item.path}\0${item.rule}`));
  const contribution = { asAny: 0, filesOver500: 0, filesOver1000: 0 };
  for (const item of acceptedExceptions) {
    if (item.rule === 'new-as-any' || item.rule === 'increased-as-any') contribution.asAny += item.excess;
    if (item.rule === 'crossed-500') contribution.filesOver500 += 1;
    if (item.rule === 'crossed-1000') contribution.filesOver1000 += 1;
  }

  const aggregate = {};
  const aggregateFailures = [];
  const rawViolations = [...perFile];
  for (const [metric, rule] of [
    ['asAny', 'total-as-any'], ['filesOver500', 'total-over-500'], ['filesOver1000', 'total-over-1000'],
  ]) {
    const old = Number(baseline.limits[metric]);
    const current = Number(metrics.totals[metric]);
    const excess = Math.max(0, current - old);
    // Never bank capacity from resolved files or another path. Only active,
    // reviewed per-file exceptions can cover a currently observed excess.
    const appliedAdjustment = Math.min(excess, contribution[metric]);
    const remainingExcess = excess - appliedAdjustment;
    aggregate[metric] = { old, current, excess, activeContribution: contribution[metric], appliedAdjustment, remainingExcess };
    if (excess > 0) rawViolations.push(violation(rule, null, old, current, excess));
    if (remainingExcess > 0) aggregateFailures.push(violation(rule, null, old + appliedAdjustment, current, remainingExcess));
  }

  return {
    version: 1,
    sourceRevision,
    totals: aggregate,
    rawViolations,
    acceptedExceptions,
    proposedExceptions,
    unacceptedViolations,
    invalidExceptions: errors,
    review: ledger?.review ?? null,
    reviewFailure,
    aggregateFailures,
    passed: !reviewFailure && errors.length === 0 && unacceptedViolations.length === 0 && aggregateFailures.length === 0,
  };
}
