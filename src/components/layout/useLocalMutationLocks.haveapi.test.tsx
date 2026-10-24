import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { HaveApiError, haveApiCall } from '../../lib/api/haveapi';
import { isLocalLockPersistenceError, type LocalMutationGeneration } from '../../lib/localLocks';
import { objectRef } from '../../lib/objectRef';
import { useLocalMutationLocks } from './useLocalMutationLocks';
import { installSerialWebLocks } from './webLocksTestMock';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  installSerialWebLocks();
  window.vpsAdmin = {
    api: { url: 'https://api.example.test', version: '7.0' },
    sessionToken: 'fixture-token',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
});

afterEach(() => {
  window.vpsAdmin = undefined;
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'locks');
});

describe('shared mutation guard with actual HaveAPI receipts', () => {
  it.each([401, 403, 422])('blocks duplicate submission after a contradictory HTTP%s success', async (httpStatus) => {
    installHaveApiXhr(async () => new Response(JSON.stringify({
      status: true, response: { vps: { id: 123 }, _meta: { action_state_id: 91 } },
    }), { status: httpStatus }));
    const hook = renderHook(() => useLocalMutationLocks({
      userId: 42, persistenceErrorMessage: 'guard persistence failed', outcomeUncertainMessage: 'outcome uncertain',
    }));
    const ref = objectRef('Vps', 123);
    const submit = async () => {
      let generation: LocalMutationGeneration | undefined;
      try {
        generation = await hook.result.current.acquireLocalLock(ref, { durable: true });
        await haveApiCall({ method: 'POST', path: '/vpses/123/start' });
      } catch (error) {
        hook.result.current.settleLocalLock(ref, error, generation);
        return error;
      }
    };
    await act(async () => {
      expect(await submit()).toBeInstanceOf(HaveApiError);
    });
    expect(hook.result.current.localLocks[0]).toMatchObject({ key: 'Vps:123', uncertain: true });
    act(() => hook.result.current.releaseLocalLock(ref));
    await act(async () => {
      expect(await submit()).toSatisfy(isLocalLockPersistenceError);
    });
    expect(apiWire.requests).toHaveLength(1);
    expect(hook.result.current.isLocallyLocked(ref)).toBe(true);
    hook.unmount();
  });

  it.each([401, 403, 422])('releases the shared guard after an authoritative HTTP%s rejection', async (httpStatus) => {
    installHaveApiXhr(async () => new Response(JSON.stringify({
      status: false, message: 'Rejected', response: null,
    }), { status: httpStatus }));
    const hook = renderHook(() => useLocalMutationLocks({
      userId: 42, persistenceErrorMessage: 'guard persistence failed', outcomeUncertainMessage: 'outcome uncertain',
    }));
    const ref = objectRef('Vps', 123);
    await act(async () => {
      const generation = await hook.result.current.acquireLocalLock(ref, { durable: true });
      const error = await haveApiCall({ method: 'POST', path: '/vpses/123/start' }).catch((error) => error);
      expect(error).toBeInstanceOf(HaveApiError);
      hook.result.current.settleLocalLock(ref, error, generation);
    });
    expect(hook.result.current.isLocallyLocked(ref)).toBe(false);
    await act(async () => {
      const retry = await hook.result.current.acquireLocalLock(ref, { durable: true });
      hook.result.current.settleLocalLock(ref, new Error('cancelled before dispatch'), retry);
    });
    expect(apiWire.requests).toHaveLength(1);
    hook.unmount();
  });
});
