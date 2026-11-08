import type { PublicNodeStatus } from '../../lib/api/public';
import { fetchVpsList, type Vps } from '../../lib/api/vps';

const PAGE_SIZE = 200;
const MAX_PAGES = 20;

/** Resolve the whole owned collection; never treat a truncated result as complete. */
export async function fetchDashboardOwnNodeIds(userId: number, signal?: AbortSignal): Promise<number[]> {
  if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error('Missing account identity');
  const nodes = new Set<number>();
  let fromId: number | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchVpsList({ user: userId, includes: 'node,user', limit: PAGE_SIZE, fromId, signal });
    let lastId = fromId ?? 0;
    for (const vps of result.data) {
      const nodeId = ownedNodeId(vps, userId);
      if (vps.id <= lastId) throw new Error('VPS pagination did not advance');
      lastId = vps.id;
      nodes.add(nodeId);
    }
    // Count metadata may describe the whole collection; membership needs every row.
    if (result.data.length < PAGE_SIZE) return [...nodes];
    if (lastId <= (fromId ?? 0)) throw new Error('VPS pagination did not advance');
    fromId = lastId;
  }
  throw new Error('Owned VPS collection is incomplete');
}

function ownedNodeId(vps: Vps, userId: number): number {
  const nodeId = vps.node?.id;
  if (vps.user?.id !== userId || typeof nodeId !== 'number' || !Number.isSafeInteger(nodeId) || nodeId <= 0) {
    throw new Error('Unknown VPS owner or node');
  }
  return nodeId;
}

export function selectDashboardOwnNodes(nodes: PublicNodeStatus[], ownNodeIds: number[]): PublicNodeStatus[] {
  const wanted = new Set(ownNodeIds);
  const selected = nodes.filter(node => typeof node.id === 'number' && wanted.has(node.id));
  const found = new Set(selected.map(node => node.id));
  if (ownNodeIds.some(id => !found.has(id))) throw new Error('Owned node status is unavailable');
  return selected;
}
