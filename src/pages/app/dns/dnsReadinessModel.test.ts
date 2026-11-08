import { describe, expect, test } from 'vitest';
import type { IpReference } from '../../../lib/api/networkingViews';
import type { DnsZoneTransfer } from '../../../lib/api/dnsTransfers';
import { dnsPrimaryIsOwnedDetached, dnsPrimaryPathStatus } from './dnsReadinessModel';

describe('DNS evidence and allocation attachment', () => {
  test('old success and failed evidence are both pending without current evidence', () => {
    for (const status of ['success', 'failed', 'unknown']) {
      for (const evidence_current of [undefined, false]) {
        expect(dnsPrimaryPathStatus({ id: 1, status, evidence_current })).toBe('pending');
      }
    }
    expect(dnsPrimaryPathStatus({ id: 1, status: 'unknown', evidence_current: true })).toBe('pending');
    expect(dnsPrimaryPathStatus({ id: 1, status: 'failed', evidence_current: true })).toBe('failed');
    expect(dnsPrimaryPathStatus({ id: 1, status: 'success', evidence_current: true })).toBe('success');
  });

  const transfer = (ip: unknown): DnsZoneTransfer => ({
    id: 3,
    host_ip_address: { id: 4, ip_address: ip as IpReference },
  });

  test('only an explicit matching owner and null interface establish owned-detached', () => {
    const row: DnsZoneTransfer = {
      id: 3,
      host_ip_address: { id: 4, ip_address: { id: 5, user: { id: 10 }, network_interface: null } },
    };
    expect(dnsPrimaryIsOwnedDetached(row, 10)).toBe(true);
    expect(dnsPrimaryIsOwnedDetached(row, 11)).toBe(false);
    expect(dnsPrimaryIsOwnedDetached(row)).toBe(false);
    row.host_ip_address!.ip_address!.network_interface = { id: 6 };
    expect(dnsPrimaryIsOwnedDetached(row, 10)).toBe(false);
  });

  test.each([
    undefined,
    null,
    {},
    { id: 5 },
    { id: 5, user: { id: 10 } },
    { id: 5, network_interface: null },
    { id: 5, user: { id: 10 }, network_interface: undefined },
    { id: 5, user: { id: 10 }, network_interface: { _meta: { resolved: false, authorized: false } } },
    { id: 5, user: { id: 10 }, network_interface: null, _meta: { resolved: false } },
  ])('unavailable expansion remains unknown: %j', (ip) => {
    expect(dnsPrimaryIsOwnedDetached(transfer(ip), 10)).toBe(false);
  });

  test('host assigned flag cannot substitute for parent attachment', () => {
    expect(dnsPrimaryIsOwnedDetached({ id: 3, host_ip_address: { id: 4, assigned: false } }, 10)).toBe(false);
  });
});
