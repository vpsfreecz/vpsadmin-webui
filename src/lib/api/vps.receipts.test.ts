import { apiWire } from '../../test/haveapiXhr';
import { describe, expect, test, vi } from 'vitest';
import { fetchVpsList, vpsStart } from './vps';
function mockFetchOk(response: unknown) { return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, response }) }); }
function lastFetchCall() { return vi.mocked(apiWire.respond).mock.calls.at(-1)!; }
describe('generated VPS actual-package receipts', () => {
  test('generated client list preserves actual-XHR metadata, nullable rows and partial included associations', async () => {
    const row = {
      id: 12, hostname: null, cpu: 0, is_running: false,
      user: { login: 'member' }, node: { location: { id: 2, environment: { label: 'test' } } },
    };
    const response = { vpses: [row], _meta: { total_count: 1, extra: false } };
    apiWire.respond = mockFetchOk(response);

    const result = await fetchVpsList({ includes: 'user,node__location__environment', count: true });

    expect(result.data).toEqual([row]);
    expect(result.meta).toEqual(response._meta);
    expect(result.httpStatus).toBe(200);
    expect(result.envelope).toEqual({ status: true, response });
    expect(result.data[0]?.user).not.toHaveProperty('level');
    expect(result.data[0]?.user).not.toHaveProperty('id');
  });

  test('generated client start preserves the actual-XHR action receipt without replaying the request', async () => {
    const response = { vps: {}, _meta: { action_state_id: 81, extra: false } };
    apiWire.respond = mockFetchOk(response);

    const result = await vpsStart(12);

    expect(result.meta).toEqual(response._meta);
    expect(result.envelope).toEqual({ status: true, response });
    expect(result.httpStatus).toBe(200);
    expect(apiWire.respond).toHaveBeenCalledOnce();
    const [url, init] = lastFetchCall();
    expect(new URL(url).pathname).toBe('/v7.0/vpses/12/start');
    expect(init?.method).toBe('POST');
  });

});
