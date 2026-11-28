import type { VpsEvidence__IndexInput, VpsPressureHistory__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { readPressureDetail, readPressureHistory, readPressurePage } from './vpsPressureOutput';
import type { PressureFilters } from './vpsPressureModels';

export async function fetchPressurePage(
  filters: PressureFilters & { offset: number; limit: number },
  signal?: AbortSignal
) {
  const params: VpsEvidence__IndexInput = { ...filters };
  return readPressurePage(await (await getApi()).vps_evidence.index({ params, signal }), filters);
}

export async function fetchPressureDetail(vpsId: number, signal?: AbortSignal) {
  return readPressureDetail(await (await getApi()).vps.evidence.index({ path: { vps_id: vpsId }, signal }), vpsId);
}

export async function fetchPressureHistory(vpsId: number, days: 7 | 30, signal?: AbortSignal) {
  const params: VpsPressureHistory__IndexInput = { vps: vpsId, days };
  return readPressureHistory(await (await getApi()).vps_pressure_history.index({ params, signal }), days);
}
