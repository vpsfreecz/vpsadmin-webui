import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assignmentIpAddress, interfaceName, ipOwnership, fetchAssignedIpAddresses } from './UserNetworkAddressesModel';
import { isOwnedByUser } from './IpAddressAssignmentModel';

const mocks = vi.hoisted(() => ({ assignments: vi.fn(), ips: vi.fn() }));
vi.mock('../../../lib/api/networking', () => ({ fetchIpAddressAssignments: mocks.assignments }));
vi.mock('../../../lib/api/ipAddresses', () => ({ fetchIpAddresses: mocks.ips }));

describe('member IP address facts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('distinguishes known non-ownership from an omitted owner', () => {
    expect(ipOwnership({ id: 1, user: { id: 88 } }, 7)).toBe(false);
    expect(ipOwnership({ id: 1, user: null }, 7)).toBe(false);
    expect(ipOwnership({ id: 1 }, 7)).toBeNull();
  });
  it('keeps allocation ownership separate from the assignment owner', () => {
    const row = assignmentIpAddress({
      id: 1,
      user: { id: 7 },
      vps: { id: 123 },
      ip_address: { id: 10, user: null, network_interface: { id: 9, name: 'eth0' } },
    });
    expect(row?.vpsId).toBe(123);
    expect(interfaceName(row!.ip)).toBe('eth0');
    expect(isOwnedByUser(row!.ip, 7)).toBe(false);
  });

  it('uses a resource label or ID when a full interface is unavailable', () => {
    expect(interfaceName({ id: 1, network_interface: { id: 9, label: 'venet0' } })).toBe('venet0');
    expect(interfaceName({ id: 1, network_interface: { id: 9 } })).toBe('#9');
    expect(interfaceName({ id: 1, network_interface: null })).toBe('—');
  });

  it('does not invent an interface for routed or detached addresses', () => {
    const row = assignmentIpAddress({
      id: 1,
      vps: { id: 123 },
      ip_address: { id: 10, user: { id: 7 }, network_interface: null },
    });
    expect(row?.vpsId).toBe(123);
    expect(interfaceName(row!.ip)).toBe('—');
    expect(isOwnedByUser(row!.ip, 7)).toBe(true);
  });
});

describe('unresolved assignment hydration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reads current allocation facts only through allowed VPSes, once per VPS', async () => {
    mocks.assignments.mockResolvedValue({
      data: [
        { id: 1, vps: { id: 123 }, ip_address: { id: 10, addr: '192.0.2.1' } },
        { id: 2, vps: { id: 123 }, ip_address: { id: 11, addr: '192.0.2.2' } },
        { id: 3, vps: { id: 999 }, ip_address: { id: 99 } },
      ],
    });
    mocks.ips.mockResolvedValue({
      data: [
        { id: 10, user: null, network_interface: { id: 9, name: 'eth0', vps: { id: 123 } } },
        { id: 11, user: { id: 7 }, network_interface: { id: 9, name: 'eth0', vps: { id: 123 } } },
        { id: 99, user: { id: 88 }, network_interface: { id: 99, vps: { id: 999 } } },
      ],
    });
    const rows = await fetchAssignedIpAddresses(7, new Set([123]));
    expect(mocks.ips).toHaveBeenCalledTimes(1);
    expect(mocks.ips).toHaveBeenCalledWith(expect.objectContaining({ vps: 123, limit: 250 }));
    expect(rows.map(({ ip }) => [ip.id, interfaceName(ip), ipOwnership(ip, 7)])).toEqual([
      [10, 'eth0', false],
      [11, 'eth0', true],
    ]);
  });

  it('discards a stale assignment missing from the current VPS allocation list', async () => {
    mocks.assignments.mockResolvedValue({ data: [{ id: 1, vps: { id: 123 }, ip_address: { id: 10 } }] });
    mocks.ips.mockResolvedValue({ data: [{ id: 10, network_interface: { id: 9, vps: { id: 999 } } }] });
    expect(await fetchAssignedIpAddresses(7, new Set([123]))).toEqual([]);
  });

  it('surfaces a failed current-fact query instead of treating it as empty/unowned', async () => {
    mocks.assignments.mockResolvedValue({ data: [{ id: 1, vps: { id: 123 }, ip_address: { id: 10 } }] });
    mocks.ips.mockRejectedValue(new Error('Example API failure'));
    await expect(fetchAssignedIpAddresses(7, new Set([123]))).rejects.toThrow('Example API failure');
  });
});
