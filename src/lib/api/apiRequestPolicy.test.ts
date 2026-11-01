import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestSpec } from 'haveapi-client';
import { HaveApiError, isAmbiguousMutationError, SESSION_EXPIRED_EVENT } from './apiErrors';
import { executeApiRequest } from './apiRequestPolicy';
import { executeHaveApiRequest } from './haveapiRequestClient';
import { recoverBffSession } from '../auth/bffSession';

vi.mock('./haveapiRequestClient', () => ({ executeHaveApiRequest: vi.fn() }));
vi.mock('../auth/bffSession', () => ({ recoverBffSession: vi.fn() }));
const receipt = { data: false, meta: { total_count: 0, custom: null }, envelope: { status: true, response: false }, httpStatus: 202 };
beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://api.example.test/mounted', version: '7.0' }, accessToken: 'old',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
  document.documentElement.lang = 'cs';
  vi.mocked(executeHaveApiRequest).mockReset().mockResolvedValue(receipt);
  vi.mocked(recoverBffSession).mockReset();
});
afterEach(() => { window.vpsAdmin = undefined; document.documentElement.lang = ''; });
const base = 'https://api.example.test/mounted/v7.0';
function unauthorized() {
  const error = new HaveApiError({ status: false, message: 'Unauthorized' }, undefined, 401);
  error.failure = 'api';
  return error;
}

describe('complete generated request policy', () => {
  it('forwards output namespace, metadata, headers, signal and timeout without projecting the receipt', async () => {
    const controller = new AbortController();
    const spec: RequestSpec = {
      method: 'GET', path: '/things', inputNamespace: 'thing', outputNamespace: 'things', metaNamespace: 'page',
      params: { enabled: false, limit: 0 }, meta: { count: true }, headers: { 'X-Request': 'kept' },
      signal: controller.signal, timeoutMs: 125,
    };
    expect(await executeApiRequest(base, 'authenticated', spec)).toBe(receipt);
    expect(executeHaveApiRequest).toHaveBeenCalledExactlyOnceWith(base, 'authenticated', {
      ...spec, headers: { Accept: 'application/json', 'Accept-Language': 'cs', 'X-Request': 'kept', 'X-Token': 'old' },
    });
  });

  it('rejects an obsolete API binding before exposing credentials to its old base', async () => {
    window.vpsAdmin!.api!.url = 'https://new-api.example.test';
    await expect(executeApiRequest(base, 'authenticated', { method: 'POST', path: '/things' })).rejects.toThrow('API configuration changed');
    expect(executeHaveApiRequest).not.toHaveBeenCalled();
  });

  it('keeps public requests anonymous and never renews or announces session expiry', async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    try {
      vi.mocked(executeHaveApiRequest).mockRejectedValueOnce(unauthorized());
      await expect(executeApiRequest(base, 'public', { method: 'GET', path: '/' })).rejects.toBeInstanceOf(HaveApiError);
      expect(executeHaveApiRequest).toHaveBeenCalledWith(base, 'public', { method: 'GET', path: '/', headers: { Accept: 'application/json' } });
      expect(recoverBffSession).not.toHaveBeenCalled();
      expect(expired).not.toHaveBeenCalled();
    } finally { window.removeEventListener(SESSION_EXPIRED_EVENT, expired); }
  });

  it.each(['GET', 'OPTIONS'])('renews a validated %s rejection once with stable spec and language', async method => {
    vi.mocked(executeHaveApiRequest).mockRejectedValueOnce(unauthorized());
    vi.mocked(recoverBffSession).mockImplementationOnce(async () => {
      window.vpsAdmin!.accessToken = 'new'; document.documentElement.lang = 'en'; return true;
    });
    const spec = { method, path: '/things?method=PUT', outputNamespace: null, timeoutMs: 100 };
    expect(await executeApiRequest(base, 'authenticated', spec)).toBe(receipt);
    expect(recoverBffSession).toHaveBeenCalledExactlyOnceWith('old');
    expect(executeHaveApiRequest).toHaveBeenLastCalledWith(base, 'authenticated', {
      ...spec, headers: { Accept: 'application/json', 'Accept-Language': 'cs', 'X-Token': 'new' },
    });
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('renews rejected %s without replaying the write', async method => {
    vi.mocked(executeHaveApiRequest).mockRejectedValueOnce(unauthorized());
    vi.mocked(recoverBffSession).mockResolvedValueOnce(true);
    const error = await executeApiRequest(base, 'authenticated', { method, path: '/things' }).catch(value => value);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('Přihlášení bylo obnoveno.');
    expect(isAmbiguousMutationError(error)).toBe(false);
    expect(executeHaveApiRequest).toHaveBeenCalledOnce();
  });

  it.each(['protocol', 'contradictory', 'transport'])('does not renew or replay a %s failure', async kind => {
    const error = kind === 'transport' ? new TypeError('Network lost') : unauthorized();
    if (error instanceof HaveApiError) {
      error.failure = kind === 'protocol' ? 'protocol' : 'api';
      if (kind === 'contradictory') error.envelope.status = true;
    }
    vi.mocked(executeHaveApiRequest).mockRejectedValueOnce(error);
    await expect(executeApiRequest(base, 'authenticated', { method: 'POST', path: '/things' })).rejects.toBe(error);
    expect(recoverBffSession).not.toHaveBeenCalled();
    expect(executeHaveApiRequest).toHaveBeenCalledOnce();
    expect(isAmbiguousMutationError(error)).toBe(true);
  });
});
