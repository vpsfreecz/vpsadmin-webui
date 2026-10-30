import type { DnsZone } from '../../../lib/api/dns';

function normalizedToken(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Zones created and edited by vpsAdmin are internal primary zones. External
 * zones are represented by the API as zones whose content is obtained from
 * another authoritative source, so the useful UI is server/transfer oriented.
 */
export function isSecondaryDnsZone(zone: DnsZone): boolean {
  const source = normalizedToken(zone.source);
  if (source === 'external_source' || source === 'external' || source === 'secondary_source') return true;

  const type = normalizedToken(zone.type ?? zone.zone_type);
  if (type === 'secondary_type' || type === 'secondary') return true;

  return false;
}

/**
 * A zone transfer peer always has the opposite authoritative role to the
 * managed zone: internal zones send to secondaries, external zones receive
 * from primaries. This is a property of the zone, not a user choice.
 */
export function dnsZoneTransferPeerType(zone: DnsZone): 'primary_type' | 'secondary_type' {
  return isSecondaryDnsZone(zone) ? 'primary_type' : 'secondary_type';
}

/** Display only a positively identified zone kind; direction is independent. */
export function dnsZoneKind(zone: DnsZone): 'primary' | 'secondary' | null {
  if (isSecondaryDnsZone(zone)) return 'secondary';
  const source = normalizedToken(zone.source);
  const type = normalizedToken(zone.type ?? zone.zone_type);
  return source === 'internal_source' || source === 'internal'
    || type === 'primary_type' || type === 'primary' ? 'primary' : null;
}

export function dnsZoneKindLabel(t: (key: string) => string, zone: DnsZone): string {
  const kind = dnsZoneKind(zone);
  return kind ? t(`dns.zones.kind.${kind}`) : t('common.na');
}

/** A secondary's local flag does not describe its upstream DNSSEC signatures. */
export function dnsZoneDnssecState(zone: DnsZone): 'enabled' | 'disabled' | null {
  if (dnsZoneKind(zone) !== 'primary') return null;
  return zone.dnssec_enabled === true ? 'enabled' : zone.dnssec_enabled === false ? 'disabled' : null;
}
