import type { ActionResult } from 'vpsadmin-typescript-client';
import { ApiOutputError } from './apiOutput';
import type { PressureHistoryDay, PressureHistoryMeta, VpsPressureRow } from './vpsPressureModels';

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const positive = (value: unknown): value is number => integer(value) && value > 0;
const timestamp = (value: unknown): value is string =>
  typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const nullable = (value: unknown, check: (value: unknown) => boolean) => value === null || check(value);
const reference = (value: unknown, label: string) =>
  object(value) && positive(value['id']) && typeof value[label] === 'string';

function row(value: unknown): value is VpsPressureRow {
  if (!object(value) || !object(value['vps']) || !reference(value['vps'], 'hostname')) return false;
  if (
    typeof value['signal'] !== 'string' ||
    !value['signal'] ||
    value['id'] !== `${String(value['vps']['id'])}:${value['signal']}`
  )
    return false;
  return (
    typeof value['label'] === 'string' &&
    typeof value['configuration_valid'] === 'boolean' &&
    nullable(value['credit_us'], integer) &&
    ['window_seconds', 'threshold_seconds'].every((key) => nullable(value[key], positive)) &&
    ['window_from', 'window_to', 'last_observed_at'].every((key) => nullable(value[key], timestamp)) &&
    ['reporting_enabled', 'window_complete'].every((key) => nullable(value[key], (v) => typeof v === 'boolean')) &&
    ['no_data', 'fresh', 'stale'].includes(String(value['observation_state'])) &&
    (value['user'] === undefined || reference(value['user'], 'login')) &&
    (value['node'] === undefined || value['node'] === null || reference(value['node'], 'domain_name')) &&
    (value['configuration_valid'] !== true ||
      (positive(value['window_seconds']) &&
        positive(value['threshold_seconds']) &&
        timestamp(value['window_from']) &&
        timestamp(value['window_to'])))
  );
}

export interface PressureReadMeta extends Record<string, unknown> {
  read_at: string;
  configuration_valid: boolean;
  unavailable_signals: string[];
}
export interface PressurePageMeta extends PressureReadMeta {
  offset: number;
  limit: number;
  next_offset: number | null;
  total_count: number;
}

function metadata(value: unknown): value is PressureReadMeta {
  return (
    object(value) &&
    timestamp(value['read_at']) &&
    typeof value['configuration_valid'] === 'boolean' &&
    Array.isArray(value['unavailable_signals']) &&
    value['unavailable_signals'].every((signal) => signal === 'rtnl_latency') &&
    new Set(value['unavailable_signals']).size === value['unavailable_signals'].length
  );
}

export function readPressureDetail(
  result: ActionResult<unknown>,
  vpsId: number
): ActionResult<VpsPressureRow[], PressureReadMeta> {
  if (
    Array.isArray(result.data) &&
    result.data.every((item) => row(item) && item.vps.id === vpsId) &&
    new Set(result.data.map((item: VpsPressureRow) => item.id)).size === result.data.length &&
    metadata(result.meta)
  ) {
    return { ...result, data: result.data, meta: result.meta };
  }
  throw new ApiOutputError('memory pressure detail', result);
}

export function readPressurePage(
  result: ActionResult<unknown>,
  expected: { offset: number; limit: number; vps?: number; user?: number }
): ActionResult<VpsPressureRow[], PressurePageMeta> {
  const meta = result.meta;
  if (
    Array.isArray(result.data) &&
    result.data.every(
      (item) =>
        row(item) &&
        item.credit_us !== null &&
        item.credit_us > 0 &&
        (expected.vps === undefined || item.vps.id === expected.vps) &&
        (expected.user === undefined || item.user?.id === expected.user)
    ) &&
    new Set(result.data.map((item: VpsPressureRow) => item.id)).size === result.data.length &&
    metadata(meta) &&
    meta['offset'] === expected.offset &&
    meta['limit'] === expected.limit &&
    integer(meta['total_count']) &&
    result.data.length <= expected.limit
  ) {
    const end = expected.offset + result.data.length;
    const nextOffset = result.data.length > 0 && end < meta['total_count'] ? end : null;
    if ((result.data.length === 0 || end <= meta['total_count']) && meta['next_offset'] === nextOffset) {
      return {
        ...result,
        data: result.data,
        meta: {
          ...meta,
          offset: expected.offset,
          limit: expected.limit,
          total_count: meta['total_count'],
          next_offset: nextOffset,
        },
      };
    }
  }
  throw new ApiOutputError('memory pressure overview', result);
}

const dayMs = 86_400_000;
function historyMetadata(value: unknown): value is PressureHistoryMeta {
  return (
    object(value) &&
    timestamp(value['read_at']) &&
    value['timezone'] === 'UTC' &&
    timestamp(value['range_from']) &&
    timestamp(value['range_to']) &&
    nullable(value['total_recorded_us'], positive) &&
    nullable(value['first_recorded_at'], timestamp) &&
    nullable(value['accounting_since'], timestamp) &&
    typeof value['ownership_limited'] === 'boolean' &&
    typeof value['available'] === 'boolean'
  );
}

/** Calendar bounds include today's next midnight; read_at does not clip the final bucket. */
export function readPressureHistory(
  result: ActionResult<unknown>,
  days: 7 | 30
): ActionResult<PressureHistoryDay[], PressureHistoryMeta> {
  const meta = result.meta;
  const rows: unknown = result.data;
  if (!historyMetadata(meta) || !Array.isArray(rows) || rows.length !== days)
    throw new ApiOutputError('memory pressure history', result);
  const now = new Date(meta.read_at);
  const isAvailable = meta.available;
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const from = midnight - (days - 1) * dayMs;
  if (Date.parse(meta.range_from) !== from || Date.parse(meta.range_to) !== midnight + dayMs)
    throw new ApiOutputError('memory pressure history range', result);
  let total = 0;
  function bucket(value: unknown, index: number): value is PressureHistoryDay {
    if (
      !object(value) ||
      !timestamp(value['from_at']) ||
      !timestamp(value['to_at']) ||
      !nullable(value['recorded_us'], positive)
    )
      return false;
    if (
      Date.parse(value['from_at']) !== from + index * dayMs ||
      Date.parse(value['to_at']) !== from + (index + 1) * dayMs ||
      value['partial_day'] !== (index === days - 1)
    )
      return false;
    if (!isAvailable && value['recorded_us'] !== null) return false;
    if (positive(value['recorded_us'])) total += value['recorded_us'];
    return true;
  }
  if (
    rows.every(bucket) &&
    Number.isSafeInteger(total) &&
    meta.total_recorded_us === (total || null) &&
    (meta.available || meta.first_recorded_at === null)
  ) {
    // First recording is acceptance time across the retained 32 days, independently of this range.
    return { ...result, data: rows, meta };
  }
  throw new ApiOutputError('memory pressure history', result);
}
