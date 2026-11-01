import type { DatasetExpansion__CreateInput, DatasetExpansion__History__CreateInput, DatasetExpansion__History__IndexInput, DatasetExpansion__RegisterExpandedInput, DatasetExpansion__UpdateInput, Dataset__CreateInput, Dataset__IndexInput, Dataset__Plan__CreateInput, Dataset__Plan__IndexInput, Dataset__Snapshot__CreateInput, Dataset__Snapshot__IndexInput, Dataset__UpdateInput, Environment__DatasetPlan__IndexInput, SnapshotDownload__CreateInput, SnapshotDownload__IndexInput } from 'vpsadmin-typescript-client';
import type { Dataset__ShowOutput, DatasetPlan__ShowOutput, Environment__DatasetPlan__ShowOutput, Dataset__Plan__ShowOutput, DatasetExpansion__ShowOutput, DatasetExpansion__History__ShowOutput, Dataset__Snapshot__ShowOutput, SnapshotDownload__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { fields, positiveId, reference, rows, object, type StorageReference } from './vpsStorageOutput';

export type Dataset = Omit<Dataset__ShowOutput, 'id' | 'user' | 'vps' | 'parent' | 'export' | 'dataset_expansion' | 'environment'> & { id: number; user?: StorageReference | null; vps?: StorageReference | null; parent?: StorageReference | null; export?: StorageReference | null; dataset_expansion?: StorageReference | null; environment?: StorageReference | null; } & Record<string, unknown>;
function isDataset(value: unknown): value is Dataset {
  return fields(value, ['name', 'sharenfs', 'sync'], ['used', 'referenced', 'avail', 'quota', 'refquota', 'recordsize', 'compressratio', 'refcompressratio', 'current_history_id'], ['atime', 'compression', 'relatime']) && positiveId(value['id'])
    && reference(value['user'])
    && reference(value['vps'])
    && reference(value['parent'])
    && reference(value['export'])
    && reference(value['dataset_expansion'])
    && reference(value['environment']);
}

export type DatasetPlan = Omit<DatasetPlan__ShowOutput, 'id'> & { id: number; } & Record<string, unknown>;
function isDatasetPlan(value: unknown): value is DatasetPlan {
  return fields(value, ['label', 'description'], [], []) && positiveId(value['id']);
}

export type EnvironmentDatasetPlan = Omit<Environment__DatasetPlan__ShowOutput, 'id' | 'dataset_plan'> & { id: number; dataset_plan?: StorageReference | null; } & Record<string, unknown>;
function isEnvironmentDatasetPlan(value: unknown): value is EnvironmentDatasetPlan {
  return fields(value, ['label'], [], ['user_add', 'user_remove']) && positiveId(value['id'])
    && reference(value['dataset_plan']);
}

export type DatasetInPoolPlan = Omit<Dataset__Plan__ShowOutput, 'id' | 'environment_dataset_plan'> & { id: number; environment_dataset_plan?: StorageReference | null; } & Record<string, unknown>;
function isDatasetInPoolPlan(value: unknown): value is DatasetInPoolPlan {
  return fields(value, [], [], []) && positiveId(value['id'])
    && reference(value['environment_dataset_plan']);
}

export type DatasetExpansion = Omit<DatasetExpansion__ShowOutput, 'id' | 'vps' | 'dataset'> & { id: number; vps?: StorageReference | null; dataset?: StorageReference | null; } & Record<string, unknown>;
function isDatasetExpansion(value: unknown): value is DatasetExpansion {
  return fields(value, ['state', 'created_at'], ['original_refquota', 'added_space', 'over_refquota_seconds', 'max_over_refquota_seconds'], ['enable_notifications', 'enable_shrink', 'stop_vps']) && positiveId(value['id'])
    && reference(value['vps'])
    && reference(value['dataset']);
}

export type DatasetExpansionHistory = Omit<DatasetExpansion__History__ShowOutput, 'id' | 'admin'> & { id: number; admin?: StorageReference | null; } & Record<string, unknown>;
function isDatasetExpansionHistory(value: unknown): value is DatasetExpansionHistory {
  return fields(value, ['created_at'], ['added_space', 'original_refquota', 'new_refquota'], []) && positiveId(value['id'])
    && reference(value['admin']);
}

export type Snapshot = Omit<Dataset__Snapshot__ShowOutput, 'id' | 'dataset' | 'mount' | 'export'> & { id: number; dataset?: StorageReference | null; mount?: StorageReference | null; export?: StorageReference | null; } & Record<string, unknown>;
function isSnapshot(value: unknown): value is Snapshot {
  return fields(value, ['name', 'label', 'created_at'], ['history_id'], []) && positiveId(value['id'])
    && reference(value['dataset'])
    && reference(value['mount'])
    && reference(value['export']);
}

export type SnapshotDownload = Omit<SnapshotDownload__ShowOutput, 'id' | 'user' | 'snapshot' | 'from_snapshot'> & { id: number; user?: StorageReference | null; snapshot?: StorageReference | null; from_snapshot?: StorageReference | null; } & Record<string, unknown>;
function isSnapshotDownload(value: unknown): value is SnapshotDownload {
  return fields(value, ['file_name', 'url', 'format', 'sha256sum', 'expiration_date'], ['size'], ['ready']) && positiveId(value['id'])
    && reference(value['user'])
    && reference(value['snapshot'])
    && reference(value['from_snapshot']);
}

import { getApi } from './sdk';
import { requireActionStateResult } from './apiErrors';

/**
 * Datasets, snapshots and snapshot download links.
 */

export type ResourceRef = StorageReference;

export type SnapshotDownloadFormat = 'archive' | 'stream' | 'incremental_stream';

export async function fetchDatasets(opts?: {
  fromId?: number;
  limit?: number;
  user?: number;
  vps?: number;
  subtree?: number;
  includes?: string;
  count?: boolean;
  role?: 'primary' | 'hypervisor' | 'backup';
  toDepth?: number;
}) {
  const params: Dataset__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.subtree !== undefined) params['dataset'] = opts.subtree;
  if (opts?.role !== undefined) params['role'] = opts.role;
  if (opts?.toDepth !== undefined) params['to_depth'] = opts.toDepth;

  const res = await (await getApi()).dataset.index({
    params,
    meta:
      opts?.includes || opts?.count !== undefined
        ? {
            ...(opts.includes ? { includes: opts.includes } : {}),
            ...(opts.count !== undefined ? { count: opts.count } : {}),
          }
        : undefined,
  });

  return narrowApiResult(res, data => rows(data, isDataset), 'fetchDatasets');
}

export async function fetchDataset(datasetId: number, opts?: { includes?: string }) {
  const res = await (await getApi()).dataset.show({
    path: { dataset_id: datasetId },
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });
  return narrowApiResult(res, data => object(data, isDataset), 'fetchDataset');
}

export async function findDatasetByName(name: string, userId?: number) {
  const res = await (await getApi()).dataset.find_by_name({
    params: { name, user: userId },
  });
  return narrowApiResult(res, data => object(data, isDataset), 'findDatasetByName');
}

export type DatasetEditablePayload = Dataset__UpdateInput;

export type DatasetCreatePayload = Dataset__CreateInput;

export async function createDataset(payload: DatasetCreatePayload) {
  const res = await (await getApi()).dataset.create({
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isDataset), 'createDataset');
}

export async function updateDataset(datasetId: number, payload: DatasetEditablePayload) {
  return (await getApi()).dataset.update({
    path: { dataset_id: datasetId },
    params: payload,
  });
}

export async function deleteDataset(datasetId: number) {
  return (await getApi()).dataset.delete({
    path: { dataset_id: datasetId },
  });
}

export async function fetchDatasetSnapshots(datasetId: number, opts?: {
  fromId?: number;
  limit?: number;
  count?: boolean;
}) {
  const params: Dataset__Snapshot__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (await getApi()).dataset.snapshot.index({
    path: { dataset_id: datasetId },
    params,
    meta: opts?.count !== undefined ? { count: opts.count } : undefined,
  });

  return narrowApiResult(res, data => rows(data, isSnapshot), 'fetchDatasetSnapshots');
}

export async function createDatasetSnapshot(datasetId: number, payload: Dataset__Snapshot__CreateInput) {
  const res = await (await getApi()).dataset.snapshot.create({
    path: { dataset_id: datasetId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isSnapshot), 'createDatasetSnapshot');
}

export async function deleteDatasetSnapshot(datasetId: number, snapshotId: number) {
  return (await getApi()).dataset.snapshot.delete({
    path: { dataset_id: datasetId, snapshot_id: snapshotId },
  });
}

export async function rollbackDatasetSnapshot(datasetId: number, snapshotId: number) {
  const res = await (await getApi()).dataset.snapshot.rollback({
    path: { dataset_id: datasetId, snapshot_id: snapshotId },
  });
  return requireActionStateResult(res, 'dataset snapshot rollback');
}

export async function fetchSnapshotDownloads(opts?: {
  fromId?: number;
  limit?: number;
  dataset?: number;
  snapshot?: number;
  includes?: string;
  count?: boolean;
}) {
  const params: SnapshotDownload__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.dataset !== undefined) params['dataset'] = opts.dataset;
  if (opts?.snapshot !== undefined) params['snapshot'] = opts.snapshot;

  const res = await (await getApi()).snapshot_download.index({
    params,
    meta:
      opts?.includes || opts?.count !== undefined
        ? {
            ...(opts.includes ? { includes: opts.includes } : {}),
            ...(opts.count !== undefined ? { count: opts.count } : {}),
          }
        : undefined,
  });

  return narrowApiResult(res, data => rows(data, isSnapshotDownload), 'fetchSnapshotDownloads');
}

export async function createSnapshotDownload(payload: SnapshotDownload__CreateInput) {
  const res = await (await getApi()).snapshot_download.create({
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isSnapshotDownload), 'createSnapshotDownload');
}

export async function deleteSnapshotDownload(id: number) {
  return (await getApi()).snapshot_download.delete({
    path: { snapshot_download_id: id },
  });
}

export async function fetchDatasetPlans(datasetId: number, opts?: { limit?: number; fromId?: number; includes?: string }) {
  const params: Dataset__Plan__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).dataset.plan.index({
    path: { dataset_id: datasetId },
    params,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });

  return narrowApiResult(res, data => rows(data, isDatasetInPoolPlan), 'fetchDatasetPlans');
}

export async function fetchEnvironmentDatasetPlans(environmentId: number, opts?: { limit?: number; fromId?: number; includes?: string }) {
  const params: Environment__DatasetPlan__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).environment.dataset_plan.index({
    path: { environment_id: environmentId },
    params,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });

  return narrowApiResult(res, data => rows(data, isEnvironmentDatasetPlan), 'fetchEnvironmentDatasetPlans');
}

export async function assignDatasetPlan(datasetId: number, payload: Dataset__Plan__CreateInput) {
  const res = await (await getApi()).dataset.plan.create({
    path: { dataset_id: datasetId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isDatasetInPoolPlan), 'assignDatasetPlan');
}

export async function deleteDatasetPlan(datasetId: number, planId: number) {
  return (await getApi()).dataset.plan.delete({
    path: { dataset_id: datasetId, plan_id: planId },
  });
}

export async function fetchDatasetExpansion(expansionId: number) {
  const res = await (await getApi()).dataset_expansion.show({
    path: { dataset_expansion_id: expansionId },
  });
  return narrowApiResult(res, data => object(data, isDatasetExpansion), 'fetchDatasetExpansion');
}

export async function fetchDatasetExpansionHistory(expansionId: number, opts?: { limit?: number; fromId?: number; includes?: string }) {
  const params: DatasetExpansion__History__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).dataset_expansion.history.index({
    path: { dataset_expansion_id: expansionId },
    params,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });

  return narrowApiResult(res, data => rows(data, isDatasetExpansionHistory), 'fetchDatasetExpansionHistory');
}

export async function createDatasetExpansion(payload: DatasetExpansion__CreateInput) {
  const res = await (await getApi()).dataset_expansion.create({
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isDatasetExpansion), 'createDatasetExpansion');
}

export async function updateDatasetExpansion(expansionId: number, payload: DatasetExpansion__UpdateInput) {
  const res = await (await getApi()).dataset_expansion.update({
    path: { dataset_expansion_id: expansionId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isDatasetExpansion), 'updateDatasetExpansion');
}

export async function registerExpandedDataset(payload: DatasetExpansion__RegisterExpandedInput) {
  const res = await (await getApi()).dataset_expansion.register_expanded({
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isDatasetExpansion), 'registerExpandedDataset');
}

export async function addDatasetExpansionSpace(expansionId: number, payload: DatasetExpansion__History__CreateInput) {
  const res = await (await getApi()).dataset_expansion.history.create({
    path: { dataset_expansion_id: expansionId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isDatasetExpansionHistory), 'addDatasetExpansionSpace');
}
