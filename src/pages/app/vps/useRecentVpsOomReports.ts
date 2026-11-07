import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchOomReports } from '../../../lib/api/oom';
import { useTierSlowIntervalMs } from '../../../lib/refreshTiers';
import { RECENT_OOM_LIMIT, RECENT_OOM_WINDOW_MS, recentVpsOomReports } from './recentVpsOomReports';

export function useRecentVpsOomReports(scope: { userId?: number; vpsId?: number }) {
  const [clock, setClock] = useState(Date.now);
  const interval = useTierSlowIntervalMs();
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ['oom_reports', 'recent-vps-warning', { user: scope.userId, vps: scope.vpsId }],
    queryFn: async () =>
      (
        await fetchOomReports({
          userId: scope.userId,
          vpsId: scope.vpsId,
          sinceIso: new Date(Date.now() - RECENT_OOM_WINDOW_MS).toISOString(),
          limit: scope.vpsId === undefined ? RECENT_OOM_LIMIT : 1,
        })
      ).data,
    staleTime: interval,
    refetchInterval: interval,
    retry: false,
  });
  const now = Math.max(clock, query.dataUpdatedAt, query.errorUpdatedAt);
  return useMemo(() => recentVpsOomReports(query.data, now), [query.data, now]);
}
