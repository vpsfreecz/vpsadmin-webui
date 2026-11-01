import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  ClusterResource__IndexOutput,
  DefaultObjectClusterResource__IndexOutput,
  ClusterResource__ShowOutput,
  Location__ShowOutput,
  User__ClusterResource__IndexOutput,
} from 'vpsadmin-typescript-client';
import type {
  ClusterResource__IndexInput,
  DefaultObjectClusterResource__IndexInput,
  User__ClusterResource__IndexInput,
} from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

export type ClusterResource = Omit<ClusterResource__IndexOutput[number], 'id'> & { id: number;
  [k: string]: unknown };

export type UserClusterResource = Omit<
  User__ClusterResource__IndexOutput[number],
  'id' | 'cluster_resource' | 'environment'
> & {
  id: number;
  cluster_resource?: ClusterResourceReference | null;
  environment?: OperationsReference | null;
  [k: string]: unknown;
};

export type DefaultObjectClusterResource = Omit<
  DefaultObjectClusterResource__IndexOutput[number],
  'id' | 'cluster_resource' | 'environment'
> & {
  id: number;
  cluster_resource?: ClusterResourceReference | null;
  environment?: OperationsReference | null;
  [k: string]: unknown;
};

export async function fetchClusterResources(opts?: { limit?: number; fromId?: number }) {
  const params: ClusterResource__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).cluster_resource.index({ params });

  return narrowApiResult(res, narrowClusterResourceList, 'cluster_resources#index');
}

export async function fetchUserClusterResources(userId: number, opts?: {
  limit?: number;
  environmentId?: number;
}) {
  const params: User__ClusterResource__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;

  const res = await (
    await getApi()
  ).user.cluster_resource.index({
    path: { user_id: userId },
    params,
    meta: { includes: 'environment,cluster_resource' },
  });

  return narrowApiResult(res, narrowUserClusterResourceList, 'users/:id/cluster_resources#index');
}

export async function fetchDefaultObjectClusterResources(opts?: {
  limit?: number;
  environmentId?: number;
  className?: string;
}) {
  const params: DefaultObjectClusterResource__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;
  if (opts?.className) params['class_name'] = opts.className;

  const res = await (
    await getApi()
  ).default_object_cluster_resource.index({ params, meta: { includes: 'cluster_resource' } });

  return narrowApiResult(res, narrowDefaultObjectClusterResourceList, 'default_object_cluster_resources#index');
}

function isClusterResource(value: unknown): value is ClusterResource {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['allocate_chain', 'free_chain', 'label', 'name', 'resource_type'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['max', 'min', 'stepsize'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function narrowClusterResource(value: unknown): ClusterResource {
  if (!isClusterResource(value)) throw new TypeError('Invalid ClusterResource fields');
  return value;
}
function narrowClusterResourceList(value: unknown): ClusterResource[] {
  if (!Array.isArray(value)) throw new TypeError('Expected ClusterResource list');
  return value.map(narrowClusterResource);
}

function isUserClusterResource(value: unknown): value is UserClusterResource {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['free', 'used', 'value'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    (value['cluster_resource'] == null || isClusterResourceReference(value['cluster_resource'])) &&
    ['environment'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowUserClusterResource(value: unknown): UserClusterResource {
  if (!isUserClusterResource(value)) throw new TypeError('Invalid UserClusterResource fields');
  return value;
}
function narrowUserClusterResourceList(value: unknown): UserClusterResource[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserClusterResource list');
  return value.map(narrowUserClusterResource);
}

function isDefaultObjectClusterResource(value: unknown): value is DefaultObjectClusterResource {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['class_name'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    ['value'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    (value['cluster_resource'] == null || isClusterResourceReference(value['cluster_resource'])) &&
    ['environment'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowDefaultObjectClusterResource(value: unknown): DefaultObjectClusterResource {
  if (!isDefaultObjectClusterResource(value)) throw new TypeError('Invalid DefaultObjectClusterResource fields');
  return value;
}
function narrowDefaultObjectClusterResourceList(value: unknown): DefaultObjectClusterResource[] {
  if (!Array.isArray(value)) throw new TypeError('Expected DefaultObjectClusterResource list');
  return value.map(narrowDefaultObjectClusterResource);
}

type ClusterResourceReference = OperationsReference & Pick<ClusterResource__ShowOutput, 'min' | 'max' | 'stepsize'>;
function isClusterResourceReference(value: unknown): value is ClusterResourceReference {
  return isOperationsReference(value) && ['min', 'max', 'stepsize'].every(key => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key])));
}
