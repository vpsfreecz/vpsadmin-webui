import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { NodeHeatmapProvider } from '../../components/cluster/NodeHeatmaps';
import { useI18n } from '../../app/i18n';
import { getRuntimeConfig } from '../../app/config';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { fetchNews, fetchOutages, fetchPublicNodeStatus, fetchPublicStats, fetchPublicSecurityAdvisories } from '../../lib/api/public';
import { consumeSessionExpiredNotice, sessionReturnPath } from '../../lib/auth/sessionExpiredNotice';
import { withRouterBasename, withSameOriginNextParam } from '../../lib/routerPaths';
import {
  categorizePublicOutages,
  groupPublicNodesByLocation,
  summarizePublicNodes,
} from './OverviewModel';
import { OverviewNodesSection } from './OverviewNodesSection';
import { OverviewNewsCard } from './OverviewNewsCard';
import { OverviewOutagesCard } from './OverviewOutagesCard';
import { OverviewAdvisoriesCard } from './OverviewAdvisoriesCard';
import { OverviewSummaryCards } from './OverviewSummaryCards';
import { useDeferredOverviewQueries } from './useDeferredOverviewQueries';

export function OverviewPage() {
  const i18n = useI18n();
  const deferredEnabled = useDeferredOverviewQueries();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expiredNotice, setExpiredNotice] = useState<ReturnType<typeof consumeSessionExpiredNotice>>(null);
  const consumedNoticeRef = useRef(false);
  const hasSessionExpiredParam = searchParams.get('session') === 'expired';

  useEffect(() => {
    if (!consumedNoticeRef.current) {
      consumedNoticeRef.current = true;
      setExpiredNotice(consumeSessionExpiredNotice());
    }

    if (!hasSessionExpiredParam) return;
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('session');
    navigate(
      {
        pathname: location.pathname,
        search: nextParams.toString() ? `?${nextParams.toString()}` : '',
        hash: location.hash,
      },
      { replace: true },
    );
  }, [hasSessionExpiredParam, location.hash, location.pathname, location.search, navigate]);

  const cfg = getRuntimeConfig();
  const loginBase = cfg.loginUrl ?? withRouterBasename('/oauth/login', cfg.routerBasename);
  const signInHref = withSameOriginNextParam(loginBase, sessionReturnPath(expiredNotice?.pathname, cfg.routerBasename));

  const statsQ = useQuery({
    queryKey: ['cluster', 'public_stats'],
    queryFn: async () => (await fetchPublicStats()).data,
  });

  const nodesQ = useQuery({
    queryKey: ['nodes', 'public_status', { surface: 'overview' }],
    queryFn: async () => (await fetchPublicNodeStatus()).data,
    enabled: deferredEnabled,
  });

  const outagesQ = useQuery({
    queryKey: ['outages', 'index', { surface: 'overview', limit: 25 }],
    queryFn: async () => (await fetchOutages({ limit: 25 })).data,
    enabled: deferredEnabled,
  });

  const newsQ = useQuery({
    queryKey: ['news_logs', 'index', { surface: 'overview', limit: 5 }],
    queryFn: async () => (await fetchNews({ limit: 5 })).data,
    enabled: deferredEnabled,
  });

  const advisoriesQ = useQuery({
    queryKey: ['public', 'security_advisories', { surface: 'overview', state: 'published', limit: 5 }],
    queryFn: async () => (await fetchPublicSecurityAdvisories()).data,
    enabled: deferredEnabled,
  });

  const unknownLocationLabel = i18n.t('public.nodes.location_unknown');
  const outagesByCategory = useMemo(() => categorizePublicOutages(outagesQ.data ?? []), [outagesQ.data]);
  const nodesByLocation = useMemo(
    () => groupPublicNodesByLocation(nodesQ.data ?? [], unknownLocationLabel),
    [nodesQ.data, unknownLocationLabel]
  );
  const nodeSummary = useMemo(() => summarizePublicNodes(nodesByLocation), [nodesByLocation]);

  const nodesLoading = !deferredEnabled || nodesQ.isLoading;
  const outagesLoading = !deferredEnabled || outagesQ.isLoading;
  const newsLoading = !deferredEnabled || newsQ.isLoading;

  return (
    <>
      <h1 className="sr-only">{i18n.t('public.overview.title')}</h1>
      <div className="space-y-6" data-testid="public.overview.page">
        {expiredNotice ? (
          <Alert title={i18n.t('auth.session_expired.title')} variant="warn" testId="auth.session-expired.notice">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>{i18n.t('auth.session_expired.body')}</p>
              <Button as="a" href={signInHref} size="sm" testId="auth.session-expired.sign-in">
                {i18n.t('auth.action.sign_in')}
              </Button>
            </div>
          </Alert>
        ) : null}

        <OverviewOutagesCard groups={outagesByCategory} loading={outagesLoading} error={outagesQ.isError} />
        <OverviewNewsCard news={newsQ.data} newsLoading={newsLoading} newsError={newsQ.isError} />
        <OverviewAdvisoriesCard
          advisories={advisoriesQ.data}
          loading={!deferredEnabled || advisoriesQ.isLoading}
          error={advisoriesQ.isError}
        />

        <NodeHeatmapProvider>
          <OverviewNodesSection groups={nodesByLocation} summary={nodeSummary} loading={nodesLoading} error={nodesQ.isError} />
        </NodeHeatmapProvider>

        <OverviewSummaryCards
          stats={statsQ.data}
          statsLoading={statsQ.isLoading}
          statsError={statsQ.isError}
        />
        {!outagesLoading && !outagesQ.isError ? (
          <OverviewOutagesCard groups={outagesByCategory} loading={false} error={false} resolved />
        ) : null}
      </div>
    </>
  );
}
