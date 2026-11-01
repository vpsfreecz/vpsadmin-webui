import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { describe, expect, test, vi } from 'vitest';

import { deployVpsUserData, fetchVpsUserDataList } from './vpsUserData';

function mockFetchOk(response: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, response }) });
}

describe('VPS user-data blocking mutation contract', () => {
  test('uses only server owner/format filters and retains partial associations and receipt', async () => {
    const response = { vps_user_data: [{ id: 4, label: null, user: { login: 'member' } }], _meta: { trace: 'kept' } };
    installHaveApiXhr(() => ({ status: 200, json: async () => ({ status: true, response }) }));
    const result = await fetchVpsUserDataList({ user: 7, format: 'script', limit: 25, fromId: 8 });
    expect(result).toMatchObject({ data: response.vps_user_data, meta: { trace: 'kept' }, httpStatus: 200, envelope: { response } });
    const url = new URL(apiWire.requests.find(request => request.method === 'GET')!.url);
    expect(url.searchParams.get('vps_user_data[user]')).toBe('7');
    expect(url.searchParams.get('vps_user_data[format]')).toBe('script');
    expect(url.searchParams.get('vps_user_data[from_id]')).toBe('8');
    expect(url.searchParams.has('vps_user_data[q]')).toBe(false);
  });

  test('does not drop a malformed owner from the list', async () => {
    const response = { vps_user_data: [{ id: 4, user: { id: '7' } }] };
    installHaveApiXhr(() => ({ status: 200, json: async () => ({ status: true, response }) }));
    await expect(fetchVpsUserDataList()).rejects.toMatchObject({ code: 'INVALID_API_OUTPUT', result: { envelope: { response } } });
  });

  test('fails closed when deploy omits its action-state id', async () => {
    apiWire.respond = mockFetchOk({ vps_user_data: {}, _meta: {} }) as unknown as typeof fetch;

    await expect(deployVpsUserData(17, 42)).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test('accepts deploy only with a valid action-state id', async () => {
    apiWire.respond = mockFetchOk({ vps_user_data: {}, _meta: { action_state_id: 731 } }) as unknown as typeof fetch;

    await expect(deployVpsUserData(17, 42)).resolves.toMatchObject({ meta: { action_state_id: 731 } });
  });
});
