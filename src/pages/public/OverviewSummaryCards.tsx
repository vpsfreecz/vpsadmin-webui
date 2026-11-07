import React from 'react';

import { useI18n } from '../../app/i18n';
import { SummaryGrid } from '../../components/layout/SummaryGrid';
import { StatCard } from '../../components/ui/StatCard';
import type { PublicClusterStats } from '../../lib/api/public';

function loadingValue(loading: boolean, error: boolean, value: React.ReactNode): React.ReactNode {
  if (loading) return <span className="text-muted">…</span>;
  if (error) return '—';
  return value;
}

export function OverviewSummaryCards(props: {
  stats?: PublicClusterStats;
  statsLoading: boolean;
  statsError: boolean;
}) {
  const i18n = useI18n();

  return (
    <div data-testid="public.summary-row">
      <SummaryGrid testId="public.summary-grid">
        <div className="md:col-span-6">
          <StatCard
            bodyClassName="px-3 py-3"
            testId="public.stats.members"
            title={i18n.t('public.overview.stats.members.title')}
            value={loadingValue(props.statsLoading, props.statsError, props.stats?.user_count ?? '—')}
          />
        </div>

        <div className="md:col-span-6">
          <StatCard
            bodyClassName="px-3 py-3"
            testId="public.stats.vps"
            title={i18n.t('public.overview.stats.vps.title')}
            value={loadingValue(props.statsLoading, props.statsError, props.stats?.vps_count ?? '—')}
          />
        </div>
      </SummaryGrid>
    </div>
  );
}
