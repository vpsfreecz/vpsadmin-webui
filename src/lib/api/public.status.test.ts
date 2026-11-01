import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { ApiOutputError } from './apiOutput';
import { fetchPublicNodeStatus, fetchPublicStats } from './public';

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
