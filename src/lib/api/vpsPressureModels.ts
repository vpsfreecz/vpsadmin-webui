/** Displayed fields are narrowed at the domain boundary, independently of SDK discovery. */
export interface VpsPressureRow {
  id: string;
  vps: { id: number; hostname: string };
  user?: { id: number; login: string };
  node?: { id: number; domain_name: string } | null;
  signal: string;
  label: string;
  credit_us: number | null;
  window_seconds: number | null;
  window_from: string | null;
  window_to: string | null;
  threshold_seconds: number | null;
  configuration_valid: boolean;
  reporting_enabled: boolean | null;
  observation_state: 'no_data' | 'fresh' | 'stale';
  window_complete: boolean | null;
  last_observed_at: string | null;
}

export interface PressureHistoryDay {
  from_at: string;
  to_at: string;
  recorded_us: number | null;
  partial_day: boolean;
}

export interface PressureHistoryMeta extends Record<string, unknown> {
  read_at: string;
  timezone: 'UTC';
  range_from: string;
  range_to: string;
  total_recorded_us: number | null;
  first_recorded_at: string | null;
  accounting_since: string | null;
  ownership_limited: boolean;
  available: boolean;
}

export const pressureFilterKeys = ['user', 'vps', 'node', 'location', 'environment'] as const;
export type PressureFilterKey = (typeof pressureFilterKeys)[number];
export type PressureFilters = Partial<Record<PressureFilterKey, number>>;
