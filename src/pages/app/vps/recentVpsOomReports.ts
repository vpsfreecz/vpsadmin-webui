import type { OomReport } from '../../../lib/api/oom';

export const RECENT_OOM_WINDOW_MS = 24 * 60 * 60 * 1000;
export const RECENT_OOM_LIMIT = 100;

// Only a dated report for this VPS is evidence. A usage ratio is not pressure.
export function recentVpsOomReports(reports: OomReport[] | undefined, nowMs: number): ReadonlyMap<number, OomReport> {
  const latest = new Map<number, OomReport>();
  for (const report of reports ?? []) {
    const vpsId = report.vps?.id;
    const at = Date.parse(report.created_at ?? '');
    if (!Number.isSafeInteger(report.id) || report.id <= 0 || !Number.isSafeInteger(vpsId) || !vpsId || vpsId <= 0)
      continue;
    if (!Number.isFinite(at) || at > nowMs || nowMs - at > RECENT_OOM_WINDOW_MS) continue;
    const previous = latest.get(vpsId);
    if (!previous || at > Date.parse(previous.created_at ?? '')) latest.set(vpsId, report);
  }
  return latest;
}
