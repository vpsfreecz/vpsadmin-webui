import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/auth';
import { useI18n } from '../../app/i18n';
import type { DashboardSettings } from '../../app/dashboardSettingsModel';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useTierBIntervalMs } from '../../lib/refreshTiers';
import { ClusterHealthCard, summarizeNodes } from './DashboardOperationalCards';
import { fetchDashboardOwnNodeIds, selectDashboardOwnNodes } from './DashboardOwnNodes';

export function DashboardClusterCard(props: {
  isLoading: boolean;
  isError: boolean;
  nodeData: ReturnType<typeof summarizeNodes>;
  settings: DashboardSettings;
  onChangeSettings: (settings: DashboardSettings) => void;
  onToggleCollapsed: () => void;
  onReload?: () => void;
}) {
  const auth = useAuth();
  const { t } = useI18n();
  const onlyMine = props.settings.nodeScope === 'mine';
  const userId = auth.user?.id;
  const validUserId = Number.isSafeInteger(userId) && Number(userId) > 0;
  const refetchInterval = useTierBIntervalMs();
  const ownNodes = useQuery({
    queryKey: ['dashboard', 'own_vps_nodes', { userId: userId ?? null }],
    queryFn: ({ signal }) => fetchDashboardOwnNodeIds(userId!, signal),
    enabled: onlyMine && validUserId,
    retry: false,
    refetchInterval: onlyMine ? refetchInterval : false,
  });
  const filtered = useMemo(() => {
    if (!onlyMine) return { data: props.nodeData, error: false };
    if (!ownNodes.data) return { data: summarizeNodes([], ''), error: false };
    try {
      const allNodes = props.nodeData.byLocation.flatMap(([, group]) => group.nodes);
      return {
        data: summarizeNodes(selectDashboardOwnNodes(allNodes, ownNodes.data), t('dashboard.section.cluster.location_unknown')),
        error: false,
      };
    } catch {
      return { data: summarizeNodes([], ''), error: true };
    }
  }, [onlyMine, ownNodes.data, props.nodeData, t]);
  const membershipError = onlyMine && (ownNodes.isError || !validUserId || filtered.error);
  return (
    <ClusterHealthCard
      nodeData={filtered.data}
      density={props.settings.density}
      collapsed={props.settings.collapsedWidgets.includes('cluster')}
      onToggleCollapsed={props.onToggleCollapsed}
      isLoading={props.isLoading || (onlyMine && ownNodes.isPending && !membershipError)}
      isError={props.isError || membershipError}
      errorMessage={membershipError ? t('dashboard.section.cluster.mine.error') : undefined}
      emptyMessage={onlyMine ? t('dashboard.section.cluster.mine.empty') : undefined}
      headerControl={
        <>
        <Select
          testId="app.dashboard.cluster.scope"
          ariaLabel={t('dashboard.section.cluster.scope.label')}
          className="w-auto max-w-full"
          value={onlyMine ? 'mine' : 'all'}
          onChange={event => props.onChangeSettings({ ...props.settings, nodeScope: event.target.value === 'mine' ? 'mine' : 'all' })}
          options={[
            { value: 'all', label: t('dashboard.section.cluster.scope.all') },
            { value: 'mine', label: t('dashboard.section.cluster.scope.mine') },
          ]}
        />
        {membershipError ? (
          <Button variant="secondary" size="sm" testId="app.dashboard.cluster.scope.retry"
            disabled={!validUserId || ownNodes.isFetching}
            onClick={() => { void ownNodes.refetch(); props.onReload?.(); }}>
            {t('common.retry')}
          </Button>
        ) : null}
        </>
      }
    />
  );
}
