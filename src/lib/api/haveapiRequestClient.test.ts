import { afterEach, describe, expect, it, vi } from 'vitest';
import { rememberBffSession } from '../auth/bffSession';
import { haveApiCall, HaveApiError, isAmbiguousMutationError, requireActionStateResult } from './haveapi';
import { createRequestClientCall, type HaveApiRequestClient } from './haveapiRequestClient';

const sessionUrl = new URL('/session.json', window.location.href).href;
const key = 'a'.repeat(64);
const success = (response: Record<string, unknown>) => ({
  data: response,
  meta: {},
  envelope: { status: true, response },
  httpStatus: 200,
});
const failure = (kind: string, status = 401, envelope = { status: false, message: 'Unauthorized' }) =>
  Object.assign(new Error('Request failed'), { kind, httpStatus: status, envelope });
function setup() {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: 'v7.0' },
    accessToken: 'old',
    description: { authentication: { oauth2: { http_header: 'X-Token' } } },
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
  rememberBffSession(sessionUrl, key, 'old');
}
function clientWith(request: (spec: Parameters<HaveApiRequestClient['request']>[0]) => Promise<unknown>) {
  // Fake transport payload type is chosen by the caller, just as with network JSON.
  return { request } as HaveApiRequestClient;
}
afterEach(() => {
  rememberBffSession(sessionUrl, null);
  window.vpsAdmin = undefined;
  document.documentElement.lang = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('injectable HaveAPI request client', () => {
  it('keeps default fetch query getters to one read during transport extraction', async () => {
    setup();
    let reads = 0;
    let sentUrl = '';
    const params = Object.defineProperty({}, 'owner', { enumerable: true, get: () => ++reads });
    vi.stubGlobal('fetch', async (url: string) => {
      sentUrl = url;
      return new Response(JSON.stringify({ status: true, response: { things: [] } }));
    });
    await haveApiCall({ path: '/things', namespace: 'thing', params });
    expect(reads).toBe(1);
    expect(new URL(sentUrl).searchParams.get('thing[owner]')).toBe('1');
  });

  it('normalizes relative paths and omits parameters without an input namespace', async () => {
    setup();
    const request = vi.fn(async () => success({ things: [] }));
    await createRequestClientCall(clientWith(request))({ path: 'things', params: { ignored: 3 } });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ path: '/things', params: undefined }));
  });

  it('retains the scalar-query boundary before dispatch', async () => {
    setup();
    const request = vi.fn(async () => success({}));
    await expect(
      createRequestClientCall(clientWith(request))({
        path: '/things',
        namespace: 'thing',
        params: { owner: [3] },
      })
    ).rejects.toBeInstanceOf(HaveApiError);
    expect(request).not.toHaveBeenCalled();
  });

  it('delegates params/meta/signal and preserves existing namespace and receipt policy', async () => {
    setup();
    document.documentElement.lang = 'cs';
    const signal = new AbortController().signal;
    const request = vi.fn(async () => success({ thing: { id: 7 }, _meta: { action_state_id: 91 } }));
    const call = createRequestClientCall(clientWith(request));
    const result = await call({
      method: 'POST',
      path: '/things',
      namespace: 'thing',
      params: { name: 'x' },
      meta: { includes: 'owner' },
      signal,
    });
    expect(result.data).toEqual({ id: 7 });
    expect(requireActionStateResult(result, 'create').meta).toEqual({ action_state_id: 91 });
    expect(request).toHaveBeenCalledExactlyOnceWith({
      method: 'POST',
      path: '/things',
      inputNamespace: 'thing',
      metaNamespace: '_meta',
      params: { name: 'x' },
      meta: { includes: 'owner' },
      signal,
      headers: { Accept: 'application/json', 'Accept-Language': 'cs', 'X-Token': 'old' },
    });
  });

  it('renews one qualifying read with current auth and original language/params', async () => {
    setup();
    document.documentElement.lang = 'cs';
    const params = { owner: 3 };
    const fetchMock = vi.fn(async () => {
      document.documentElement.lang = 'en';
      params.owner = 99;
      return new Response(JSON.stringify({ sessionKey: key, accessToken: 'new' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const request = vi.fn(async (spec: Parameters<HaveApiRequestClient['request']>[0]) => {
      if (spec.headers?.['X-Token'] === 'old') throw failure('api');
      return success({ things: [7] });
    });
    expect(
      (await createRequestClientCall(clientWith(request))({ path: '/things', params, namespace: 'thing' })).data
    ).toEqual([7]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1]?.[0]).toMatchObject({
      params: { owner: 3 },
      headers: { 'Accept-Language': 'cs', 'X-Token': 'new' },
    });
  });

  it('renews an explicitly rejected mutation without replay', async () => {
    setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ sessionKey: key, accessToken: 'new' }), {
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
    const request = vi.fn(async () => {
      throw failure('api');
    });
    const err = await createRequestClientCall(clientWith(request))({ method: 'POST', path: '/things' }).catch(
      (error) => error
    );
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(HaveApiError);
    expect(isAmbiguousMutationError(err)).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rejects a different BFF session without retrying the read', async () => {
    setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ sessionKey: 'b'.repeat(64), accessToken: 'new' }), {
            headers: { 'Content-Type': 'application/json' },
          })
      )
    );
    const request = vi.fn(async () => {
      throw failure('api');
    });
    await expect(createRequestClientCall(clientWith(request))({ path: '/things' })).rejects.toMatchObject({
      httpStatus: 401,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each(['Invalid JSON response', 'Invalid API response envelope'])(
    'does not recover or replay malformed mutation: %s',
    async (message) => {
      setup();
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const request = vi.fn(async () => {
        throw Object.assign(failure('protocol'), { message });
      });
      const err = await createRequestClientCall(clientWith(request))({ method: 'POST', path: '/things' }).catch(
        (error) => error
      );
      expect(isAmbiguousMutationError(err)).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(request).toHaveBeenCalledTimes(1);
    }
  );

  it.each(['transport', 'timeout', 'aborted'])('preserves uncertain mutation classification: %s', async (kind) => {
    setup();
    const request = vi.fn(async () => {
      throw failure(kind, 0);
    });
    const err = await createRequestClientCall(clientWith(request))({ method: 'POST', path: '/things' }).catch(
      (error) => error
    );
    expect(isAmbiguousMutationError(err)).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('keeps HTTP 200 API rejection status absent on HaveApiError', async () => {
    setup();
    const request = vi.fn(async () => {
      throw failure('api', 200);
    });
    await expect(createRequestClientCall(clientWith(request))({ path: '/things' })).rejects.toMatchObject({
      name: 'HaveApiError',
      httpStatus: undefined,
    });
  });
});
