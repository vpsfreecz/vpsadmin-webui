export { findDatasetByName, type Dataset } from './datasets';
import type { Vps__Mount__CreateInput, Vps__Mount__UpdateInput } from 'vpsadmin-typescript-client';
import type { Vps__Mount__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { fields, positiveId, reference, rows, object, type StorageReference } from './vpsStorageOutput';

export type VpsMount = Omit<Vps__Mount__ShowOutput, 'id' | 'vps' | 'dataset' | 'user_namespace_map'> & { id: number; vps?: StorageReference | null; dataset?: StorageReference | null; user_namespace_map?: StorageReference | null; } & Record<string, unknown>;
function isVpsMount(value: unknown): value is VpsMount {
  return fields(value, ['mountpoint', 'mode', 'on_start_fail', 'current_state', 'expiration_date'], [], ['enabled', 'master_enabled']) && positiveId(value['id'])
    && reference(value['vps'])
    && reference(value['dataset'])
    && reference(value['user_namespace_map']);
}

import { getApi } from './sdk';
import { requireActionStateResult } from './apiErrors';

export async function fetchVpsMounts(vpsId: number) {
  const res = await (await getApi()).vps.mount.index({
    path: { vps_id: vpsId },
  });
  return narrowApiResult(res, data => rows(data, isVpsMount), 'fetchVpsMounts');
}

export async function createVpsMount(vpsId: number, params: Vps__Mount__CreateInput) {
  const res = await (await getApi()).vps.mount.create({
    path: { vps_id: vpsId },
    params,
  });
  return narrowApiResult(requireActionStateResult(res, 'VPS mount create'), data => object(data, isVpsMount), 'createVpsMount');
}

export async function updateVpsMount(vpsId: number, mountId: number, params: Vps__Mount__UpdateInput) {
  const res = await (await getApi()).vps.mount.update({
    path: { vps_id: vpsId, mount_id: mountId },
    params,
  });
  return narrowApiResult(requireActionStateResult(res, 'VPS mount update'), data => object(data, isVpsMount), 'updateVpsMount');
}

export async function deleteVpsMount(vpsId: number, mountId: number) {
  const res = await (await getApi()).vps.mount.delete({
    path: { vps_id: vpsId, mount_id: mountId },
  });
  return requireActionStateResult(res, 'VPS mount delete');
}
