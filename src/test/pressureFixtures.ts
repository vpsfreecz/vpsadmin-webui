import type { ActionDescription, ApiDescription } from 'vpsadmin-typescript-client';

export const pressureRowFixture = (vpsId = 12, userId = 4) => ({
  id: `${vpsId}:rtnl_latency`,
  vps: { id: vpsId, hostname: `pressure-${vpsId}.example.test` },
  hostname: `pressure-${vpsId}.example.test`,
  user: { id: userId, login: `user${userId}` },
  node: { id: 5, domain_name: 'node5.example.test' },
  signal: 'rtnl_latency',
  label: 'RTNL latency',
  representation: 'qualified_duration',
  credit_us: 70_000_125,
  configuration_valid: true,
  window_seconds: 86400,
  window_from: '2026-11-27T12:00:00Z',
  window_to: '2026-11-28T12:00:00Z',
  threshold_seconds: 60,
  reporting_enabled: false,
  last_observed_at: '2026-11-28T11:59:00Z',
  observation_state: 'fresh',
  window_complete: false,
});
export const pressureReadMeta = { read_at: '2026-11-28T12:00:00Z', configuration_valid: true, unavailable_signals: [] };
export const pressurePageFixture = (vpsId = 12, userId = 4) => ({
  data: [pressureRowFixture(vpsId, userId)],
  meta: { ...pressureReadMeta, offset: 0, limit: 25, next_offset: null, total_count: 1 },
});
export function pressureHistoryFixture(days: 7 | 30) {
  const end = Date.parse('2026-11-29T00:00:00Z');
  const from = end - days * 86_400_000;
  return {
    data: Array.from({ length: days }, (_, index) => ({
      id: String(index),
      from_at: new Date(from + index * 86_400_000).toISOString(),
      to_at: new Date(from + (index + 1) * 86_400_000).toISOString(),
      recorded_us: index === days - 1 ? 125 : null,
      partial_day: index === days - 1,
    })),
    meta: {
      read_at: '2026-11-28T12:00:00Z',
      timezone: 'UTC',
      range_from: new Date(from).toISOString(),
      range_to: new Date(end).toISOString(),
      total_recorded_us: 125,
      first_recorded_at: '2026-10-28T12:00:00Z',
      accounting_since: null,
      ownership_limited: false,
      available: true,
    },
  };
}
export function pressureDescription(): ApiDescription {
  const fields = (keys: readonly string[]) => Object.fromEntries(keys.map((key) => [key, {}]));
  const action = (input: readonly string[], output: readonly string[], meta: readonly string[]): ActionDescription => ({
    method: 'GET',
    input: { parameters: fields(input) },
    output: { layout: 'object_list', parameters: fields(output) },
    meta: { global: { output: { parameters: fields(meta) } } },
  });
  return {
    resources: {
      vps_evidence: {
        actions: {
          index: action(
            ['user', 'vps', 'node', 'location', 'environment', 'offset', 'limit'],
            Object.keys(pressureRowFixture()),
            Object.keys(pressurePageFixture().meta)
          ),
        },
      },
      vps: {
        resources: {
          evidence: {
            actions: { index: action([], Object.keys(pressureRowFixture()), Object.keys(pressureReadMeta)) },
          },
        },
      },
      vps_pressure_history: {
        actions: {
          index: action(
            ['vps', 'days'],
            Object.keys(pressureHistoryFixture(7).data[0] ?? {}),
            Object.keys(pressureHistoryFixture(7).meta)
          ),
        },
      },
    },
  };
}
