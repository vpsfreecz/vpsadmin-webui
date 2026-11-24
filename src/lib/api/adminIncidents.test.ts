import { beforeEach, expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import { adminIncidentMeta, evaluationFixture, exposureFixture } from '../../test/adminIncidentFixtures';
import { parseAdminIncidentFilters } from '../../pages/app/incidents/adminIncidentState';
import { ApiOutputError } from './apiOutput';
import { fetchAdminIncidentEvaluations, fetchAdminIncidentExposures } from './adminIncidents';

beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://admin-incidents.example.test', version: '7.0' },
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
});

function reply(response: unknown) {
  const envelope = { status: true, response };
  apiWire.respond = vi.fn(async () => ({ json: async () => envelope }));
  return envelope;
}

it('calls the generated Exposure operation with Resource filters, false and server ordering', async () => {
  const meta = { ...adminIncidentMeta, total_count: 1 };
  const envelope = reply({ incident_policy_exposures: [exposureFixture({ count_7d: 0 })], _meta: meta });
  const filters = parseAdminIncidentFilters(
    new URLSearchParams('vps=12&user=4&node=5&stop_enforced=false&sort=count_30d'),
    'overview'
  );
  const result = await fetchAdminIncidentExposures(filters);
  const request = apiWire.requests.at(-1)!;
  const url = new URL(request.url);
  expect(request.method).toBe('GET');
  expect(url.pathname).toBe('/v7.0/incident_policy_exposures');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    'incident_policy_exposure[offset]': '0',
    'incident_policy_exposure[limit]': '25',
    'incident_policy_exposure[vps]': '12',
    'incident_policy_exposure[user]': '4',
    'incident_policy_exposure[node]': '5',
    'incident_policy_exposure[stop_enforced]': 'false',
    'incident_policy_exposure[sort]': 'count_30d',
    'incident_policy_exposure[direction]': 'asc',
  });
  expect(result.data[0]).toMatchObject({ count_7d: 0, stop_enforced: false, latest_action_id: null });
  expect(result.meta).toEqual(meta);
  expect(result.envelope).toEqual(envelope);
  expect(result.httpStatus).toBe(200);
  expect(apiWire.requests).toHaveLength(1);
});

it('uses generated direction-only History without lower-period bounds for outstanding work', async () => {
  reply({
    incident_policy_evaluations: [evaluationFixture({ matched: null, stop_enforced: false })],
    _meta: { ...adminIncidentMeta, total_count: 1, from: null, to: null },
  });
  const filters = parseAdminIncidentFilters(
    new URLSearchParams('scope=outstanding&from=bad&to=bad&sort=evaluated_at&vps_id=12&user_id=4&direction=asc'),
    'history'
  );
  const result = await fetchAdminIncidentEvaluations(filters);
  const url = new URL(apiWire.requests.at(-1)!.url);
  expect(url.pathname).toBe('/v7.0/incident_policy_evaluations');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    'incident_policy_evaluation[offset]': '0',
    'incident_policy_evaluation[limit]': '25',
    'incident_policy_evaluation[vps_id]': '12',
    'incident_policy_evaluation[user_id]': '4',
    'incident_policy_evaluation[scope]': 'outstanding',
    'incident_policy_evaluation[direction]': 'asc',
  });
  expect(result.data[0]).toMatchObject({ matched: null, stop_enforced: false });
  expect(result.meta).toMatchObject({ from: null, to: null });
});

it('sends exact anchored page inputs and keeps malformed output HTTP/envelope receipts', async () => {
  const envelope = reply({
    incident_policy_exposures: [{ ...exposureFixture(), vps: { id: '12', hostname: 'bad' } }],
    _meta: { ...adminIncidentMeta, offset: 25, total_count: 26 },
  });
  const filters = parseAdminIncidentFilters(
    new URLSearchParams('offset=25&as_of=2026-11-24T12%3A00%3A00Z'),
    'overview'
  );
  await expect(fetchAdminIncidentExposures(filters)).rejects.toMatchObject({
    name: 'ApiOutputError',
    result: { httpStatus: 200, envelope, meta: { offset: 25 } },
  });
  expect(new URL(apiWire.requests.at(-1)!.url).searchParams.get('incident_policy_exposure[as_of]')).toBe(filters.as_of);
});

it('keeps denied reads as errors without a fallback request', async () => {
  apiWire.respond = vi.fn(async () => ({ status: 403, json: async () => ({ status: false, message: 'Forbidden' }) }));
  await expect(
    fetchAdminIncidentEvaluations(parseAdminIncidentFilters(new URLSearchParams(), 'history'))
  ).rejects.toThrow();
  expect(apiWire.requests).toHaveLength(1);
});

it('rejects a changed echoed cutoff from an actual generated response', async () => {
  reply({ incident_policy_exposures: [], _meta: { ...adminIncidentMeta, total_count: 0 } });
  await expect(
    fetchAdminIncidentExposures(
      parseAdminIncidentFilters(new URLSearchParams('as_of=2026-11-24T11%3A00%3A00Z'), 'overview')
    )
  ).rejects.toBeInstanceOf(ApiOutputError);
});
