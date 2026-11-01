import { describe, expect, test } from 'vitest';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { fetchVpsMaintenanceWindows, updateVpsMaintenanceWindow } from './vpsMaintenance';

describe('generated maintenance windows', () => {
  test('accepts Sunday zero without inventing an id and sends false/zero exactly', async () => {
    const window = { weekday: 0, is_open: false, opens_at: 0, closes_at: null };
    installHaveApiXhr((_url, init) => ({ status: 200, json: async () => ({ status: true, response: {
      [init?.method === 'GET' ? 'maintenance_windows' : 'maintenance_window']: init?.method === 'GET' ? [window] : window,
      _meta: { trace: 'kept' },
    } }) }));
    const list = await fetchVpsMaintenanceWindows(42);
    expect(list.data).toEqual([window]);
    expect(list.data[0]).not.toHaveProperty('id');
    const result = await updateVpsMaintenanceWindow(42, 0, { is_open: false, opens_at: 0 });
    const update = apiWire.requests.find(request => request.method === 'PUT')!;
    expect(update.url).toContain('/maintenance_windows/0');
    expect(JSON.parse(update.body!)).toMatchObject({ maintenance_window: { is_open: false, opens_at: 0 } });
    expect(result).toMatchObject({ data: window, meta: { trace: 'kept' }, httpStatus: 200 });
  });
});
