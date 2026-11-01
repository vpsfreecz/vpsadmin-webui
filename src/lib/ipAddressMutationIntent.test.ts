import { describe, expect, it } from 'vitest';

import type { IpAddress } from './api/ipAddresses';
import {
  ipOwnerUpdateIntent,
  ipRouteAssignIntent,
  ipRouteFreeIntent,
  reconcileIpAddressMutation,
} from './ipAddressMutationIntent';
import type { LocalLock } from './localLocks';

function ip(overrides: Partial<IpAddress> = {}): IpAddress {
  return {
    id: 10,
    addr: '198.51.100.10',
    network_interface: null,
    user: { id: 7 },
    charged_environment: { id: 3 },
    ...overrides,
  };
}

function lock(intent: NonNullable<LocalLock['intent']>): Pick<LocalLock, 'kind' | 'intent'> {
  return { kind: 'IpAddress', intent };
}

describe('IP address mutation intent reconciliation', () => {
  it('clears an assignment only for the exact interface and VPS target', () => {
    const intent = ipRouteAssignIntent(ip(), 501, 123)!;

    expect(reconcileIpAddressMutation(lock(intent), ip({
      network_interface: { id: 501, vps: { id: 123 } },
    }))).toBe('clear');
    expect(reconcileIpAddressMutation(lock(intent), ip({
      network_interface: { id: 502, vps: { id: 123 } },
    }))).toBe('busy');
    expect(reconcileIpAddressMutation(lock(intent), ip({
      network_interface: { id: 501, vps: { id: 124 } },
    }))).toBe('busy');
  });

  it('clears a route removal only after the route is detached', () => {
    const assigned = ip({ network_interface: { id: 501, vps: { id: 123 } } });
    const intent = ipRouteFreeIntent(assigned)!;

    expect(reconcileIpAddressMutation(lock(intent), assigned)).toBe('busy');
    expect(reconcileIpAddressMutation(lock(intent), ip())).toBe('clear');
  });

  it('clears an owner update only for the exact user and environment target', () => {
    const intent = ipOwnerUpdateIntent(ip(), 77, 4)!;

    expect(reconcileIpAddressMutation(lock(intent), ip({
      user: { id: 77 },
      charged_environment: { id: 4 },
    }))).toBe('clear');
    expect(reconcileIpAddressMutation(lock(intent), ip({
      user: { id: 77 },
      charged_environment: { id: 5 },
    }))).toBe('busy');
    expect(reconcileIpAddressMutation(lock(intent), ip({
      user: undefined,
      charged_environment: undefined,
    }))).toBe('busy');
  });

  it('fails closed for a missing intent and rejects invalid or no-op constructors', () => {
    expect(reconcileIpAddressMutation({ kind: 'IpAddress' }, ip())).toBe('error');
    expect(ipRouteAssignIntent(ip({ network_interface: { id: 501 } }), 501, 123)).toBeNull();
    expect(ipRouteFreeIntent(ip())).toBeNull();
    expect(ipOwnerUpdateIntent(ip(), 7, 3)).toBeNull();
    expect(ipOwnerUpdateIntent(ip(), 77, null)).toBeNull();
  });
});

it('does not clear uncertain writes from omitted or partial associations', () => {
  const assigned = ip({ network_interface: { id: 501, vps: { id: 123 } } });
  const free = ipRouteFreeIntent(assigned)!;
  expect(reconcileIpAddressMutation(lock(free), ip({ network_interface: undefined }))).toBe('busy');
  expect(reconcileIpAddressMutation(lock(free), ip({ network_interface: {} }))).toBe('busy');
  expect(ipRouteAssignIntent(ip({ network_interface: undefined }), 501, 123)).toBeNull();
  expect(ipOwnerUpdateIntent(ip({ user: undefined }), null, null)).toBeNull();
  const clearOwner = ipOwnerUpdateIntent(ip(), null, null)!;
  expect(reconcileIpAddressMutation(lock(clearOwner), ip({ user: undefined, charged_environment: undefined }))).toBe('busy');
  expect(reconcileIpAddressMutation(lock(clearOwner), ip({ user: null, charged_environment: null }))).toBe('clear');
});
