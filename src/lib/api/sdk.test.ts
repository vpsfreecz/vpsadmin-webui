import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientInputError } from 'vpsadmin-typescript-client';
import { ApiOutputError } from './apiOutput';
import { isAmbiguousMutationError } from './apiErrors';
import { executeApiRequest } from './apiRequestPolicy';
import { getApi, getPublicApi } from './sdk';

vi.mock('./apiRequestPolicy', () => ({ executeApiRequest: vi.fn() }));
let sequence = 0;
const receipt = (data: unknown) => ({ data, meta: {}, envelope: { status: true, response: data }, httpStatus: 200 });
beforeEach(() => {
  window.vpsAdmin = {
    api: { url: `https://binding-${++sequence}.example.test/mount`, version: '7.0' }, accessToken: 'old',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
  vi.mocked(executeApiRequest).mockReset();
});
afterEach(() => { window.vpsAdmin = undefined; });

describe('generated SDK bindings', () => {
  it('constructs clients and rejects invalid operation input without dispatch or discovery', async () => {
    const api = await getApi();
    expect(getPublicApi()).not.toBe(api);
    expect(executeApiRequest).not.toHaveBeenCalled();
    await expect(api.vps.show({ path: { vps_id: '..' } })).rejects.toBeInstanceOf(ClientInputError);
    expect(executeApiRequest).not.toHaveBeenCalled();
  });

  it('keeps the cache identity scoped to API base, public/auth policy and metadata namespace', async () => {
    const first = await getApi();
    expect(await getApi()).toBe(first);
    window.vpsAdmin!.webuiNext!.haveApi!.metaNamespace = 'wire_meta';
    const changed = await getApi();
    expect(changed).not.toBe(first);
    expect(getPublicApi()).not.toBe(changed);
    window.vpsAdmin!.api!.url = 'https://another-base.example.test';
    expect(await getApi()).not.toBe(changed);
    expect(executeApiRequest).not.toHaveBeenCalled();
  });

  it('discovers through anonymous root describe once and then binds the discovered namespace', async () => {
    window.vpsAdmin!.webuiNext = undefined;
    vi.mocked(executeApiRequest).mockResolvedValueOnce(receipt({
      authentication: { oauth2: { http_header: 'X-Discovered' } }, meta: { namespace: 'wire_meta' },
    })).mockResolvedValue(receipt([]));
    const api = await getApi();
    expect(await getApi()).toBe(api);
    await api.vps.index({ meta: { count: true }, params: { limit: 0 } });
    expect(executeApiRequest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(executeApiRequest).mock.calls[0]).toMatchObject([
      'https://binding-' + sequence + '.example.test/mount/v7.0', 'public',
      { method: 'OPTIONS', path: '/', outputNamespace: null, metaNamespace: '_meta' }, undefined,
    ]);
    expect(vi.mocked(executeApiRequest).mock.calls[1]?.[2]).toMatchObject({
      method: 'GET', path: '/vpses', outputNamespace: 'vpses', metaNamespace: 'wire_meta',
      meta: { count: true }, params: { limit: 0 },
    });
  });

  it('reuses a discovered public namespace without another description request', async () => {
    window.vpsAdmin!.webuiNext = undefined;
    vi.mocked(executeApiRequest).mockResolvedValueOnce(receipt({ meta: { namespace: 'wire_meta' } }))
      .mockResolvedValue(receipt([]));
    await getApi();
    await getPublicApi().news_log.index({ meta: { count: true } });
    expect(executeApiRequest).toHaveBeenCalledTimes(2);
    expect(vi.mocked(executeApiRequest).mock.calls[1]?.[2]).toMatchObject({ metaNamespace: 'wire_meta', meta: { count: true } });
  });

  it('preserves canonical object-list metadata and the untouched custom-namespace receipt', async () => {
    window.vpsAdmin!.webuiNext!.haveApi!.metaNamespace = 'wire_meta';
    const rows = [{ id: 7, hostname: 'test', wire_meta: { resolved: true } }];
    const envelope = { status: true, response: { vpses: rows, wire_meta: { total_count: 1 } } };
    vi.mocked(executeApiRequest).mockResolvedValue({ data: rows, meta: { total_count: 1 }, envelope, httpStatus: 200 });
    const result = await (await getApi()).vps.index({ meta: { count: true } });
    expect(result.data).toEqual([{ ...rows[0], _meta: { resolved: true } }]);
    expect(result.envelope).toBe(envelope);
    expect(result.meta).toEqual({ total_count: 1 });
  });

  it.each([{ meta: [] }, { meta: { namespace: false } }, { authentication: { oauth2: { http_header: 3 } } }])(
    'fails closed on malformed discovery fields without dispatching the requested operation', async data => {
      window.vpsAdmin!.webuiNext = undefined;
      vi.mocked(executeApiRequest).mockResolvedValueOnce(receipt(data));
      const error = await getApi().catch(value => value);
      expect(error).toMatchObject({ cause: expect.any(ApiOutputError) });
      expect(isAmbiguousMutationError(error)).toBe(false);
      expect(executeApiRequest).toHaveBeenCalledOnce();
    },
  );

  it('keeps failed discovery visible without claiming that a mutation was sent', async () => {
    window.vpsAdmin!.webuiNext = undefined;
    const cause = new TypeError('description transport failed');
    vi.mocked(executeApiRequest).mockRejectedValueOnce(cause);
    const error = await getApi().catch(value => value);
    expect(error).toMatchObject({ cause });
    expect(isAmbiguousMutationError(error)).toBe(false);
    expect(executeApiRequest).toHaveBeenCalledOnce();
  });

  it('rejects a metadata namespace colliding with generated fields before dispatch', async () => {
    window.vpsAdmin!.webuiNext!.haveApi!.metaNamespace = 'page';
    await expect(getApi()).rejects.toBeInstanceOf(ClientInputError);
    expect(executeApiRequest).not.toHaveBeenCalled();
  });

  it('does not discover for a public operation and preserves the configured mounted base', async () => {
    window.vpsAdmin!.webuiNext = undefined;
    vi.mocked(executeApiRequest).mockResolvedValueOnce(receipt([]));
    await getPublicApi().news_log.index({ params: { limit: 5 } });
    expect(executeApiRequest).toHaveBeenCalledOnce();
    expect(vi.mocked(executeApiRequest).mock.calls[0]?.slice(0, 3)).toMatchObject([
      `https://binding-${sequence}.example.test/mount/v7.0`, 'public',
      { method: 'GET', path: '/news_logs', inputNamespace: 'news_log', outputNamespace: 'news_logs' },
    ]);
  });
});
