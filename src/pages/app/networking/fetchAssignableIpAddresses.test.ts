import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchIpAddresses, type IpAddress } from '../../../lib/api/ipAddresses';
import { fetchAssignableIpAddresses } from './fetchAssignableIpAddresses';

vi.mock('../../../lib/api/ipAddresses', () => ({ fetchIpAddresses: vi.fn() }));
const fetchAddresses = vi.mocked(fetchIpAddresses);
const ip: IpAddress = {
  id: 42, addr: '10.108.0.42', prefix: 32,
  network: { id: 12, ip_version: 4, role: 'private_access', purpose: 'any',
    primary_location: { id: 10, environment: { id: 1 } } },
};
function respond(rows: IpAddress[]) {
  fetchAddresses.mockResolvedValueOnce({ data: rows, meta: {}, envelope: { status: true } });
}
beforeEach(() => vi.resetAllMocks());

describe('assignment candidates', () => {
  test('trusts secondary-location availability and requests compatible network purposes', async () => {
    respond([ip]);
    const signal = new AbortController().signal;
    expect(await fetchAssignableIpAddresses(11, 'ipv4_private', [], signal)).toEqual([ip]);
    expect(fetchAddresses).toHaveBeenCalledWith(expect.objectContaining({
      location: 11, version: 4, role: 'private_access', usableFor: 'vps',
      assignedToInterface: false, signal,
    }));
    expect(fetchAddresses.mock.calls[0]?.[0]).not.toHaveProperty('purpose');
  });

  test('revalidates a preselected address outside the first page using the same filters', async () => {
    respond([]); respond([ip]);
    expect(await fetchAssignableIpAddresses(11, 'ipv4_private', [ip, ip])).toEqual([ip]);
    expect(fetchAddresses).toHaveBeenCalledTimes(2);
    expect(fetchAddresses).toHaveBeenLastCalledWith(expect.objectContaining({
      location: 11, usableFor: 'vps', assignedToInterface: false,
      network: 12, addr: ip.addr, prefix: 32, limit: 1,
    }));
  });

  test('does not inject cached addresses from unavailable networks or return a different ID', async () => {
    respond([]); respond([{ ...ip, id: 77 }]);
    expect(await fetchAssignableIpAddresses(99, 'ipv4_private', [ip])).toEqual([]);
  });

  test('does not present an API failure as an empty successful list', async () => {
    fetchAddresses.mockRejectedValueOnce(new Error('permission denied'));
    await expect(fetchAssignableIpAddresses(11, 'ipv4_private')).rejects.toThrow('permission denied');
  });

  test('fails closed when revalidating a reserved address fails', async () => {
    respond([]); fetchAddresses.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(fetchAssignableIpAddresses(11, 'ipv4_private', [ip])).rejects.toThrow('network unavailable');
  });

  test('does not re-fetch visible candidates or offer assigned/wrong-family records', async () => {
    respond([ip, ip, { ...ip, id: 43, network_interface: { id: 7 } }]);
    expect(await fetchAssignableIpAddresses(11, 'ipv4_private', [ip])).toEqual([ip]);
    expect(fetchAddresses).toHaveBeenCalledTimes(1);
    respond([{ ...ip, network: { ...ip.network!, role: 'public_access' } }]);
    expect(await fetchAssignableIpAddresses(11, 'ipv4_private')).toEqual([]);
  });
});
