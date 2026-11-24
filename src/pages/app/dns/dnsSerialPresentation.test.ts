import { describe, expect, it } from 'vitest';
import type { DnsZone } from '../../../lib/api/dns';
import { dnsConfiguredSerialText, dnsReportedSerialText, knownDnsSerial } from './dnsSerialPresentation';

const t = (key: string) => key;
const zone = (values: Record<string, unknown>): DnsZone => ({ id: 1, ...values }) as DnsZone;

describe('DNS serial evidence boundaries', () => {
  it('does not present a secondary stored default as an observed primary serial', () => {
    expect(dnsConfiguredSerialText(zone({ source: 'external_source', serial: 1 }), t)).toBe(
      'dns.zone.serial.primary_managed'
    );
    expect(dnsReportedSerialText(2026111401, t)).toBe('2026111401');
  });
  it('retains configured and independently reported primary values without declaring readiness', () => {
    expect(dnsConfiguredSerialText(zone({ source: 'internal_source', serial: 101 }), t)).toBe('101');
    expect(dnsReportedSerialText(100, t)).toBe('100');
  });
  it.each(['external', 'secondary_source'])('preserves the existing secondary source alias %s', (source) => {
    expect(dnsConfiguredSerialText(zone({ source, serial: 1 }), t)).toBe('dns.zone.serial.primary_managed');
  });
  it('honors the existing secondary-type fallback before reading the counter', () => {
    expect(dnsConfiguredSerialText(zone({ type: 'secondary_type', serial: 1 }), t)).toBe(
      'dns.zone.serial.primary_managed'
    );
  });
  it('does not infer a configured primary from an unknown zone kind', () => {
    expect(dnsConfiguredSerialText(zone({ serial: 1 }), t)).toBe('dns.zone.serial.unknown');
  });
  it.each([0, 0xffffffff])('keeps the valid boundary serial %s as exact digits', (value) => {
    expect(knownDnsSerial(value)).toBe(value);
    expect(dnsReportedSerialText(value, t)).toBe(String(value));
    expect(dnsConfiguredSerialText(zone({ source: 'internal_source', serial: value }), t)).toBe(String(value));
  });
  it.each([undefined, null, '', '100', -1, 1.5, NaN, Infinity, 0x100000000])(
    'keeps an absent or invalid serial unknown: %s',
    (value) => {
      expect(knownDnsSerial(value)).toBeNull();
      expect(dnsReportedSerialText(value, t)).toBe('dns.zone.serial.unknown');
      expect(dnsConfiguredSerialText(zone({ source: 'internal_source', serial: value }), t)).toBe(
        'dns.zone.serial.unknown'
      );
    }
  );
});
