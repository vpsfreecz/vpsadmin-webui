import type {
  Vps__BootInput,
  Vps__CloneInput,
  Vps__CreateInput,
  Vps__DeleteInput,
  Vps__MigrateInput,
  Vps__PasswdOutput,
  Vps__ReinstallInput,
  Vps__ReplaceInput,
  Vps__Status__IndexInput,
  Vps__Status__IndexOutput,
  Vps__SwapWithInput,
  Vps__UpdateInput,
  Vps__ConsoleToken__CreateOutput,
  Environment__ShowOutput,
  Location__ShowOutput,
  Node__ShowOutput,
  OsTemplate__ShowOutput,
  User__ShowOutput,
  Vps__IndexGlobalInput,
  Vps__IndexInput,
  Vps__IndexOutput,
} from 'vpsadmin-typescript-client';
import { requireActionStateResult } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

type VpsReference = Pick<OsTemplate__ShowOutput, 'id' | 'name' | 'label'> & Record<string, unknown>;
type VpsOwner = Pick<User__ShowOutput, 'id' | 'login' | 'full_name'> & Record<string, unknown>;
type VpsEnvironment = Pick<Environment__ShowOutput, 'id' | 'label'> & Record<string, unknown>;
type VpsLocation = Pick<Location__ShowOutput, 'id' | 'label' | 'domain' | 'description' | 'remote_console_server'> & {
  environment?: VpsEnvironment | null;
} & Record<string, unknown>;
type VpsNode = Pick<Node__ShowOutput, 'id' | 'name' | 'domain_name' | 'fqdn' | 'hypervisor_type' | 'cgroup_version'> & {
  location?: VpsLocation | null;
} & Record<string, unknown>;

/** VPS navigation needs an identity; included relations can remain partial. */
export type Vps = Omit<Vps__IndexOutput[number],
  'id' | 'node' | 'user' | 'os_template' | 'dns_resolver' | 'user_namespace_map' | 'dataset' | 'pool'
> & {
  id: number;
  node?: VpsNode | null;
  user?: VpsOwner | null;
  os_template?: VpsReference | null;
  dns_resolver?: VpsReference | null;
  user_namespace_map?: VpsReference | null;
  dataset?: VpsReference | null;
  pool?: VpsReference | null;
  [k: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalId(value: unknown): boolean {
  return value === undefined || value === null
    || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0);
}

function hasOptionalStrings(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(key => value[key] === undefined || value[key] === null || typeof value[key] === 'string');
}

function isOptionalRelation<T>(value: unknown, guard: (value: unknown) => value is T): value is T | null | undefined {
  return value === undefined || value === null || guard(value);
}

function isVpsReference(value: unknown): value is VpsReference {
  return isRecord(value) && isOptionalId(value['id']) && hasOptionalStrings(value, ['name', 'label']);
}

function isVpsOwner(value: unknown): value is VpsOwner {
  return isRecord(value) && isOptionalId(value['id']) && hasOptionalStrings(value, ['login', 'full_name']);
}

function isVpsEnvironment(value: unknown): value is VpsEnvironment {
  return isRecord(value) && isOptionalId(value['id']) && hasOptionalStrings(value, ['label']);
}

function isVpsLocation(value: unknown): value is VpsLocation {
  return isRecord(value) && isOptionalId(value['id'])
    && hasOptionalStrings(value, ['label', 'domain', 'description', 'remote_console_server'])
    && isOptionalRelation(value['environment'], isVpsEnvironment);
}

function isVpsNode(value: unknown): value is VpsNode {
  return isRecord(value) && isOptionalId(value['id'])
    && hasOptionalStrings(value, ['name', 'domain_name', 'fqdn', 'hypervisor_type', 'cgroup_version'])
    && isOptionalRelation(value['location'], isVpsLocation);
}

function isVps(value: unknown): value is Vps {
  if (!isRecord(value) || typeof value['id'] !== 'number'
    || !Number.isSafeInteger(value['id']) || value['id'] <= 0) return false;
  const strings = [
    'hostname', 'object_state', 'expiration_date', 'remind_after_date', 'created_at',
    'cgroup_version', 'config', 'info', 'maintenance_lock', 'maintenance_lock_reason', 'map_mode',
  ] satisfies readonly (keyof Vps__IndexOutput[number])[];
  const numbers = [
    'uptime', 'process_count', 'cpu', 'cpu_idle', 'cpu_iowait', 'cpu_irq', 'cpu_limit',
    'cpu_nice', 'cpu_softirq', 'cpu_system', 'cpu_user', 'memory', 'swap', 'diskspace',
    'used_memory', 'used_swap', 'used_diskspace', 'loadavg1', 'loadavg5', 'loadavg15',
    'autostart_priority', 'start_menu_timeout', 'implicit_oom_report_rule_hit_count',
  ] satisfies readonly (keyof Vps__IndexOutput[number])[];
  const booleans = [
    'is_running', 'manage_hostname', 'allow_admin_modifications', 'enable_network',
    'autostart_enable', 'enable_os_template_auto_update', 'in_rescue_mode', 'onstartall',
  ] satisfies readonly (keyof Vps__IndexOutput[number])[];
  return hasOptionalStrings(value, strings)
    && numbers.every(key => value[key] === undefined || value[key] === null
      || (typeof value[key] === 'number' && Number.isFinite(value[key])))
    && booleans.every(key => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean')
    && isOptionalRelation(value['user'], isVpsOwner)
    && isOptionalRelation(value['node'], isVpsNode)
    && ['os_template', 'dns_resolver', 'user_namespace_map', 'dataset', 'pool']
      .every(key => isOptionalRelation(value[key], isVpsReference));
}

function narrowVpsList(data: Vps__IndexOutput): Vps[] {
  if (!Array.isArray(data)) throw new Error('Expected a VPS list');
  return data.map(value => {
    if (!isVps(value)) throw new Error('Invalid VPS identity or fields');
    return value;
  });
}

export type VpsStatus = Vps__Status__IndexOutput[number] & { id: number };
export type ConsoleToken = Vps__ConsoleToken__CreateOutput & { token: string; expiration: string };
export type VpsPasswdReply = Vps__PasswdOutput & { password: string };
export type VpsClonePayload = Vps__CloneInput;
export type VpsSwapWithPayload = Vps__SwapWithInput;
export type VpsReplacePayload = Vps__ReplaceInput;
export type VpsReinstallPayload = Vps__ReinstallInput;
export type VpsBootPayload = Vps__BootInput;
export type VpsMigratePayload = Vps__MigrateInput;

type CreateVpsCommonPayload = Pick<Vps__CreateInput,
  'vps_user_data' | 'user_data_format' | 'user_data_content' | 'os_template' | 'start'
  | 'cpu' | 'memory' | 'diskspace' | 'swap' | 'ipv4' | 'ipv6' | 'ipv4_private'
> & { hostname: string };
export type CreateVpsAdminPayload = CreateVpsCommonPayload & Pick<Vps__CreateInput, 'info'> & {
  mode: 'admin'; node: number; user: number;
};
export type CreateVpsUserPayload = CreateVpsCommonPayload & Pick<Vps__CreateInput, 'environment' | 'location'> & { mode: 'user' };

export type CreateVpsPayload = CreateVpsAdminPayload | CreateVpsUserPayload;

export function buildCreateVpsParams(payload: CreateVpsPayload): Vps__CreateInput {
  const common: Vps__CreateInput = {
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
  const params: Vps__IndexInput = {};
  const meta: Vps__IndexGlobalInput = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.hostnameAny) params['hostname_any'] = opts.hostnameAny;
  if (opts?.hostnameExact) params['hostname_exact'] = opts.hostnameExact;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.userNamespaceMap !== undefined) params['user_namespace_map'] = opts.userNamespaceMap;
  if (opts?.node !== undefined) params['node'] = opts.node;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.environment !== undefined) params['environment'] = opts.environment;
  if (opts?.includes) meta['includes'] = opts.includes;
  if (opts?.count !== undefined) meta['count'] = opts.count;

  const res = await (await getApi()).vps.index({
    params,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
    signal: opts?.signal,
  });
  return narrowApiResult(res, narrowVpsList, 'VPS list');
}

export async function fetchVps(vpsId: number, opts?: { includes?: string; signal?: AbortSignal }) {
  const res = await (await getApi()).vps.show({
    path: { vps_id: vpsId },
    meta: opts?.includes ? { includes: opts.includes } : undefined,
    signal: opts?.signal,
  });
  return narrowApiResult(res, data => { if (!isVps(data)) throw new Error('Invalid VPS'); return data; }, 'VPS');
}

export async function updateVps(vpsId: number, params: Vps__UpdateInput) {
  const res = await (await getApi()).vps.update({
    path: { vps_id: vpsId },
    params,
  });
  // Lifetime dates and an isolated admin-modification preference can be saved
  // synchronously. Preserve receipt validation for every other update and for
  // any action-state metadata that the server does provide.
  const lifetimeOnlyKeys = new Set(['expiration_date', 'remind_after_date', 'change_reason']);
  const lifetimeOnly = Object.keys(params).length > 0
    && Object.keys(params).every((key) => lifetimeOnlyKeys.has(key));
  const preferenceOnly = Object.keys(params).length === 1
    && typeof params['allow_admin_modifications'] === 'boolean';
  const hasReceipt = ['action_state_id', 'state_id', 'action_state', 'state']
    .some((key) => res.meta?.[key] != null);
  return (lifetimeOnly || preferenceOnly) && !hasReceipt ? res : requireActionStateResult(res, 'VPS update');
}

export async function createVps(payload: CreateVpsPayload) {
  const res = await (await getApi()).vps.create({
    params: buildCreateVpsParams(payload),
  });
  return narrowApiResult(requireActionStateResult(res, 'VPS create'), data => { if (!isVps(data)) throw new Error('Invalid VPS'); return data; }, 'VPS create');
}

export async function vpsStart(vpsId: number) {
  const res = await (await getApi()).vps.start({ path: { vps_id: vpsId } });
  return requireActionStateResult(res, 'VPS start');
}

export async function vpsStop(vpsId: number, opts?: { force?: boolean }) {
  const res = await (await getApi()).vps.stop({
    path: { vps_id: vpsId },
    params: opts?.force === undefined ? undefined : { force: opts.force },
  });
  return requireActionStateResult(res, 'VPS stop');
}

export async function vpsRestart(vpsId: number, opts?: { force?: boolean }) {
  const res = await (await getApi()).vps.restart({
    path: { vps_id: vpsId },
    params: opts?.force === undefined ? undefined : { force: opts.force },
  });
  return requireActionStateResult(res, 'VPS restart');
}

export async function vpsPasswd(vpsId: number, type: 'simple' | 'secure' = 'secure') {
  const res = await (await getApi()).vps.passwd({
    path: { vps_id: vpsId },
    params: { type },
  });
  return narrowApiResult(requireActionStateResult(res, 'VPS password reset'), data => {
    if (typeof data.password !== 'string' || !data.password) throw new Error('Invalid VPS password');
    return { ...data, password: data.password };
  }, 'VPS password reset');
}

export async function vpsClone(vpsId: number, params: VpsClonePayload) {
  const res = await (await getApi()).vps.clone({
    path: { vps_id: vpsId },
    params: { ...params },
  });
  return narrowApiResult(requireActionStateResult(res, 'VPS clone'), data => { if (!isVps(data)) throw new Error('Invalid VPS'); return data; }, 'VPS clone');
}

export async function vpsSwapWith(vpsId: number, params: VpsSwapWithPayload) {
  const res = await (await getApi()).vps.swap_with({
    path: { vps_id: vpsId },
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS swap');
}

export async function vpsReplace(vpsId: number, params: VpsReplacePayload) {
  const res = await (await getApi()).vps.replace({
    path: { vps_id: vpsId },
    params: { ...params },
  });
  return narrowApiResult(requireActionStateResult(res, 'VPS replace'), data => { if (!isVps(data)) throw new Error('Invalid VPS'); return data; }, 'VPS replace');
}

export async function vpsBoot(vpsId: number, params: VpsBootPayload) {
  const res = await (await getApi()).vps.boot({
    path: { vps_id: vpsId },
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS boot');
}

export async function vpsReinstall(vpsId: number, params: VpsReinstallPayload) {
  const res = await (await getApi()).vps.reinstall({
    path: { vps_id: vpsId },
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS reinstall');
}

export async function vpsMigrate(vpsId: number, params: VpsMigratePayload) {
  const res = await (await getApi()).vps.migrate({
    path: { vps_id: vpsId },
    params: { ...params },
  });
  return requireActionStateResult(res, 'VPS migrate');
}

export type VpsDeleteOptions = Pick<Vps__DeleteInput, 'lazy'> & { expiration_date?: string };

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
  const res = await (await getApi()).vps.delete({
    path: { vps_id: vpsId },
    params: params ? { lazy: params.lazy } : undefined,
  });
  return requireActionStateResult(res, 'VPS delete');
}

export async function createConsoleToken(vpsId: number) {
  const res = await (await getApi()).vps.console_token.create({
    path: { vps_id: vpsId },
  });
  return narrowApiResult(res, data => {
    if (typeof data.token !== 'string' || !data.token || typeof data.expiration !== 'string' || !data.expiration) throw new Error('Invalid console token');
    return { ...data, token: data.token, expiration: data.expiration };
  }, 'VPS console token');
}

export async function deleteConsoleToken(vpsId: number) {
  return (await getApi()).vps.console_token.delete({
    path: { vps_id: vpsId },
  });
}

export async function fetchVpsStatuses(
  vpsId: number,
  opts?: { limit?: number; fromId?: number; from?: string; to?: string }
) {
  const params: Vps__Status__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.from) params['from'] = opts.from;
  if (opts?.to) params['to'] = opts.to;

  const res = await (await getApi()).vps.status.index({
    path: { vps_id: vpsId },
    params,
  });
  return narrowApiResult(res, data => {
    if (!Array.isArray(data)) throw new Error('Invalid VPS statuses');
    return data.map(value => {
      if (!isRecord(value) || typeof value['id'] !== 'number' || !Number.isSafeInteger(value['id']) || value['id'] <= 0) throw new Error('Invalid VPS status identity');
      return { ...value, id: value['id'] };
    });
  }, 'VPS statuses');
}
