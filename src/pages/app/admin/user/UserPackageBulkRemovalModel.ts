import type { UserClusterResourcePackage } from '../../../../lib/api/clusterResourcePackages';
import { HaveApiError, isAmbiguousMutationError } from '../../../../lib/api/haveapi';

export interface PackageRemovalTarget {
  id: number;
  label: string;
  environment: string;
}
export interface PackageRemovalOutcome extends PackageRemovalTarget {
  status: 'removed' | 'rejected' | 'unknown' | 'not_attempted';
  error?: unknown;
}

export function canBulkRemovePackage(row: UserClusterResourcePackage, userId: number): boolean {
  if (!Number.isSafeInteger(row.id) || row.id <= 0) return false;
  if (row.user?.id !== undefined && row.user.id !== userId) return false;
  const pkg = row.cluster_resource_package;
  if (row.is_personal === true || pkg?.is_personal === true || pkg?.user) return false;
  return row.is_personal === false || pkg?.is_personal === false || pkg?.user === null;
}

export function packageRemovalTargets(
  rows: UserClusterResourcePackage[],
  ids: Iterable<number>,
  userId: number
): PackageRemovalTarget[] {
  const selected = new Set(ids);
  const seen = new Set<number>();
  const targets: PackageRemovalTarget[] = [];
  for (const row of rows) {
    if (!selected.has(row.id) || seen.has(row.id) || !canBulkRemovePackage(row, userId)) continue;
    seen.add(row.id);
    targets.push({
      id: row.id,
      label: row.cluster_resource_package?.label || row.label || `#${row.cluster_resource_package?.id ?? row.id}`,
      environment: row.environment?.label || row.cluster_resource_package?.environment?.label || '—',
    });
  }
  return targets;
}

/** DELETE is synchronous; never replay an unknown result or treat the batch as atomic. */
export async function removePackagesSequentially(
  targets: readonly PackageRemovalTarget[],
  remove: (id: number) => Promise<unknown>,
  onProgress: (completed: number) => void
): Promise<PackageRemovalOutcome[]> {
  const results: PackageRemovalOutcome[] = [];
  let stop = false;
  for (const target of targets) {
    if (stop) {
      results.push({ ...target, status: 'not_attempted' });
      continue;
    }
    try {
      await remove(target.id);
      results.push({ ...target, status: 'removed' });
    } catch (error) {
      const unknown = isAmbiguousMutationError(error);
      results.push({ ...target, status: unknown ? 'unknown' : 'rejected', error });
      stop = unknown || (error instanceof HaveApiError && (error.httpStatus === 401 || error.httpStatus === 403));
    }
    onProgress(results.length);
  }
  return results;
}
