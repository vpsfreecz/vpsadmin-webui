import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { rememberBffSession } from '../auth/bffSession';
import { AsyncError } from 'haveapi-client';
import { requestHaveApi } from './haveapiRequestClient';
import {
  haveApiCall,
  publicHaveApiCall,
  HaveApiError,
  isAmbiguousMutationError,
  MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE,
  requireActionStateResult,
} from './haveapi';

const sessionUrl = new URL('/session.json', window.location.href).href;
const key = 'a'.repeat(64);
const json = (response: unknown, status = 200) => new Response(JSON.stringify(response), { status });
const ok = (response: unknown) => json({ status: true, response });
beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: '7.0' },
    accessToken: 'old',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
  rememberBffSession(sessionUrl, key, 'old');
});
afterEach(() => {
  rememberBffSession(sessionUrl, null);
  window.vpsAdmin = undefined;
  document.documentElement.lang = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('production HaveAPI AsyncClient requests', () => {
  it('uses actual XHR without a parallel fetch transport or description setup', async () => {
    const fetch = vi.fn(() => {
      throw new Error('HaveAPI must use the installed client');
    });
    vi.stubGlobal('fetch', fetch);
    const send = vi.fn(async () => ok({ things: [7] }));
    installHaveApiXhr(send);
    expect((await haveApiCall({ path: 'things' })).data).toEqual([7]);
    expect(send).toHaveBeenCalledOnce();
    expect(apiWire.requests[0]).toMatchObject({
      method: 'GET',
      url: 'https://api.example.test/v7.0/things',
      withCredentials: false,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reads scalar getters once and keeps original query/language across auth renewal', async () => {
    document.documentElement.lang = 'cs';
    let reads = 0;
    const params = Object.defineProperty({}, 'owner', { enumerable: true, get: () => ++reads });
    const send = vi.fn(async (_url: string, init?: RequestInit) =>
      new Headers(init?.headers).get('X-Token') === 'old'
        ? json({ status: false, message: 'Unauthorized', response: null }, 401)
        : ok({ things: [7] })
    );
    installHaveApiXhr(send);
    const sessionFetch = vi.fn(async () => {
      document.documentElement.lang = 'en';
      return new Response(JSON.stringify({ sessionKey: key, accessToken: 'new' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', sessionFetch);
    await haveApiCall({ path: '/things', namespace: 'thing', params });
    expect(reads).toBe(1);
    expect(sessionFetch).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledTimes(2);
    const [first, second] = apiWire.requests;
    expect(second?.url).toBe(first?.url);
    expect(new URL(second!.url).searchParams.get('thing[owner]')).toBe('1');
    expect(second?.headers).toMatchObject({ 'Accept-Language': 'cs', 'X-Token': 'new' });
  });

  it('omits unnamespaced params and rejects non-scalar query fields before XHR', async () => {
    installHaveApiXhr(async () => ok({ things: [] }));
    await haveApiCall({ path: '/things', params: { ignored: 3 } });
    expect(new URL(apiWire.requests[0]!.url).search).toBe('');
    await expect(haveApiCall({ path: '/things', namespace: 'thing', params: { owner: [3] } })).rejects.toBeInstanceOf(
      HaveApiError
    );
    expect(apiWire.requests).toHaveLength(1);
  });

  it('preserves validated namespace/meta/action-state projection for JSON writes', async () => {
    installHaveApiXhr(async () => ok({ thing: { id: 7 }, _meta: { action_state_id: 91 } }));
    const result = await haveApiCall({
      method: 'POST',
      path: '/things',
      namespace: 'thing',
      params: { name: 'x' },
      meta: { includes: 'owner' },
    });
    expect(JSON.parse(apiWire.requests[0]!.body!)).toEqual({ thing: { name: 'x' }, _meta: { includes: 'owner' } });
    expect(result.data).toEqual({ id: 7 });
    expect(requireActionStateResult(result, 'create').meta).toEqual({ action_state_id: 91 });
  });

  it.each([
    [null, null, undefined],
    [[1, 2], [1, 2], undefined],
    [{ thing: 7, meta: { count: 1 } }, 7, { count: 1 }],
    [{ thing: 7, other: 8, _meta: { count: 2 } }, { thing: 7, other: 8, _meta: { count: 2 } }, { count: 2 }],
  ])('preserves raw/null and legacy namespace projection for %j', async (response, data, meta) => {
    installHaveApiXhr(async () => ok(response));
    const result = await haveApiCall({ path: '/things' });
    expect(result.data).toEqual(data);
    expect(result.meta).toEqual(meta);
    expect(result.envelope.response).toEqual(response);
  });

  it('uses the configured metadata namespace for validation and projection', async () => {
    window.vpsAdmin!.webuiNext!.haveApi!.metaNamespace = 'page';
    installHaveApiXhr(async () => ok({ things: [7], page: { total_count: 1 } }));
    const result = await haveApiCall({ path: '/things' });
    expect(result.data).toEqual([7]);
    expect(result.meta).toEqual({ total_count: 1 });
  });

  it('keeps public requests separate and anonymous after authenticated dispatches', async () => {
    document.documentElement.lang = 'cs';
    installHaveApiXhr(async () => ok({ things: [] }));
    await haveApiCall({ path: '/things' });
    await publicHaveApiCall({ path: '/things' });
    expect(apiWire.requests).toHaveLength(2);
    expect(apiWire.requests[0]?.headers['X-Token']).toBe('old');
    expect(apiWire.requests[1]?.headers).toEqual({ Accept: 'application/json' });
  });

  it('resolves a relative configured API base without changing its version path', async () => {
    window.vpsAdmin!.api = { url: '/api', version: '7.0' };
    installHaveApiXhr(async () => ok({ things: [] }));
    await haveApiCall({ path: '/things' });
    expect(apiWire.requests[0]?.url).toBe(new URL('/api/v7.0/things', location.href).href);
  });

  it('discovers missing header/meta with one library OPTIONS request and refreshes per base', async () => {
    const send = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'OPTIONS'
        ? ok({ authentication: { token: { http_header: 'X-Discovered' } }, meta: { namespace: 'meta' } })
        : ok({ thing: 7, meta: { count: 1 } })
    );
    installHaveApiXhr(send);
    for (const host of ['https://discovery-one.example.test', 'https://discovery-two.example.test']) {
      window.vpsAdmin = { api: { url: host, version: '7.0' }, sessionToken: 'live' };
      expect((await haveApiCall({ path: '/things' })).data).toBe(7);
    }
    expect(apiWire.requests.filter((request) => request.method === 'OPTIONS').map((request) => request.url)).toEqual([
      'https://discovery-one.example.test/v7.0/',
      'https://discovery-two.example.test/v7.0/',
    ]);
    expect(
      apiWire.requests
        .filter((request) => request.method === 'GET')
        .every((request) => request.headers['X-Discovered'] === 'live')
    ).toBe(true);
  });

  it.each([200, 422])('keeps nested HTTP %s rejection authoritative with its envelope', async (status) => {
    const envelope = { status: false, message: 'Rejected', response: null, errors: { vps: { memory: ['too large'] } } };
    installHaveApiXhr(async () => json(envelope, status));
    const error = await haveApiCall({ method: 'POST', path: '/things' }).catch((error) => error);
    expect(error).toBeInstanceOf(HaveApiError);
    expect(error.envelope).toEqual(envelope);
    expect(error.cause).toBeInstanceOf(AsyncError);
    expect(error.cause.kind).toBe('api');
    expect(error.cause.response.envelope).toEqual(envelope);
    expect(error.httpStatus).toBe(status === 200 ? undefined : status);
    expect(isAmbiguousMutationError(error)).toBe(false);
  });

  it.each([401, 403, 422])('keeps a contradictory HTTP%s success receipt ambiguous without renewal or replay', async (status) => {
    const sessionFetch = vi.fn();
    vi.stubGlobal('fetch', sessionFetch);
    const envelope = { status: true, response: { thing: 7, _meta: { action_state_id: 91 } } };
    installHaveApiXhr(async () => json(envelope, status));
    const error = await haveApiCall({ method: 'POST', path: '/things' }).catch((error) => error);
    expect(error).toBeInstanceOf(HaveApiError);
    expect(error.httpStatus).toBe(status);
    expect(error.envelope).toEqual(envelope);
    expect(error.cause).toBeInstanceOf(AsyncError);
    expect(error.cause.response).toMatchObject({
      httpStatus: status, envelope, meta: { action_state_id: 91 }, data: envelope.response,
    });
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(sessionFetch).not.toHaveBeenCalled();
    expect(apiWire.requests).toHaveLength(1);
  });

  it.each(['<html>bad</html>', '{}'])('never renews or retries a malformed HTTP401 read: %s', async (body) => {
    const sessionFetch = vi.fn();
    vi.stubGlobal('fetch', sessionFetch);
    installHaveApiXhr(async () => new Response(body, { status: 401 }));
    const error = await haveApiCall({ path: '/things' }).catch((error) => error);
    expect(error).toBeInstanceOf(HaveApiError);
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(sessionFetch).not.toHaveBeenCalled();
    expect(apiWire.requests).toHaveLength(1);
  });

  it.each([{ status: true }, { status: true, response: { _meta: [] } }])(
    'keeps unusable successful replies ambiguous',
    async (body) => {
      installHaveApiXhr(async () => json(body));
      const error = await haveApiCall({ method: 'POST', path: '/things' }).catch((error) => error);
      expect(error.envelope.errors).toBe(MALFORMED_HAVEAPI_ENVELOPE_ERROR_CODE);
      expect(error.cause).toBeInstanceOf(AsyncError);
      expect(error.cause.kind).toBe('protocol');
      expect(error.cause.envelope).toEqual(body);
      expect(error.cause.response.envelope).toEqual(body);
      expect(isAmbiguousMutationError(error)).toBe(true);
    }
  );

  it('settles pre-dispatch and in-flight cancellation through the actual package', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(haveApiCall({ path: '/things', signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(apiWire.requests).toHaveLength(0);
    installHaveApiXhr(() => new Promise(() => {}));
    const active = new AbortController();
    const pending = haveApiCall({ path: '/things', signal: active.signal });
    await vi.waitFor(() => expect(apiWire.requests).toHaveLength(1));
    active.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(apiWire.requests[0]?.aborted).toBe(true);
  });

  it('maps a native XHR network failure to the existing uncertain mutation class', async () => {
    installHaveApiXhr(async () => {
      throw new TypeError('network lost');
    });
    const error = await haveApiCall({ method: 'POST', path: '/things' }).catch((error) => error);
    expect(error).toBeInstanceOf(TypeError);
    expect(error.cause).toBeInstanceOf(AsyncError);
    expect(error.cause.kind).toBe('transport');
    expect(isAmbiguousMutationError(error)).toBe(true);
  });

  it('settles the installed client timeout and aborts its outstanding XHR', async () => {
    vi.useFakeTimers();
    try {
      installHaveApiXhr(() => new Promise(() => {}));
      const pending = requestHaveApi('https://api.example.test/v7.0', 'authenticated', {
        method: 'POST', path: '/things', timeoutMs: 25,
      });
      const rejected = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
      await vi.advanceTimersByTimeAsync(25);
      await rejected;
      expect(apiWire.requests).toHaveLength(1);
      expect(apiWire.requests[0]?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
