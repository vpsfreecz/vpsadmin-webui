import React from 'react';

import { useI18n } from '../../app/i18n';
import { SummaryGrid } from '../../components/layout/SummaryGrid';
import { Badge } from '../../components/ui/Badge';
import { StatusLandingMark } from '../../components/branding/StatusLandingMark';
import { StatCard } from '../../components/ui/StatCard';
import type { PublicClusterStats } from '../../lib/api/public';
import type { BadgeVariant } from '../../lib/taskStatus';
import type { PublicIpv4Level } from './OverviewModel';

function loadingValue(loading: boolean, error: boolean, value: React.ReactNode): React.ReactNode {
  if (loading) return <span className="text-muted">…</span>;
  if (error) return '—';
  return value;
}

export function OverviewSummaryCards(props: {
  stats?: PublicClusterStats;
  statsLoading: boolean;
  statsError: boolean;
  ipv4Left: number | null;
  ipv4Level: PublicIpv4Level;
  ipv4BadgeVariant: BadgeVariant;
}) {
  const i18n = useI18n();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center" data-testid="public.summary-row">
      <div className="shrink-0 self-start md:self-center" aria-hidden="true" data-testid="public.summary.brand">
        <StatusLandingMark className="text-accent/80" title={i18n.t('public.overview.title')} />
      </div>
      <SummaryGrid className="w-full min-w-0 flex-1" testId="public.summary-grid">
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
            footer={
              <span className="inline-flex items-center gap-2">
                <span>{i18n.t('public.overview.stats.vps.ipv4_free')}</span>
                <Badge variant={props.ipv4BadgeVariant}>{props.ipv4Left == null ? '—' : props.ipv4Left}</Badge>
                {props.ipv4Level === 'warn' ? (
                  <span className="hidden text-warn sm:inline">{i18n.t('public.overview.ipv4_warn.hint')}</span>
                ) : null}
              </span>
            }
          />
        </div>
      </SummaryGrid>
    </div>
  );
}
