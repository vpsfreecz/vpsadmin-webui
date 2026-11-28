import { beforeEach, expect, it, vi } from 'vitest';
import { apiWire } from '../../test/haveapiXhr';
import {
  pressureHistoryFixture,
  pressurePageFixture,
  pressureReadMeta,
  pressureRowFixture,
} from '../../test/pressureFixtures';
import { fetchPressureDetail, fetchPressureHistory, fetchPressurePage } from './vpsPressure';
import { ApiOutputError } from './apiOutput';

beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://pressure.example.test', version: '7.0' },
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
});
function reply(response: unknown) {
  const envelope = { status: true, response };
  apiWire.respond = vi.fn(async () => ({ json: async () => envelope }));
  return envelope;
}

it('uses the actual generated root action with all resource filters and authoritative offset metadata', async () => {
  const page = pressurePageFixture();
  const envelope = reply({ vps_evidence: page.data, _meta: page.meta });
  const result = await fetchPressurePage({
    user: 4,
    vps: 12,
    node: 5,
    location: 3,
    environment: 1,
    offset: 0,
    limit: 25,
  });
  const request = apiWire.requests.at(-1)!;
  const url = new URL(request.url);
  expect(request.method).toBe('GET');
  expect(url.pathname).toBe('/v7.0/vps_evidence');
  expect(Object.fromEntries(url.searchParams)).toEqual({
    'vps_evidence[user]': '4',
    'vps_evidence[vps]': '12',
    'vps_evidence[node]': '5',
    'vps_evidence[location]': '3',
    'vps_evidence[environment]': '1',
    'vps_evidence[offset]': '0',
    'vps_evidence[limit]': '25',
  });
  expect(result.data[0]?.credit_us).toBe(70_000_125);
  expect(result.meta.unavailable_signals).toEqual([]);
  expect(result.envelope).toEqual(envelope);
});

it('uses the distinct generated child route and preserves member missing references, zero and nullable configuration', async () => {
  const { user: _user, node: _node, ...member } = pressureRowFixture();
  reply({ evidence: [{ ...member, credit_us: 0, observation_state: 'no_data' }], _meta: pressureReadMeta });
  expect((await fetchPressureDetail(12)).data[0]?.credit_us).toBe(0);
  expect(new URL(apiWire.requests.at(-1)!.url).pathname).toBe('/v7.0/vpses/12/evidence');
  reply({
    evidence: [
      {
        ...member,
        configuration_valid: false,
        credit_us: null,
        window_seconds: null,
        window_from: null,
        window_to: null,
        threshold_seconds: null,
        reporting_enabled: null,
        window_complete: null,
      },
    ],
    _meta: { ...pressureReadMeta, configuration_valid: false, unavailable_signals: ['rtnl_latency'] },
  });
  const result = await fetchPressureDetail(12);
  expect(result.data[0]?.credit_us).toBeNull();
  expect(result.data[0]?.user).toBeUndefined();
});

it('preserves pending-transfer or mismatched-epoch unavailable credit independently of valid settings', async () => {
  const unavailable = {
    ...pressureRowFixture(),
    credit_us: null,
    last_observed_at: null,
    observation_state: 'no_data',
    window_complete: false,
  };
  const envelope = reply({ evidence: [unavailable], _meta: pressureReadMeta });
  const result = await fetchPressureDetail(12);
  expect(result.data[0]).toMatchObject({
    configuration_valid: true,
    credit_us: null,
    window_seconds: 86400,
    threshold_seconds: 60,
    window_from: unavailable.window_from,
    window_to: unavailable.window_to,
    observation_state: 'no_data',
  });
  expect(result.envelope).toEqual(envelope);
  expect(new URL(apiWire.requests.at(-1)!.url).pathname).toBe('/v7.0/vpses/12/evidence');

  reply({ vps_evidence: [unavailable], _meta: pressurePageFixture().meta });
  await expect(fetchPressurePage({ offset: 0, limit: 25 })).rejects.toBeInstanceOf(ApiOutputError);
});

it.each([7, 30] as const)(
  'uses generated %i-day calendar history with actual namespace and all metadata',
  async (days) => {
    const history = pressureHistoryFixture(days);
    const envelope = reply({ vps_pressure_history: history.data, _meta: history.meta });
    const result = await fetchPressureHistory(12, days);
    const url = new URL(apiWire.requests.at(-1)!.url);
    expect(url.pathname).toBe('/v7.0/vps_pressure_history');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      'vps_pressure_history[vps]': '12',
      'vps_pressure_history[days]': String(days),
    });
    expect(result.data).toHaveLength(days);
    expect(result.meta.first_recorded_at).toBe(history.meta.first_recorded_at);
    expect(result.meta.accounting_since).toBeNull();
    expect(result.envelope).toEqual(envelope);
  }
);

it('refuses malformed Custom metadata while retaining the actual generated response receipt', async () => {
  const page = pressurePageFixture();
  const envelope = reply({ vps_evidence: page.data, _meta: { ...page.meta, unavailable_signals: 'rtnl_latency' } });
  try {
    await fetchPressurePage({ offset: 0, limit: 25 });
    throw new Error('accepted malformed metadata');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiOutputError);
    expect((error as ApiOutputError).result.envelope).toEqual(envelope);
  }
});
