import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { ApiOutputError } from './apiOutput';
import { fetchAuthenticatedNodeStatus, fetchPublicNodeStatus, fetchPublicStats } from './public';

beforeEach(() => {
  window.vpsAdmin = { api: { url: 'https://public-status.example.test/mount', version: '7.0' }, accessToken: 'private' };
});
afterEach(() => { window.vpsAdmin = undefined; });
const reply = (response: unknown) => new Response(JSON.stringify({ status: true, response }), { status: 200 });

describe('generated public status views', () => {
  it('preserves real zero counts and the whole anonymous receipt', async () => {
    const data = { user_count: 0, vps_count: 0, ipv4_left: 0 };
    const wire = { cluster: data };
    installHaveApiXhr(() => reply(wire));
    expect(await fetchPublicStats()).toEqual({ data, meta: {}, envelope: { status: true, response: wire }, httpStatus: 200 });
    expect(apiWire.requests[0]).toMatchObject({ url: 'https://public-status.example.test/mount/v7.0/cluster/public_stats', headers: { Accept: 'application/json' } });
  });

  it('preserves nullable optional node facts and partial location data without inventing identity', async () => {
    const node = { name: 'node1', status: false, fqdn: null, cpu_idle: 0, location: { label: 'location1' } };
    installHaveApiXhr(() => reply({ nodes: [node] }));
    expect((await fetchPublicNodeStatus()).data).toEqual([node]);
    expect(apiWire.requests).toHaveLength(1);
    expect(apiWire.requests[0]!.headers).toEqual({ Accept: 'application/json' });
  });

  it('uses authenticated status for stable node identities while public calls remain anonymous', async () => {
    window.vpsAdmin = {
      api: { url: 'https://node-identities.example.test', version: '7.0' },
      sessionToken: 'synthetic-member-session',
      webuiNext: { haveApi: { authHeader: 'X-HaveAPI-Auth-Token', metaNamespace: '_meta' } },
    };
    const publicRow = { name: 'same-name', status: false, location: { id: 1 } };
    installHaveApiXhr((_url, init) => reply({ nodes: [
      new Headers(init?.headers).has('X-HaveAPI-Auth-Token') ? { ...publicRow, id: 7 } : publicRow,
    ] }));
    expect((await fetchPublicNodeStatus()).data).toEqual([publicRow]);
    expect((await fetchAuthenticatedNodeStatus()).data).toEqual([{ ...publicRow, id: 7 }]);
    expect(apiWire.requests[0]!.headers).toEqual({ Accept: 'application/json' });
    expect(apiWire.requests[1]!.headers['X-HaveAPI-Auth-Token']).toBe('synthetic-member-session');
  });

  it.each([undefined, null, '7', 0, -1])('rejects unavailable authenticated node identity: %j', async id => {
    window.vpsAdmin = {
      api: { url: 'https://node-identities.example.test', version: '7.0' },
      sessionToken: 'synthetic-member-session',
      webuiNext: { haveApi: { authHeader: 'X-HaveAPI-Auth-Token', metaNamespace: '_meta' } },
    };
    installHaveApiXhr(() => reply({ nodes: [{ id, name: 'node', status: true }] }));
    await expect(fetchAuthenticatedNodeStatus()).rejects.toBeInstanceOf(ApiOutputError);
  });

  it.each([{ user_count: null, vps_count: 0, ipv4_left: 0 }, { user_count: 1, ipv4_left: 0 }])(
    'fails on missing required displayed counts instead of showing invented zero: %j', async data => {
      installHaveApiXhr(() => reply({ cluster: data }));
      const error = await fetchPublicStats().catch(value => value);
      expect(error).toBeInstanceOf(ApiOutputError);
      expect(error.result.data).toEqual(data);
    },
  );

  it.each([{ name: 'node1' }, { status: true }, { name: 'node1', status: true, location: { id: -1 } }])(
    'keeps malformed node output explicit: %j', async node => {
      installHaveApiXhr(() => reply({ nodes: [node] }));
      await expect(fetchPublicNodeStatus()).rejects.toBeInstanceOf(ApiOutputError);
    },
  );
});
