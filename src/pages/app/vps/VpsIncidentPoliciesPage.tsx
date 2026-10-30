import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppMode } from '../../../app/appMode';
import { useAuth } from '../../../app/auth';
import { useI18n } from '../../../app/i18n';
import {
  fetchIncidentPolicyCapabilities,
  fetchVpsIncidentPolicies,
  updateVpsIncidentPolicy,
} from '../../../lib/api/incidentPolicies';
import { fetchVps, updateVps } from '../../../lib/api/vps';
import { MissingActionStateError } from '../../../lib/api/apiErrors';
import { formatDateTime } from '../../../lib/format';
import { LoadingState } from '../../../components/ui/LoadingState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Alert } from '../../../components/ui/Alert';
import { useVps } from './VpsContext';
import { VpsIncidentPolicySection } from './VpsIncidentPolicySection';
import { VpsIncidentsContent } from './VpsIncidentsPage';
import { VpsIncidentSettingsEditor, type IncidentSettingsChange } from './VpsIncidentSettingsEditor';

export async function saveIncidentSettings(vpsId: number, change: IncidentSettingsChange) {
  if (change.kind === 'limits') {
    await updateVpsIncidentPolicy(vpsId, change.policyKey, {
      warning_limit_override: change.warning,
      stop_limit_override: change.shutdown,
    });
    return;
  }
  const accepted = await updateVps(vpsId, { incident_enforcement_enabled: change.allowed });
  const uncertain = new MissingActionStateError('incident permission verification', accepted);
  try {
    const fresh = (await fetchVps(vpsId)).data;
    if (fresh.id !== vpsId || fresh.incident_enforcement_enabled !== change.allowed) throw uncertain;
  } catch {
    throw uncertain;
  }
}

export function VpsIncidentPoliciesPage() {
  const { vps } = useVps();
  const { basePath, mode } = useAppMode();
  const auth = useAuth();
  const { t } = useI18n();
  const capability = useQuery({
    queryKey: ['incident_policy', 'capabilities', basePath],
    queryFn: fetchIncidentPolicyCapabilities,
  });
  const policies = useQuery({
    queryKey: ['vps', 'incident_policy', { vpsId: vps.id }, basePath],
    queryFn: () => fetchVpsIncidentPolicies(vps.id),
    enabled: capability.data?.data.policies === true,
  });
  if (capability.isLoading || policies.isLoading) return <LoadingState />;
  if (capability.isError || policies.isError)
    return (
      <ErrorState
        title={t('incidentEscalation.loadError')}
        error={capability.error ?? policies.error}
        onRetry={() => {
          void capability.refetch();
          void policies.refetch();
        }}
      />
    );
  if (!capability.data?.data.policies) return <Alert variant="info">{t('incidentEscalation.unavailable')}</Alert>;
  const admin = mode === 'admin' && auth.role === 'admin';
  const timestamp = (label: string, value: string | null | undefined) =>
    value ? (
      <div>
        <dt className="text-muted">{label}</dt>
        <dd>{formatDateTime(value)}</dd>
      </div>
    ) : null;
  return (
    <VpsIncidentsContent
      permission={typeof vps.incident_enforcement_enabled === 'boolean' ? vps.incident_enforcement_enabled : undefined}
      permissionForm={
        admin && capability.data.data.permission && typeof vps.incident_enforcement_enabled === 'boolean' ? (
          <VpsIncidentSettingsEditor
            key={`${vps.id}:permission`}
            vps={vps}
            settings={{ kind: 'permission', allowed: vps.incident_enforcement_enabled }}
            saveSettings={saveIncidentSettings}
          />
        ) : undefined
      }
      operationFeedback={
        vps.incident_action_state && vps.incident_action_state !== 'none' ? (
          <Alert variant={vps.incident_action_state === 'pending' ? 'warn' : 'danger'}>
            {t(`incidentEscalation.action.${vps.incident_action_state}`)}
            {vps.incident_action_chain_id ? (
              <Link className="ml-2 underline" to={`${basePath}/transactions/${vps.incident_action_chain_id}`}>
                {t('incidentEscalation.transaction', { id: vps.incident_action_chain_id })}
              </Link>
            ) : null}
          </Alert>
        ) : undefined
      }
      sharedDetails={
        vps.incident_last_stop_at || vps.incident_next_stop_allowed_at || vps.incident_accounting_since ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2">
              {timestamp(t('incidentEscalation.lastStop'), vps.incident_last_stop_at)}
              {timestamp(t('incidentEscalation.cooldown'), vps.incident_next_stop_allowed_at)}
              {timestamp(t('incidentEscalation.accountingSince'), vps.incident_accounting_since)}
            </dl>
            {vps.incident_next_stop_allowed_at ? (
              <p className="text-muted">{t('incidentEscalation.cooldownHint')}</p>
            ) : null}
          </>
        ) : undefined
      }
    >
      {(policies.data?.data ?? []).map((policy) => (
        <VpsIncidentPolicySection
          key={`${vps.id}:${policy.key}`}
          policyKey={policy.key}
          label={policy.label}
          description={policy.description}
          configurationValid={policy.configuration_valid}
          status={policy.status ?? null}
          warning={{ count: policy.count_7d, limit: policy.warning_limit ?? null, days: policy.warning_period_days }}
          shutdown={{ count: policy.count_30d, limit: policy.stop_limit ?? null, days: policy.stop_period_days }}
          historyHref={`${basePath}/incidents?vps=${vps.id}&policy_key=${encodeURIComponent(policy.key)}`}
          details={
            policy.last_incident_at ||
            policy.last_warning_at ||
            policy.evaluated_at ||
            policy.evaluation_report_id ||
            policy.effective_mode ||
            typeof policy.stop_enforced === 'boolean' ||
            (admin && policy.settings_category) ? (
              <>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {timestamp(t('incidentEscalation.lastIncident'), policy.last_incident_at)}
                  {timestamp(t('incidentEscalation.lastWarning'), policy.last_warning_at)}
                  {timestamp(t('incidentEscalation.evaluated'), policy.evaluated_at)}
                  {policy.effective_mode ? (
                    <div>
                      <dt className="text-muted">{t('incidentEscalation.modeLabel')}</dt>
                      <dd>{t(`incidentEscalation.modeValue.${policy.effective_mode}`)}</dd>
                    </div>
                  ) : null}
                  {typeof policy.stop_enforced === 'boolean' ? (
                    <div>
                      <dt className="text-muted">{t('incidentEscalation.automaticShutdown')}</dt>
                      <dd>
                        {t(
                          policy.stop_enforced
                            ? 'incidentEscalation.permissionAllowed'
                            : 'incidentEscalation.permissionBlocked'
                        )}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {policy.evaluation_report_id ? (
                  <Link className="block underline" to={`${basePath}/incidents/${policy.evaluation_report_id}`}>
                    {t('incidentEscalation.evaluationReport', { id: policy.evaluation_report_id })}
                  </Link>
                ) : null}
                {admin && policy.settings_category ? (
                  <Link
                    className="block underline"
                    to={`${basePath}/cluster/system-config?category=${encodeURIComponent(policy.settings_category)}`}
                  >
                    {t('incidentEscalation.policySettings')}
                  </Link>
                ) : null}
              </>
            ) : undefined
          }
          settings={
            admin &&
            capability.data.data.update &&
            policy.warning_limit_override !== undefined &&
            policy.stop_limit_override !== undefined ? (
              <VpsIncidentSettingsEditor
                key={`${vps.id}:${policy.key}`}
                vps={vps}
                saveSettings={saveIncidentSettings}
                effectiveWarning={policy.configuration_valid ? (policy.warning_limit ?? undefined) : undefined}
                effectiveShutdown={policy.configuration_valid ? (policy.stop_limit ?? undefined) : undefined}
                warningPeriod={policy.warning_period_days}
                shutdownPeriod={policy.stop_period_days}
                settings={{
                  kind: 'limits',
                  policyKey: policy.key,
                  policyLabel: policy.label,
                  warning: policy.warning_limit_override,
                  shutdown: policy.stop_limit_override,
                }}
              />
            ) : undefined
          }
        />
      ))}
    </VpsIncidentsContent>
  );
}
