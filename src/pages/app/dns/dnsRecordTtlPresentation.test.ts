import { describe, expect, it } from 'vitest';
import { dnsRecordTtlPresentation, knownDnsTtlSeconds } from './dnsRecordTtlPresentation';

describe('DNS TTL observation and inheritance', () => {
  it.each([60, 7200, 604800])('accepts API-supported seconds %s', value => {
    expect(knownDnsTtlSeconds(value)).toBe(value);
  });
  it.each([undefined, null, 0, 59, 604801, 60.5, NaN, Infinity, '7200', true])('does not invent a TTL from %s', value => {
    expect(knownDnsTtlSeconds(value)).toBeNull();
  });
  it('keeps an explicit override even when the zone default differs or is missing', () => {
    expect(dnsRecordTtlPresentation(600, 7200)).toEqual({ kind: 'explicit', seconds: 600 });
    expect(dnsRecordTtlPresentation(600, undefined)).toEqual({ kind: 'explicit', seconds: 600 });
  });
  it('resolves a null override only from the current known zone default', () => {
    expect(dnsRecordTtlPresentation(null, 7200)).toEqual({ kind: 'inherited', seconds: 7200 });
    expect(dnsRecordTtlPresentation(null, 600)).toEqual({ kind: 'inherited', seconds: 600 });
    expect(dnsRecordTtlPresentation(null, undefined)).toEqual({ kind: 'inherited', seconds: null });
    expect(dnsRecordTtlPresentation(null, 0)).toEqual({ kind: 'inherited', seconds: null });
  });
  it('does not treat omitted or invalid record TTL as confirmed inheritance', () => {
    expect(dnsRecordTtlPresentation(undefined, 7200)).toEqual({ kind: 'unknown', seconds: null });
    expect(dnsRecordTtlPresentation(0, 7200)).toEqual({ kind: 'unknown', seconds: null });
  });
});
