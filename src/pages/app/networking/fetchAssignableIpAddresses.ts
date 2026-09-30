import { fetchIpAddresses, type IpAddress } from '../../../lib/api/ipAddresses';
import {
  assignableIpKindQuery,
  isAssignedIp,
  matchesAssignableIpKind,
  uniqueIpAddresses,
  type AssignableIpKind,
} from './IpAddressAssignmentModel';

/** LocationNetwork membership and compatible purposes are API contracts. */
export async function fetchAssignableIpAddresses(
  location: number,
  kind: AssignableIpKind,
  extraIps: IpAddress[] = [],
  signal?: AbortSignal
): Promise<IpAddress[]> {
  const filters = {
    location,
    ...assignableIpKindQuery(kind),
    usableFor: 'vps' as const,
    assignedToInterface: false,
    includes: 'network__primary_location__environment,network_interface,user,vps',
    signal,
  };
  const listed = (await fetchIpAddresses({ ...filters, limit: 50, order: 'interface' })).data;
  const listedIds = new Set(listed.map((ip) => ip.id));
  const extras = uniqueIpAddresses(extraIps).filter((ip) => (
    !listedIds.has(ip.id) && !isAssignedIp(ip) && matchesAssignableIpKind(ip, kind)
    && !!ip.addr && !!ip.network?.id && typeof ip.prefix === 'number'
  ));
  // A reserved/preselected address may fall outside the first page. Re-query
  // it with the same location/purpose filters instead of trusting cached data.
  const verified = await Promise.all(extras.map(async (ip) => {
    const response = await fetchIpAddresses({
      ...filters, network: ip.network!.id, addr: ip.addr, prefix: ip.prefix, limit: 1,
    });
    return response.data.filter((row) => row.id === ip.id);
  }));
  return uniqueIpAddresses([...verified.flat(), ...listed]).filter((ip) => (
    !isAssignedIp(ip) && matchesAssignableIpKind(ip, kind)
  ));
}
