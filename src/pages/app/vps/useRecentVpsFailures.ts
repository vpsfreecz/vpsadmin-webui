import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchTransactionChains } from '../../../lib/api/transactions';
import {
  buildRecentVpsFailures,
  mergeTransactionChains,
  recentFailureEvaluationTime,
  type RecentVpsFailures,
} from './recentVpsFailures';

export function useRecentVpsFailures(refetchInterval: number): RecentVpsFailures {
  const failedChainsQ = useQuery({
    queryKey: ['transaction_chain', 'recent-failed', { limit: 200 }],
    queryFn: async () => {
      const [failed, fatal] = await Promise.all([
        fetchTransactionChains({ state: 'failed', limit: 200 }),
        fetchTransactionChains({ state: 'fatal', limit: 200 }),
      ]);
      return mergeTransactionChains([failed.data, fatal.data]);
    },
    refetchInterval,
  });

  const evaluatedAt = recentFailureEvaluationTime(failedChainsQ.dataUpdatedAt, failedChainsQ.errorUpdatedAt);
  return useMemo(() => buildRecentVpsFailures(failedChainsQ.data, evaluatedAt), [failedChainsQ.data, evaluatedAt]);
}
