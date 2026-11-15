import { describe, expect, it } from 'vitest';
import { dnsTransferReason } from './dnsTransferPresentation';

const t = (key: string) => key;
describe('reported DNS transfer reasons', () => {
  it('uses the existing known event meaning for a refused transfer', () => {
    expect(dnsTransferReason(t, 'refused', 'REFUSED by the primary')).toBe('dns.zone.transfers.log.reason.refused');
  });
  it('keeps an unrecognized diagnostic rather than inventing a known failure', () => {
    expect(dnsTransferReason(t, 'new_reason', 'Specific server diagnostic')).toBe('Specific server diagnostic');
  });
  it('retains the unrecognized code when the API reason is empty', () => {
    expect(dnsTransferReason(t, 'new_reason', '')).toBe('new_reason');
  });
  it('retains the unrecognized code when the API reason is absent', () => {
    expect(dnsTransferReason(t, 'new_reason', undefined)).toBe('new_reason');
  });
  it('does not turn missing event evidence into a failed transfer', () => {
    expect(dnsTransferReason(t, undefined, null)).toBe('');
  });
});
