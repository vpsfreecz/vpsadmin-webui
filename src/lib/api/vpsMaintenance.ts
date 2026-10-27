import { expectArray, haveApiCall } from './haveapi';
import type { ResourceRef } from './appTypes';

export interface VpsMaintenanceWindow {
  id: number;
  vps?: ResourceRef;
  /** API weekday: Sunday = 0, Monday = 1, …, Saturday = 6. */
  weekday: number;
  is_open: boolean;
  opens_at?: number | null;
  closes_at?: number | null;
  [k: string]: unknown;
}

export async function fetchVpsMaintenanceWindows(vpsId: number) {
  const res = await haveApiCall<VpsMaintenanceWindow[]>({
    method: 'GET',
    path: `/vpses/${vpsId}/maintenance_windows`,
  });
  return {
    ...res,
    data: expectArray<VpsMaintenanceWindow>(res.data, `vpses/${vpsId}/maintenance_windows`),
  };
}

export async function updateVpsMaintenanceWindow(vpsId: number, weekday: number, params: Record<string, unknown>) {
  return haveApiCall<VpsMaintenanceWindow>({
    method: 'PUT',
    path: `/vpses/${vpsId}/maintenance_windows/${weekday}`,
    namespace: 'maintenance_window',
    params,
  });
}

export async function updateAllVpsMaintenanceWindows(vpsId: number, params: Record<string, unknown>) {
  return haveApiCall<void>({
    method: 'PUT',
    path: `/vpses/${vpsId}/maintenance_windows`,
    namespace: 'maintenance_window',
    params,
  });
}
