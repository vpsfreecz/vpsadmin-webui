import type { ActionDescription, ApiDescription } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { pressureFilterKeys } from './vpsPressureModels';

export const pressureFields = [
  'id',
  'vps',
  'hostname',
  'signal',
  'label',
  'configuration_valid',
  'credit_us',
  'window_from',
  'window_to',
  'window_seconds',
  'threshold_seconds',
  'reporting_enabled',
  'observation_state',
  'window_complete',
  'last_observed_at',
] as const;
const readMeta = ['read_at', 'configuration_valid', 'unavailable_signals'];
export const pressureHistoryFields = ['from_at', 'to_at', 'recorded_us', 'partial_day'] as const;
export const pressureHistoryMetaFields = [
  'read_at',
  'timezone',
  'range_from',
  'range_to',
  'total_recorded_us',
  'first_recorded_at',
  'accounting_since',
  'ownership_limited',
  'available',
] as const;

function present(fields: unknown, keys: readonly string[]) {
  return (
    typeof fields === 'object' &&
    fields !== null &&
    !Array.isArray(fields) &&
    keys.every((key) => {
      const value: unknown = (fields as Record<string, unknown>)[key];
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    })
  );
}

function available(
  action: ActionDescription | null | undefined,
  inputs: readonly string[],
  fields: readonly string[],
  meta: readonly string[]
) {
  return Boolean(
    action &&
    action.method === 'GET' &&
    action.output?.layout === 'object_list' &&
    (inputs.length === 0 || present(action.input?.parameters, inputs)) &&
    present(action.output.parameters, fields) &&
    present(action.meta?.global?.output?.parameters, meta)
  );
}

export function vpsPressureCapabilities(description: ApiDescription) {
  const overview = description.resources?.['vps_evidence']?.actions?.['index'];
  const detail = description.resources?.['vps']?.resources?.['evidence']?.actions?.['index'];
  const history = description.resources?.['vps_pressure_history']?.actions?.['index'];
  return {
    overview: available(overview, ['offset', 'limit'], pressureFields, [
      ...readMeta,
      'offset',
      'limit',
      'next_offset',
      'total_count',
    ]),
    detail: available(detail, [], pressureFields, readMeta),
    history: available(history, ['vps', 'days'], pressureHistoryFields, pressureHistoryMetaFields),
    filters: pressureFilterKeys.filter((key) => present(overview?.input?.parameters, [key])),
  };
}

/** Authenticated discovery is permission-filtered; app mode still determines visible scope. */
export async function fetchVpsPressureCapabilities() {
  return narrowApiResult(await (await getApi()).describe(), vpsPressureCapabilities, 'memory pressure capabilities');
}
