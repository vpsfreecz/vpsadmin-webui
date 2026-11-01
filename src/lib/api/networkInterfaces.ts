import type {
  NetworkInterfaceAccounting__IndexInput,
  NetworkInterfaceAccounting__IndexOutput,
  NetworkInterface__IndexOutput,
  NetworkInterface__UpdateInput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, reference, interfaceReference } from './networkingViews';
import type { VpsReference, InterfaceReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray, requireActionStateResult } from './apiErrors';

export type NetworkInterface = Omit<NetworkInterface__IndexOutput[number], 'id' | 'vps'> & {
  id: number;
  vps?: VpsReference | null;
  [key: string]: unknown;
};

export type NetworkInterfaceAccounting = Omit<NetworkInterfaceAccounting__IndexOutput[number], 'network_interface'> & {
  network_interface?: InterfaceReference | null;
  [key: string]: unknown;
};

export interface NetworkInterfaceAccountingListOpts {
  vps?: number;
  user?: number;
  environment?: number;
  location?: number;
  node?: number;
  year?: number;
  month?: number;
  limit?: number;
  fromBytes?: number;
  order?: 'created_at' | 'updated_at' | 'descending' | 'ascending';
  includes?: string;
}

export async function fetchNetworkInterfaces(vpsId: number, opts?: { limit?: number }) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).network_interface.index({
      params: {
        vps: vpsId,
        limit: opts?.limit ?? 100,
      },
    }),
    (data) => expectArray<unknown>(data, 'network_interface list').map(narrowNetworkInterface),
    'network_interface index'
  );
  return res;
}

export async function updateNetworkInterface(netifId: number, params: NetworkInterface__UpdateInput) {
  const res = narrowApiResult(
    await (
      await getApi()
    ).network_interface.update({
      path: { network_interface_id: netifId },
      params,
    }),
    narrowNetworkInterface,
    'network_interface update'
  );
  return requireActionStateResult(res, 'network interface update');
}

export async function fetchNetworkInterfaceAccountings(opts?: NetworkInterfaceAccountingListOpts) {
  const params: NetworkInterfaceAccounting__IndexInput = {};
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.environment !== undefined) params['environment'] = opts.environment;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.node !== undefined) params['node'] = opts.node;
  if (opts?.year !== undefined) params['year'] = opts.year;
  if (opts?.month !== undefined) params['month'] = opts.month;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromBytes !== undefined) params['from_bytes'] = opts.fromBytes;
  if (opts?.order) params['order'] = opts.order;

  const res = narrowApiResult(
    await (
      await getApi()
    ).network_interface_accounting.index({
      params,
      meta: opts?.includes ? { includes: opts.includes } : undefined,
    }),
    (data) => expectArray<unknown>(data, 'network_interface_accounting list').map(narrowNetworkInterfaceAccounting),
    'network_interface_accounting index'
  );
  return res;
}

export async function fetchNetworkInterfaceAccountingForVps(vpsId: number, year: number, month: number) {
  return fetchNetworkInterfaceAccountings({
    vps: vpsId,
    year,
    month,
    limit: 250,
  });
}

function isNetworkInterface(value: unknown): value is NetworkInterface {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(value, ['mac', 'name', 'type'], ['max_rx', 'max_tx'], ['enable']) ||
    !optional(value['vps'], reference)
  )
    return false;
  return true;
}
function narrowNetworkInterface(value: unknown): NetworkInterface {
  if (!isNetworkInterface(value)) throw new TypeError('Invalid NetworkInterface identity or fields');
  return value;
}

function isNetworkInterfaceAccounting(value: unknown): value is NetworkInterfaceAccounting {
  if (
    !isRecord(value) ||
    !fields(
      value,
      ['created_at', 'updated_at'],
      ['bytes', 'bytes_in', 'bytes_out', 'month', 'packets', 'packets_in', 'packets_out', 'year'],
      []
    ) ||
    !optional(value['network_interface'], interfaceReference)
  )
    return false;
  return true;
}
function narrowNetworkInterfaceAccounting(value: unknown): NetworkInterfaceAccounting {
  if (!isNetworkInterfaceAccounting(value))
    throw new TypeError('Invalid NetworkInterfaceAccounting identity or fields');
  return value;
}
