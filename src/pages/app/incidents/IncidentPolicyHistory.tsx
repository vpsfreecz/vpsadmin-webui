import { useQuery } from '@tanstack/react-query';
import { useAppMode } from '../../../app/appMode';
import { useAuth } from '../../../app/auth';
import { useI18n } from '../../../app/i18n';
import {
  fetchIncidentPolicies,
  fetchIncidentPolicyCapabilities,
  fetchIncidentPolicyEvaluations,
} from '../../../lib/api/incidentPolicies';
import type { IncidentReport } from '../../../lib/api/incidents';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Alert } from '../../../components/ui/Alert';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { IncidentPolicySavedSection } from './IncidentPolicySavedSection';
import { incidentPolicyReferencePaths } from './incidentPolicyLinks';

/** One authorized report detail; list rows never mount this reader. */
export function IncidentPolicyHistory({ report }: { report: IncidentReport }) {
  const { basePath, mode } = useAppMode();
  const auth = useAuth();
  const { t } = useI18n();
  const admin = mode === 'admin' && auth.role === 'admin';
  const capabilities = useQuery({
    queryKey: ['incident_policy', 'capabilities', basePath],
    queryFn: fetchIncidentPolicyCapabilities,
  });
  const history = useQuery({
    queryKey: ['incident_report', 'policy_evaluation', report.id, basePath],
    queryFn: () => fetchIncidentPolicyEvaluations(report.id),
    enabled: capabilities.data?.data.evaluations === true,
  });
  const rows = [...(history.data?.data ?? [])].sort((a, b) =>
    a.policy_key < b.policy_key ? -1 : a.policy_key > b.policy_key ? 1 : 0
  );
  const matched = rows.filter(
    (row) => row.matched === true && (row.state === 'recorded' || row.state === 'audit_only')
  );
  const other = admin ? rows.filter((row) => !matched.includes(row)) : [];
  // Only the included, authorized association can enable navigation; raw_vps_id is historical.
  const vpsId = report.vps?.id;
  const hasVps = typeof vpsId === 'number' && Number.isSafeInteger(vpsId) && vpsId > 0;
  const registry = useQuery({
    queryKey: ['incident_policy', 'registry', basePath],
    queryFn: fetchIncidentPolicies,
    enabled: hasVps && matched.length > 0 && capabilities.data?.data.policies === true,
  });
  if (capabilities.isError || history.isError)
    return (
      <ErrorState
        title={t('incidentEscalation.historyLoadError')}
        error={capabilities.error ?? history.error}
        onRetry={() => {
          void capabilities.refetch();
          void history.refetch();
        }}
      />
    );
  if (capabilities.isLoading || (capabilities.data?.data.evaluations && history.isLoading)) return <LoadingState />;
  // Members receive a privacy-filtered collection: empty can hide matched errors.
  // Only the administrator's exhaustive saved results can prove no match.
  const knownEmpty =
    admin &&
    capabilities.data?.data.evaluations === true &&
    history.isSuccess &&
    rows.every((row) => row.matched === false);
  const unavailable =
    !capabilities.data?.data.evaluations ||
    rows.some((row) => row.matched == null && row.state !== 'error') ||
    (!admin && history.isSuccess && matched.length === 0);
  if (!matched.length && !other.length && !unavailable && !knownEmpty) return null;
  const activeKeys = new Set(registry.data?.data.map((row) => row.key) ?? []);
  return (
    <Card testId="incidents.policyHistory">
      <CardHeader compact title={t('incidentEscalation.savedEvaluations')} />
      <CardBody compact className="space-y-4">
        {knownEmpty ? <p>{t('incidentEscalation.noMatchingPolicies')}</p> : null}
        {unavailable ? <Alert variant="info">{t('incidentEscalation.membershipUnavailable')}</Alert> : null}
        {registry.isError ? (
          <ErrorState
            title={t('incidentEscalation.loadError')}
            error={registry.error}
            onRetry={() => void registry.refetch()}
          />
        ) : null}
        {matched.map((row) => {
          const links = incidentPolicyReferencePaths(basePath, vpsId, row.policy_key, activeKeys);
          return (
            <IncidentPolicySavedSection
              key={row.policy_key}
              label={row.label ?? row.policy_key}
              warning={{ days: row.warning_period_days, count: row.count_7d, limit: row.warning_limit }}
              stop={{ days: row.stop_period_days, count: row.count_30d, limit: row.stop_limit }}
              evaluatedAt={row.evaluated_at}
              decision={row.decision}
              currentHref={links.current}
              historyHref={links.history}
            />
          );
        })}
        {other.length ? (
          <details className="text-sm" data-testid="incidents.policyHistory.other">
            <summary className="cursor-pointer text-muted">{t('incidentEscalation.otherEvaluations')}</summary>
            <div className="mt-3 space-y-3">
              {other.map((row) => (
                <section key={row.policy_key}>
                  <h3 className="break-words font-semibold">{row.label ?? row.policy_key}</h3>
                  <p className="text-muted">
                    {row.state === 'error'
                      ? t('incidentEscalation.historyState.error')
                      : row.matched === false
                        ? t('incidentEscalation.historyState.skipped')
                        : t('common.na')}
                    {row.state === 'error' && row.error_stage ? ` · ${row.error_stage}` : ''}
                    {row.state === 'error' && row.error_class ? ` · ${row.error_class}` : ''}
                  </p>
                </section>
              ))}
            </div>
          </details>
        ) : null}
      </CardBody>
    </Card>
  );
}
