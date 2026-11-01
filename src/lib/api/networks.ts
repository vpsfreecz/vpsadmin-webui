import type {
  Network__AddAddressesInput,
  Network__CreateInput,
  Network__IndexInput,
  Network__IndexOutput,
  Network__UpdateInput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, locationReference } from './networkingViews';
import type { LocationReference } from './networkingViews';
import { expectArray } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type NetworkRole = 'public_access' | 'private_access';
export type NetworkPurpose = 'any' | 'vps' | 'export';
export type NetworkSplitAccess = 'no_access' | 'user_split' | 'owner_split';

export type Network = Omit<Network__IndexOutput[number], 'id' | 'primary_location'> & {
  id: number;
  primary_location?: LocationReference | null;
  [key: string]: unknown;
};

export async function fetchNetworks(opts?: {
  limit?: number;
  fromId?: number;
  locationId?: number;
  purpose?: NetworkPurpose;
  enabled?: boolean;
}) {
  const params: Network__IndexInput = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.locationId !== undefined) params['location'] = opts.locationId;
  if (opts?.purpose) params['purpose'] = opts.purpose;
  if (opts?.enabled !== undefined) params['enabled'] = opts.enabled;

  const res = narrowApiResult(
    await (
      await getApi()
    ).network.index({
      params,
    }),
    (data) => expectArray<unknown>(data, 'network list').map(narrowNetwork),
    'network index'
  );

  return res;
}

export async function fetchNetwork(id: number) {
  return narrowApiResult(
    await (
      await getApi()
    ).network.show({
      path: { network_id: id },
      meta: { includes: 'primary_location' },
    }),
    narrowNetwork,
    'network show'
  );
}

export interface NetworkWriteCapability {
  input?: { parameters?: Record<string, unknown> | null } | null;
}

function isNetworkWriteCapability(value: unknown): value is NetworkWriteCapability {
  if (!isRecord(value)) return false;
  const input = value['input'];
  if (input === undefined || input === null) return true;
  if (!isRecord(input)) return false;
  const parameters = input['parameters'];
  if (parameters === undefined || parameters === null) return true;
  if (!isRecord(parameters)) return false;
  if (!Object.prototype.hasOwnProperty.call(parameters, 'enabled')) return true;

  const enabled = parameters['enabled'];
  if (!isRecord(enabled) || enabled['type'] !== 'Boolean') return false;
  return ['required', 'nullable', 'protected'].every(
    (key) => enabled[key] === undefined || enabled[key] === null || typeof enabled[key] === 'boolean'
  );
}

export function networkEnabledWritable(capability?: NetworkWriteCapability): boolean {
  return (
    isNetworkWriteCapability(capability) &&
    Object.prototype.hasOwnProperty.call(capability.input?.parameters ?? {}, 'enabled')
  );
}

export async function fetchNetworkWriteCapability(id?: number) {
  const api = await getApi();
  const result =
    id === undefined
      ? await api.network.create.describe()
      : await api.network.update.describe({ path: { network_id: id } });
  return narrowApiResult(
    result,
    (data) => {
      if (!isNetworkWriteCapability(data)) throw new TypeError('Invalid network write capability');
      return data;
    },
    'network write capability'
  );
}

export async function createNetwork(opts: {
  label?: string;
  ipVersion: 4 | 6;
  address: string;
  prefix: number;
  role: NetworkRole;
  managed: boolean;
  enabled?: boolean;
  splitAccess: NetworkSplitAccess;
  splitPrefix: number;
  purpose: NetworkPurpose;
  addIpAddresses?: boolean;
}) {
  const params: Network__CreateInput = {
    label: opts.label ?? '',
    ip_version: opts.ipVersion,
    address: opts.address,
    prefix: opts.prefix,
    role: opts.role,
    managed: opts.managed,
    split_access: opts.splitAccess,
    split_prefix: opts.splitPrefix,
    purpose: opts.purpose,
    add_ip_addresses: Boolean(opts.addIpAddresses),
  };
  if (opts.enabled !== undefined) params['enabled'] = opts.enabled;

  return narrowApiResult(
    await (
      await getApi()
    ).network.create({
      params,
    }),
    narrowNetwork,
    'network create'
  );
}

export async function updateNetwork(opts: {
  id: number;
  label?: string;
  ipVersion?: 4 | 6;
  address?: string;
  prefix?: number;
  role?: NetworkRole;
  managed?: boolean;
  enabled?: boolean;
  splitAccess?: NetworkSplitAccess;
  splitPrefix?: number;
  purpose?: NetworkPurpose;
}) {
  const params: Network__UpdateInput = {};

  if (opts.label !== undefined) params['label'] = opts.label;
  if (opts.ipVersion !== undefined) params['ip_version'] = opts.ipVersion;
  if (opts.address !== undefined) params['address'] = opts.address;
  if (opts.prefix !== undefined) params['prefix'] = opts.prefix;
  if (opts.role !== undefined) params['role'] = opts.role;
  if (opts.managed !== undefined) params['managed'] = opts.managed;
  if (opts.enabled !== undefined) params['enabled'] = opts.enabled;
  if (opts.splitAccess !== undefined) params['split_access'] = opts.splitAccess;
  if (opts.splitPrefix !== undefined) params['split_prefix'] = opts.splitPrefix;
  if (opts.purpose !== undefined) params['purpose'] = opts.purpose;

  return narrowApiResult(
    await (
      await getApi()
    ).network.update({
      path: { network_id: opts.id },
      params,
    }),
    narrowNetwork,
    'network update'
  );
}

export async function addNetworkAddresses(opts: { id: number; count: number; user?: number; environment?: number }) {
  const params: Network__AddAddressesInput = {
    count: opts.count,
  };

  if (opts.user !== undefined) params['user'] = opts.user;
  if (opts.environment !== undefined) params['environment'] = opts.environment;

  return narrowApiResult(
    await (
      await getApi()
    ).network.add_addresses({
      path: { network_id: opts.id },
      params,
    }),
    (data) => {
      if (
        data.count !== undefined &&
        data.count !== null &&
        (typeof data.count !== 'number' || !Number.isSafeInteger(data.count) || data.count < 0)
      )
        throw new TypeError('Invalid address count');
      return data;
    },
    'network address count'
  );
}

function isNetwork(value: unknown): value is Network {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      ['address', 'label', 'purpose', 'role', 'split_access'],
      [
        'assigned',
        'available_to_users',
        'ip_version',
        'owned',
        'owned_unassigned',
        'prefix',
        'size',
        'split_prefix',
        'taken',
        'used',
      ],
      ['enabled', 'managed']
    ) ||
    !optional(value['primary_location'], locationReference)
  )
    return false;
  return true;
}
function narrowNetwork(value: unknown): Network {
  if (!isNetwork(value)) throw new TypeError('Invalid Network identity or fields');
  return value;
}
