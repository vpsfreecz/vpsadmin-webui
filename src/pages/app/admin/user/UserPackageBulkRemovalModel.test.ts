import { describe, expect, it, vi } from 'vitest';
import { HaveApiError } from '../../../../lib/api/haveapi';
import { canBulkRemovePackage, packageRemovalTargets, removePackagesSequentially } from './UserPackageBulkRemovalModel';

const rows = [
  {
    id: 21,
    user: { id: 53, login: 'member', level: 1 },
    is_personal: false,
    cluster_resource_package: { id: 11, label: 'Standard' },
  },
  { id: 22, is_personal: false, cluster_resource_package: { id: 11, label: 'Standard' } },
  { id: 23, is_personal: true, cluster_resource_package: { id: 12, label: 'Personal' } },
];
const targets = rows.slice(0, 2).map((row) => ({ id: row.id, label: 'Standard', environment: 'Production' }));

describe('member package bulk removal', () => {
  it('selects exact assignment IDs, preserving repeated package definitions and deduplicating selections', () => {
    expect(packageRemovalTargets([...rows, rows[0]!], [21, 21, 22, 23, 999], 53).map((row) => row.id)).toEqual([
      21, 22,
    ]);
  });
  it('rejects personal, unknown-type and foreign-member assignments', () => {
    expect(canBulkRemovePackage(rows[2]!, 53)).toBe(false);
    expect(canBulkRemovePackage({ id: 1 }, 53)).toBe(false);
    expect(canBulkRemovePackage({ ...rows[0]!, user: { id: 99, login: 'foreign', level: 1 } }, 53)).toBe(false);
    expect(
      canBulkRemovePackage(
        { ...rows[0]!, cluster_resource_package: { id: 11, user: { id: 53, login: 'member', level: 1 } } },
        53
      )
    ).toBe(false);
  });
  it('records independent successes and reports progress without parallel writes', async () => {
    let active = 0;
    const remove = vi.fn(async () => {
      active += 1;
      expect(active).toBe(1);
      await Promise.resolve();
      active -= 1;
    });
    const progress = vi.fn();
    const outcomes = await removePackagesSequentially(targets, remove, progress);
    expect(outcomes.map((row) => row.status)).toEqual(['removed', 'removed']);
    expect(remove.mock.calls).toHaveLength(2);
    expect(progress.mock.calls).toEqual([[1], [2]]);
  });
  it('does not pretend a partial rejection rolled back earlier successes', async () => {
    const remove = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new HaveApiError({ status: false, message: 'Cannot remove' }));
    const outcomes = await removePackagesSequentially(targets, remove, vi.fn());
    expect(outcomes.map((row) => row.status)).toEqual(['removed', 'rejected']);
  });
  for (const error of [
    new TypeError('Network lost'),
    new HaveApiError({ status: false }, 'Server error', 503),
    new HaveApiError({ status: false }, 'Forbidden', 403),
  ]) {
    it(`stops after ${error.message} without attempting later assignments or retrying`, async () => {
      const remove = vi.fn().mockRejectedValue(error);
      const outcomes = await removePackagesSequentially(targets, remove, vi.fn());
      expect(remove).toHaveBeenCalledTimes(1);
      expect(outcomes[1]?.status).toBe('not_attempted');
      expect(outcomes[0]?.status).toBe(
        error instanceof HaveApiError && error.httpStatus === 403 ? 'rejected' : 'unknown'
      );
    });
  }
});
