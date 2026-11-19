import { expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { ClientInputError } from './apiErrors';
import { fetchVps, fetchVpsList, updateVps } from './vps';

function reply(response: unknown) {
  apiWire.respond = vi.fn(async () => ({ json: async () => ({ status: true, response }) }));
}
it('preserves explicit arbitrary policy/status filters with owner and pagination', async () => {
  reply({ vpses: [] });
  await fetchVpsList({
    user: 7,
    limit: 25,
    fromId: 50,
    incidentPolicy: 'arbitrary_key',
    incidentStatus: 'stop_threshold',
    incidentEnforcementEnabled: false,
  });
  const url = new URL(apiWire.requests.at(-1)!.url);
  for (const [key, value] of Object.entries({
    user: '7',
    limit: '25',
    from_id: '50',
    incident_policy: 'arbitrary_key',
    incident_status: 'stop_threshold',
    incident_enforcement_enabled: 'false',
  }))
    expect(url.searchParams.get(`vps[${key}]`)).toBe(value);
});
it('never supplies an implicit policy or a status without an explicit key', async () => {
  reply({ vpses: [] });
  await fetchVpsList({ incidentStatus: 'warning' });
  expect(new URL(apiWire.requests.at(-1)!.url).searchParams.has('vps[incident_status]')).toBe(false);
  reply({ vps: { id: 5 } });
  await fetchVps(5);
  expect(new URL(apiWire.requests.at(-1)!.url).searchParams.has('vps[incident_policy]')).toBe(false);
});
it('preserves generic aggregate counters and shared permission', async () => {
  reply({
    vps: { id: 5, incident_warning_count: 2, incident_stop_threshold_count: 1, incident_enforcement_enabled: false },
  });
  expect((await fetchVps(5)).data).toMatchObject({
    incident_warning_count: 2,
    incident_stop_threshold_count: 1,
    incident_enforcement_enabled: false,
  });
});
it.each([true, false])(
  'accepts only the isolated shared permission synchronous acknowledgement %s',
  async (allowed) => {
    reply({ vps: { ok: true } });
    await updateVps(5, { incident_enforcement_enabled: allowed });
    expect(JSON.parse(apiWire.requests.at(-1)!.body!)).toEqual({ vps: { incident_enforcement_enabled: allowed } });
  }
);
it('retains strict receipts for mixed shared permission or a malformed supplied receipt', async () => {
  reply({ vps: { ok: true } });
  await expect(updateVps(5, { incident_enforcement_enabled: false, cpu: 4 })).rejects.toMatchObject({
    code: 'MISSING_ACTION_STATE',
  });
  reply({ vps: { ok: true }, _meta: { action_state_id: 'invalid' } });
  await expect(updateVps(5, { incident_enforcement_enabled: false })).rejects.toMatchObject({
    code: 'MISSING_ACTION_STATE',
  });
});
it('rejects an invalid primitive shared permission before dispatch', async () => {
  reply({ vps: { ok: true } });
  // @ts-expect-error An untrusted external draft must still satisfy generated boolean validation.
  await expect(updateVps(5, { incident_enforcement_enabled: null })).rejects.toBeInstanceOf(ClientInputError);
  expect(apiWire.requests).toHaveLength(0);
});
