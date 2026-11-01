import { describe, expect, test } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { ApiOutputError } from './apiOutput';
import { fetchHostIpAddresses, hostAssignmentTarget } from './networking';
import { fetchIpAddressIndexCapability, fetchIpAddresses } from './ipAddresses';
import { fetchNetworkInterfaceAccountings } from './networkInterfaces';

function reply(response: unknown) {
  apiWire.respond = async () => ({ status: 200, json: async () => ({ status: true, response }) });
}

describe('generated network application boundary', () => {
  test('preserves nullable and partial references without inventing an owner or interface identity', async () => {
    const rows = [
      { id: 9, addr: null, user: { login: 'member' }, network: { enabled: false }, network_interface: null },
    ];
    reply({ ip_addresses: rows, _meta: { total_count: 0 } });
    const result = await fetchIpAddresses();
    expect(result.data).toEqual(rows);
    expect(result.data[0]?.user).not.toHaveProperty('id');
    expect(result.meta.total_count).toBe(0);
    expect(result.httpStatus).toBe(200);
  });

  test.each([
    { id: 0 },
    { id: 9, network_interface: { id: '12' } },
    { id: 9, network: { enabled: 0 } },
    { id: 9, network_interface: { vps: { user: { id: '12' } } } },
  ])('rejects malformed allocation identity or included values: %j', async (row) => {
    reply({ ip_addresses: [row] });
    const pending = fetchIpAddresses();
    await expect(pending).rejects.toBeInstanceOf(ApiOutputError);
    await expect(pending).rejects.toMatchObject({ phase: 'post-dispatch', result: { data: [row], httpStatus: 200 } });
  });

  test('uses generated Index description and rejects malformed availability metadata', async () => {
    reply({ input: { parameters: { network_enabled: { type: 'Boolean', nullable: false } } } });
    expect((await fetchIpAddressIndexCapability()).data.input?.parameters).toHaveProperty('network_enabled');
    const request = apiWire.requests[0]!;
    expect(request.method).toBe('OPTIONS');
    expect(new URL(request.url).pathname).toBe('/v7.0/ip_addresses');
    expect(new URL(request.url).searchParams.get('method')).toBe('GET');
    reply({ input: { parameters: { network_enabled: { type: 'String' } } } });
    await expect(fetchIpAddressIndexCapability()).rejects.toBeInstanceOf(ApiOutputError);
  });

  test('keeps an older permitted description without network availability unsupported', async () => {
    reply({ input: { parameters: { addr: { type: 'String' } } } });
    expect((await fetchIpAddressIndexCapability()).data.input?.parameters).not.toHaveProperty('network_enabled');
  });

  test('accepts composite accounting rows without fabricating a row ID', async () => {
    const rows = [{ network_interface: { name: 'eth0' }, year: 2026, month: 1, bytes_in: 0, bytes_out: null }];
    reply({ network_interface_accountings: rows });
    const result = await fetchNetworkInterfaceAccountings();
    expect(result.data).toEqual(rows);
    expect(result.data[0]).not.toHaveProperty('id');
  });

  test('requires a known unassigned host and actual routed parent identities for confirmation', async () => {
    const row = { id: 9, assigned: false, ip_address: { id: 42, network_interface: { id: 12, name: 'eth0' } } };
    reply({ host_ip_addresses: [row] });
    const host = (await fetchHostIpAddresses()).data[0]!;
    expect(hostAssignmentTarget(host)).toEqual({ parentId: 42, interfaceId: 12, interfaceName: 'eth0' });
    expect(hostAssignmentTarget({ ...host, assigned: null })).toBeUndefined();
    expect(hostAssignmentTarget({ ...host, assigned: true })).toBeUndefined();
    expect(hostAssignmentTarget({ ...host, ip_address: { id: 42, network_interface: null } })).toBeUndefined();
    expect(hostAssignmentTarget({ ...host, ip_address: { network_interface: { id: 12 } } })).toBeUndefined();
  });
});
