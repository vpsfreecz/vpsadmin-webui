import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientInputError } from 'vpsadmin-typescript-client';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { rememberBffSession } from '../auth/bffSession';
import { HaveApiError, isAmbiguousMutationError, requireActionStateResult } from './apiErrors';
import { ApiOutputError, narrowApiResult } from './apiOutput';
import { getApi, getPublicApi } from './sdk';

const key = 'a'.repeat(64);
const sessionUrl = new URL('/session.json', window.location.href).href;
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
let sequence = 0;
beforeEach(() => {
  window.vpsAdmin = {
    api: { url: `https://sdk-wire-${++sequence}.example.test/mount`, version: '7.0' }, accessToken: 'old',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
  rememberBffSession(sessionUrl, key, 'old');
  document.documentElement.lang = 'cs';
});
afterEach(() => {
  rememberBffSession(sessionUrl, null);
  window.vpsAdmin = undefined; document.documentElement.lang = ''; vi.unstubAllGlobals();
});

describe('immutable generated SDK through actual HaveAPI XHR', () => {
  it('uses the generated output namespace once and preserves includes/count and raw receipt', async () => {
    const envelope = { status: true, response: { vpses: [{ id: 7, hostname: 'test' }], other: ['untouched'], _meta: { total_count: 1 } } };
    installHaveApiXhr(() => response(envelope));
    const result = await (await getApi()).vps.index({ params: { limit: 0 }, meta: { includes: 'user', count: true } });
    expect(result.data).toEqual([{ id: 7, hostname: 'test' }]);
    expect(result.meta).toEqual({ total_count: 1 });
    expect(result.envelope).toEqual(envelope);
    const request = apiWire.requests[0]!;
    expect(new URL(request.url).pathname).toBe('/mount/v7.0/vpses');
    expect(new URL(request.url).searchParams.get('vps[limit]')).toBe('0');
    expect(new URL(request.url).searchParams.get('_meta[includes]')).toBe('user');
    expect(new URL(request.url).searchParams.get('_meta[count]')).toBe('true');
    expect(request.headers).toMatchObject({ 'X-Token': 'old', 'Accept-Language': 'cs' });
  });

  it('binds custom global/object-list metadata without changing nested values or raw envelope', async () => {
    window.vpsAdmin!.webuiNext!.haveApi!.metaNamespace = 'wire_meta';
    const row = { id: 7, hostname: 'test', wire_meta: { resolved: true }, user: { id: 2, wire_meta: { untouched: true } } };
    const envelope = { status: true, response: { vpses: [row], wire_meta: { total_count: 1 } } };
    installHaveApiXhr(() => response(envelope));
    const result = await (await getApi()).vps.index({ meta: { count: true } });
    expect(result.data).toEqual([{ ...row, _meta: { resolved: true } }]);
    expect(result.meta).toEqual({ total_count: 1 });
    expect(result.envelope).toEqual(envelope);
    expect(new URL(apiWire.requests[0]!.url).searchParams.get('wire_meta[count]')).toBe('true');
  });

  it('retries a validated generated read once with the original request and new token', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ sessionKey: key, accessToken: 'new' }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetch);
    installHaveApiXhr((_url, init) => new Headers(init?.headers).get('X-Token') === 'old'
      ? response({ status: false, message: 'Unauthorized', response: null }, 401)
      : response({ status: true, response: { vpses: [], _meta: { total_count: 0 } } }));
    await (await getApi()).vps.index({ params: { limit: 0 }, meta: { count: true }, headers: { 'X-Request': 'kept' } });
    expect(fetch).toHaveBeenCalledOnce();
    expect(apiWire.requests).toHaveLength(2);
    expect(apiWire.requests[1]!.url).toBe(apiWire.requests[0]!.url);
    expect(apiWire.requests[1]!.headers).toMatchObject({ 'X-Token': 'new', 'X-Request': 'kept', 'Accept-Language': 'cs' });
  });

  it('renews a rejected generated write without automatically replaying it', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ sessionKey: key, accessToken: 'new' }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetch);
    installHaveApiXhr(() => response({ status: false, message: 'Unauthorized', response: null }, 401));
    const error = await (await getApi()).vps.start({ path: { vps_id: 7 } }).catch(value => value);
    expect(error.message).toContain('Přihlášení bylo obnoveno.');
    expect(isAmbiguousMutationError(error)).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
    expect(apiWire.requests).toHaveLength(1);
  });

  it('preserves nullable/false/zero poll inputs with the generated action path', async () => {
    installHaveApiXhr(() => response({ status: true, response: { action_state: { id: 9, finished: false, status: false, current: 0 } } }));
    const result = await (await getApi()).action_state.poll({ path: { action_state_id: 9 }, params: { status: false, current: 0, total: null, update_in: null } });
    expect(result.data).toMatchObject({ id: 9, status: false, current: 0 });
    const url = new URL(apiWire.requests[0]!.url);
    expect(url.searchParams.get('action_state[status]')).toBe('false');
    expect(url.searchParams.get('action_state[current]')).toBe('0');
    expect(url.searchParams.has('action_state[total]')).toBe(true);
  });

  it('keeps a generated async receipt and treats malformed application output as uncertain', async () => {
    const envelope = { status: true, response: { vps: {}, _meta: { action_state_id: 19 } } };
    installHaveApiXhr(() => response(envelope));
    const result = await (await getApi()).vps.start({ path: { vps_id: 7 } });
    expect(requireActionStateResult(result, 'start VPS')).toBe(result);
    const error = (() => {
      try { narrowApiResult(result, () => { throw new Error('unusable output'); }, 'start VPS'); } catch (value) { return value; }
    })();
    expect(error).toBeInstanceOf(ApiOutputError);
    expect(error).toMatchObject({ result: { envelope, httpStatus: 200, meta: { action_state_id: 19 } } });
    expect(isAmbiguousMutationError(error)).toBe(true);
  });

  it.each([401, 422])('retains contradictory HTTP %s/success evidence without renewal or write replay', async status => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const envelope = { status: true, response: { vps: {}, _meta: { action_state_id: 19 } } };
    installHaveApiXhr(() => response(envelope, status));
    const error = await (await getApi()).vps.start({ path: { vps_id: 7 } }).catch(value => value);
    expect(error).toBeInstanceOf(HaveApiError);
    expect(error).toMatchObject({ httpStatus: status, envelope, result: { envelope, httpStatus: status, meta: { action_state_id: 19 } } });
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(apiWire.requests).toHaveLength(1);
  });

  it('uses generated OPTIONS with encoded identifiers and preserves denied capability failures', async () => {
    installHaveApiXhr(() => response({ status: false, message: 'Denied', response: null }, 403));
    await expect((await getApi()).network.update.describe({ path: { network_id: 'a/b' } })).rejects.toBeInstanceOf(HaveApiError);
    expect(apiWire.requests).toHaveLength(1);
    expect(apiWire.requests[0]!.method).toBe('OPTIONS');
    expect(apiWire.requests[0]!.url).toContain('/mount/v7.0/networks/a%2Fb?method=PUT');
  });

  it('distinguishes local input rejection from actual XHR network uncertainty', async () => {
    const api = await getApi();
    const local = await api.vps.start({ path: { vps_id: '..' } }).catch(value => value);
    expect(local).toBeInstanceOf(ClientInputError);
    expect(isAmbiguousMutationError(local)).toBe(false);
    expect(apiWire.requests).toHaveLength(0);
    installHaveApiXhr(() => { throw new TypeError('network lost'); });
    const sent = await api.vps.start({ path: { vps_id: 7 } }).catch(value => value);
    expect(sent).toBeInstanceOf(TypeError);
    expect(isAmbiguousMutationError(sent)).toBe(true);
    expect(apiWire.requests).toHaveLength(1);
  });

  it('uses supplied public metadata configuration without discovery or private headers', async () => {
    window.vpsAdmin!.webuiNext = undefined;
    window.vpsAdmin!.description = { meta: { namespace: 'wire_meta' } };
    installHaveApiXhr(() => response({ status: true, response: { news_logs: [], wire_meta: { total_count: 0 } } }));
    const result = await getPublicApi().news_log.index({ meta: { count: true } });
    expect(result.meta).toEqual({ total_count: 0 });
    expect(apiWire.requests).toHaveLength(1);
    expect(apiWire.requests[0]!.headers).toEqual({ Accept: 'application/json' });
    expect(new URL(apiWire.requests[0]!.url).searchParams.get('wire_meta[count]')).toBe('true');
  });

  it('keeps public generated calls free of runtime authentication/language after private calls', async () => {
    installHaveApiXhr(() => response({ status: true, response: { vpses: [], news_logs: [] } }));
    await (await getApi()).vps.index();
    await getPublicApi().news_log.index();
    expect(apiWire.requests[1]!.headers).toEqual({ Accept: 'application/json' });
    expect(apiWire.requests[1]!.withCredentials).toBe(false);
  });
});
