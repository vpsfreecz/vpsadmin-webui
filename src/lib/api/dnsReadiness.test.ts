import { afterEach, describe, expect, test, vi } from 'vitest';
import { installHaveApiXhr } from '../../test/haveapiXhr';
import { fetchDnsReadinessCapabilities, fetchDnsPrimaryTransferStates } from './dnsReadiness';
import { fetchDnsZoneTransfers } from './dnsTransfers';

afterEach(() => {
  vi.unstubAllGlobals();
});

function reply(response: unknown) {
  const fetchMock = vi.fn(
    async (..._args: Parameters<typeof fetch>) =>
      new Response(JSON.stringify({ status: true, response }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  );
  installHaveApiXhr(fetchMock);
  return fetchMock;
}

describe('DNS readiness capabilities through actual generated SDK', () => {
  test('generated path operation preserves stale status, currentness and response receipt', async () => {
    const fetchMock = reply({
      dns_server_zone_primary_transfer_states: [
        {
          id: 7,
          status: 'success',
          evidence_current: false,
          last_attempt_kind: 'ixfr_probe',
          last_success_at: '2026-11-08T12:00:00Z',
          dns_zone_transfer: { id: 3 },
        },
      ],
      _meta: { total_count: 1 },
    });
    const result = await fetchDnsPrimaryTransferStates({ dnsZone: 42, fromId: 6, limit: 25 });
    const url = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(url.pathname).toBe('/v7.0/dns_server_zone_primary_transfer_states');
    expect(url.searchParams.get('dns_server_zone_primary_transfer_state[from_id]')).toBe('6');
    expect(url.searchParams.get('dns_server_zone_primary_transfer_state[dns_zone]')).toBe('42');
    expect(result.data[0]).toMatchObject({ id: 7, status: 'success', evidence_current: false });
    expect(result.meta).toMatchObject({ total_count: 1 });
    expect(result.httpStatus).toBe(200);
  });

  test('old API description does not grant any new reads', async () => {
    const fetchMock = reply({ resources: {} });
    expect((await fetchDnsReadinessCapabilities()).data).toEqual({
      paths: false,
      aggregates: false,
      serving: false,
      sources: false,
    });
    expect(fetchMock.mock.calls.at(-1)?.[1]?.method).toBe('OPTIONS');
  });

  test('a partial or wrongly typed feature is unavailable', async () => {
    reply({
      resources: {
        dns_server_zone: { actions: { index: { output: { parameters: { zone_status: { type: 'String' } } } } } },
        dns_server_zone_primary_transfer_state: {
          actions: {
            index: {
              output: {
                parameters: {
                  status: { type: 'String' },
                  evidence_current: { type: 'String' },
                },
              },
            },
          },
        },
      },
    });
    expect((await fetchDnsReadinessCapabilities()).data).toMatchObject({ serving: true, paths: false });
  });

  test('parent attachment includes preserve explicit null and do not leak TSIG secrets', async () => {
    const fetchMock = reply({
      dns_zone_transfers: [
        {
          id: 3,
          host_ip_address: { id: 4, ip_address: { id: 5, user: { id: 10 }, network_interface: null } },
          dns_tsig_key: { id: 6, secret: 'synthetic-secret' },
        },
      ],
    });
    const result = await fetchDnsZoneTransfers({ dns_zone: 42, peer_type: 'primary_type', limit: 1 });
    const url = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(url.searchParams.get('_meta[includes]')).toContain('host_ip_address__ip_address__network_interface');
    expect(url.searchParams.get('_meta[includes]')).toContain('host_ip_address__ip_address__user');
    expect(url.searchParams.get('dns_zone_transfer[peer_type]')).toBe('primary_type');
    expect(url.searchParams.has('dns_zone_transfer[from_id]')).toBe(false);
    expect(result.data[0]?.host_ip_address?.ip_address?.network_interface).toBeNull();
    expect(JSON.stringify(result)).not.toContain('synthetic-secret');
  });
});
