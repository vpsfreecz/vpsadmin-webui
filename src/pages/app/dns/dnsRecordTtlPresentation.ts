import { DNS_TTL_MAX, DNS_TTL_MIN } from './dnsTtlContract';

export function knownDnsTtlSeconds(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= DNS_TTL_MIN && value <= DNS_TTL_MAX
    ? value
    : null;
}

export function dnsRecordTtlPresentation(ttl: unknown, zoneDefaultTtl: unknown): {
  kind: 'explicit' | 'inherited' | 'unknown';
  seconds: number | null;
} {
  if (ttl === null) return { kind: 'inherited', seconds: knownDnsTtlSeconds(zoneDefaultTtl) };
  const seconds = knownDnsTtlSeconds(ttl);
  return seconds === null ? { kind: 'unknown', seconds: null } : { kind: 'explicit', seconds };
}
