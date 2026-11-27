import { describe, expect, it } from 'vitest';
import { snapshotRemovalFixture } from '../../test/snapshotRemoval';
import { parseSnapshotRemovalPreview } from './datasetSnapshotRemovalManifest';
import serializedPreview from '../../test/fixtures/snapshot-removal-preview.json';

describe('complete snapshot removal Custom manifest boundary', () => {
  it('accepts the actual backend endpoint serialization without a preview task receipt', () => {
    const parsed = parseSnapshotRemovalPreview(serializedPreview.response.dataset);
    expect(parsed.manifest.root_dataset_id).toBe(78);
    expect(parsed.manifest.counts).toMatchObject({ snapshots: 1, snapshot_locations: 2, trees: 1, branches: 1 });
    expect(serializedPreview.response._meta).toEqual({});
  });
  it('retains every location and empty/historical structure, with external parent allowed', () => {
    const input = snapshotRemovalFixture({ recursive: true, disable_plans: false }, 125);
    const parsed = parseSnapshotRemovalPreview(input);
    expect(parsed.manifest.snapshot_locations).toHaveLength(127);
    expect(parsed.manifest.counts).toMatchObject({ snapshots: 125, snapshot_locations: 127, trees: 2, branches: 3, plans_to_disable: 0 });
    expect(parsed.manifest.snapshot_locations.filter(row => row.snapshot_id === 1)).toHaveLength(3);
    expect(parsed.manifest.datasets[0]?.parent_id).toBe(1);
    expect(parsed.manifest.trees[1]?.name).toBe('tree.1-empty');
  });
  it.each([0, 1, 2, 4, 5, 11])('accepts a complete inventory with %i logical snapshots', count => {
    expect(parseSnapshotRemovalPreview(snapshotRemovalFixture(undefined, count)).manifest.counts.snapshots).toBe(count);
  });
  it.each([
    ['version', (v: ReturnType<typeof snapshotRemovalFixture>) => { v.manifest_version = 2 as never; }],
    ['digest', v => { v.manifest_digest = 'not-a-digest'; }],
    ['missing required collection', v => { delete (v.manifest as Partial<typeof v.manifest>).trees; }],
    ['partial count', v => { v.manifest.snapshot_locations.pop(); }],
    ['logical count', v => { v.manifest.counts.snapshots += 1; }],
    ['plan count', v => { v.manifest.counts.plans_to_disable = 0; }],
    ['duplicate dataset', v => { v.manifest.datasets.push(v.manifest.datasets[0]!); v.manifest.counts.datasets += 1; }],
    ['duplicate membership', v => { v.manifest.snapshot_locations.push(v.manifest.snapshot_locations[2]!); v.manifest.counts.snapshot_locations += 1; }],
    ['duplicate source copy', v => { v.manifest.snapshot_locations.push(v.manifest.snapshot_locations[0]!); v.manifest.counts.snapshot_locations += 1; }],
    ['missing root', v => { v.manifest.root_dataset_id = 999; }],
    ['missing copy dataset', v => { v.manifest.copies[0]!.dataset_id = 999; }],
    ['missing location copy', v => { v.manifest.snapshot_locations[0]!.dataset_in_pool_id = 999; }],
    ['missing tree copy', v => { v.manifest.trees[0]!.dataset_in_pool_id = 999; }],
    ['missing branch tree', v => { v.manifest.branches[0]!.dataset_tree_id = 999; }],
    ['missing plan copy', v => { v.manifest.plans[0]!.dataset_in_pool_id = 999; }],
    ['wrong plan effect', v => { v.manifest.plans[0]!.action = 'retain'; }],
    ['missing membership branch', v => { v.manifest.snapshot_locations[2]!.branch_id = 999; }],
    ['missing origin membership', v => { v.manifest.snapshot_locations[3]!.origin_snapshot_in_pool_in_branch_id = 999; }],
    ['omitted null', v => { delete (v.manifest.datasets[0] as Partial<typeof v.manifest.datasets[number]>).parent_id; }],
    ['wrong primitive', v => { v.manifest.copies[0]!.pool_open = 'true' as never; }],
    ['invalid ID', v => { v.manifest.datasets[0]!.id = 0; }],
    ['invalid count', v => { v.manifest.counts.copies = 2.5; }],
    ['invalid timestamp', v => { v.manifest.snapshot_locations[0]!.created_at = 'yesterday'; }],
  ] satisfies Array<[string, (value: ReturnType<typeof snapshotRemovalFixture>) => void]>)('rejects %s without skipping rows', (_name, corrupt) => {
    const input = snapshotRemovalFixture();
    corrupt(input);
    expect(() => parseSnapshotRemovalPreview(input)).toThrow();
  });
});
