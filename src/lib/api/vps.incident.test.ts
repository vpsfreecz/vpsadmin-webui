import { describe, expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { ClientInputError, HaveApiError, isAmbiguousMutationError } from './apiErrors';
import { fetchVps, fetchVpsList, updateVps } from './vps';

function reply(response: unknown) {
  const responder = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve({
    ok: true, json: async () => ({ status: true, response }),
  }));
  apiWire.respond = responder;
  return responder;
}

describe('VPS selected incident policy contract', () => {
  it('sends the selected type and server filters with owner scope and pagination', async () => {
    const fetch = reply({ vpses: [] });
    await fetchVpsList({ user: 7, limit: 25, fromId: 50, incidentPolicy: 'test_rule', incidentStatus: 'stop_threshold', incidentEnforcementEnabled: false });
    const url = new URL(String(fetch.mock.calls.at(-1)![0]));
    expect(url.pathname).toBe('/v7.0/vpses');
    for (const [key, value] of Object.entries({ user: '7', limit: '25', from_id: '50', incident_policy: 'test_rule', incident_status: 'stop_threshold', incident_enforcement_enabled: 'false' })) {
      expect(url.searchParams.get(`vps[${key}]`)).toBe(value);
    }
  });

  it('omits new selector/filter inputs on initial capability reads', async () => {
    const listFetch = reply({ vpses: [] });
    await fetchVpsList();
    const showFetch = reply({ vps: { id: 5 } });
    await fetchVps(5);
    for (const call of [...listFetch.mock.calls, ...showFetch.mock.calls]) {
      const url = new URL(String(call[0]));
      expect([...url.searchParams.keys()].some(key => key.includes('incident_'))).toBe(false);
    }
  });

  it.each(['oomd', 'test_rule'])('carries known selected type %s on detail refresh', async incidentPolicy => {
    const fetch = reply({ vps: { id: 5 } });
    await fetchVps(5, { incidentPolicy });
    const url = new URL(String(fetch.mock.calls.at(-1)![0]));
    expect(url.pathname).toBe('/v7.0/vpses/5');
    expect(url.searchParams.get('vps[incident_policy]')).toBe(incidentPolicy);
  });

  it.each(['oomd', 'test_rule'])('preserves explicit selection and null resets on isolated synchronous %s save', async incident_policy => {
    const fetch = reply({ vps: { id: 5 }, _meta: {} });
    const settings = { incident_policy, incident_warning_limit_override: null, incident_stop_limit_override: null, incident_enforcement_enabled: false };
    await updateVps(5, settings);
    expect(JSON.parse(String(fetch.mock.calls[0]![1]?.body))).toMatchObject({ vps: settings });
  });

  it.each([
    { incident_policy: 'oomd' },
    { incident_policy: '', incident_enforcement_enabled: true },
    { incident_policy: 'bad/type', incident_enforcement_enabled: true },
    { incident_warning_limit_override: null },
    { incident_enforcement_enabled: false },
    { incident_policy: 'oomd', incident_warning_limit_override: null, cpu: 4 },
    { incident_policy: 'oomd', incident_warning_limit_override: 0 },
  ])('does not accept a malformed/mixed/selector-only success as a synchronous save (%j)', async params => {
    reply({ vps: {}, _meta: {} });
    await expect(updateVps(5, params)).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });

  it('rejects invalid primitive/null inputs before sending', async () => {
    const responder = reply({ vps: {}, _meta: {} });
    // @ts-expect-error The generated non-null selector rejects invalid external input.
    await expect(updateVps(5, { incident_policy: null, incident_enforcement_enabled: true })).rejects.toBeInstanceOf(ClientInputError);
    // @ts-expect-error A nullable integer override does not accept a string.
    await expect(updateVps(5, { incident_policy: 'oomd', incident_stop_limit_override: '12' })).rejects.toBeInstanceOf(ClientInputError);
    // @ts-expect-error The shared permission is a non-null boolean.
    await expect(updateVps(5, { incident_policy: 'oomd', incident_enforcement_enabled: null })).rejects.toBeInstanceOf(ClientInputError);
    // @ts-expect-error The generated boolean input does not accept a string.
    await expect(updateVps(5, { incident_policy: 'oomd', incident_enforcement_enabled: 'false' })).rejects.toBeInstanceOf(ClientInputError);
    expect(responder).not.toHaveBeenCalled();
  });

  it('propagates server refusal of an unknown string selector without adding local choices', async () => {
    const responder = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve({
      ok: true, json: async () => ({ status: false, message: 'Invalid incident policy', errors: { incident_policy: ['not registered'] } }),
    }));
    apiWire.respond = responder;
    const error: unknown = await fetchVps(5, { incidentPolicy: 'unknown_rule' }).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(HaveApiError);
    expect(isAmbiguousMutationError(error)).toBe(false);
    expect(new URL(String(responder.mock.calls[0]![0])).searchParams.get('vps[incident_policy]')).toBe('unknown_rule');
  });

  it('continues to validate a malformed supplied async receipt on isolated settings', async () => {
    reply({ vps: {}, _meta: { action_state_id: 'not-an-id' } });
    await expect(updateVps(5, { incident_policy: 'oomd', incident_enforcement_enabled: false })).rejects.toMatchObject({ code: 'MISSING_ACTION_STATE' });
  });
});
