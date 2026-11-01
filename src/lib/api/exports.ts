import type { Export__CreateInput, Export__Host__CreateInput, Export__Host__IndexInput, Export__Host__UpdateInput, Export__IndexInput, Export__UpdateInput, HostIpAddress__IndexInput } from 'vpsadmin-typescript-client';
import type { HostIpAddress__ShowOutput, Export__ShowOutput, Export__Host__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { fields, positiveId, reference, rows, object, type StorageReference } from './vpsStorageOutput';

export type HostIpAddress = Omit<HostIpAddress__ShowOutput, 'id' | 'ip_address'> & { id: number; ip_address?: StorageReference | null; } & Record<string, unknown>;
function isHostIpAddress(value: unknown): value is HostIpAddress {
  return fields(value, ['addr', 'reverse_record_value'], [], ['assigned', 'user_created']) && positiveId(value['id'])
    && reference(value['ip_address']);
}

export type ExportItem = Omit<Export__ShowOutput, 'id' | 'dataset' | 'snapshot' | 'user' | 'ip_address' | 'host_ip_address'> & { id: number; dataset?: StorageReference | null; snapshot?: StorageReference | null; user?: StorageReference | null; ip_address?: StorageReference | null; host_ip_address?: StorageReference | null; } & Record<string, unknown>;
function isExportItem(value: unknown): value is ExportItem {
  return fields(value, ['path', 'expiration_date', 'created_at', 'updated_at'], ['threads'], ['all_vps', 'rw', 'sync', 'subtree_check', 'root_squash', 'enabled']) && positiveId(value['id'])
    && reference(value['dataset'])
    && reference(value['snapshot'])
    && reference(value['user'])
    && reference(value['ip_address'])
    && reference(value['host_ip_address']);
}

export type ExportHost = Omit<Export__Host__ShowOutput, 'id' | 'ip_address'> & { id: number; ip_address?: StorageReference | null; } & Record<string, unknown>;
function isExportHost(value: unknown): value is ExportHost {
  return fields(value, [], [], ['rw', 'sync', 'subtree_check', 'root_squash']) && positiveId(value['id'])
    && reference(value['ip_address']);
}

import { getApi } from './sdk';

export type ResourceRef = StorageReference;

export async function fetchExports(opts?: {
  fromId?: number;
  limit?: number;
  user?: number;
  includes?: string;
}) {
  const params: Export__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.user !== undefined) params['user'] = opts.user;

  const res = await (await getApi()).export.index({
    params,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });

  return narrowApiResult(res, data => rows(data, isExportItem), 'fetchExports');
}

export async function fetchExport(exportId: number, opts?: { includes?: string }) {
  const res = await (await getApi()).export.show({
    path: { export_id: exportId },
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });
  return narrowApiResult(res, data => object(data, isExportItem), 'fetchExport');
}

export async function createExport(payload: Export__CreateInput) {
  const res = await (await getApi()).export.create({
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isExportItem), 'createExport');
}

export async function updateExport(exportId: number, payload: Export__UpdateInput) {
  const res = await (await getApi()).export.update({
    path: { export_id: exportId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isExportItem), 'updateExport');
}

export async function deleteExport(exportId: number) {
  return (await getApi()).export.delete({
    path: { export_id: exportId },
  });
}

export async function fetchExportHosts(exportId: number, opts?: { fromId?: number; limit?: number; includes?: string }) {
  const params: Export__Host__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  const res = await (await getApi()).export.host.index({
    path: { export_id: exportId },
    params,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });
  return narrowApiResult(res, data => rows(data, isExportHost), 'fetchExportHosts');
}

export async function createExportHost(exportId: number, payload: Export__Host__CreateInput) {
  const res = await (await getApi()).export.host.create({
    path: { export_id: exportId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isExportHost), 'createExportHost');
}

export async function updateExportHost(exportId: number, hostId: number, payload: Export__Host__UpdateInput) {
  const res = await (await getApi()).export.host.update({
    path: { export_id: exportId, host_id: hostId },
    params: payload,
  });
  return narrowApiResult(res, data => object(data, isExportHost), 'updateExportHost');
}

export async function deleteExportHost(exportId: number, hostId: number) {
  return (await getApi()).export.host.delete({
    path: { export_id: exportId, host_id: hostId },
  });
}

export async function fetchHostIpAddresses(opts?: {
  fromId?: number;
  limit?: number;
  addr?: string;
  user?: number;
  vps?: number;
  assigned?: boolean;
  purpose?: string;
  usableFor?: string;
  routed?: boolean;
  order?: string;
  includes?: string;
  signal?: AbortSignal;
}) {
  const params: HostIpAddress__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.addr !== undefined) params['addr'] = opts.addr;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.assigned !== undefined) params['assigned'] = opts.assigned;
  if (opts?.purpose !== undefined) params['purpose'] = opts.purpose;
  if (opts?.usableFor !== undefined) params['usable_for'] = opts.usableFor;
  if (opts?.routed !== undefined) params['routed'] = opts.routed;
  if (opts?.order !== undefined) params['order'] = opts.order;

  const res = await (await getApi()).host_ip_address.index({
    params,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
    signal: opts?.signal,
  });

  return narrowApiResult(res, data => rows(data, isHostIpAddress), 'fetchHostIpAddresses');
}
