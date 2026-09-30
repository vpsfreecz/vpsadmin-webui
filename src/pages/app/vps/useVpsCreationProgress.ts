import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActionState } from '../../../lib/api/actionStates';
import type { TrackedActionState } from '../../../components/layout/ChromeContext';
import { resolvePendingVpsCreateActionStateId } from './VpsDetailVisibility';

export function useVpsCreationProgress(vpsId: number, locationState: unknown, tracked: TrackedActionState[], pollMs: number | false) {
  const qc = useQueryClient();
  const id = useMemo(() => resolvePendingVpsCreateActionStateId(locationState, tracked, vpsId), [locationState, tracked, vpsId]);
  const query = useQuery({
    queryKey: ['action_state', 'show', { id: id ?? -1 }],
    queryFn: async () => (await fetchActionState(id!)).data,
    enabled: id !== undefined,
    retry: false,
    refetchInterval: (q) => q.state.data?.finished ? false : pollMs,
  });
  const finished = query.data?.finished === true;
  useEffect(() => {
    if (id === undefined || !finished) return;
    // Refresh the real detail after either success or rollback, even when its
    // previous response already contained a runtime status.
    void qc.invalidateQueries({ queryKey: ['vps', 'show', { id: vpsId }] });
    void qc.invalidateQueries({ queryKey: ['ip_address', 'list', { vpsId }] });
    void qc.invalidateQueries({ queryKey: ['transaction_chain', 'list', { className: 'Vps', rowId: vpsId }] });
  }, [finished, id, qc, vpsId]);
  return { id, query, pending: id !== undefined && !finished };
}
