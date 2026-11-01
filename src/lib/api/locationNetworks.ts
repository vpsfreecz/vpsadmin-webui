import type {
  LocationNetwork__IndexInput,
  LocationNetwork__IndexOutput,
  LocationNetwork__UpdateInput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, networkReference, locationReference } from './networkingViews';
import type { LocationReference, NetworkReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray } from './apiErrors';

export type LocationNetwork = Omit<LocationNetwork__IndexOutput[number], 'id' | 'location' | 'network'> & {
  id: number;
  location?: LocationReference | null;
  network?: NetworkReference | null;
  [key: string]: unknown;
};

export async function fetchLocationNetworks(opts?: { locationId?: number; networkId?: number; limit?: number }) {
  const params: LocationNetwork__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.locationId !== undefined) params['location'] = opts.locationId;
  if (opts?.networkId !== undefined) params['network'] = opts.networkId;

  const res = narrowApiResult(
    await (
      await getApi()
    ).location_network.index({
      params,
      meta: { includes: 'location,network' },
    }),
    (data) => expectArray<unknown>(data, 'location_network list').map(narrowLocationNetwork),
    'location_network index'
  );

  return res;
}

export async function createLocationNetwork(opts: {
  locationId: number;
  networkId: number;
  primary: boolean;
  priority: number;
  autopick: boolean;
  userpick: boolean;
}) {
  return narrowApiResult(
    await (
      await getApi()
    ).location_network.create({
      params: {
        location: opts.locationId,
        network: opts.networkId,
        primary: opts.primary,
        priority: opts.priority,
        autopick: opts.autopick,
        userpick: opts.userpick,
      },
    }),
    narrowLocationNetwork,
    'location_network create'
  );
}

export async function updateLocationNetwork(opts: {
  id: number;
  primary?: boolean;
  priority?: number;
  autopick?: boolean;
  userpick?: boolean;
}) {
  const params: LocationNetwork__UpdateInput = {};

  if (opts.primary !== undefined) params['primary'] = opts.primary;
  if (opts.priority !== undefined) params['priority'] = opts.priority;
  if (opts.autopick !== undefined) params['autopick'] = opts.autopick;
  if (opts.userpick !== undefined) params['userpick'] = opts.userpick;

  return narrowApiResult(
    await (
      await getApi()
    ).location_network.update({
      path: { location_network_id: opts.id },
      params,
    }),
    narrowLocationNetwork,
    'location_network update'
  );
}

export async function deleteLocationNetwork(opts: { id: number }) {
  return await (
    await getApi()
  ).location_network.delete({
    path: { location_network_id: opts.id },
  });
}

function isLocationNetwork(value: unknown): value is LocationNetwork {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(value, [], ['priority'], ['autopick', 'primary', 'userpick']) ||
    !optional(value['location'], locationReference) ||
    !optional(value['network'], networkReference)
  )
    return false;
  return true;
}
function narrowLocationNetwork(value: unknown): LocationNetwork {
  if (!isLocationNetwork(value)) throw new TypeError('Invalid LocationNetwork identity or fields');
  return value;
}
