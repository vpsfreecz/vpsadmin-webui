import { describe, expect, test } from 'vitest';

import { dnsZoneDnssecState, dnsZoneKind, dnsZoneTransferPeerType, isSecondaryDnsZone } from './DnsZoneModel';

describe('DnsZoneModel', () => {
  test('treats external source zones as secondary zones', () => {
    expect(isSecondaryDnsZone({ id: 1, source: 'external_source' })).toBe(true);
    expect(isSecondaryDnsZone({ id: 1, source: 'external' })).toBe(true);
  });

  test('keeps internal source zones as primary/editable zones', () => {
    expect(isSecondaryDnsZone({ id: 1, source: 'internal_source' })).toBe(false);
    expect(isSecondaryDnsZone({ id: 1, source: 'internal' })).toBe(false);
  });

  test('falls back to explicit secondary type fields', () => {
    expect(isSecondaryDnsZone({ id: 1, type: 'secondary_type' })).toBe(true);
    expect(isSecondaryDnsZone({ id: 1, zone_type: 'secondary' })).toBe(true);
  });

  test('derives the opposite transfer peer role from the zone source', () => {
    expect(dnsZoneTransferPeerType({ id: 1, source: 'internal_source' })).toBe('secondary_type');
    expect(dnsZoneTransferPeerType({ id: 2, source: 'external_source' })).toBe('primary_type');
  });
});

describe('zone presentation semantics', () => {
  test.each(['forward_role', 'reverse_role'])('keeps %s independent of primary/secondary', (role) => {
    expect(dnsZoneKind({ id: 1, role, source: 'internal_source' })).toBe('primary');
    expect(dnsZoneKind({ id: 1, role, source: 'external_source' })).toBe('secondary');
  });
  test.each([true, false, undefined])('does not infer secondary DNSSEC from the local flag %s', (dnssec_enabled) => {
    expect(dnsZoneDnssecState({ id: 1, source: 'external_source', dnssec_enabled })).toBeNull();
  });
  test('preserves unknown kind/signing state instead of inventing primary or unsigned', () => {
    expect(dnsZoneKind({ id: 1 })).toBeNull();
    expect(dnsZoneDnssecState({ id: 1, dnssec_enabled: false })).toBeNull();
    expect(dnsZoneDnssecState({ id: 1, source: 'internal_source' })).toBeNull();
    expect(dnsZoneDnssecState({ id: 1, source: 'internal_source', dnssec_enabled: true })).toBe('enabled');
    expect(dnsZoneDnssecState({ id: 1, source: 'internal_source', dnssec_enabled: false })).toBe('disabled');
  });
});
