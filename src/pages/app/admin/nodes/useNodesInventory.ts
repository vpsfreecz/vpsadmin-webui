import { useQuery } from '@tanstack/react-query';
import { fetchNodeOverview, fetchNodes } from '../../../../lib/api/nodes';
import { fetchPublicNodeStatus } from '../../../../lib/api/public';
import type { NodeStateFilter } from '../NodesModel';

export function useNodesInventory({
  limit,
  fromId,
  state,
  admin,
  refetchInterval,
}: {
  limit: number;
  fromId: number | undefined;
  state: NodeStateFilter;
  admin: boolean;
  refetchInterval: number;
}) {
  const nodesQ = useQuery({
    queryKey: [
      'nodes',
      'index',
      {
        limit: limit,
        fromId: fromId,
        state: admin && state !== 'active' ? state : undefined,
      },
    ],
    queryFn: async () =>
      (
        await fetchNodes({
          limit: limit,
          fromId: fromId,
          state: admin && state !== 'active' ? state : undefined,
        })
      ).data,
    staleTime: 15000,
    refetchInterval: refetchInterval,
  });

  const overviewQ = useQuery({
    queryKey: ['nodes', 'overview'],
    queryFn: async ({ signal }) => (await fetchNodeOverview(signal)).data,
    enabled: admin,
    retry: false,
    staleTime: 15000,
    refetchInterval: refetchInterval,
  });

  const statusQ = useQuery({
    queryKey: ['nodes', 'public_status'],
    queryFn: async () => (await fetchPublicNodeStatus()).data,
    staleTime: 15000,
    refetchInterval: refetchInterval,
  });

  return { nodesQ, statusQ, overviewQ };
}
