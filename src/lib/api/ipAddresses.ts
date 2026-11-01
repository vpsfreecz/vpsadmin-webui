import type {
  IpAddress__AssignInput,
  IpAddress__AssignWithHostAddressInput,
  IpAddress__IndexInput,
  IpAddress__UpdateInput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, ipReference } from './networkingViews';
import type { NetworkReference, IpReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray, MissingActionStateError, requireActionStateResult } from './apiErrors';

export type Network = NetworkReference;

export type IpAddress = IpReference & { id: number };
function narrowIpAddress(value: unknown): IpAddress {
  if (!ipReference(value) || !isId(value.id)) throw new TypeError('Invalid IP address identity or fields');
  return { ...value, id: value.id };
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
  const params: IpAddress__IndexInput = {};

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

  const res = narrowApiResult(
    await (
      await getApi()
    ).ip_address.index({
      params,
      meta:
        opts?.includes || opts?.count
          ? {
              ...(opts?.includes ? { includes: opts.includes } : {}),
              ...(opts?.count ? { count: true } : {}),
            }
          : undefined,
      signal: opts?.signal,
    }),
    (data) => expectArray<unknown>(data, 'ip_address list').map(narrowIpAddress),
    'ip_address index'
  );

  return res;
}

export async function fetchIpAddressIndexCapability() {
  return narrowApiResult(
    await (await getApi()).ip_address.index.describe(),
    narrowIpAddressIndexCapability,
    'IP address index capability'
  );
}

export async function fetchIpAddress(ipAddressId: number, opts?: { includes?: string }) {
  return narrowApiResult(
    await (
      await getApi()
    ).ip_address.show({
      path: { ip_address_id: ipAddressId },
      meta: opts?.includes ? { includes: opts.includes } : undefined,
    }),
    narrowIpAddress,
    'ip_address show'
  );
}

function ownerUpdateTarget(params: IpAddress__UpdateInput): { user: number | null; environment: number | null } | null {
  if (!Object.hasOwn(params, 'user') || Object.keys(params).some((key) => key !== 'user' && key !== 'environment')) return null;
  if (params['user'] === null && !Object.hasOwn(params, 'environment')) return { user: null, environment: null };
  const user = isId(params.user) ? params.user : null;
  const environment = isId(params.environment) ? params.environment : null;
  return user && environment ? { user, environment } : null;
}

function referenceId(value: unknown): number | null {
  const id = isRecord(value) ? value['id'] : value;
  return isId(id) ? id : null;
}

export async function updateIpAddress(ipAddressId: number, params: IpAddress__UpdateInput) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).ip_address.update({
      path: { ip_address_id: ipAddressId },
      params,
    }),
    narrowIpAddress,
    'ip_address update'
  );
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

export async function assignIpAddressRoute(ipAddressId: number, payload: IpAddress__AssignInput) {
  const params: IpAddress__AssignInput = {
    network_interface: payload.network_interface,
  };
  if (payload.route_via !== undefined && payload.route_via !== null) params['route_via'] = payload.route_via;

  const res = narrowApiResult(
    await (
      await getApi()
    ).ip_address.assign({
      path: { ip_address_id: ipAddressId },
      params,
    }),
    narrowIpAddress,
    'ip_address assign'
  );
  return requireActionStateResult(res, 'IP address route assign');
}

export async function assignIpAddressRouteWithHostAddress(
  ipAddressId: number,
  payload: IpAddress__AssignWithHostAddressInput
) {
  const params: IpAddress__AssignWithHostAddressInput = {
    network_interface: payload.network_interface,
  };
  if (payload.host_ip_address !== undefined && payload.host_ip_address !== null) {
    params['host_ip_address'] = payload.host_ip_address;
  }

  const res = narrowApiResult(
    await (
      await getApi()
    ).ip_address.assign_with_host_address({
      path: { ip_address_id: ipAddressId },
      params,
    }),
    narrowIpAddress,
    'ip_address assign_with_host_address'
  );
  return requireActionStateResult(res, 'IP address route and host address assign');
}

export async function freeIpAddressRoute(ipAddressId: number) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).ip_address.free({
      path: { ip_address_id: ipAddressId },
    }),
    narrowIpAddress,
    'ip_address free'
  );
  return requireActionStateResult(res, 'IP address route free');
}

export async function fetchIpAddressesForVps(vpsId: number, opts?: { limit?: number; includes?: string }) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).ip_address.index({
      params: {
        vps: vpsId,
        order: 'interface',
        limit: opts?.limit ?? 250,
      },
      meta: { includes: opts?.includes ?? 'network,user,network_interface' },
    }),
    (data) => expectArray<unknown>(data, 'ip_address list').map(narrowIpAddress),
    'ip_address index'
  );
  return res;
}

function narrowIpAddressIndexCapability(value: unknown): {
  input?: { parameters?: Record<string, unknown> | null } | null;
} {
  if (!isRecord(value)) throw new TypeError('Invalid IP address capability');
  const input = value['input'];
  if (input === undefined || input === null) return { ...value, input };
  if (!isRecord(input)) throw new TypeError('Invalid IP address capability input');
  const parameters = input['parameters'];
  if (parameters === undefined || parameters === null) return { ...value, input: { ...input, parameters } };
  if (!isRecord(parameters)) throw new TypeError('Invalid IP address capability parameters');
  if (Object.prototype.hasOwnProperty.call(parameters, 'network_enabled')) {
    const enabled = parameters['network_enabled'];
    if (
      !isRecord(enabled) ||
      enabled['type'] !== 'Boolean' ||
      !fields(enabled, [], [], ['required', 'nullable', 'protected'])
    )
      throw new TypeError('Invalid network availability capability');
  }
  return { ...value, input: { ...input, parameters } };
}
