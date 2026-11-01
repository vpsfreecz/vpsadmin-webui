import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientInputError, isAmbiguousMutationError, MissingActionStateError } from './apiErrors';
import { executeApiRequest } from './apiRequestPolicy';
import { ApiOutputError } from './apiOutput';
import { fetchVpsList, vpsStart } from './vps';

vi.mock('./apiRequestPolicy', () => ({ executeApiRequest: vi.fn() }));

beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://vps-pilot.example.test/mount', version: '7.0' },
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
  vi.mocked(executeApiRequest).mockReset();
});

afterEach(() => { window.vpsAdmin = undefined; });

describe('generated VPS list pilot', () => {
  it('uses generated filters/includes/count and preserves the complete receipt and included rows', async () => {
    const signal = new AbortController().signal;
    const row = {
      id: 12, hostname: null, is_running: false, cpu: 0, expiration_date: null,
      user: { login: 'member' },
      node: { id: 3, location: { label: 'Prague', environment: { id: 4, label: null } } },
      os_template: null, dataset: { name: 'root' },
      _meta: { resolved: true }, extension: { untouched: true },
    };
    const meta = { total_count: 1, extension: false };
    const envelope = { status: true, response: { vpses: [row], _meta: meta } };
    const result = { data: [row], meta, envelope, httpStatus: 200 };
    vi.mocked(executeApiRequest).mockResolvedValueOnce(result);

    const received = await fetchVpsList({
      limit: 25, fromId: 0, hostnameAny: 'test', hostnameExact: 'test.example', user: 8,
      userNamespaceMap: 9, node: 3, location: 2, environment: 4,
      includes: 'user,node__location__environment', count: true, signal,
    });

    expect(executeApiRequest).toHaveBeenCalledOnce();
    expect(vi.mocked(executeApiRequest).mock.calls[0]?.slice(0, 3)).toMatchObject([
      'https://vps-pilot.example.test/mount/v7.0', 'authenticated', {
        method: 'GET', path: '/vpses', inputNamespace: 'vps', outputNamespace: 'vpses',
        params: {
          limit: 25, from_id: 0, hostname_any: 'test', hostname_exact: 'test.example', user: 8,
          user_namespace_map: 9, node: 3, location: 2, environment: 4,
        },
        meta: { includes: 'user,node__location__environment', count: true }, signal,
      },
    ]);
    expect(received).toEqual(result);
    expect(received.data[0]).toBe(row);
    expect(received.meta).toBe(meta);
    expect(received.envelope).toBe(envelope);
    expect(received.data[0]?.user).not.toHaveProperty('level');
    expect(received.data[0]?.user).not.toHaveProperty('id');
  });

  it('keeps a genuine zero count, empty collection and explicit false metadata', async () => {
    vi.mocked(executeApiRequest).mockResolvedValueOnce({
      data: [], meta: { total_count: 0 }, envelope: { status: true, response: { vpses: [] } }, httpStatus: 200,
    });

    const result = await fetchVpsList({ limit: 0, count: false });

    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({ total_count: 0 });
    expect(vi.mocked(executeApiRequest).mock.calls[0]?.[2]).toMatchObject({
      params: { limit: 0 }, meta: { count: false },
    });
  });

  it.each([
    { id: 12 },
    { id: 12, hostname: null, node: null, user: null, is_running: null },
    { id: 12, node: { location: { environment: {} } }, user: {} },
  ])('keeps absent/null display fields and valid partial relations (%j)', async row => {
    vi.mocked(executeApiRequest).mockResolvedValueOnce({
      data: [row], meta: {}, envelope: { status: true, response: { vpses: [row] } }, httpStatus: 200,
    });

    const result = await fetchVpsList();

    expect(result.data[0]).toBe(row);
    expect(result.data[0]).toEqual(row);
  });

  it.each([
    null, {}, { id: null }, { id: '12' }, { id: 0 }, { id: -1 }, { id: 1.5 },
    { id: Number.MAX_SAFE_INTEGER + 1 }, { id: 12, hostname: false }, { id: 12, cpu: '4' },
    { id: 12, user: [] }, { id: 12, user: { id: '8' } }, { id: 12, user: { login: 8 } },
    { id: 12, node: false }, { id: 12, node: { location: 8 } },
    { id: 12, node: { location: { environment: { id: -1 } } } },
    { id: 12, os_template: { label: false } },
  ])('rejects malformed identity/consumed fields with the original receipt (%j)', async row => {
    const result = {
      data: [row], meta: { total_count: 1 },
      envelope: { status: true, response: { vpses: [row] } }, httpStatus: 200,
    };
    vi.mocked(executeApiRequest).mockResolvedValueOnce(result);

    const error: unknown = await fetchVpsList().catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ApiOutputError);
    expect(error).toMatchObject({ phase: 'post-dispatch', result });
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(executeApiRequest).toHaveBeenCalledOnce();
  });

  it('does not replace a malformed collection with an empty successful page', async () => {
    vi.mocked(executeApiRequest).mockResolvedValueOnce({
      data: null, meta: {}, envelope: { status: true, response: null }, httpStatus: 200,
    });

    await expect(fetchVpsList()).rejects.toBeInstanceOf(ApiOutputError);
  });
});

describe('generated VPS start pilot', () => {
  it('preserves the complete asynchronous receipt from the generated operation', async () => {
    const meta = { action_state_id: 81, extension: false };
    const envelope = { status: true, response: { vps: {}, _meta: meta } };
    const result = { data: {}, meta, envelope, httpStatus: 202 };
    vi.mocked(executeApiRequest).mockResolvedValueOnce(result);

    const received = await vpsStart(12);

    expect(executeApiRequest).toHaveBeenCalledOnce();
    expect(vi.mocked(executeApiRequest).mock.calls[0]?.slice(0, 3)).toMatchObject([
      'https://vps-pilot.example.test/mount/v7.0', 'authenticated',
      { method: 'POST', path: '/vpses/12/start', inputNamespace: 'vps', outputNamespace: 'vps' },
    ]);
    expect(received).toEqual(result);
    expect(received.meta).toBe(meta);
    expect(received.envelope).toBe(envelope);
  });

  it.each([undefined, null, 0, -1, 1.5, 'invalid'])('keeps an unusable action receipt uncertain (%s)', async id => {
    const result = {
      data: {}, meta: { action_state_id: id },
      envelope: { status: true, response: {} }, httpStatus: 200,
    };
    vi.mocked(executeApiRequest).mockResolvedValueOnce(result);

    const error: unknown = await vpsStart(12).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(MissingActionStateError);
    expect(error).toMatchObject({ result });
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(executeApiRequest).toHaveBeenCalledOnce();
  });

  it('classifies invalid local input without dispatching the mutation', async () => {
    const error: unknown = await vpsStart(Number.NaN).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ClientInputError);
    expect(isAmbiguousMutationError(error)).toBe(false);
    expect(executeApiRequest).not.toHaveBeenCalled();
  });

  it('retains a transport failure as uncertain without replaying the write', async () => {
    const error = new TypeError('Connection lost');
    vi.mocked(executeApiRequest).mockRejectedValueOnce(error);

    await expect(vpsStart(12)).rejects.toBe(error);
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(executeApiRequest).toHaveBeenCalledOnce();
  });
});
