import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useKeysetPagination } from './useKeysetPagination';

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

function setup() {
  const setSearchParams = vi.fn();
  const hook = renderHook(
    ({ search }) =>
      useKeysetPagination({
        id: 'navigation-race',
        filterKey: 'node=7',
        searchParams: new URLSearchParams(search),
        setSearchParams,
      }),
    { initialProps: { search: 'node=7&limit=50&page=1' } }
  );
  return { ...hook, setSearchParams };
}

test.each(['previous', 'numbered'] as const)(
  '%s navigation supersedes a pending next-page router transition',
  (navigation) => {
    const { result, rerender, setSearchParams } = setup();
    act(() => result.current.goNext(50));
    expect(result.current.page).toBe(2);
    expect(setSearchParams).toHaveBeenCalledTimes(1);

    // The router has scheduled page 2, but has not published new params yet.
    act(() => {
      if (navigation === 'previous') result.current.goPrev();
      else result.current.goToPage(1);
    });
    expect(result.current.page).toBe(1);
    expect(setSearchParams).toHaveBeenCalledTimes(2);
    const latest = setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(latest.get('page')).toBe('1');
    expect(latest.has('from_id')).toBe(false);
    expect(latest.get('node')).toBe('7');

    rerender({ search: latest.toString() });
    expect(result.current.page).toBe(1);
    expect(result.current.hasForward).toBe(true);
    act(() => result.current.goNext(999));
    expect(result.current.fromId).toBe(50);
  }
);

test('normalization does not rewrite an already normalized URL', () => {
  const { rerender, setSearchParams } = setup();
  rerender({ search: 'node=7&limit=50&page=1' });
  expect(setSearchParams).not.toHaveBeenCalled();
});

test('browser back and forward still restore the visited cursor', () => {
  const { result, rerender } = setup();
  act(() => result.current.goNext(50));
  rerender({ search: 'node=7&limit=50&page=2&from_id=50' });
  expect(result.current.fromId).toBe(50);
  rerender({ search: 'node=7&limit=50&page=1' });
  expect(result.current.page).toBe(1);
  expect(result.current.hasForward).toBe(true);
  rerender({ search: 'node=7&limit=50&page=2&from_id=50' });
  expect(result.current.page).toBe(2);
  expect(result.current.fromId).toBe(50);
});

test('a departed dataset page cannot normalize or paginate the new route URL', () => {
  const originalUrl = window.location.href;
  window.history.replaceState(null, '', '/app/backups?tab=downloads&q=synthetic');
  const setSearchParams = vi.fn();
  try {
    const { result, rerender } = renderHook(
      ({ filterKey }) =>
        useKeysetPagination({
          id: 'departing-dataset-route',
          filterKey,
          navigationPathname: '/app/nas/10/snapshots',
          searchParams: new URLSearchParams('from=backups&backups.tab=downloads&backups.q=synthetic'),
          setSearchParams,
        }),
      { initialProps: { filterKey: 'dataset=10' } }
    );
    expect(setSearchParams).not.toHaveBeenCalled();
    act(() => {
      result.current.goNext(31);
      result.current.setLimit(100);
    });
    expect(setSearchParams).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '/app/nas/10/snapshots');
    rerender({ filterKey: 'dataset=11' });
    const next = setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(next.get('limit')).toBe('50');
    expect(next.get('page')).toBe('1');
    expect(next.get('backups.q')).toBe('synthetic');
    expect(next.get('backups.tab')).toBe('downloads');
  } finally {
    window.history.replaceState(null, '', originalUrl);
  }
});
