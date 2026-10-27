import type { ActionState } from '../../lib/api/actionStates';
import { resourceId, refLabel } from '../../lib/resources';
import { transactionErrorText } from '../../lib/txFormat';
import type { TrackedActionState } from './ChromeContext';

function compactActionTarget(s: ActionState): string | null {
  const row = s;
  const keys = ['object', 'vps', 'dataset', 'dns_zone', 'user', 'node', 'network', 'migration_plan', 'ip_address'];
  for (const key of keys) {
    const value = row[key];
    const id = resourceId(value);
    const label = refLabel(value);
    if (label) return label;
    if (id) return `#${id}`;
  }

  const kind = typeof row['object_type'] === 'string' ? row['object_type'] : typeof row['class_name'] === 'string' ? row['class_name'] : null;
  const rowId = resourceId(row['object_id'] ?? row['row_id']);
  if (kind && rowId) return `${kind} #${rowId}`;
  if (rowId) return `#${rowId}`;
  return null;
}

export function compactFailureSummary(value: unknown, maxLength = 180): string | null {
  const text = transactionErrorText(value).trim();
  if (!text) return null;
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength - 1)}…`;
}

export function trackedActionLabel(
  tracked: TrackedActionState | undefined,
  fallback: string,
  t: (key: any, vars?: Record<string, unknown>) => string,
): string {
  if (tracked?.actionLabelKey) {
    const translated = t(tracked.actionLabelKey);
    if (translated) return translated;
  }
  const explicit = tracked?.actionLabel?.trim();
  return explicit || fallback;
}

export function trackedTargetLabel(tracked: TrackedActionState | undefined, actionState: ActionState): string | null {
  const explicit = tracked?.objectLabel?.trim();
  return explicit || compactActionTarget(actionState);
}

