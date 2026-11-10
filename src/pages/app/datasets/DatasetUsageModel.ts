export interface DatasetUsageValues {
  used?: number | null;
  referenced?: number | null;
  quota?: number | null;
  refquota?: number | null;
  avail?: number | null;
}

export interface DatasetUsageBreakdown {
  kind: 'reference' | 'quota';
  used: number | null;
  limit: number;
  free: number | null;
  ratio: number | null;
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null;
}

/** API storage values are MiB. refquota limits referenced bytes; quota includes descendants. */
export function datasetUsageBreakdown(values: DatasetUsageValues): DatasetUsageBreakdown[] {
  const result: DatasetUsageBreakdown[] = [];
  for (const [kind, measurement, rawLimit] of [
    ['reference', values.referenced, values.refquota],
    ['quota', values.used, values.quota],
  ] as const) {
    const limit = nonNegativeNumber(rawLimit);
    if (limit === null || limit <= 0) continue;
    const used = nonNegativeNumber(measurement);
    const ratio = used !== null && Number.isFinite(used / limit) ? used / limit : null;
    result.push({ kind, used, limit, free: used === null ? null : Math.max(0, limit - used), ratio });
  }
  return result;
}
