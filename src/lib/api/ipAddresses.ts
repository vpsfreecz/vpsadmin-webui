import { expectArray, haveApiCall, MissingActionStateError, requireActionStateResult } from './haveapi';
import { normalizeObjectId } from '../objectRef';
import type { ResourceRef } from './appTypes';
import type { NetworkInterface } from './networkInterfaces';
import type { User } from './users';
import type { Vps } from './vps';

export interface Network {
  id: number;
  address?: string;
  prefix?: number;
  ip_version?: number;
  role?: string;
  purpose?: string;
  enabled?: boolean;
  primary_location?: {
    id?: number;
    label?: string;
    environment?: { id?: number; label?: string } | null;
  } | null;
  [k: string]: unknown;
}

export interface IpAddress {
  id: number;
  network?: Network;
  prefix?: number;
  size?: number;
  network_interface?: NetworkInterface | ResourceRef | null;
  user?: User | ResourceRef | null;
  charged_environment?: ResourceRef | null;
  addr?: string;
  routed?: boolean;
  vps?: Vps | ResourceRef;
  route_via?: ResourceRef;
  order?: number;
  [k: string]: unknown;
}

export async function fetchIpAddresses(opts?: {
  limit?: number;
  fromId?: number;
  includes?: string;

  location?: number;
  network?: number;
  version?: number;
  role?: string;
  purpose?: string;
  usableFor?: 'vps' | 'export';
  addr?: string;
  prefix?: number;
  vps?: number;
  user?: number | null;
  networkInterface?: number;
  assignedToInterface?: boolean;
  networkEnabled?: boolean;
  order?: string;
  count?: boolean;
  signal?: AbortSignal;
}) {
  const params: Record<string, string | number | boolean | null> = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.network !== undefined) params['network'] = opts.network;
  if (opts?.version !== undefined) params['version'] = opts.version;
  if (opts?.role) params['role'] = opts.role;
  if (opts?.purpose) params['purpose'] = opts.purpose;
  if (opts?.usableFor) params['usable_for'] = opts.usableFor;
  if (opts?.addr) params['addr'] = opts.addr;
  if (opts?.prefix !== undefined) params['prefix'] = opts.prefix;
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.networkInterface !== undefined) params['network_interface'] = opts.networkInterface;
  if (opts?.assignedToInterface !== undefined) params['assigned_to_interface'] = opts.assignedToInterface;
  if (opts?.networkEnabled !== undefined) params['network_enabled'] = opts.networkEnabled;
  if (opts?.order) params['order'] = opts.order;

  const res = await haveApiCall<IpAddress[]>({
    method: 'GET',
    path: '/ip_addresses',
    namespace: 'ip_address',
    params,
    meta: opts?.includes || opts?.count ? {
      ...(opts?.includes ? { includes: opts.includes } : {}),
      ...(opts?.count ? { count: true } : {}),
    } : undefined,
    signal: opts?.signal,
  });

  return { ...res, data: expectArray<IpAddress>(res.data, 'ip_addresses') };
}

export async function fetchIpAddressIndexCapability() {
  return haveApiCall<{ input?: { parameters?: Record<string, unknown> } }>({
    method: 'OPTIONS', path: '/ip_addresses?method=GET',
  });
}

export async function fetchIpAddress(ipAddressId: number, opts?: { includes?: string }) {
  return haveApiCall<IpAddress>({
    method: 'GET',
    path: `/ip_addresses/${ipAddressId}`,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });
}

function ownerUpdateTarget(params: Record<string, unknown>): { user: number | null; environment: number | null } | null {
  if (!Object.hasOwn(params, 'user') || Object.keys(params).some((key) => key !== 'user' && key !== 'environment')) return null;
  if (params['user'] === null && !Object.hasOwn(params, 'environment')) return { user: null, environment: null };
  const user = normalizeObjectId(params['user']);
  const environment = normalizeObjectId(params['environment']);
  return user && environment ? { user, environment } : null;
}

function referenceId(value: unknown): number | null {
  return normalizeObjectId(value && typeof value === 'object' && 'id' in value ? value.id : value);
}

export async function updateIpAddress(ipAddressId: number, params: Record<string, unknown>) {
  const res = await haveApiCall<IpAddress>({
    method: 'PUT',
    path: `/ip_addresses/${ipAddressId}`,
    namespace: 'ip_address',
    params,
  });
  const target = ownerUpdateTarget(params);
  const hasReceipt = ['action_state_id', 'state_id', 'action_state', 'state']
    .some((key) => res.meta?.[key] != null);
  if (!target || hasReceipt) return requireActionStateResult(res, 'IP address update');

  // Ownership without node work is a synchronous API operation. Confirm its
  // exact owner/accounting target with a fresh read before reporting success.
  const unverified = () => new MissingActionStateError('IP ownership verification', res);
  if (!res.data || res.data.id !== ipAddressId) throw unverified();
  let verified: IpAddress;
  try {
    verified = (await fetchIpAddress(ipAddressId, { includes: 'user,charged_environment' })).data;
  } catch {
    throw unverified();
  }
  if (!verified || verified.id !== ipAddressId
      || !Object.hasOwn(verified, 'user') || !Object.hasOwn(verified, 'charged_environment')
      || (target.user === null
        ? verified.user !== null || verified.charged_environment !== null
        : referenceId(verified.user) !== target.user || referenceId(verified.charged_environment) !== target.environment)) {
    throw unverified();
  }
  return { ...res, data: verified };
}

export async function assignIpAddressRoute(
  ipAddressId: number,
  payload: { network_interface: number; route_via?: number | null }
) {
  const params: Record<string, unknown> = {
    network_interface: payload.network_interface,
  };
  if (payload.route_via !== undefined && payload.route_via !== null) params['route_via'] = payload.route_via;

  const res = await haveApiCall<IpAddress>({
    method: 'POST',
    path: `/ip_addresses/${ipAddressId}/assign`,
    namespace: 'ip_address',
    params,
  });
  return requireActionStateResult(res, 'IP address route assign');
}

export async function assignIpAddressRouteWithHostAddress(
  ipAddressId: number,
  payload: { network_interface: number; host_ip_address?: number | null }
) {
  const params: Record<string, unknown> = {
    network_interface: payload.network_interface,
  };
  if (payload.host_ip_address !== undefined && payload.host_ip_address !== null) {
    params['host_ip_address'] = payload.host_ip_address;
  }

  const res = await haveApiCall<IpAddress>({
    method: 'POST',
    path: `/ip_addresses/${ipAddressId}/assign_with_host_address`,
    namespace: 'ip_address',
    params,
  });
  return requireActionStateResult(res, 'IP address route and host address assign');
}

export async function freeIpAddressRoute(ipAddressId: number) {
  const res = await haveApiCall<IpAddress>({
    method: 'POST',
    path: `/ip_addresses/${ipAddressId}/free`,
  });
  return requireActionStateResult(res, 'IP address route free');
}

export async function fetchIpAddressesForVps(vpsId: number, opts?: { limit?: number; includes?: string }) {
  const res = await haveApiCall<IpAddress[]>({
    method: 'GET',
    path: '/ip_addresses',
    namespace: 'ip_address',
    params: {
      vps: vpsId,
      order: 'interface',
      limit: opts?.limit ?? 250,
    },
    meta: { includes: opts?.includes ?? 'network,user,network_interface' },
  });
  return { ...res, data: expectArray<IpAddress>(res.data, 'ip_addresses') };
}
