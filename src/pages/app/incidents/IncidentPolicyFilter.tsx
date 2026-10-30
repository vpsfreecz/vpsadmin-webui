import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import { fetchIncidentPolicies, fetchIncidentPolicyCapabilities } from '../../../lib/api/incidentPolicies';
import { Select } from '../../../components/ui/Select';
import { Alert } from '../../../components/ui/Alert';
import { ErrorState } from '../../../components/ui/ErrorState';

/** One cached registry for the list, never a lookup for each report row. */
export function IncidentPolicyFilter() {
  const { basePath } = useAppMode();
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const selected = params.get('policy_key') ?? '';
  const capabilities = useQuery({
    queryKey: ['incident_policy', 'capabilities', basePath],
    queryFn: fetchIncidentPolicyCapabilities,
    staleTime: 60_000,
  });
  const registry = useQuery({
    queryKey: ['incident_policy', 'registry', basePath],
    queryFn: fetchIncidentPolicies,
    enabled: capabilities.data?.data.policies === true,
    staleTime: 60_000,
  });
  const policies = registry.data?.data ?? [];
  const options = [
    { value: '', label: t('incidentEscalation.allPolicies') },
    ...policies.map((policy) => ({ value: policy.key, label: policy.label })),
    ...(selected && !policies.some((policy) => policy.key === selected) ? [{ value: selected, label: selected }] : []),
  ];
  const failed = capabilities.isError || registry.isError;
  return (
    <div className="min-w-0 space-y-2" data-testid="incidents.policyFilter">
      <Select
        ariaLabel={t('incidentEscalation.type')}
        value={selected}
        disabled={failed || !registry.isSuccess || capabilities.data?.data.policies !== true}
        options={options}
        onChange={(event) => {
          const next = new URLSearchParams(params);
          if (event.target.value) next.set('policy_key', event.target.value);
          else next.delete('policy_key');
          next.delete('from_id');
          next.set('page', '1');
          setParams(next, { flushSync: true });
        }}
      />
      {failed ? (
        <ErrorState
          title={t('incidentEscalation.loadError')}
          error={capabilities.error ?? registry.error}
          onRetry={() => {
            if (capabilities.isError) void capabilities.refetch();
            else void registry.refetch();
          }}
          showDetails={false}
          showBack={false}
          showStatusLink={false}
        />
      ) : capabilities.isSuccess && !capabilities.data.data.policies ? (
        <Alert variant="info">{t('incidentEscalation.unavailable')}</Alert>
      ) : null}
    </div>
  );
}
