import { describe, expect, it } from 'vitest';
import { HaveApiError, isAmbiguousMutationError } from '../../../lib/api/apiErrors';
import { requestResolveFailure } from './RequestResolveFailure';

function rejection(message: string, status: number) {
  const error = new HaveApiError({ status: false, message }, message, status);
  error.failure = 'api';
  return error;
}

describe('request resolution failure reasons', () => {
  it.each([422, 500])('explains exhausted IPv4 without reclassifying HTTP %i', (status) => {
    const error = rejection('no ipv4 address available', status);
    expect(requestResolveFailure(error, 'Localized IPv4 reason')).toBe('Localized IPv4 reason');
    expect(isAmbiguousMutationError(error)).toBe(status === 500);
  });

  it('retains other server reasons without confusing private IPv4 or IPv6 exhaustion', () => {
    for (const message of ['no ipv4_private address available', 'no ipv6 address available', 'location is disabled']) {
      expect(requestResolveFailure(rejection(message, 500), 'Localized IPv4 reason')).toBe(message);
    }
  });

  it('does not invent a server rejection after transport or protocol failure', () => {
    const protocol = rejection('no ipv4 address available', 500);
    protocol.failure = 'protocol';
    const contradictory = new HaveApiError({ status: true, message: 'no ipv4 address available' }, '', 500);
    contradictory.failure = 'api';
    for (const error of [new TypeError('no ipv4 address available'), protocol, contradictory]) {
      expect(requestResolveFailure(error, 'Localized IPv4 reason')).toBeNull();
      expect(isAmbiguousMutationError(error)).toBe(true);
    }
  });
});
