import type { ActionResult } from 'vpsadmin-typescript-client';
import { ApiOutputError } from './apiOutput';
import type { AdminIncidentEvaluation, AdminIncidentExposure, AdminIncidentPageMeta } from './adminIncidentModels';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const integer = (value: unknown): value is number =>
  Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
const positive = (value: unknown) => integer(value) && value > 0;
const date = (value: unknown) =>
  typeof value === 'string' &&
  /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:?\d\d)$/.test(value) &&
  Number.isFinite(Date.parse(value));
const string = (value: unknown) => typeof value === 'string';
const boolean = (value: unknown) => typeof value === 'boolean';

function fields(
  row: Record<string, unknown>,
  keys: readonly string[],
  check: (value: unknown) => boolean,
  nullable = false
) {
  return keys.every((key) => Object.hasOwn(row, key) && ((nullable && row[key] === null) || check(row[key])));
}

function reference(value: unknown, label: string) {
  return object(value) && positive(value['id']) && string(value[label]);
}

function exposure(value: unknown): value is AdminIncidentExposure {
  if (
    !object(value) ||
    !object(value['vps']) ||
    value['id'] !== `${String(value['vps']['id'])}:${String(value['policy_key'])}`
  )
    return false;
  if (
    value['configuration_valid'] === true &&
    (!positive(value['warning_limit']) ||
      !positive(value['stop_limit']) ||
      !['clear', 'near_limit', 'warning', 'stop_threshold'].includes(String(value['status'])))
  )
    return false;
  return (
    object(value) &&
    string(value['id']) &&
    value['id'] !== '' &&
    reference(value['vps'], 'hostname') &&
    reference(value['user'], 'login') &&
    reference(value['node'], 'domain_name') &&
    fields(value, ['policy_key', 'label', 'global_mode', 'outstanding_stop_state'], string) &&
    fields(value, ['owner_active', 'transfer_pending', 'configuration_valid'], boolean) &&
    fields(value, ['warning_permitted', 'stop_enforced'], boolean, true) &&
    fields(value, ['count_7d', 'count_30d'], integer) &&
    value['warning_period_days'] === 7 &&
    value['stop_period_days'] === 30 &&
    fields(
      value,
      [
        'warning_limit',
        'stop_limit',
        'warning_remaining',
        'stop_remaining',
        'outstanding_stop_action_id',
        'outstanding_stop_chain_id',
        'latest_action_id',
        'latest_action_chain_id',
        'latest_notice_report_id',
      ],
      integer,
      true
    ) &&
    fields(
      value,
      ['status', 'effective_mode', 'latest_action_kind', 'latest_action_state', 'latest_mail_state'],
      string,
      true
    ) &&
    fields(
      value,
      [
        'last_incident_at',
        'last_warning_at',
        'next_warning_allowed_at',
        'last_stop_at',
        'next_stop_allowed_at',
        'accounting_since',
        'latest_stop_completed_at',
      ],
      date,
      true
    )
  );
}

function evaluation(value: unknown): value is AdminIncidentEvaluation {
  return (
    object(value) &&
    positive(value['id']) &&
    positive(value['incident_report_id']) &&
    fields(value, ['vps_id', 'user_id'], positive, true) &&
    fields(value, ['hostname', 'user_login'], string, true) &&
    fields(value, ['policy_key', 'label', 'state', 'decision'], string) &&
    date(value['evaluated_at']) &&
    fields(value, ['matched', 'stop_enforced'], boolean, true) &&
    value['warning_period_days'] === 7 &&
    value['stop_period_days'] === 30 &&
    fields(
      value,
      [
        'count_7d',
        'count_30d',
        'warning_limit',
        'stop_limit',
        'action_id',
        'transaction_chain_id',
        'physical_stop_action_id',
        'notice_report_id',
      ],
      integer,
      true
    ) &&
    fields(value, ['effective_mode', 'threshold_status', 'action_kind', 'action_state', 'mail_state'], string, true) &&
    fields(
      value,
      [
        'detected_at',
        'action_created_at',
        'action_updated_at',
        'stop_completed_at',
        'mail_queued_at',
        'mail_finished_at',
      ],
      date,
      true
    )
  );
}

function metadata(
  value: unknown,
  count: number,
  expected: { offset: number; limit: number; as_of?: string },
  history: boolean
): value is AdminIncidentPageMeta {
  if (
    !object(value) ||
    !integer(value['total_count']) ||
    value['offset'] !== expected.offset ||
    value['limit'] !== expected.limit ||
    !date(value['as_of']) ||
    !date(value['read_at']) ||
    (expected.as_of !== undefined && Date.parse(String(value['as_of'])) !== Date.parse(expected.as_of)) ||
    count > expected.limit ||
    !fields(value, ['next_offset'], integer, true)
  )
    return false;
  const end = expected.offset + count;
  if (count > 0 && end > value['total_count']) return false;
  if (
    value['next_offset'] !== (end < value['total_count'] ? end : null) ||
    (count === 0 && value['next_offset'] != null)
  )
    return false;
  if (!history) return true;
  if (!fields(value, ['from', 'to'], date, true)) return false;
  if ((value['from'] === null) !== (value['to'] === null)) return false;
  return value['from'] === null || Date.parse(String(value['from'])) < Date.parse(String(value['to']));
}

/** Narrow actual generated results while preserving their HTTP/envelope receipt. */
export function readAdminIncidentPage(
  result: ActionResult<unknown>,
  view: 'overview',
  expected: { offset: number; limit: number; as_of?: string }
): ActionResult<AdminIncidentExposure[], AdminIncidentPageMeta>;
export function readAdminIncidentPage(
  result: ActionResult<unknown>,
  view: 'history',
  expected: { offset: number; limit: number; as_of?: string }
): ActionResult<AdminIncidentEvaluation[], AdminIncidentPageMeta>;
export function readAdminIncidentPage(
  result: ActionResult<unknown>,
  view: 'overview' | 'history',
  expected: { offset: number; limit: number; as_of?: string }
): ActionResult<AdminIncidentExposure[] | AdminIncidentEvaluation[], AdminIncidentPageMeta> {
  const rows: unknown = result.data;
  if (Array.isArray(rows) && metadata(result.meta, rows.length, expected, view === 'history')) {
    if (new Set(rows.map((row) => (object(row) ? row['id'] : undefined))).size !== rows.length)
      throw new ApiOutputError('duplicate admin incident identity', result);
    if (view === 'overview' && rows.every(exposure)) return { ...result, data: rows, meta: result.meta };
    if (view === 'history' && rows.every(evaluation)) return { ...result, data: rows, meta: result.meta };
  }
  throw new ApiOutputError('admin incident policy page', result);
}
