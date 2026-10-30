import type { Vps, VpsIncidentSettings, VpsIncidentStatus } from '../../../lib/api/vps';

export const INCIDENT_STATUSES: VpsIncidentStatus[] = ['clear', 'near_limit', 'warning', 'stop_threshold'];

export function hasIncidentSummary(vps: Vps): boolean {
  return typeof vps.incident_count_7d === 'number'
    && typeof vps.incident_policy === 'string' && vps.incident_policy.length > 0;
}

export function incidentStatus(value: string | null): VpsIncidentStatus | undefined {
  return INCIDENT_STATUSES.find(status => status === value);
}

export function incidentSettings(vps: Vps): VpsIncidentSettings {
  return {
    incident_policy: vps.incident_policy ?? '',
    incident_warning_limit_override: vps.incident_warning_limit_override ?? null,
    incident_stop_limit_override: vps.incident_stop_limit_override ?? null,
    incident_enforcement_enabled: vps.incident_enforcement_enabled === true,
  };
}

export function parseIncidentLimit(value: string): number | null | undefined {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

export function sameIncidentSettings(vps: Vps, settings: VpsIncidentSettings): boolean {
  return vps.incident_policy === settings.incident_policy
    && vps.incident_warning_limit_override === settings.incident_warning_limit_override
    && vps.incident_stop_limit_override === settings.incident_stop_limit_override
    && vps.incident_enforcement_enabled === settings.incident_enforcement_enabled;
}
