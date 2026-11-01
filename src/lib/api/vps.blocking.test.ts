import { apiWire } from '../../test/haveapiXhr';
import { describe, expect, test, vi } from 'vitest';
import { ClientInputError, HaveApiError, isAmbiguousMutationError } from './apiErrors';

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
    await expect(updateVps(12, { expiration_date: '2026-11-21T08:25:00Z' })).resolves.toMatchObject({
      data: { id: 12, remind_after_date: null },
    });
  });

  test.each([true, false])('accepts a synchronous isolated admin preference (%s)', async (allow) => {
    apiWire.respond = mockFetchOk({ vps: {}, _meta: {} }) as unknown as typeof fetch;
    await expect(updateVps(12, { allow_admin_modifications: allow })).resolves.toBeDefined();
  });

  test.each([
    { allow_admin_modifications: false, cpu: 4 },
    { allow_admin_modifications: false, change_reason: 'reason' },
  ])('still requires a receipt for mixed or malformed preference writes', async (params) => {
    apiWire.respond = mockFetchOk({ vps: {}, _meta: {} }) as unknown as typeof fetch;
    await expect(updateVps(12, params)).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test('rejects a malformed preference before sending and permits deliberate correction', async () => {
    apiWire.respond = mockFetchOk({ vps: {}, _meta: {} }) as unknown as typeof fetch;
    // @ts-expect-error Generated boolean input rejects an invalid external draft too.
    const error: unknown = await updateVps(12, { allow_admin_modifications: 'false' }).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ClientInputError);
    expect(isAmbiguousMutationError(error)).toBe(false);
    expect(apiWire.respond).not.toHaveBeenCalled();
  });

  test('rejects an explicitly malformed async receipt on a preference write', async () => {
    apiWire.respond = mockFetchOk({ vps: {}, _meta: { action_state_id: 'invalid' } }) as unknown as typeof fetch;
    await expect(updateVps(12, { allow_admin_modifications: true })).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test('validates any supplied asynchronous receipt on lifetime-only updates', async () => {
    apiWire.respond = mockFetchOk({ vps: {}, _meta: { action_state_id: 'invalid' } }) as unknown as typeof fetch;
    await expect(updateVps(12, { expiration_date: null })).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test('fails closed when the canonical empty VPS start output omits its action-state id', async () => {
    // HaveAPI safe_output frames even an empty object under its resource namespace.
    apiWire.respond = mockFetchOk({ vps: {}, _meta: {} }) as unknown as typeof fetch;
    await expect(vpsStart(12)).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  test('retains a namespace-free VPS start reply as an uncertain protocol failure', async () => {
    const response = { _meta: { action_state_id: 81 } };
    apiWire.respond = mockFetchOk(response) as unknown as typeof fetch;

    const error: unknown = await vpsStart(12).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(HaveApiError);
    expect(error).toMatchObject({
      failure: 'protocol',
      result: { envelope: { status: true, response }, meta: response._meta, httpStatus: 200 },
    });
    expect(isAmbiguousMutationError(error)).toBe(true);
    expect(apiWire.respond).toHaveBeenCalledOnce();
  });

  test.each([
    ['stop', () => vpsStop(12)],
    ['restart', () => vpsRestart(12)],
    ['password reset', () => vpsPasswd(12)],
  ])('fails closed when VPS %s omits its action-state id', async (_action, call) => {
    apiWire.respond = mockFetchOk({ vps: {}, _meta: {} }) as unknown as typeof fetch;
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
