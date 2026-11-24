import type {
  IncidentPolicyExposure__IndexInput,
  IncidentPolicyEvaluation__IndexInput,
} from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { readAdminIncidentPage } from './adminIncidentOutput';
import type { AdminIncidentFilters } from '../../pages/app/incidents/adminIncidentState';

/** Explicit generated inputs keep each endpoint's URL filters local. */
export async function fetchAdminIncidentExposures(filters: AdminIncidentFilters, signal?: AbortSignal) {
  const params: IncidentPolicyExposure__IndexInput = {
    offset: filters.offset,
    limit: filters.limit,
    as_of: filters.as_of,
    policy_key: filters.policy_key,
    vps: filters.vps,
    user: filters.user,
    node: filters.node,
    status: filters.status,
    effective_mode: filters.effective_mode,
    stop_enforced: filters.stop_enforced,
    sort: filters.sort,
    direction: filters.direction,
  };
  return readAdminIncidentPage(
    await (await getApi()).incident_policy_exposure.index({ params, signal }),
    'overview',
    filters
  );
}

export async function fetchAdminIncidentEvaluations(filters: AdminIncidentFilters, signal?: AbortSignal) {
  const params: IncidentPolicyEvaluation__IndexInput = {
    offset: filters.offset,
    limit: filters.limit,
    as_of: filters.as_of,
    policy_key: filters.policy_key,
    vps_id: filters.vps_id,
    user_id: filters.user_id,
    scope: filters.scope,
    from: filters.from,
    to: filters.to,
    decision: filters.decision,
    action_kind: filters.action_kind,
    action_state: filters.action_state,
    mail_state: filters.mail_state,
    direction: filters.direction,
  };
  return readAdminIncidentPage(
    await (await getApi()).incident_policy_evaluation.index({ params, signal }),
    'history',
    filters
  );
}
