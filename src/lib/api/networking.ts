import type {
  HostIpAddress__CreateInput,
  HostIpAddress__IndexInput,
  HostIpAddress__IndexOutput,
  HostIpAddress__UpdateInput,
  IpAddressAssignment__IndexInput,
  IpAddressAssignment__IndexOutput,
  NetworkInterfaceAccounting__UserTopInput,
  NetworkInterfaceAccounting__UserTopOutput,
  NetworkInterfaceMonitor__IndexInput,
  NetworkInterfaceMonitor__IndexOutput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, reference, interfaceReference, ipReference } from './networkingViews';
import type { OwnerReference, VpsReference, InterfaceReference, IpReference, DnsReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray, requireActionStateResult } from './apiErrors';

export type HostIpAddress = Omit<HostIpAddress__IndexOutput[number], 'id' | 'ip_address'> & {
  id: number;
  ip_address?: IpReference | null;
  [key: string]: unknown;
};

export type IpAddressAssignment = Omit<
  IpAddressAssignment__IndexOutput[number],
  'id' | 'ip_address' | 'user' | 'vps' | 'assigned_by_chain' | 'unassigned_by_chain'
> & {
  id: number;
  ip_address?: IpReference | null;
  user?: OwnerReference | null;
  vps?: VpsReference | null;
  assigned_by_chain?: DnsReference | null;
  unassigned_by_chain?: DnsReference | null;
  [key: string]: unknown;
};

export type NetworkInterfaceMonitorRow = Omit<
  NetworkInterfaceMonitor__IndexOutput[number],
  'id' | 'network_interface'
> & { id: number; network_interface?: InterfaceReference | null; [key: string]: unknown };

export type NetworkTrafficUserTopRow = Omit<NetworkInterfaceAccounting__UserTopOutput[number], 'user'> & {
  user?: OwnerReference | null;
  [key: string]: unknown;
};

export async function fetchHostIpAddresses(opts?: {
  limit?: number;
  fromId?: number;
  ipAddress?: number;
  networkInterface?: number;
  user?: number;
  vps?: number;
  assigned?: boolean;
  routed?: boolean;
  addr?: string;
  version?: number;
  location?: number;
  network?: number;
  order?: 'asc' | 'interface';
  count?: boolean;
  signal?: AbortSignal;
}) {
  const params: HostIpAddress__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.ipAddress !== undefined) params['ip_address'] = opts.ipAddress;
  if (opts?.networkInterface !== undefined) params['network_interface'] = opts.networkInterface;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.assigned !== undefined) params['assigned'] = opts.assigned;
  if (opts?.routed !== undefined) params['routed'] = opts.routed;
  if (opts?.addr) params['addr'] = opts.addr;
  if (opts?.version !== undefined) params['version'] = opts.version;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.network !== undefined) params['network'] = opts.network;
  if (opts?.order) params['order'] = opts.order;

  const res = narrowApiResult(
    await (
      await getApi()
    ).host_ip_address.index({
      params,
      meta: {
        includes: 'ip_address,ip_address__user,ip_address__network_interface,ip_address__network_interface__vps',
        ...(opts?.count ? { count: true } : {}),
      },
      signal: opts?.signal,
    }),
    (data) => expectArray<unknown>(data, 'host_ip_address list').map(narrowHostIpAddress),
    'host_ip_address index'
  );
  return res;
}

export async function fetchHostIpAddress(id: number, signal?: AbortSignal) {
  return narrowApiResult(
    await (
      await getApi()
    ).host_ip_address.show({
      path: { host_ip_address_id: id },
      meta: { includes: 'ip_address,ip_address__user,ip_address__network_interface' },
      signal,
    }),
    narrowHostIpAddress,
    'host_ip_address show'
  );
}

export async function createHostIpAddress(payload: HostIpAddress__CreateInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).host_ip_address.create({
      params: payload,
    }),
    narrowHostIpAddress,
    'host_ip_address create'
  );
}

export async function updateHostIpAddress(hostIpAddressId: number, params: HostIpAddress__UpdateInput) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).host_ip_address.update({
      path: { host_ip_address_id: hostIpAddressId },
      params,
    }),
    narrowHostIpAddress,
    'host_ip_address update'
  );
  return requireActionStateResult(res, 'host IP address update');
}

export async function deleteHostIpAddress(hostIpAddressId: number) {
  const res = await (
    await getApi()
  ).host_ip_address.delete({
    path: { host_ip_address_id: hostIpAddressId },
  });
  return requireActionStateResult(res, 'host IP address delete');
}

export async function assignHostIpAddress(hostIpAddressId: number) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).host_ip_address.assign({
      path: { host_ip_address_id: hostIpAddressId },
    }),
    narrowHostIpAddress,
    'host_ip_address assign'
  );
  return requireActionStateResult(res, 'host IP address assign');
}

export async function freeHostIpAddress(hostIpAddressId: number) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).host_ip_address.free({
      path: { host_ip_address_id: hostIpAddressId },
    }),
    narrowHostIpAddress,
    'host_ip_address free'
  );
  return requireActionStateResult(res, 'host IP address free');
}

export async function fetchIpAddressAssignments(opts?: {
  limit?: number;
  fromId?: number;
  ipAddr?: string;
  user?: number;
  vps?: number;
  active?: boolean;
  location?: number;
  network?: number;
  order?: 'newest' | 'oldest';
  includes?: string;
}) {
  const params: IpAddressAssignment__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.ipAddr) params['ip_addr'] = opts.ipAddr;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.active !== undefined) params['active'] = opts.active;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.network !== undefined) params['network'] = opts.network;
  if (opts?.order) params['order'] = opts.order;

  const res = narrowApiResult(
    await (
      await getApi()
    ).ip_address_assignment.index({
      params,
      meta: {
        includes: opts?.includes ?? 'user,vps,assigned_by_chain,unassigned_by_chain,ip_address',
      },
    }),
    (data) => expectArray<unknown>(data, 'ip_address_assignment list').map(narrowIpAddressAssignment),
    'ip_address_assignment index'
  );
  return res;
}

export async function fetchNetworkInterfaceMonitor(opts?: {
  limit?: number;
  user?: number;
  environment?: number;
  location?: number;
  node?: number;
  vps?: number;
  networkInterface?: number;
  order?: string;
  includes?: string;
}) {
  const params: NetworkInterfaceMonitor__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.environment !== undefined) params['environment'] = opts.environment;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.node !== undefined) params['node'] = opts.node;
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.networkInterface !== undefined) params['network_interface'] = opts.networkInterface;
  if (opts?.order) params['order'] = opts.order;

  const res = narrowApiResult(
    await (
      await getApi()
    ).network_interface_monitor.index({
      params,
      meta: {
        includes: opts?.includes ?? 'network_interface__vps',
      },
    }),
    (data) => expectArray<unknown>(data, 'network_interface_monitor list').map(narrowNetworkInterfaceMonitorRow),
    'network_interface_monitor index'
  );
  return res;
}

export async function fetchNetworkTrafficUserTop(opts?: {
  limit?: number;
  fromBytes?: number;
  environment?: number;
  location?: number;
  node?: number;
  year?: number;
  month?: number;
}) {
  const params: NetworkInterfaceAccounting__UserTopInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromBytes !== undefined) params['from_bytes'] = opts.fromBytes;
  if (opts?.environment !== undefined) params['environment'] = opts.environment;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.node !== undefined) params['node'] = opts.node;
  if (opts?.year !== undefined) params['year'] = opts.year;
  if (opts?.month !== undefined) params['month'] = opts.month;

  const res = narrowApiResult(
    await (
      await getApi()
    ).network_interface_accounting.user_top({
      params,
      meta: { includes: 'user' },
    }),
    (data) => expectArray<unknown>(data, 'network_interface_accounting list').map(narrowNetworkTrafficUserTopRow),
    'network_interface_accounting user_top'
  );
  return res;
}

function isHostIpAddress(value: unknown): value is HostIpAddress {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(value, ['addr', 'reverse_record_value'], [], ['assigned', 'user_created']) ||
    !optional(value['ip_address'], ipReference)
  )
    return false;
  return true;
}
function narrowHostIpAddress(value: unknown): HostIpAddress {
  if (!isHostIpAddress(value)) throw new TypeError('Invalid HostIpAddress identity or fields');
  return value;
}

function isIpAddressAssignment(value: unknown): value is IpAddressAssignment {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      ['created_at', 'from_date', 'ip_addr', 'to_date', 'updated_at'],
      ['ip_prefix', 'raw_user_id', 'raw_vps_id'],
      ['reconstructed']
    ) ||
    !optional(value['ip_address'], ipReference) ||
    !['user', 'vps', 'assigned_by_chain', 'unassigned_by_chain'].every((key) => optional(value[key], reference))
  )
    return false;
  return true;
}
function narrowIpAddressAssignment(value: unknown): IpAddressAssignment {
  if (!isIpAddressAssignment(value)) throw new TypeError('Invalid IpAddressAssignment identity or fields');
  return value;
}

function isNetworkInterfaceMonitorRow(value: unknown): value is NetworkInterfaceMonitorRow {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      ['updated_at'],
      ['bytes', 'bytes_in', 'bytes_out', 'delta', 'packets', 'packets_in', 'packets_out'],
      []
    ) ||
    !optional(value['network_interface'], interfaceReference)
  )
    return false;
  return true;
}
function narrowNetworkInterfaceMonitorRow(value: unknown): NetworkInterfaceMonitorRow {
  if (!isNetworkInterfaceMonitorRow(value))
    throw new TypeError('Invalid NetworkInterfaceMonitorRow identity or fields');
  return value;
}

function isNetworkTrafficUserTopRow(value: unknown): value is NetworkTrafficUserTopRow {
  if (
    !isRecord(value) ||
    !fields(
      value,
      ['created_at', 'updated_at'],
      ['bytes', 'bytes_in', 'bytes_out', 'month', 'packets', 'packets_in', 'packets_out', 'year'],
      []
    ) ||
    !optional(value['user'], reference)
  )
    return false;
  return true;
}
function narrowNetworkTrafficUserTopRow(value: unknown): NetworkTrafficUserTopRow {
  if (!isNetworkTrafficUserTopRow(value)) throw new TypeError('Invalid NetworkTrafficUserTopRow identity or fields');
  return value;
}

export function hostAssignmentTarget(host: HostIpAddress | null | undefined) {
  const parent = host?.ip_address;
  const netif = parent?.network_interface;
  if (host?.assigned !== false || !isId(parent?.id) || !isId(netif?.id)) return undefined;
  return { parentId: parent.id, interfaceId: netif.id, interfaceName: netif.name };
}
