export type AdminIncidentView = 'overview' | 'history';
export const exposureSorts = [
  'severity',
  'vps_id',
  'user_login',
  'policy_key',
  'count_7d',
  'count_30d',
  'warning_remaining',
  'stop_remaining',
  'last_incident_at',
] as const;
export const historyScopes = ['violations', 'matched', 'all', 'outstanding'] as const;
export const incidentActionStates = ['pending', 'queued', 'failed', 'uncertain', 'completed', 'suppressed'] as const;
export const incidentMailStates = ['pending', 'queued', 'sent', 'failed', 'uncertain', 'suppressed'] as const;

export interface AdminIncidentFilters {
  offset: number;
  limit: number;
  as_of?: string;
  policy_key?: string;
  vps_id?: number;
  user_id?: number;
  vps?: number;
  user?: number;
  node?: number;
  status?: string;
  effective_mode?: string;
  stop_enforced?: boolean;
  sort?: string;
  direction: 'asc' | 'desc';
  scope?: string;
  decision?: string;
  action_kind?: string;
  action_state?: string;
  mail_state?: string;
  from?: string;
  to?: string;
}

function integer(sp: URLSearchParams, key: string, fallback?: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = sp.get(key);
  if (raw == null || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) throw new Error('Invalid incident filter');
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error('Invalid incident filter');
  return value;
}

function choice(sp: URLSearchParams, key: string, values: readonly string[], fallback?: string) {
  const value = sp.get(key) || fallback;
  if (value != null && !values.includes(value)) throw new Error('Invalid incident filter');
  return value;
}

function datetime(sp: URLSearchParams, key: string) {
  const value = sp.get(key) || undefined;
  if (value && (!/^\d{4}-\d\d-\d\dT.*(?:Z|\+00:00)$/.test(value) || !Number.isFinite(Date.parse(value)))) {
    throw new Error('Invalid incident filter');
  }
  return value;
}

/** Local URL state only. Membership, thresholds and ordering are server-owned. */
export function parseAdminIncidentFilters(sp: URLSearchParams, view: AdminIncidentView): AdminIncidentFilters {
  const sort = view === 'overview' ? choice(sp, 'sort', exposureSorts, 'severity')! : undefined;
  const direction = choice(
    sp,
    'direction',
    ['asc', 'desc'],
    view === 'history' || sort === 'severity' ? 'desc' : 'asc'
  ) as 'asc' | 'desc';
  const common = {
    offset: integer(sp, 'offset', 0)!,
    limit: integer(sp, 'limit', 25, 1, 100)!,
    as_of: datetime(sp, 'as_of'),
    policy_key: sp.get('policy_key') || undefined,
    direction,
  };
  if (view === 'overview') {
    return {
      ...common,
      sort,
      vps: integer(sp, 'vps', undefined, 1),
      user: integer(sp, 'user', undefined, 1),
      node: integer(sp, 'node', undefined, 1),
      status: choice(sp, 'status', ['clear', 'near_limit', 'warning', 'stop_threshold', 'invalid']),
      effective_mode: choice(sp, 'effective_mode', ['observe', 'notify', 'enforce']),
      stop_enforced:
        choice(sp, 'stop_enforced', ['true', 'false']) === undefined ? undefined : sp.get('stop_enforced') === 'true',
    };
  }
  const scope = choice(sp, 'scope', historyScopes, 'violations');
  return {
    ...common,
    vps_id: integer(sp, 'vps_id', undefined, 1),
    user_id: integer(sp, 'user_id', undefined, 1),
    scope,
    decision: choice(sp, 'decision', ['none', 'warning', 'stop']),
    action_kind: choice(sp, 'action_kind', ['warning', 'stop']),
    action_state: choice(sp, 'action_state', incidentActionStates),
    mail_state: choice(sp, 'mail_state', incidentMailStates),
    // Outstanding work has no evaluation-period bound, including deep links.
    from: scope === 'outstanding' ? undefined : datetime(sp, 'from'),
    to: scope === 'outstanding' ? undefined : datetime(sp, 'to'),
  };
}

export function changeAdminIncidentFilter(sp: URLSearchParams, key: string, value: string) {
  const next = new URLSearchParams(sp);
  if (value) next.set(key, value);
  else next.delete(key);
  next.delete('offset');
  if (key === 'sort') next.delete('direction');
  if (key === 'scope' && value === 'outstanding') {
    next.delete('from');
    next.delete('to');
  }
  return next;
}

export function refreshAdminIncidentFilters(sp: URLSearchParams) {
  const next = new URLSearchParams(sp);
  next.delete('as_of');
  next.delete('offset');
  return next;
}
