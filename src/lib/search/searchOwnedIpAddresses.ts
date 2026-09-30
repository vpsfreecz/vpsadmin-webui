import { fetchIpAddresses, type IpAddress } from '../api/ipAddresses';

function positiveId(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  if (!value || typeof value !== 'object') return null;
  return positiveId((value as { id?: unknown }).id);
}

function relatedVpses(ip: IpAddress): unknown[] {
  const networkInterface = ip.network_interface;
  const nested = networkInterface && typeof networkInterface === 'object'
    ? (networkInterface as { vps?: unknown }).vps
    : undefined;

  return [ip.vps, nested].filter((candidate) => positiveId(candidate) !== null);
}

function ipAddressBelongsToUser(ip: IpAddress, expectedUserId?: number): boolean {
  const userId = positiveId(expectedUserId);
  if (userId === null) return false;

  if (positiveId(ip.user) === userId) return true;

  return relatedVpses(ip).some((vps) => (
    vps !== null
    && typeof vps === 'object'
    && positiveId((vps as { user?: unknown }).user) === userId
  ));
}

export class IncompleteIpSearchError extends Error {}

/** Search one exact address; never download the global IP inventory. */
export async function searchOwnedIpAddresses(opts: {
  addr: string;
  prefix?: number;
  scopeUserId?: number;
  isAdmin?: boolean;
  expectedUserId?: number;
  signal?: AbortSignal;
}): Promise<IpAddress[]> {
  const userId = positiveId(opts.expectedUserId) ?? positiveId(opts.scopeUserId);
  if (userId === null) return [];
  const matches = new Map<number, IpAddress>();
  const pageSize = 100;
  let fromId: number | undefined;

  for (;;) {
    const { data } = await fetchIpAddresses({
      addr: opts.addr,
      prefix: opts.prefix,
      limit: pageSize,
      fromId,
      order: 'asc',
      // `user` filters direct IP ownership, excluding addresses assigned to an
      // owned VPS. Verify both ownership paths after this exact-address query.
      includes: 'network_interface__vps__user,user',
      signal: opts.signal,
    });
    for (const ip of data) {
      if (ipAddressBelongsToUser(ip, userId)) matches.set(ip.id, ip);
    }
    if (data.length < pageSize) return [...matches.values()];

    // Admin ordering is id ASC. Member ordering is user_id DESC, id ASC and
    // cannot safely use an ID-only cursor across owner boundaries.
    if (!opts.isAdmin) {
      throw new IncompleteIpSearchError('IP search returned an incomplete page');
    }
    const nextId = Math.max(...data.map((ip) => positiveId(ip.id) ?? 0));
    if (nextId <= (fromId ?? 0)) throw new IncompleteIpSearchError('IP search pagination stalled');
    fromId = nextId;
  }
}
