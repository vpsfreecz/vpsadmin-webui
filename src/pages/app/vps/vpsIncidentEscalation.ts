import type { VpsIncidentStatus } from '../../../lib/api/vps';

export const INCIDENT_STATUSES: VpsIncidentStatus[] = ['clear', 'near_limit', 'warning', 'stop_threshold'];
export function incidentStatus(value: string | null): VpsIncidentStatus | undefined {
  return INCIDENT_STATUSES.find((status) => status === value);
}
export function parseIncidentLimit(value: string): number | null | undefined {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}
