import type { DnsZone } from '../../../lib/api/dns';
import { isSecondaryDnsZone } from './DnsZoneModel';

/** SOA serials are unsigned 32-bit values; zero is a real value. */
export function knownDnsSerial(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff ? value : null;
}

/** DnsZone.serial is a configuration counter, not a primary-server response. */
export function dnsConfiguredSerialText(zone: DnsZone, t: (key: string) => string): string {
  if (isSecondaryDnsZone(zone)) return t('dns.zone.serial.primary_managed');
  const source = typeof zone.source === 'string' ? zone.source.trim().toLowerCase() : '';
  const type = String(zone['type'] ?? zone['zone_type'] ?? '')
    .trim()
    .toLowerCase();
  const primary =
    ['internal_source', 'internal', 'primary_source'].includes(source) || ['primary_type', 'primary'].includes(type);
  if (!primary) return t('dns.zone.serial.unknown');
  return dnsReportedSerialText(zone.serial, t);
}

/** A report is displayed as reported; it is never compared to infer serving. */
export function dnsReportedSerialText(value: unknown, t: (key: string) => string): string {
  const serial = knownDnsSerial(value);
  return serial === null ? t('dns.zone.serial.unknown') : String(serial);
}
