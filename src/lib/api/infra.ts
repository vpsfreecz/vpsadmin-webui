import { narrowLocation, type Location } from './appTypes';
import type {
  Environment__CreateInput,
  Environment__UpdateInput,
  Location__CreateInput,
  Location__UpdateInput,
} from 'vpsadmin-typescript-client';
import type { Environment__IndexOutput } from 'vpsadmin-typescript-client';
import type { Environment__IndexInput, Location__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

export type Environment = Omit<Environment__IndexOutput[number], 'id'> & {
  id: number;

  [k: string]: unknown };

export { type Location } from './appTypes';

export async function fetchEnvironments(opts?: { limit?: number; hasHypervisor?: boolean; hasStorage?: boolean }) {
  const params: Environment__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.hasHypervisor !== undefined) params['has_hypervisor'] = opts.hasHypervisor;
  if (opts?.hasStorage !== undefined) params['has_storage'] = opts.hasStorage;

  const res = await (await getApi()).environment.index({ params });

  return narrowApiResult(res, narrowEnvironmentList, 'environments#index');
}

export async function fetchLocations(opts?: {
  limit?: number;
  environmentId?: number;
  hasHypervisor?: boolean;
  hasStorage?: boolean;
  hypervisorType?: string;
  includes?: string;
  sharesNetworksWithLocationId?: number;
  sharesNetworksWithVersion?: 4 | 6 | 'any';
  sharesNetworksPrimary?: boolean;
}) {
  const params: Location__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;
  if (opts?.hasHypervisor !== undefined) params['has_hypervisor'] = opts.hasHypervisor;
  if (opts?.hasStorage !== undefined) params['has_storage'] = opts.hasStorage;
  if (opts?.hypervisorType) params['hypervisor_type'] = opts.hypervisorType;

  if (opts?.sharesNetworksWithLocationId !== undefined) {
    const id = opts.sharesNetworksWithLocationId;
    const ver = opts.sharesNetworksWithVersion ?? 'any';

    if (ver === 4) params['shares_v4_networks_with'] = id;
    else if (ver === 6) params['shares_v6_networks_with'] = id;
    else params['shares_any_networks_with'] = id;

    if (opts?.sharesNetworksPrimary !== undefined) params['shares_networks_primary'] = opts.sharesNetworksPrimary;
  }

  const res = await (
    await getApi()
  ).location.index({ params,
    meta: opts?.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(
    res,
    (data) => {
      if (!Array.isArray(data)) throw new TypeError('Expected locations');
      return data.map(narrowLocation);
    },
    'locations'
  );
}

export async function createEnvironment(payload: Environment__CreateInput) {
  return narrowApiResult(
    await (await getApi()).environment.create({ params: payload }),
    narrowEnvironment,
    'environment.create'
  );
}

export async function updateEnvironment(environmentId: number, payload: Environment__UpdateInput) {
  return narrowApiResult(
    await (await getApi()).environment.update({ path: { environment_id: environmentId }, params: payload }),
    narrowEnvironment,
    'environment.update'
  );
}

export async function createLocation(payload: Location__CreateInput) {
  return narrowApiResult(
    await (await getApi()).location.create({ params: payload }),
    narrowLocation,
    'location.create'
  );
}

export async function updateLocation(locationId: number, payload: Location__UpdateInput) {
  return narrowApiResult(
    await (await getApi()).location.update({ path: { location_id: locationId }, params: payload }),
    narrowLocation,
    'location.update'
  );
}

export async function setEnvironmentMaintenance(environmentId: number, opts: { lock: boolean; reason?: string }) {
  return (await getApi()).environment.set_maintenance({
    path: { environment_id: environmentId },
    params: { lock: opts.lock, reason: opts.reason },
  });
}

export async function setLocationMaintenance(locationId: number, opts: { lock: boolean; reason?: string }) {
  return (await getApi()).location.set_maintenance({
    path: { location_id: locationId },
    params: { lock: opts.lock, reason: opts.reason },
  });
}

function isOperationsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isEnvironment(value: unknown): value is Environment {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['description', 'domain', 'label', 'maintenance_lock', 'maintenance_lock_reason'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['max_vps_count', 'vps_lifetime'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['can_create_vps', 'can_destroy_vps', 'user_ip_ownership'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean'
    )
  );
}
function narrowEnvironment(value: unknown): Environment {
  if (!isEnvironment(value)) throw new TypeError('Invalid Environment fields');
  return value;
}
function narrowEnvironmentList(value: unknown): Environment[] {
  if (!Array.isArray(value)) throw new TypeError('Expected Environment list');
  return value.map(narrowEnvironment);
}
