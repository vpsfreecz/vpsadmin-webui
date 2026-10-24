import { apiWire } from '../../test/haveapiXhr';
import { describe, expect, test, vi } from 'vitest';

import {
  createVps,
  updateVps,
  vpsBoot,
  vpsClone,
  vpsDelete,
  vpsMigrate,
  vpsPasswd,
  vpsReinstall,
  vpsReplace,
  vpsRestart,
  vpsStart,
  vpsStop,
  vpsSwapWith,
} from './vps';

function mockFetchOk(response: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: true, response }) });
}

describe('blocking VPS API contracts', () => {
  test('accepts a synchronous VPS lifetime-date update without an action-state id', async () => {
    apiWire.respond = mockFetchOk({ vps: { id: 12, remind_after_date: null }, _meta: {} }) as unknown as typeof fetch;
    await expect(updateVps(12, { remind_after_date: null })).resolves.toMatchObject({
      data: { id: 12, remind_after_date: null },
    });
  });

  test.each([true, false])('accepts a synchronous isolated admin preference (%s)', async (allow) => {
    apiWire.respond = mockFetchOk({ _meta: {} }) as unknown as typeof fetch;
    await expect(updateVps(12, { allow_admin_modifications: allow })).resolves.toBeDefined();
  });

  test.each([
    { allow_admin_modifications: false, cpu: 4 },
    { allow_admin_modifications: 'false' },
    { allow_admin_modifications: false, change_reason: 'reason' },
  ])('still requires a receipt for mixed or malformed preference writes', async (params) => {
    apiWire.respond = mockFetchOk({ _meta: {} }) as unknown as typeof fetch;
    await expect(updateVps(12, params)).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test('rejects an explicitly malformed async receipt on a preference write', async () => {
    apiWire.respond = mockFetchOk({ _meta: { action_state_id: 'invalid' } }) as unknown as typeof fetch;
    await expect(updateVps(12, { allow_admin_modifications: true })).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test.each([
    ['start', () => vpsStart(12)],
    ['stop', () => vpsStop(12)],
    ['restart', () => vpsRestart(12)],
    ['password reset', () => vpsPasswd(12)],
  ])('fails closed when VPS %s omits its action-state id', async (_action, call) => {
    apiWire.respond = mockFetchOk({ _meta: {} }) as unknown as typeof fetch;
    await expect(call()).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test.each([
    [
      'create',
      () => createVps({
        mode: 'user',
        hostname: 'missing-task.example',
        location: 2,
        os_template: 6,
      }),
    ],
    ['update', () => updateVps(12, { cpu: 4 })],
    ['clone', () => vpsClone(12, {})],
    ['swap', () => vpsSwapWith(12, { vps: 13 })],
    ['replace', () => vpsReplace(12, {})],
    ['boot', () => vpsBoot(12, {})],
    ['reinstall', () => vpsReinstall(12, {})],
    ['migrate', () => vpsMigrate(12, { node: 2 })],
    ['delete', () => vpsDelete(12)],
  ])('fails closed when VPS %s omits its action-state id', async (_action, call) => {
    apiWire.respond = mockFetchOk({ vps: { id: 12 }, _meta: {} }) as unknown as typeof fetch;
    await expect(call()).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });
});
