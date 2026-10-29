// i18n-ignore-file
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { findUserByExactLogin } from '../../../../lib/api/userLookups';
import { useIpAddressSmartSearch } from './useIpAddressSmartSearch';

vi.mock('../../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../../lib/api/userLookups', () => ({ findUserByExactLogin: vi.fn() }));

function setup(query = 'version=6&limit=25&page=2&from_id=90') {
  window.history.replaceState(null, '', `/admin/networking/ip-addresses?${query}`);
  const setSearchParams = vi.fn();
  const openIp = vi.fn();
  const hook = renderHook(() => useIpAddressSmartSearch({
    searchParams: new URLSearchParams(query), setSearchParams, openIp,
    legacyQuery: '', setAddressFilter: vi.fn(), clearUrlFilters: vi.fn(),
  }));
  return { ...hook, setSearchParams, openIp };
}

beforeEach(() => vi.clearAllMocks());

describe('IP inventory numeric owner search', () => {
  it.each(['5008', 'q:5008', 'user:5008', '5008 version:6'])(
    '%s filters the owner without an IP navigation or login lookup', async (query) => {
      const { result, setSearchParams, openIp } = setup();
      await act(async () => result.current.applySmartText(query));
      const next = setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
      expect(next.get('user')).toBe('5008');
      expect(next.get('version')).toBe('6');
      expect(next.get('limit')).toBe('25');
      for (const key of ['q', 'page', 'from_id', 'assigned_to_interface']) expect(next.has(key)).toBe(false);
      expect(openIp).not.toHaveBeenCalled();
      expect(findUserByExactLogin).not.toHaveBeenCalled();
    },
  );

  it('puts owner filtering first and retains the explicit IP suggestion', () => {
    const { result, setSearchParams, openIp } = setup('assigned_to_interface=1');
    act(() => result.current.setSmart('5008'));
    expect(result.current.smartSuggestions.map((s) => s.id)).toEqual(['user', 'open']);
    act(() => result.current.smartSuggestions[0]?.onPick());
    const next = setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(next.get('user')).toBe('5008');
    expect(next.get('assigned_to_interface')).toBe('1');
    expect(openIp).not.toHaveBeenCalled();
  });

  it.each(['#5008', 'id:5008'])('%s still opens that exact IP detail', async (query) => {
    const { result, openIp, setSearchParams } = setup();
    await act(async () => result.current.applySmartText(query));
    expect(openIp).toHaveBeenCalledWith(5008);
    expect(setSearchParams).not.toHaveBeenCalled();
  });
});
