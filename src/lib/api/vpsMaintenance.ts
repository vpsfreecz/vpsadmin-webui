import type { Vps__MaintenanceWindow__ShowOutput, Vps__MaintenanceWindow__UpdateInput, Vps__MaintenanceWindow__UpdateAllInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import { fields, object, rows } from './vpsStorageOutput';

/** API weekday: Sunday = 0, Monday = 1, …, Saturday = 6. */
export type VpsMaintenanceWindow = Vps__MaintenanceWindow__ShowOutput & { weekday: number; is_open: boolean };
function isWindow(value: unknown): value is VpsMaintenanceWindow {
  return fields(value, [], ['opens_at', 'closes_at'])
    && typeof value['weekday'] === 'number' && Number.isInteger(value['weekday']) && value['weekday'] >= 0 && value['weekday'] <= 6
    && typeof value['is_open'] === 'boolean';
}

export async function fetchVpsMaintenanceWindows(vpsId: number) {
  const res = await (await getApi()).vps.maintenance_window.index({ path: { vps_id: vpsId } });
  return narrowApiResult(res, data => rows(data, isWindow), 'VPS maintenance windows');
}

export async function updateVpsMaintenanceWindow(vpsId: number, weekday: number, params: Vps__MaintenanceWindow__UpdateInput) {
  const res = await (await getApi()).vps.maintenance_window.update({
    path: { vps_id: vpsId, maintenance_window_id: weekday }, params,
  });
  return narrowApiResult(res, data => object(data, isWindow), 'VPS maintenance window');
}

export async function updateAllVpsMaintenanceWindows(vpsId: number, params: Vps__MaintenanceWindow__UpdateAllInput) {
  const res = await (await getApi()).vps.maintenance_window.update_all({ path: { vps_id: vpsId }, params });
  return narrowApiResult(res, data => rows(data, isWindow), 'VPS maintenance windows');
}
