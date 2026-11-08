import type { DnsZoneTransfer } from '../../../lib/api/dnsTransfers';
import type { DnsPrimaryTransferState } from '../../../lib/api/dnsReadiness';
import { isId, isRecord } from '../../../lib/api/networkingViews';

export function dnsPrimaryPathStatus(path: DnsPrimaryTransferState): 'success' | 'failed' | 'pending' {
  if (path.evidence_current !== true) return 'pending';
  return path.status === 'success' || path.status === 'failed' ? path.status : 'pending';
}

/** Only explicit, authorized parent-allocation evidence can establish detachment. */
export function dnsPrimaryIsOwnedDetached(transfer: DnsZoneTransfer, zoneOwnerId?: number): boolean {
  const ip = transfer.host_ip_address?.ip_address;
  if (!isId(zoneOwnerId) || !isRecord(ip) || !isId(ip['id'])) return false;
  const metadata: unknown = ip['_meta'];
  if (isRecord(metadata) && (metadata['resolved'] === false || metadata['authorized'] === false)) return false;
  const owner = ip['user'];
  return (
    isRecord(owner) &&
    owner['id'] === zoneOwnerId &&
    Object.hasOwn(ip, 'network_interface') &&
    ip['network_interface'] === null
  );
}

export function dnsReadinessStatus(value: unknown): 'success' | 'failed' | 'pending' {
  return value === 'success' || value === 'failed' ? value : 'pending';
}
