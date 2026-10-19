import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTransactionChains, type TransactionChain } from '../../../lib/api/transactions';
import {
  buildRecentVpsFailures,
  mergeTransactionChains,
  recentFailureEvaluationTime,
  recentVpsFailureChains,
  type RecentVpsFailures,
} from './recentVpsFailures';

function useRecentFailures(
  scope: { className: 'Vps'; rowId: number } | undefined,
  limit: number,
  refetchInterval: number,
  enabled = true
): RecentVpsFailures {
  const failedChainsQ = useQuery({
    queryKey: ['transaction_chain', 'recent-failed', { ...scope, limit }],
    queryFn: async () => {
      const [failed, fatal] = await Promise.all([
        fetchTransactionChains({ ...scope, state: 'failed', limit }),
        fetchTransactionChains({ ...scope, state: 'fatal', limit }),
      ]);
      return mergeTransactionChains([failed.data, fatal.data]);
    },
    enabled: enabled && (scope === undefined || (Number.isFinite(scope.rowId) && scope.rowId > 0)),
    refetchInterval,
  });

  const evaluatedAt = recentFailureEvaluationTime(failedChainsQ.dataUpdatedAt, failedChainsQ.errorUpdatedAt);
  return useMemo(() => buildRecentVpsFailures(failedChainsQ.data, evaluatedAt), [failedChainsQ.data, evaluatedAt]);
}

export function useRecentVpsFailures(refetchInterval: number): RecentVpsFailures {
  return useRecentFailures(undefined, 200, refetchInterval);
}

export function useLatestRecentVpsFailure(
  vpsId: number,
  refetchInterval: number,
  enabled: boolean
): TransactionChain | undefined {
  const failures = useRecentFailures({ className: 'Vps', rowId: vpsId }, 1, refetchInterval, enabled);
  return recentVpsFailureChains(failures, vpsId)[0];
}
