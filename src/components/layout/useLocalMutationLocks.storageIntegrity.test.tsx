import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLocalLock,
  isLocalLockPersistenceError,
  LOCAL_LOCK_STORAGE_KEY,
} from '../../lib/localLocks';
import { objectRef } from '../../lib/objectRef';
import { useLocalMutationLocks } from './useLocalMutationLocks';
import { installSerialWebLocks } from './webLocksTestMock';

function renderLocks(userId = 42) {
  return renderHook(() => useLocalMutationLocks({
    userId,
    persistenceErrorMessage: 'guard persistence failed',
    outcomeUncertainMessage: 'outcome uncertain',
  }));
}

function uncertaintyEntryKey(userId: number, objectKey: string, uncertaintyId: string): string {
  return `${LOCAL_LOCK_STORAGE_KEY}.user-${userId}.uncertain.${encodeURIComponent(objectKey)}.${encodeURIComponent(uncertaintyId)}`;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  installSerialWebLocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'locks');
});

describe('useLocalMutationLocks uncertainty storage integrity', () => {
  it.each(['getter', 'getItem'] as const)('renders with a denied localStorage %s but refuses durable mutation dispatch', async (deniedAccess) => {
    const denied = new DOMException('storage unavailable', 'SecurityError');
    if (deniedAccess === 'getter') {
      vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw denied; });
    } else {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw denied; });
    }
    const hook = renderLocks();
    const dispatch = vi.fn();
    const guardedMutation = async () => {
      await hook.result.current.acquireLocalLock(objectRef('Vps', 123), { durable: true });
      dispatch();
    };

    expect(hook.result.current.localLocks).toEqual([]);
    await expect(guardedMutation()).rejects.toBe(denied);
    expect(dispatch).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('retains hydrated guards when background display reads become unavailable', async () => {
    vi.useFakeTimers();
    const ref = objectRef('Vps', 123);
    window.localStorage.setItem(uncertaintyEntryKey(42, 'Vps:123', 'broken'), '{not-json');
    const hook = renderLocks();
    await act(async () => undefined);
    const guard = hook.result.current.localLocks[0];
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('storage unavailable', 'SecurityError');
    });
    try {
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
      expect(hook.result.current.localLocks).toEqual([guard]);
      expect(hook.result.current.isLocallyLocked(ref)).toBe(true);
    } finally {
      hook.unmount();
      vi.useRealTimers();
    }
  });

  it.each(['getter', 'getItem'] as const)('retains displayed guards when a storage event encounters a denied %s', async (deniedAccess) => {
    const storage = window.localStorage;
    const key = uncertaintyEntryKey(42, 'Vps:123', 'broken');
    storage.setItem(key, '{not-json');
    const hook = renderLocks();
    await act(async () => undefined);
    const guard = hook.result.current.localLocks[0];
    const denied = () => { throw new DOMException('storage unavailable', 'SecurityError'); };
    if (deniedAccess === 'getter') vi.spyOn(window, 'localStorage', 'get').mockImplementation(denied);
    else vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);

    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key, storageArea: storage, oldValue: '{not-json', newValue: null,
    })));
    expect(hook.result.current.localLocks).toEqual([guard]);
    expect(hook.result.current.isLocallyLocked(objectRef('Vps', 123))).toBe(true);
    hook.unmount();
  });

  it('refreshes only the event object from current storage and removes a deleted ordinary lock', async () => {
    const ref = objectRef('Vps', 123);
    const other = createLocalLock(objectRef('Vps', 124), Date.now(), { actionStateId: 902 });
    const prefix = `${LOCAL_LOCK_STORAGE_KEY}.user-42.entry.`;
    const key = `${prefix}Vps%3A123`;
    window.localStorage.setItem(`${prefix}Vps%3A124`, JSON.stringify(other));
    const hook = renderLocks();
    await act(async () => undefined);
    const current = createLocalLock(ref, Date.now(), { actionStateId: 903 });
    window.localStorage.setItem(key, JSON.stringify(current));
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key, storageArea: window.localStorage, newValue: JSON.stringify({ ...current, actionStateId: 901 }),
    })));
    expect(hook.result.current.localLocks).toContainEqual(current);
    expect(hook.result.current.localLocks).toContainEqual(other);

    window.localStorage.removeItem(key);
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key, storageArea: window.localStorage, oldValue: JSON.stringify(current), newValue: null,
    })));
    expect(hook.result.current.localLocks).toEqual([other]);
    hook.unmount();
  });

  it.each(['ordinary', 'uncertain'] as const)('keeps a corrupt %s event object fail-closed', async (slot) => {
    const ref = objectRef('Vps', 123);
    const key = slot === 'ordinary'
      ? `${LOCAL_LOCK_STORAGE_KEY}.user-42.entry.Vps%3A123`
      : uncertaintyEntryKey(42, 'Vps:123', 'broken');
    const hook = renderLocks();
    await act(async () => undefined);
    window.localStorage.setItem(key, '{not-json');
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key, storageArea: window.localStorage, newValue: '{not-json',
    })));
    expect(hook.result.current.localLocks[0]).toMatchObject({ key: 'Vps:123', pending: true });
    await expect(hook.result.current.acquireLocalLock(ref, { durable: true }))
      .rejects.toSatisfy(isLocalLockPersistenceError);
    expect(window.localStorage.getItem(key)).toBe('{not-json');
    hook.unmount();
  });

  it('discards the unattributable legacy session array instead of importing it into the user scope', async () => {
    const ref = objectRef('Vps', 9992);
    window.sessionStorage.setItem(
      LOCAL_LOCK_STORAGE_KEY,
      JSON.stringify([createLocalLock(ref, Date.now(), { actionStateId: 9992 })])
    );

    const hook = renderLocks();

    await act(async () => undefined);
    expect(hook.result.current.localLocks).toEqual([]);
    expect(window.sessionStorage.getItem(LOCAL_LOCK_STORAGE_KEY)).toBeNull();
    expect(Object.keys(window.localStorage).filter((key) => key.includes('Vps%3A9992'))).toEqual([]);
    expect(hook.result.current.isLocallyLocked(ref)).toBe(false);
    hook.unmount();
  });

  it('hydrates an ordinary lock stored in an uncertainty slot as a pending corrupt guard', async () => {
    const ref = objectRef('Vps', 123);
    const ordinary = createLocalLock(ref, Date.now());
    window.localStorage.setItem(
      uncertaintyEntryKey(42, ordinary.key, 'ordinary-in-guard-slot'),
      JSON.stringify(ordinary)
    );

    const hook = renderLocks();
    expect(hook.result.current.localLocks[0]).toMatchObject({
      key: 'Vps:123',
      pending: true,
      uncertain: undefined,
    });
    expect(hook.result.current.localLocks[0]?.uncertaintyId).toMatch(/^corrupt-/);
    await expect(hook.result.current.acquireLocalLock(ref, { durable: true }))
      .rejects.toSatisfy(isLocalLockPersistenceError);
    expect(hook.result.current.localLocks[0]).toMatchObject({ key: 'Vps:123', pending: true });
    hook.unmount();
  });

  it.each([
    {
      name: 'value object',
      valueRef: objectRef('Vps', 124),
      valueGeneration: 'slot-generation',
    },
    {
      name: 'generation',
      valueRef: objectRef('Vps', 123),
      valueGeneration: 'different-generation',
    },
  ])('readLatestGuard fails closed when a guarded marker has a mismatched $name', async ({
    valueRef,
    valueGeneration,
  }) => {
    const slotRef = objectRef('Vps', 123);
    const marker = createLocalLock(valueRef, Date.now(), {
      pending: true,
      uncertaintyId: valueGeneration,
    });
    const hook = renderLocks();
    expect(hook.result.current.isLocallyLocked(slotRef)).toBe(false);
    window.localStorage.setItem(
      uncertaintyEntryKey(42, 'Vps:123', 'slot-generation'),
      JSON.stringify(marker)
    );

    let acquireError: unknown;
    await act(async () => {
      try {
        await hook.result.current.acquireLocalLock(slotRef, { durable: true });
      } catch (error) {
        acquireError = error;
      }
    });

    expect(acquireError).toSatisfy(isLocalLockPersistenceError);
    expect(hook.result.current.localLocks[0]).toMatchObject({
      key: 'Vps:123',
      pending: true,
      uncertain: undefined,
    });
    expect(hook.result.current.localLocks[0]?.uncertaintyId).toMatch(/^corrupt-/);
    hook.unmount();
  });
});
