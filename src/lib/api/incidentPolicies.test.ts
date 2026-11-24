import { expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { MissingActionStateError } from './apiErrors';
import { ApiOutputError } from './apiOutput';
import {
  fetchIncidentPolicies,
  fetchIncidentPolicyCapabilities,
  fetchIncidentPolicyEvaluations,
  fetchVpsIncidentPolicies,
  fetchVpsIncidentPolicy,
  updateVpsIncidentPolicy,
} from './incidentPolicies';
import { fetchIncidentReports } from './incidents';

const row = {
  key: 'alpha',
  label: 'API label',
  warning_period_days: 7,
  stop_period_days: 30,
  count_7d: 0,
  count_30d: 0,
  configuration_valid: true,
  warning_limit: 5,
  stop_limit: 10,
  status: 'clear',
  warning_limit_override: null,
  stop_limit_override: null,
  global_mode: 'enforce',
  effective_mode: 'enforce',
  stop_enforced: false,
};
function reply(response: unknown) {
  apiWire.respond = vi.fn(async () => ({ json: async () => ({ status: true, response }) }));
}
it('discovers two arbitrary metadata policies including zero saved memberships', async () => {
  reply({ incident_policies: [row, { ...row, key: 'unrelated_key', label: 'Other label' }] });
  expect((await fetchIncidentPolicies()).data.map((policy) => policy.key)).toEqual(['alpha', 'unrelated_key']);
  expect(new URL(apiWire.requests.at(-1)!.url).pathname).toBe('/v7.0/incident_policies');
  expect((await fetchVpsIncidentPolicies(12)).data[0]).toMatchObject({ key: 'alpha', count_7d: 0, warning_limit: 5 });
  expect(new URL(apiWire.requests.at(-1)!.url).pathname).toBe('/v7.0/vpses/12/incident_policies');
});
it('uses generated path encoding and verifies the exact requested registry key', async () => {
  const key = 'not/a guessed enum';
  reply({ incident_policy: { ...row, key } });
  expect((await fetchVpsIncidentPolicy(12, key)).data.key).toBe(key);
  expect(new URL(apiWire.requests.at(-1)!.url).pathname).toBe(
    '/v7.0/vpses/12/incident_policies/not%2Fa%20guessed%20enum'
  );
  reply({ incident_policy: { ...row, key: 'wrong' } });
  await expect(fetchVpsIncidentPolicy(12, key)).rejects.toBeInstanceOf(ApiOutputError);
});
it('keeps invalid configuration null without making zero effective thresholds', async () => {
  reply({
    incident_policies: [{ ...row, configuration_valid: false, warning_limit: null, stop_limit: null, status: null }],
  });
  expect((await fetchVpsIncidentPolicies(12)).data[0]).toMatchObject({
    configuration_valid: false,
    warning_limit: null,
    status: null,
  });
});
it('updates only selected policy limits with explicit null resets and authoritative row verification', async () => {
  reply({ incident_policy: row });
  await updateVpsIncidentPolicy(12, 'alpha', { warning_limit_override: null, stop_limit_override: null });
  const request = apiWire.requests.at(-1)!;
  expect(request.method).toBe('PUT');
  expect(new URL(request.url).pathname).toBe('/v7.0/vpses/12/incident_policies/alpha');
  expect(JSON.parse(request.body!)).toEqual({
    incident_policy: { warning_limit_override: null, stop_limit_override: null },
  });
});
it.each([{ ...row, key: 'other' }, { ...row, warning_limit_override: 3 }, { key: 'alpha' }, null])(
  'retains accepted-write ambiguity for unusable/mismatched authoritative row %j',
  async (returned) => {
    reply({ incident_policy: returned });
    await expect(
      updateVpsIncidentPolicy(12, 'alpha', { warning_limit_override: null, stop_limit_override: null })
    ).rejects.toBeInstanceOf(MissingActionStateError);
    expect(apiWire.requests).toHaveLength(1);
  }
);
it('gates actual resource capabilities and propagates denied discovery as a read error', async () => {
  reply({ resources: {} });
  expect((await fetchIncidentPolicyCapabilities()).data).toEqual({
    policies: false,
    update: false,
    evaluations: false,
    permission: false,
  });
  reply({
    resources: {
      incident_policy: { actions: { index: {} } },
      vps: {
        resources: {
          incident_policy: {
            actions: {
              index: {},
              show: {},
              update: { input: { parameters: { warning_limit_override: {}, stop_limit_override: {} } } },
            },
          },
        },
      },
      incident_report: { resources: { policy_evaluation: { actions: { index: {} } } } },
    },
  });
  expect((await fetchIncidentPolicyCapabilities()).data).toMatchObject({
    policies: true,
    update: true,
    evaluations: true,
  });
  apiWire.respond = vi.fn(async () => ({ status: 403, json: async () => ({ status: false, message: 'Forbidden' }) }));
  await expect(fetchIncidentPolicyCapabilities()).rejects.toThrow();
  expect(apiWire.requests.every((request) => request.method === 'OPTIONS')).toBe(true);
});
it('uses saved opaque history keys and preserves retired labels through the scoped nested reader', async () => {
  reply({ incident_reports: [] });
  await fetchIncidentReports({ vpsId: 12, policyKey: 'retired_key' });
  expect(new URL(apiWire.requests.at(-1)!.url).searchParams.get('incident_report[policy_key]')).toBe('retired_key');
  reply({
    policy_evaluations: [
      {
        policy_key: 'retired_key',
        label: 'Saved label',
        state: 'recorded',
        count_7d: 6,
        count_30d: 9,
        warning_limit: 5,
        stop_limit: 10,
        decision: 'warning',
      },
    ],
  });
  expect((await fetchIncidentPolicyEvaluations(88)).data[0]).toMatchObject({
    policy_key: 'retired_key',
    label: 'Saved label',
  });
  expect(new URL(apiWire.requests.at(-1)!.url).pathname).toBe('/v7.0/incident_reports/88/policy_evaluations');
});

it.each([true, false, null])(
  'preserves explicit saved membership %s and supplied periods through actual SDK wire',
  async (matched) => {
    reply({
      policy_evaluations: [
        {
          policy_key: 'saved_key',
          label: 'Saved label',
          matched,
          warning_period_days: 7,
          stop_period_days: 30,
          count_7d: 2,
          count_30d: 4,
          warning_limit: 3,
          stop_limit: 9,
          state: matched === null ? 'error' : 'audit_only',
        },
      ],
    });
    expect((await fetchIncidentPolicyEvaluations(88)).data[0]).toMatchObject({
      matched,
      warning_period_days: 7,
      stop_period_days: 30,
    });
  }
);
it.each([{ matched: 'true' }, { warning_period_days: 0 }, { stop_period_days: -1 }])(
  'rejects malformed saved membership/period fields %j',
  async (fields) => {
    reply({ policy_evaluations: [{ policy_key: 'saved_key', ...fields }] });
    await expect(fetchIncidentPolicyEvaluations(88)).rejects.toBeInstanceOf(ApiOutputError);
  }
);
it('keeps old omitted membership and periods absent rather than inventing applicability or windows', async () => {
  reply({ policy_evaluations: [{ policy_key: 'old_key', count_7d: 2, warning_limit: 5, state: 'recorded' }] });
  const row = (await fetchIncidentPolicyEvaluations(88)).data[0];
  expect(row).not.toHaveProperty('matched');
  expect(row).not.toHaveProperty('warning_period_days');
});
