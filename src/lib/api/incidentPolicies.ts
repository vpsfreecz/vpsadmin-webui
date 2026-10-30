import type {
  IncidentPolicy__ShowOutput,
  Vps__IncidentPolicy__ShowOutput,
  Vps__IncidentPolicy__UpdateInput,
  IncidentReport__PolicyEvaluation__IndexOutput,
} from 'vpsadmin-typescript-client';
import { expectArray, MissingActionStateError } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type IncidentPolicy = IncidentPolicy__ShowOutput & {
  key: string;
  label: string;
  warning_period_days: number;
  stop_period_days: number;
};
export type VpsIncidentPolicy = Vps__IncidentPolicy__ShowOutput &
  IncidentPolicy & {
    count_7d: number;
    count_30d: number;
    configuration_valid: boolean;
  };
export type IncidentPolicyLimits = Required<Vps__IncidentPolicy__UpdateInput>;
export type IncidentPolicyEvaluation = IncidentReport__PolicyEvaluation__IndexOutput[number] & { policy_key: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function strings(row: Record<string, unknown>, keys: readonly string[]) {
  return keys.every((key) => row[key] == null || typeof row[key] === 'string');
}
function numbers(row: Record<string, unknown>, keys: readonly string[]) {
  return keys.every(
    (key) => row[key] == null || (typeof row[key] === 'number' && Number.isSafeInteger(row[key]) && row[key] >= 0)
  );
}
function isPolicy(value: unknown): value is IncidentPolicy & Record<string, unknown> {
  return (
    record(value) &&
    typeof value['key'] === 'string' &&
    value['key'].length > 0 &&
    typeof value['label'] === 'string' &&
    value['label'].length > 0 &&
    positive(value['warning_period_days']) &&
    positive(value['stop_period_days']) &&
    strings(value, ['description', 'settings_category'])
  );
}
function policy(value: unknown): IncidentPolicy {
  if (!isPolicy(value)) throw new Error('Invalid incident policy metadata');
  return value;
}
function isVpsPolicy(value: unknown): value is VpsIncidentPolicy {
  if (!isPolicy(value) || !record(value)) return false;
  return (
    typeof value['configuration_valid'] === 'boolean' &&
    typeof value['count_7d'] === 'number' &&
    Number.isSafeInteger(value['count_7d']) &&
    value['count_7d'] >= 0 &&
    typeof value['count_30d'] === 'number' &&
    Number.isSafeInteger(value['count_30d']) &&
    value['count_30d'] >= 0 &&
    strings(value, [
      'global_mode',
      'effective_mode',
      'status',
      'last_incident_at',
      'last_warning_at',
      'evaluated_at',
      'evaluation_state',
    ]) &&
    numbers(value, [
      'warning_limit',
      'stop_limit',
      'warning_limit_override',
      'stop_limit_override',
      'evaluation_report_id',
    ]) &&
    (value['stop_enforced'] == null || typeof value['stop_enforced'] === 'boolean') &&
    (value['configuration_valid'] === false ||
      (positive(value['warning_limit']) &&
        positive(value['stop_limit']) &&
        ['clear', 'near_limit', 'warning', 'stop_threshold'].includes(String(value['status']))))
  );
}
function vpsPolicy(value: unknown): VpsIncidentPolicy {
  if (!isVpsPolicy(value)) throw new Error('Invalid VPS incident policy');
  return value;
}
function isEvaluation(value: unknown): value is IncidentPolicyEvaluation {
  return (
    record(value) &&
    typeof value['policy_key'] === 'string' &&
    value['policy_key'].length > 0 &&
    strings(value, ['label', 'evaluated_at', 'effective_mode', 'decision', 'state', 'error_stage', 'error_class']) &&
    numbers(value, ['count_7d', 'count_30d', 'warning_limit', 'stop_limit']) &&
    ['warning_period_days', 'stop_period_days'].every((key) => value[key] == null || positive(value[key])) &&
    (value['matched'] == null || typeof value['matched'] === 'boolean') &&
    (value['stop_enforced'] == null || typeof value['stop_enforced'] === 'boolean')
  );
}
function evaluation(value: unknown): IncidentPolicyEvaluation {
  if (!isEvaluation(value)) throw new Error('Invalid saved policy evaluation');
  return value;
}

export async function fetchIncidentPolicyCapabilities() {
  const result = await (await getApi()).describe();
  return narrowApiResult(
    result,
    (data) => {
      const registry = data.resources?.['incident_policy'];
      const scoped = data.resources?.['vps']?.resources?.['incident_policy'];
      const history = data.resources?.['incident_report']?.resources?.['policy_evaluation'];
      for (const container of [
        data.resources,
        registry,
        scoped,
        history,
        registry?.actions,
        scoped?.actions,
        history?.actions,
      ]) {
        if (container != null && !record(container)) throw new Error('Malformed incident capability');
      }
      return {
        policies: Boolean(registry?.actions?.['index'] && scoped?.actions?.['index'] && scoped.actions['show']),
        update: Boolean(
          scoped?.actions?.['update']?.input?.parameters?.['warning_limit_override'] &&
          scoped.actions['update'].input?.parameters?.['stop_limit_override']
        ),
        evaluations: Boolean(history?.actions?.['index']),
        permission: Boolean(
          data.resources?.['vps']?.actions?.['update']?.input?.parameters?.['incident_enforcement_enabled']
        ),
      };
    },
    'incident policy capabilities'
  );
}
export async function fetchIncidentPolicies() {
  return narrowApiResult(
    await (await getApi()).incident_policy.index(),
    (data) => expectArray<unknown>(data, 'incident policies').map(policy),
    'incident policies'
  );
}
export async function fetchVpsIncidentPolicies(vpsId: number) {
  return narrowApiResult(
    await (await getApi()).vps.incident_policy.index({ path: { vps_id: vpsId } }),
    (data) => expectArray<unknown>(data, 'VPS incident policies').map(vpsPolicy),
    'VPS incident policies'
  );
}
export async function fetchVpsIncidentPolicy(vpsId: number, key: string) {
  return narrowApiResult(
    await (await getApi()).vps.incident_policy.show({ path: { vps_id: vpsId, key } }),
    (data) => {
      const row = vpsPolicy(data);
      if (row.key !== key) throw new Error('Wrong policy identity');
      return row;
    },
    'VPS incident policy'
  );
}
export async function updateVpsIncidentPolicy(vpsId: number, key: string, limits: IncidentPolicyLimits) {
  const result = await (
    await getApi()
  ).vps.incident_policy.update({
    path: { vps_id: vpsId, key },
    params: { warning_limit_override: limits.warning_limit_override, stop_limit_override: limits.stop_limit_override },
  });
  // This synchronous write has been accepted. Unusable/mismatched verification
  // cannot establish rejection or permit another submission.
  try {
    const row = vpsPolicy(result.data);
    if (
      row.key !== key ||
      row.warning_limit_override !== limits.warning_limit_override ||
      row.stop_limit_override !== limits.stop_limit_override
    )
      throw new Error('Settings readback mismatch');
    return { ...result, data: row };
  } catch {
    throw new MissingActionStateError('incident policy verification', result);
  }
}
export async function fetchIncidentPolicyEvaluations(incidentReportId: number) {
  return narrowApiResult(
    await (await getApi()).incident_report.policy_evaluation.index({ path: { incident_report_id: incidentReportId } }),
    (data) => expectArray<unknown>(data, 'incident policy evaluations').map(evaluation),
    'incident policy evaluations'
  );
}
