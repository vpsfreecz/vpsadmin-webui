import { expectArray, haveApiCall, requireActionStateResult } from './haveapi';
import type { ResourceRef } from './appTypes';
import type { Node } from './nodes';
import type { User } from './users';

export type VpsIncidentStatus = 'clear' | 'near_limit' | 'warning' | 'stop_threshold';

export interface VpsIncidentSettings {
  incident_policy: string;
  incident_warning_limit_override: number | null;
  incident_stop_limit_override: number | null;
  incident_enforcement_enabled: boolean;
}

export interface Vps {
  id: number;
  hostname: string;
  object_state?: string;
  expiration_date?: string | null;
  remind_after_date?: string | null;
  is_running?: boolean;
  uptime?: number;
  process_count?: number;
  cpu_idle?: number;
  node?: Node;
  user?: User;
  os_template?: ResourceRef;
  dns_resolver?: ResourceRef;
  user_namespace_map?: ResourceRef;
  dataset?: ResourceRef;
  pool?: ResourceRef;
  manage_hostname?: boolean;
  cgroup_version?: number | string;
  map_mode?: 'native' | 'zfs' | string;
  allow_admin_modifications?: boolean;
  incident_policy?: string;
  incident_policy_label?: string;
  incident_count_7d?: number;
  incident_count_30d?: number;
  incident_warning_limit?: number;
  incident_stop_limit?: number;
  incident_warning_limit_override?: number | null;
  incident_stop_limit_override?: number | null;
  incident_enforcement_enabled?: boolean;
  incident_mode?: 'observe' | 'notify' | 'enforce';
  incident_stop_enforced?: boolean;
  incident_status?: VpsIncidentStatus;
  incident_last_incident_at?: string | null;
  incident_last_warning_at?: string | null;
  incident_last_stop_at?: string | null;
  incident_next_stop_allowed_at?: string | null;
  incident_action_state?: 'none' | 'pending' | 'failed' | 'uncertain';
  incident_action_chain_id?: number | null;
  incident_accounting_since?: string | null;
  enable_network?: boolean;
  autostart_enable?: boolean;
  autostart_priority?: number;
  start_menu_timeout?: number;

  cpu?: number;
  memory?: number;
  swap?: number;
  diskspace?: number;

  used_memory?: number;
  used_swap?: number;
  used_diskspace?: number;

  loadavg1?: number;
  loadavg5?: number;
  loadavg15?: number;

  created_at?: string;

  [k: string]: unknown;
}

export interface VpsStatus {
  id: number;
  is_running?: boolean;
  uptime?: number;
  loadavg1?: number;
  loadavg5?: number;
  loadavg15?: number;
  total_memory?: number;
  used_memory?: number;
  total_swap?: number;
  used_swap?: number;
  total_diskspace?: number;
  used_diskspace?: number;
  created_at?: string;
  [k: string]: unknown;
}

export interface ConsoleToken {
  token: string;
  expiration: string;
  [k: string]: unknown;
}

export interface VpsPasswdReply {
  password: string;
}

export interface VpsClonePayload {
  user?: number;
  node?: number;
  location?: number;
  environment?: number;
  hostname?: string;
  subdatasets?: boolean;
  dataset_plans?: boolean;
  resources?: boolean;
  features?: boolean;
  stop?: boolean;
}

export interface VpsSwapWithPayload {
  vps: number;
  resources?: boolean;
  hostname?: boolean;
  expirations?: boolean;
}

export interface VpsReplacePayload {
  node?: number;
  expiration_date?: string;
  start?: boolean;
  reason?: string;
}

export interface VpsReinstallPayload {
  os_template?: number;
  vps_user_data?: number;
  user_data_format?: string;
  user_data_content?: string;
}

export interface VpsBootPayload {
  os_template?: number;
  mount_root_dataset?: string;
}

export interface VpsMigratePayload {
  node: number;
  replace_ip_addresses?: boolean;
  transfer_ip_addresses?: boolean;
  maintenance_window?: boolean;
  finish_weekday?: number;
  finish_minutes?: number;
  cleanup_data?: boolean;
  no_start?: boolean;
  skip_start?: boolean;
  send_mail?: boolean;
  reason?: string;
}

interface CreateVpsCommonPayload {
  vps_user_data?: number;
  user_data_format?: string;
  user_data_content?: string;
  hostname: string;
  os_template?: number;
  start?: boolean;
  cpu?: number;
  memory?: number;
  diskspace?: number;
  swap?: number;
  ipv4?: number;
  ipv6?: number;
  ipv4_private?: number;
}

export interface CreateVpsAdminPayload extends CreateVpsCommonPayload {
  mode: 'admin';
  node: number;
  user: number;
  info?: string;
}

export interface CreateVpsUserPayload extends CreateVpsCommonPayload {
  mode: 'user';
  environment?: number;
  location?: number;
}

export type CreateVpsPayload = CreateVpsAdminPayload | CreateVpsUserPayload;

export function buildCreateVpsParams(payload: CreateVpsPayload): Record<string, unknown> {
  const common: Record<string, unknown> = {
    ...(payload.vps_user_data !== undefined ? { vps_user_data: payload.vps_user_data } : {}),
    ...(payload.user_data_format !== undefined ? { user_data_format: payload.user_data_format } : {}),
    ...(payload.user_data_content !== undefined ? { user_data_content: payload.user_data_content } : {}),
    hostname: payload.hostname,
    os_template: payload.os_template,
    start: payload.start,
    cpu: payload.cpu,
    memory: payload.memory,
    diskspace: payload.diskspace,
    swap: payload.swap,
    ipv4: payload.ipv4,
    ipv6: payload.ipv6,
    ipv4_private: payload.ipv4_private,
  };

  if (payload.mode === 'admin') {
    return {
      ...common,
      info: payload.info ?? '',
      user: payload.user,
      node: payload.node,
    };
  }

  return {
    ...common,
    environment: payload.environment,
    location: payload.location,
  };
}

export async function fetchVpsList(opts?: {
  limit?: number;
  fromId?: number;
  hostnameAny?: string;
  hostnameExact?: string;
  incidentPolicy?: string;
  incidentStatus?: VpsIncidentStatus;
  incidentEnforcementEnabled?: boolean;
  user?: number;
  userNamespaceMap?: number;
  node?: number;
  location?: number;
  environment?: number;
  includes?: string;
  count?: boolean;
  /** Optional abort signal (used by command palette for rapid typing). */
  signal?: AbortSignal;
}) {
  const params: Record<string, string | number | boolean> = {};
  const meta: Record<string, string | boolean> = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.hostnameAny) params['hostname_any'] = opts.hostnameAny;
  if (opts?.hostnameExact) params['hostname_exact'] = opts.hostnameExact;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.userNamespaceMap !== undefined) params['user_namespace_map'] = opts.userNamespaceMap;
  if (opts?.node !== undefined) params['node'] = opts.node;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.environment !== undefined) params['environment'] = opts.environment;
  if (opts?.incidentPolicy !== undefined) params['incident_policy'] = opts.incidentPolicy;
  if (opts?.incidentStatus !== undefined) params['incident_status'] = opts.incidentStatus;
  if (opts?.incidentEnforcementEnabled !== undefined) params['incident_enforcement_enabled'] = opts.incidentEnforcementEnabled;
  if (opts?.includes) meta['includes'] = opts.includes;
  if (opts?.count) meta['count'] = true;

  const res = await haveApiCall<Vps[]>({
    method: 'GET',
    path: '/vpses',
    namespace: 'vps',
    params,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
    signal: opts?.signal,
  });
  return { ...res, data: expectArray<Vps>(res.data, 'vpses') };
}

export async function fetchVps(vpsId: number, opts?: { includes?: string; incidentPolicy?: string; signal?: AbortSignal }) {
  return haveApiCall<Vps>({
    method: 'GET',
    path: `/vpses/${vpsId}`,
    namespace: 'vps',
    params: opts?.incidentPolicy !== undefined ? { incident_policy: opts.incidentPolicy } : undefined,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
    signal: opts?.signal,
  });
}

export async function updateVps(vpsId: number, params: Record<string, unknown>) {
  const res = await haveApiCall<Vps>({
    method: 'PUT',
    path: `/vpses/${vpsId}`,
    namespace: 'vps',
    params,
  });
  // Only isolated, explicitly selected incident settings are synchronous.
  // Unrelated operations and any provided receipt retain their existing guards.
  const lifetimeOnlyKeys = new Set(['expiration_date', 'remind_after_date', 'change_reason']);
  const lifetimeOnly = Object.keys(params).length > 0
    && Object.keys(params).every((key) => lifetimeOnlyKeys.has(key));
  const preferenceOnly = Object.keys(params).length === 1
    && typeof params['allow_admin_modifications'] === 'boolean';
  const incidentKeys = ['incident_warning_limit_override', 'incident_stop_limit_override', 'incident_enforcement_enabled'];
  const incidentOnly = typeof params['incident_policy'] === 'string'
    && /^[a-z][a-z0-9_]{0,99}$/.test(params['incident_policy'])
    && incidentKeys.some(key => Object.prototype.hasOwnProperty.call(params, key))
    && Object.entries(params).every(([key, value]) => key === 'incident_policy'
      || (key === 'incident_enforcement_enabled' ? typeof value === 'boolean'
        : ['incident_warning_limit_override', 'incident_stop_limit_override'].includes(key)
          && (value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0))));
  const hasReceipt = ['action_state_id', 'state_id', 'action_state', 'state']
    .some((key) => res.meta?.[key] != null);
  return lifetimeOnly || ((preferenceOnly || incidentOnly) && !hasReceipt) ? res : requireActionStateResult(res, 'VPS update');
}

export async function createVps(payload: CreateVpsPayload) {
  const res = await haveApiCall<Vps>({
    method: 'POST',
    path: '/vpses',
    namespace: 'vps',
    params: buildCreateVpsParams(payload),
  });
  return requireActionStateResult(res, 'VPS create');
}

export async function vpsStart(vpsId: number) {
  const res = await haveApiCall<null>({
    method: 'POST',
    path: `/vpses/${vpsId}/start`,
  });
  return requireActionStateResult(res, 'VPS start');
}

export async function vpsStop(vpsId: number, opts?: { force?: boolean }) {
  const res = await haveApiCall<null>({
    method: 'POST',
    path: `/vpses/${vpsId}/stop`,
    namespace: 'vps',
    params: opts?.force ? { force: true } : undefined,
  });
  return requireActionStateResult(res, 'VPS stop');
}

export async function vpsRestart(vpsId: number, opts?: { force?: boolean }) {
  const res = await haveApiCall<null>({
    method: 'POST',
    path: `/vpses/${vpsId}/restart`,
    namespace: 'vps',
    params: opts?.force ? { force: true } : undefined,
  });
  return requireActionStateResult(res, 'VPS restart');
}

export async function vpsPasswd(vpsId: number, type: 'simple' | 'secure' = 'secure') {
  const res = await haveApiCall<VpsPasswdReply>({
    method: 'POST',
    path: `/vpses/${vpsId}/passwd`,
    namespace: 'vps',
    params: { type },
  });
  return requireActionStateResult(res, 'VPS password reset');
}

export async function vpsClone(vpsId: number, params: VpsClonePayload) {
  const res = await haveApiCall<Vps>({
    method: 'POST',
    path: `/vpses/${vpsId}/clone`,
    namespace: 'vps',
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS clone');
}

export async function vpsSwapWith(vpsId: number, params: VpsSwapWithPayload) {
  const res = await haveApiCall<null>({
    method: 'POST',
    path: `/vpses/${vpsId}/swap_with`,
    namespace: 'vps',
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS swap');
}

export async function vpsReplace(vpsId: number, params: VpsReplacePayload) {
  const res = await haveApiCall<Vps>({
    method: 'POST',
    path: `/vpses/${vpsId}/replace`,
    namespace: 'vps',
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS replace');
}

export async function vpsBoot(vpsId: number, params: VpsBootPayload) {
  const res = await haveApiCall<null>({
    method: 'POST',
    path: `/vpses/${vpsId}/boot`,
    namespace: 'vps',
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS boot');
}

export async function vpsReinstall(vpsId: number, params: VpsReinstallPayload) {
  const res = await haveApiCall<null>({
    method: 'POST',
    path: `/vpses/${vpsId}/reinstall`,
    namespace: 'vps',
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS reinstall');
}

export async function vpsMigrate(vpsId: number, params: VpsMigratePayload) {
  const res = await haveApiCall<null>({
    method: 'POST',
    path: `/vpses/${vpsId}/migrate`,
    namespace: 'vps',
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS migrate');
}

export type VpsDeleteOptions = { lazy?: boolean; expiration_date?: string };

export async function vpsDelete(vpsId: number, params?: VpsDeleteOptions) {
  // DELETE only accepts lazy; a custom retention deadline uses the existing
  // admin lifetime transition as one operation, never delete-then-update.
  if (params?.expiration_date !== undefined) {
    if (params.lazy === false || !Number.isFinite(Date.parse(params.expiration_date))) {
      throw new Error('invalid-date');
    }
    return updateVps(vpsId, {
      object_state: 'soft_delete',
      expiration_date: params.expiration_date,
      change_reason: 'Deletion requested',
    });
  }
  const res = await haveApiCall<null>({
    method: 'DELETE',
    path: `/vpses/${vpsId}`,
    namespace: 'vps',
    params,
  });
  return requireActionStateResult(res, 'VPS delete');
}

export async function createConsoleToken(vpsId: number) {
  return haveApiCall<ConsoleToken>({
    method: 'POST',
    path: `/vpses/${vpsId}/console_token`,
  });
}

export async function deleteConsoleToken(vpsId: number) {
  return haveApiCall<null>({
    method: 'DELETE',
    path: `/vpses/${vpsId}/console_token`,
  });
}

export async function fetchVpsStatuses(
  vpsId: number,
  opts?: { limit?: number; fromId?: number; from?: string; to?: string }
) {
  const params: Record<string, string | number> = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.from) params['from'] = opts.from;
  if (opts?.to) params['to'] = opts.to;

  const res = await haveApiCall<VpsStatus[]>({
    method: 'GET',
    path: `/vpses/${vpsId}/statuses`,
    namespace: 'status',
    params,
  });
  return { ...res, data: expectArray<VpsStatus>(res.data, `vpses/${vpsId}/statuses`) };
}
