import type { VpsUserData__CreateInput, VpsUserData__UpdateInput } from 'vpsadmin-typescript-client';
import type { VpsUserData__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { fields, positiveId, reference, rows, object, type StorageReference } from './vpsStorageOutput';

export type VpsUserData = Omit<VpsUserData__ShowOutput, 'id' | 'user'> & { id: number; user?: StorageReference | null; } & Record<string, unknown>;
function isVpsUserData(value: unknown): value is VpsUserData {
  return fields(value, ['label', 'format', 'content', 'created_at', 'updated_at'], [], []) && positiveId(value['id'])
    && reference(value['user']);
}

import { getApi } from './sdk';
import { requireActionStateResult } from './apiErrors';

export type VpsUserDataFormat =
  | 'script'
  | 'cloudinit_config'
  | 'cloudinit_script'
  | 'nixos_configuration'
  | 'nixos_flake_configuration'
  | 'nixos_flake_uri';

export async function fetchVpsUserDataList(opts?: {
  user?: number;
  format?: string;
  limit?: number;
  fromId?: number | null;
}) {
  const res = await (await getApi()).vps_user_data.index({
    params: {
      user: opts?.user,
      format: opts?.format,
      limit: opts?.limit,
      from_id: opts?.fromId ?? undefined,
    },
  });

  return narrowApiResult(res, data => rows(data, isVpsUserData), 'fetchVpsUserDataList');
}

export async function fetchVpsUserData(id: number) {
  const res = await (await getApi()).vps_user_data.show({
    path: { vps_user_data_id: id },
  });

  return narrowApiResult(res, data => object(data, isVpsUserData), 'fetchVpsUserData');
}

export async function createVpsUserData(payload: VpsUserData__CreateInput) {
  const res = await (await getApi()).vps_user_data.create({
    params: payload,
  });

  return narrowApiResult(res, data => object(data, isVpsUserData), 'createVpsUserData');
}

export async function updateVpsUserData(
  id: number,
  payload: VpsUserData__UpdateInput
) {
  const res = await (await getApi()).vps_user_data.update({
    path: { vps_user_data_id: id },
    params: payload,
  });

  return narrowApiResult(res, data => object(data, isVpsUserData), 'updateVpsUserData');
}

export async function deleteVpsUserData(id: number) {
  return (await getApi()).vps_user_data.delete({
    path: { vps_user_data_id: id },
  });
}

export async function deployVpsUserData(id: number, vpsId: number) {
  const res = await (await getApi()).vps_user_data.deploy({
    path: { vps_user_data_id: id },
    params: {
      vps: vpsId,
    },
  });

  return requireActionStateResult(res, 'VPS user-data deployment');
}
