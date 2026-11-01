import { fetchIpAddresses, type IpAddress } from '../../../lib/api/ipAddresses';
import { fetchIpAddressAssignments, type IpAddressAssignment } from '../../../lib/api/networking';
import { resourceId } from './IpAddressAssignmentModel';

interface ScopedIpAddress {
  ip: IpAddress;
  vpsId: number | null;
}

export function assignmentIpAddress(assignment: IpAddressAssignment): ScopedIpAddress | null {
  const source = assignment.ip_address;
  if (!source || typeof source !== 'object' || !resourceId(source)) return null;

  const id = resourceId(source);
  if (id === null) return null;
  const ip: IpAddress = {
    ...source,
    id,
    addr: source.addr ?? assignment.ip_addr,
    prefix: source.prefix ?? assignment.ip_prefix,
  };
  return { ip, vpsId: ipVpsId(ip) ?? resourceId(assignment.vps) };
}

export async function fetchAssignedIpAddresses(
  userId: number | undefined,
  allowedVpsIds: Set<number>
): Promise<ScopedIpAddress[]> {
  const assignments = (
    await fetchIpAddressAssignments({
      limit: 250,
      user: userId,
      active: true,
      order: 'newest',
      includes:
        'ip_address,ip_address__network,ip_address__network__primary_location,' +
        'ip_address__network__primary_location__environment,' +
        'ip_address__network_interface,ip_address__network_interface__vps,vps',
    })
  ).data;
  const seen = new Set<number>();
  const scopedRows = assignments.flatMap((assignment) => {
    const scoped = assignmentIpAddress(assignment);
    if (!scoped || seen.has(scoped.ip.id) || scoped.vpsId === null || !allowedVpsIds.has(scoped.vpsId)) return [];
    seen.add(scoped.ip.id);
    return [scoped];
  });

  // Some API versions return only id/addr for assignment.ip_address even when
  // nested includes are requested. Read current allocations through the scoped
  // VPS list endpoint, which resolves these relations. Never infer ownership
  // or an interface from the assignment actor/history alone.
  const unresolvedVpsIds = [
    ...new Set(
      scopedRows
        .filter(({ ip }) => ip.user === undefined || ip.network_interface === undefined || ipVpsId(ip) === null)
        .map(({ vpsId }) => vpsId!)
    ),
  ];
  const currentByVps = new Map<number, Map<number, IpAddress>>();
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, unresolvedVpsIds.length) }, async () => {
      while (next < unresolvedVpsIds.length) {
        const vpsId = unresolvedVpsIds[next++]!;
        const current = (
          await fetchIpAddresses({
            vps: vpsId,
            limit: 250,
            includes: 'network__primary_location__environment,network_interface__vps',
          })
        ).data;
        currentByVps.set(
          vpsId,
          new Map(current.filter((ip) => ipVpsId(ip) === null || ipVpsId(ip) === vpsId).map((ip) => [ip.id, ip]))
        );
      }
    })
  );
  return scopedRows.flatMap((row) => {
    const current = currentByVps.get(row.vpsId!);
    if (!current) return [row];
    const ip = current.get(row.ip.id);
    // An assignment may have ended/moved since the history query. Do not keep
    // its stale VPS link when the current scoped allocation list lacks it.
    return ip ? [{ ip, vpsId: row.vpsId }] : [];
  });
}

function interfaceId(ip: IpAddress): number | null {
  return resourceId(ip.network_interface);
}

export function interfaceName(ip: IpAddress): string {
  const networkInterface = ip.network_interface;
  const id = interfaceId(ip);
  if (!networkInterface || typeof networkInterface !== 'object') return id ? `#${id}` : '—';
  return String(networkInterface.name ?? networkInterface['label'] ?? '').trim() || (id ? `#${id}` : '—');
}

export function ipVpsId(ip: IpAddress): number | null {
  return resourceId(ip.network_interface?.vps);
}

/** Assignment identity is not proof of allocation ownership. */
export function ipOwnership(ip: IpAddress, userId: number | null): boolean | null {
  if (!userId) return null;
  if (ip.user === null) return false;
  const ownerId = resourceId(ip.user);
  return ownerId === null ? null : ownerId === userId;
}
