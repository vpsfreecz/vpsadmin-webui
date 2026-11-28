import { expect, it } from 'vitest';
import type { ActionDescription, ActionResult, ApiDescription } from 'vpsadmin-typescript-client';
import { readPressureDetail, readPressurePage, readPressureHistory } from './vpsPressureOutput';
import {
  pressureFields,
  pressureHistoryFields,
  pressureHistoryMetaFields,
  vpsPressureCapabilities,
} from './vpsPressureCapabilities';

const row = {
  id: '42:rtnl_latency',
  vps: { id: 42, hostname: 'test' },
  user: { id: 7, login: 'test' },
  signal: 'rtnl_latency',
  label: 'RTNL',
  credit_us: 125,
  configuration_valid: true,
  window_seconds: 86400,
  threshold_seconds: 60,
  window_from: '2026-11-27T12:00:00Z',
  window_to: '2026-11-28T12:00:00Z',
  last_observed_at: null,
  observation_state: 'fresh',
  window_complete: false,
  reporting_enabled: false,
};
function result(rows: unknown[] = [row]): ActionResult<unknown> {
  return {
    data: rows,
    meta: {
      read_at: '2026-11-28T12:00:00Z',
      configuration_valid: true,
      unavailable_signals: [],
      offset: 0,
      limit: 25,
      next_offset: null,
      total_count: rows.length,
    },
    httpStatus: 200,
    envelope: { status: true, response: rows },
  };
}

it('preserves zero, null, optional false and Custom arrays without losing the response receipt', () => {
  const zero = result([{ ...row, credit_us: 0 }]);
  expect(readPressureDetail(zero, 42).data[0]?.credit_us).toBe(0);
  expect(readPressureDetail(zero, 42).envelope).toBe(zero.envelope);
  const unavailable = result([
    {
      ...row,
      configuration_valid: false,
      credit_us: null,
      window_seconds: null,
      threshold_seconds: null,
      window_from: null,
      window_to: null,
    },
  ]);
  expect(readPressureDetail(unavailable, 42).data[0]?.credit_us).toBeNull();
  expect(readPressureDetail(zero, 42).data[0]?.reporting_enabled).toBe(false);
  expect(readPressurePage(result(), { offset: 0, limit: 25 }).data[0]?.credit_us).toBe(125);
});

it('rejects incorrect identity/owner, unsafe values, duplicated rows, malformed Custom and mismatched pagination', () => {
  expect(() => readPressureDetail(result(), 43)).toThrow();
  expect(() => readPressurePage(result(), { offset: 0, limit: 25, user: 8 })).toThrow();
  expect(() => readPressurePage(result([{ ...row, credit_us: 0 }]), { offset: 0, limit: 25 })).toThrow();
  for (const broken of [
    result([row, row]),
    result([{ ...row, credit_us: Number.MAX_SAFE_INTEGER + 1 }]),
    { ...result(), meta: { ...result().meta, unavailable_signals: 'rtnl_latency' } },
    { ...result(), meta: { ...result().meta, unavailable_signals: ['rtnl_latency', 'rtnl_latency'] } },
    { ...result(), meta: { ...result().meta, next_offset: 25 } },
  ])
    expect(() => readPressurePage(broken, { offset: 0, limit: 25 })).toThrow();
});

it('discovers current actions and individual filters without inventing an unsupported history call', () => {
  const parameters = (keys: readonly string[]) => Object.fromEntries(keys.map((key) => [key, {}]));
  const action: ActionDescription = {
    method: 'GET',
    input: { parameters: parameters(['offset', 'limit', 'vps', 'node']) },
    output: { layout: 'object_list', parameters: parameters(pressureFields) },
    meta: {
      global: {
        output: {
          parameters: parameters([
            'read_at',
            'configuration_valid',
            'unavailable_signals',
            'offset',
            'limit',
            'next_offset',
            'total_count',
          ]),
        },
      },
    },
  };
  const description: ApiDescription = { resources: { vps_evidence: { actions: { index: action } } } };
  expect(vpsPressureCapabilities(description)).toEqual({
    overview: true,
    detail: false,
    history: false,
    filters: ['vps', 'node'],
  });
  delete action.output!.parameters!['credit_us'];
  expect(vpsPressureCapabilities(description).overview).toBe(false);
  expect(vpsPressureCapabilities({ resources: {} }).overview).toBe(false);
});

function history(days: 7 | 30): ActionResult<unknown> {
  const midnight = Date.parse('2026-03-30T00:00:00Z');
  const start = midnight - (days - 1) * 86_400_000;
  const rows = Array.from({ length: days }, (_, index) => ({
    from_at: new Date(start + index * 86_400_000).toISOString(),
    to_at: new Date(start + (index + 1) * 86_400_000).toISOString(),
    partial_day: index === days - 1,
    recorded_us: index === 0 ? 125 : null,
  }));
  return {
    ...result(rows),
    meta: {
      read_at: '2026-03-30T12:00:00Z',
      timezone: 'UTC',
      range_from: rows[0]!.from_at,
      range_to: '2026-03-31T00:00:00Z',
      total_recorded_us: 125,
      first_recorded_at: '2026-03-02T08:01:00Z',
      accounting_since: null,
      ownership_limited: false,
      available: true,
    },
  };
}

it.each([7, 30] as const)(
  'preserves %i exact UTC calendar bins, partial today and independent first retained acceptance',
  (days) => {
    const response = history(days);
    const parsed = readPressureHistory(response, days);
    expect(parsed.data).toHaveLength(days);
    expect(parsed.data.at(-1)).toMatchObject({
      to_at: '2026-03-31T00:00:00.000Z',
      partial_day: true,
      recorded_us: null,
    });
    expect(parsed.meta.first_recorded_at).toBe('2026-03-02T08:01:00Z');
    expect(parsed.meta.accounting_since).toBeNull();
    expect(parsed.envelope).toBe(response.envelope);
  }
);

it('keeps missing requested days null even when an older retained recording exists, independently of current settings', () => {
  const original = history(7);
  const rows = (original.data as Array<Record<string, unknown>>).map((day) => ({ ...day, recorded_us: null }));
  const response = {
    ...original,
    data: rows,
    meta: { ...original.meta, total_recorded_us: null, configuration_valid: false },
  };
  expect(readPressureHistory(response, 7).meta.first_recorded_at).toBe('2026-03-02T08:01:00Z');
  expect(readPressureHistory(response, 7).data.every((day) => day.recorded_us === null)).toBe(true);
  const unavailable = { ...response, meta: { ...response.meta, available: false, first_recorded_at: null } };
  expect(readPressureHistory(unavailable, 7).meta.available).toBe(false);
});

it('refuses clipped/future/zero-filled or inconsistent historical output', () => {
  const response = history(7);
  const rows = response.data as Array<Record<string, unknown>>;
  for (const broken of [
    { ...response, data: rows.slice(1) },
    { ...response, data: rows.map((day, index) => (index === 6 ? { ...day, to_at: response.meta['read_at'] } : day)) },
    { ...response, data: rows.map((day, index) => (index === 0 ? { ...day, recorded_us: 0 } : day)) },
    { ...response, meta: { ...response.meta, total_recorded_us: 126 } },
    { ...response, meta: { ...response.meta, timezone: 'Europe/Prague' } },
    { ...response, meta: { ...response.meta, available: false } },
  ])
    expect(() => readPressureHistory(broken, 7)).toThrow();
});

it('requires the declared history inputs, calendar rows and metadata before advertising support', () => {
  const parameters = (keys: readonly string[]) => Object.fromEntries(keys.map((key) => [key, {}]));
  const action: ActionDescription = {
    method: 'GET',
    input: { parameters: parameters(['vps', 'days']) },
    output: { layout: 'object_list', parameters: parameters(pressureHistoryFields) },
    meta: { global: { output: { parameters: parameters(pressureHistoryMetaFields) } } },
  };
  const description: ApiDescription = { resources: { vps_pressure_history: { actions: { index: action } } } };
  expect(vpsPressureCapabilities(description).history).toBe(true);
  delete action.meta!.global!.output!.parameters!['available'];
  expect(vpsPressureCapabilities(description).history).toBe(false);
});
