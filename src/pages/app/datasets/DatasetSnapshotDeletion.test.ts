import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDatasets } from '../../../lib/api/datasets';
import { readSnapshotDeletionState, snapshotHasReferences } from './DatasetSnapshotDeletion';
vi.mock('../../../lib/api/datasets', () => ({ fetchDatasets: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
});
describe('snapshot deletion evidence', () => {
  it.each([
    [true, false, 'available'],
    [false, true, 'backups'],
    [true, true, 'backups'],
    [false, false, 'only_nas'],
  ])('checks exact primary=%s and backup=%s membership', async (primary, backup, expected) => {
    vi.mocked(fetchDatasets).mockImplementation(async (options) => ({
      envelope: { status: true },
      data: (options?.role === 'primary' ? primary : backup) ? [{ id: 10, name: 'NAS' }] : [],
    }));
    expect(await readSnapshotDeletionState(10)).toBe(expected);
    expect(fetchDatasets).toHaveBeenCalledWith({ subtree: 10, toDepth: 0, role: 'primary', limit: 1 });
    expect(fetchDatasets).toHaveBeenCalledWith({ subtree: 10, toDepth: 0, role: 'backup', limit: 1 });
  });
  it('never treats another dataset or a failed query as evidence', async () => {
    vi.mocked(fetchDatasets).mockResolvedValue({ envelope: { status: true }, data: [{ id: 99, name: 'other' }] });
    expect(await readSnapshotDeletionState(10)).toBe('unknown');
    vi.mocked(fetchDatasets).mockRejectedValue(new Error('read failed'));
    await expect(readSnapshotDeletionState(10)).rejects.toThrow('read failed');
  });
  it('recognizes known mount/export references without blocking unrelated snapshots', () => {
    expect(snapshotHasReferences({ id: 1, name: 'free' })).toBe(false);
    expect(snapshotHasReferences({ id: 1, name: 'mounted', mount: { id: 3 } })).toBe(true);
    expect(snapshotHasReferences({ id: 1, name: 'exported', export: { id: 4 } })).toBe(true);
  });
});
