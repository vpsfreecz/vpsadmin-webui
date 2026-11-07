import { describe, expect, it } from 'vitest';
import { completeMountDatasetSnapshot, mountDatasetMatches, mountDatasetPage } from './mountDatasetPickerModel';
const root = { id: 10, name: 'root', full_name: 'tank/vps123' };
const child = { id: 2, name: 'data', full_name: 'tank/vps123/data', user: { id: 1 } };
describe('mount dataset candidates', () => {
  it('accepts only active owner subdatasets, not roots or prefix lookalikes', () => {
    expect(mountDatasetMatches(child, root, 1)).toBe(true);
    for (const invalid of [
      { ...child, id: 0 },
      { ...child, id: 10 },
      { ...child, user: { id: 2 } },
      { ...child, full_name: 'tank/vps1234/data' },
      { ...child, full_name: 'tank/remote' },
      { ...child, object_state: 'deleted' },
      { ...child, active: false },
    ])
      expect(mountDatasetMatches(invalid, root, 1)).toBe(false);
  });
  it('refuses incomplete or capped snapshots without a truthful count', () => {
    expect(completeMountDatasetSnapshot(3, 3)).toBe(true);
    expect(completeMountDatasetSnapshot(1000, 1000)).toBe(true);
    expect(completeMountDatasetSnapshot(1000, undefined)).toBe(false);
    expect(completeMountDatasetSnapshot(3, 1001)).toBe(false);
    expect(completeMountDatasetSnapshot(3, -1)).toBe(false);
    expect(completeMountDatasetSnapshot(3, undefined)).toBe(true);
  });
  it('pages alphabetically without dropping lower IDs and resets out-of-range pages', () => {
    const rows = Array.from({ length: 27 }, (_, i) => ({
      ...child,
      id: 50 - i,
      full_name: `tank/vps123/data-${String(i).padStart(2, '0')}`,
    }));
    expect(mountDatasetPage(rows, '', 0).items).toHaveLength(25);
    expect(mountDatasetPage(rows, '', 1).items.map((d) => d.id)).toEqual([25, 24]);
    expect(mountDatasetPage(rows, 'DATA-26', 50)).toMatchObject({ currentPage: 0, pages: 1, items: [rows[26]] });
  });
});
