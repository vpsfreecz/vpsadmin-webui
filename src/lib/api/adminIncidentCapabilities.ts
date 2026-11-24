import type { ActionDescription, ApiDescription } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

const commonMeta = ['total_count', 'offset', 'limit', 'next_offset', 'as_of', 'read_at'];
export const exposureFields = [
  'id',
  'vps',
  'user',
  'node',
  'policy_key',
  'label',
  'owner_active',
  'transfer_pending',
  'count_7d',
  'count_30d',
  'warning_period_days',
  'stop_period_days',
  'warning_limit',
  'stop_limit',
  'warning_remaining',
  'stop_remaining',
  'configuration_valid',
  'status',
  'global_mode',
  'effective_mode',
  'warning_permitted',
  'stop_enforced',
  'last_incident_at',
  'last_warning_at',
  'next_warning_allowed_at',
  'last_stop_at',
  'next_stop_allowed_at',
  'accounting_since',
  'outstanding_stop_state',
  'outstanding_stop_action_id',
  'outstanding_stop_chain_id',
  'latest_action_id',
  'latest_action_chain_id',
  'latest_notice_report_id',
  'latest_action_kind',
  'latest_action_state',
  'latest_mail_state',
  'latest_stop_completed_at',
] as const;
export const evaluationFields = [
  'id',
  'incident_report_id',
  'vps_id',
  'user_id',
  'hostname',
  'user_login',
  'policy_key',
  'label',
  'evaluated_at',
  'detected_at',
  'matched',
  'state',
  'warning_period_days',
  'stop_period_days',
  'count_7d',
  'count_30d',
  'warning_limit',
  'stop_limit',
  'effective_mode',
  'stop_enforced',
  'threshold_status',
  'decision',
  'action_id',
  'action_kind',
  'action_state',
  'action_created_at',
  'action_updated_at',
  'transaction_chain_id',
  'physical_stop_action_id',
  'stop_completed_at',
  'notice_report_id',
  'mail_state',
  'mail_queued_at',
  'mail_finished_at',
] as const;

function fieldsPresent(fields: unknown, names: readonly string[]) {
  return (
    typeof fields === 'object' &&
    fields !== null &&
    !Array.isArray(fields) &&
    names.every((name) => {
      const value: unknown = (fields as Record<string, unknown>)[name];
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    })
  );
}

function available(action: ActionDescription | null | undefined, fields: readonly string[], history: boolean) {
  return Boolean(
    action &&
    action.method === 'GET' &&
    action.output?.layout === 'object_list' &&
    fieldsPresent(
      action.input?.parameters,
      history
        ? [
            'offset',
            'limit',
            'as_of',
            'policy_key',
            'vps_id',
            'user_id',
            'scope',
            'from',
            'to',

            'direction',
            'decision',
            'action_kind',
            'action_state',
            'mail_state',
          ]
        : [
            'offset',
            'limit',
            'as_of',
            'policy_key',
            'vps',
            'user',
            'node',
            'status',
            'effective_mode',
            'stop_enforced',
            'sort',
            'direction',
          ]
    ) &&
    fieldsPresent(action.output.parameters, fields) &&
    fieldsPresent(action.meta?.global?.output?.parameters, history ? [...commonMeta, 'from', 'to'] : commonMeta)
  );
}

export function adminIncidentCapabilities(description: ApiDescription) {
  return {
    overview: available(description.resources?.['incident_policy_exposure']?.actions?.['index'], exposureFields, false),
    history: available(
      description.resources?.['incident_policy_evaluation']?.actions?.['index'],
      evaluationFields,
      true
    ),
  };
}

/** Authenticated discovery is permission-filtered; the page also requires admin. */
export async function fetchAdminIncidentCapabilities() {
  return narrowApiResult(await (await getApi()).describe(), adminIncidentCapabilities, 'admin incident capabilities');
}
