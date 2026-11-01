import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  ClusterResourcePackage__IndexOutput,
  ClusterResourcePackage__Item__IndexOutput,
  Location__ShowOutput,
  UserClusterResourcePackage__IndexOutput,
} from 'vpsadmin-typescript-client';
import type {
  ClusterResourcePackage__IndexInput,
  ClusterResourcePackage__Item__IndexInput,
  UserClusterResourcePackage__IndexInput,
} from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

import type { User } from './app';
import type { Environment } from './infra';
import type { ClusterResource } from './clusterResources';

export type ClusterResourcePackage = Omit<
  ClusterResourcePackage__IndexOutput[number],
  'id' | 'environment' | 'user'
> & {
  id: number; environment?: OperationsReference | null;
  user?: OperationsReference | null; [k: string]: unknown };

export type ClusterResourcePackageItem = Omit<
  ClusterResourcePackage__Item__IndexOutput[number],
  'id' | 'cluster_resource'
> & { id: number; cluster_resource?: OperationsReference | null; [k: string]: unknown };

export type UserClusterResourcePackage = Omit<
  UserClusterResourcePackage__IndexOutput[number],
  'id' | 'added_by' | 'cluster_resource_package' | 'environment' | 'user'
> & {
  id: number;
  added_by?: OperationsReference | null;
  cluster_resource_package?: OperationsReference | null;
  environment?: OperationsReference | null;
  user?: OperationsReference | null;
  [k: string]: unknown;
};

export async function fetchClusterResourcePackages(opts?: {
  limit?: number;
  fromId?: number;
  environmentId?: number;
  userId?: number | null;
}) {
  const params: ClusterResourcePackage__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;
  if (opts?.userId !== undefined) params['user'] = opts.userId;

  const res = await (await getApi()).cluster_resource_package.index({ params,
    meta: { includes: 'environment,user' } });

  return narrowApiResult(res, narrowClusterResourcePackageList, 'cluster_resource_packages#index');
}

export async function fetchClusterResourcePackage(id: number) {
  return narrowApiResult(
    await (
      await getApi()
    ).cluster_resource_package.show({
      path: { cluster_resource_package_id: id },
      meta: { includes: 'environment,user' },
    }),
    narrowClusterResourcePackage,
    'cluster_resource_package.show'
  );
}

export async function createClusterResourcePackage(payload: { label: string }) {
  return narrowApiResult(
    await (
      await getApi()
    ).cluster_resource_package.create({
      params: {
        label: payload.label,
      },
    }),
    narrowClusterResourcePackage,
    'cluster_resource_package.create'
  );
}

export async function updateClusterResourcePackage(payload: { id: number; label: string }) {
  return narrowApiResult(
    await (
      await getApi()
    ).cluster_resource_package.update({
      path: { cluster_resource_package_id: payload.id},
      params: {
        label: payload.label,
      },
    }),
    narrowClusterResourcePackage,
    'cluster_resource_package.update'
  );
}

export async function deleteClusterResourcePackage(id: number) {
  return (await getApi()).cluster_resource_package.delete({ path: { cluster_resource_package_id: id } });
}

export async function fetchClusterResourcePackageItems(pkgId: number, opts?: { limit?: number; fromId?: number }) {
  const params: ClusterResourcePackage__Item__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (
    await getApi()
  ).cluster_resource_package.item.index({
    path: { cluster_resource_package_id: pkgId },
    params,
    meta: { includes: 'cluster_resource' },
  });

  return narrowApiResult(res, narrowClusterResourcePackageItemList, `cluster_resource_packages/${pkgId}/items#index`);
}

export async function createClusterResourcePackageItem(payload: {
  pkgId: number;
  clusterResourceId: number;
  value: number;
}) {
  return narrowApiResult(
    await (
      await getApi()
    ).cluster_resource_package.item.create({
      path: { cluster_resource_package_id: payload.pkgId },
      params: {
        cluster_resource: payload.clusterResourceId,
        value: payload.value,
      },
    }),
    narrowClusterResourcePackageItem,
    'cluster_resource_package.item.create'
  );
}

export async function updateClusterResourcePackageItem(payload: { pkgId: number; itemId: number; value: number }) {
  return narrowApiResult(
    await (
      await getApi()
    ).cluster_resource_package.item.update({
      path: { cluster_resource_package_id: payload.pkgId, item_id: payload.itemId },
      params: {
        value: payload.value,
      },
    }),
    narrowClusterResourcePackageItem,
    'cluster_resource_package.item.update'
  );
}

export async function deleteClusterResourcePackageItem(payload: { pkgId: number; itemId: number }) {
  return (await getApi()).cluster_resource_package.item.delete({
    path: { cluster_resource_package_id: payload.pkgId, item_id: payload.itemId },
  });
}

export async function fetchUserClusterResourcePackages(opts?: {
  limit?: number;
  fromId?: number;
  environmentId?: number;
  userId?: number;
  clusterResourcePackageId?: number;
  addedById?: number;
}) {
  const params: UserClusterResourcePackage__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.clusterResourcePackageId !== undefined) params['cluster_resource_package'] = opts.clusterResourcePackageId;
  if (opts?.addedById !== undefined) params['added_by'] = opts.addedById;

  const res = await (
    await getApi()
  ).user_cluster_resource_package.index({
    params,
    meta: { includes: 'environment,user,added_by,cluster_resource_package' },
  });

  return narrowApiResult(res, narrowUserClusterResourcePackageList, 'user_cluster_resource_packages#index');
}

export async function createUserClusterResourcePackage(payload: {
  environmentId: number;
  userId: number;
  clusterResourcePackageId: number;
  comment?: string;
  fromPersonal?: boolean;
}) {
  return narrowApiResult(
    await (
      await getApi()
    ).user_cluster_resource_package.create({
      params: {
        environment: payload.environmentId,
        user: payload.userId,
        cluster_resource_package: payload.clusterResourcePackageId,
        comment: payload.comment ?? '',
        from_personal: Boolean(payload.fromPersonal),
      },
    }),
    narrowUserClusterResourcePackage,
    'user_cluster_resource_package.create'
  );
}

export async function updateUserClusterResourcePackage(payload: { id: number; comment: string }) {
  return narrowApiResult(
    await (
      await getApi()
    ).user_cluster_resource_package.update({
      path: { user_cluster_resource_package_id: payload.id },
      params: {
        comment: payload.comment,
      },
    }),
    narrowUserClusterResourcePackage,
    'user_cluster_resource_package.update'
  );
}

export async function deleteUserClusterResourcePackage(id: number) {
  return (await getApi()).user_cluster_resource_package.delete({ path: { user_cluster_resource_package_id: id } });
}

function isClusterResourcePackage(value: unknown): value is ClusterResourcePackage {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['created_at', 'label', 'updated_at'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['environment', 'user'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowClusterResourcePackage(value: unknown): ClusterResourcePackage {
  if (!isClusterResourcePackage(value)) throw new TypeError('Invalid ClusterResourcePackage fields');
  return value;
}
function narrowClusterResourcePackageList(value: unknown): ClusterResourcePackage[] {
  if (!Array.isArray(value)) throw new TypeError('Expected ClusterResourcePackage list');
  return value.map(narrowClusterResourcePackage);
}

function isClusterResourcePackageItem(value: unknown): value is ClusterResourcePackageItem {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['value'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['cluster_resource'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowClusterResourcePackageItem(value: unknown): ClusterResourcePackageItem {
  if (!isClusterResourcePackageItem(value)) throw new TypeError('Invalid ClusterResourcePackageItem fields');
  return value;
}
function narrowClusterResourcePackageItemList(value: unknown): ClusterResourcePackageItem[] {
  if (!Array.isArray(value)) throw new TypeError('Expected ClusterResourcePackageItem list');
  return value.map(narrowClusterResourcePackageItem);
}

function isUserClusterResourcePackage(value: unknown): value is UserClusterResourcePackage {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['comment', 'created_at', 'label', 'updated_at'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['is_personal'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean'
    ) &&
    ['added_by', 'cluster_resource_package', 'environment', 'user'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowUserClusterResourcePackage(value: unknown): UserClusterResourcePackage {
  if (!isUserClusterResourcePackage(value)) throw new TypeError('Invalid UserClusterResourcePackage fields');
  return value;
}
function narrowUserClusterResourcePackageList(value: unknown): UserClusterResourcePackage[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserClusterResourcePackage list');
  return value.map(narrowUserClusterResourcePackage);
}
