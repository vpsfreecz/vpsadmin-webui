import type { Vps__Feature__UpdateAllInput } from 'vpsadmin-typescript-client';
import type { Vps__Feature__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { fields, positiveId, reference, rows, object, type StorageReference } from './vpsStorageOutput';

export type VpsFeature = Omit<Vps__Feature__ShowOutput, 'id'> & { id: number; } & Record<string, unknown>;
function isVpsFeature(value: unknown): value is VpsFeature {
  return fields(value, ['name', 'label'], [], ['enabled']) && positiveId(value['id']);
}

import { getApi } from './sdk';
import { requireActionStateResult } from './apiErrors';

export async function fetchVpsFeatures(vpsId: number) {
  const res = await (await getApi()).vps.feature.index({
    path: { vps_id: vpsId },
  });
  return narrowApiResult(res, data => rows(data, isVpsFeature), 'fetchVpsFeatures');
}

export async function updateVpsFeature(vpsId: number, featureId: number, enabled: boolean) {
  const res = await (await getApi()).vps.feature.update({
    path: { vps_id: vpsId, feature_id: featureId },
    params: { enabled },
  });
  return requireActionStateResult(res, 'VPS feature update');
}

export async function updateVpsFeaturesAll(vpsId: number, params: Vps__Feature__UpdateAllInput) {
  const res = await (await getApi()).vps.feature.update_all({
    path: { vps_id: vpsId },
    params,
  });
  return requireActionStateResult(res, 'VPS features update');
}

export function isEditableVpsFeatureName(name: string): name is keyof Vps__Feature__UpdateAllInput {
  const names = ['fuse', 'impermanence', 'kvm', 'lxc', 'ppp', 'tun'] satisfies (keyof Vps__Feature__UpdateAllInput)[];
  return names.some(candidate => candidate === name);
}
