import type { SnapshotRemovalPreview } from '../lib/api/datasetSnapshotRemovalManifest';

export function snapshotRemovalDescription() {
  return { resources: { dataset: { actions: {
    preview_snapshot_removal: {
      method: 'POST', blocking: false,
      input: { parameters: { recursive: { type: 'Boolean' }, disable_plans: { type: 'Boolean' } } },
      output: { parameters: { manifest_version: { type: 'Integer' }, manifest_digest: { type: 'String' }, manifest: { type: 'Custom' } } },
    },
    remove_snapshots: {
      method: 'POST', blocking: true,
      input: { parameters: { recursive: { type: 'Boolean' }, disable_plans: { type: 'Boolean' }, manifest_digest: { type: 'String', required: true } } },
    },
  } } } };
}

/** Synthetic complete v1 inventory. This fixture does not certify storage behavior. */
export function snapshotRemovalFixture(options = { recursive: false, disable_plans: true }, count = 2): SnapshotRemovalPreview {
  const datasets = [{ id: 42, parent_id: 1, user_id: 1, name: 'root', full_name: 'synthetic/root', current_history_id: 3 }];
  const copies = [
    { id: 100, dataset_id: 42, pool_id: 1, pool_label: 'Primary', pool_role: 'hypervisor' as const, pool_filesystem: 'tank/vps', pool_open: true, node_id: 1, node_name: 'node1' },
    { id: 200, dataset_id: 42, pool_id: 2, pool_label: 'Backup', pool_role: 'backup' as const, pool_filesystem: 'tank/backup', pool_open: false, node_id: 2, node_name: 'node2' },
  ];
  if (options.recursive) {
    datasets.push({ id: 43, parent_id: 42, user_id: 1, name: 'data', full_name: 'synthetic/root/data', current_history_id: 0 });
    copies.push({ id: 300, dataset_id: 43, pool_id: 1, pool_label: 'Primary', pool_role: 'hypervisor', pool_filesystem: 'tank/vps', pool_open: true, node_id: 1, node_name: 'node1' });
  }
  const snapshot_locations = Array.from({ length: count }, (_, i) => ({
    snapshot_id: i + 1, snapshot_name: `snapshot-${i + 1}`, snapshot_label: i === 0 ? 'Shared historical snapshot' : null,
    created_at: '2026-11-26T12:00:00Z', history_id: 1, dataset_in_pool_id: 100, snapshot_in_pool_id: i + 1,
    snapshot_in_pool_in_branch_id: null as number | null, branch_id: null as number | null,
    origin_snapshot_in_pool_in_branch_id: null as number | null,
  }));
  // Same logical snapshot is visible in both backups and in two memberships.
  if (count > 0) for (const membership of [501, 502]) snapshot_locations.push({
    ...snapshot_locations[0]!, dataset_in_pool_id: 200, snapshot_in_pool_id: 400,
    snapshot_in_pool_in_branch_id: membership, branch_id: membership === 501 ? 11 : 12,
    origin_snapshot_in_pool_in_branch_id: membership === 501 ? null : 501,
  });
  return {
    manifest_version: 1, manifest_digest: `v1:${'a'.repeat(64)}`,
    manifest: {
      root_dataset_id: 42, options: { ...options }, datasets, copies, snapshot_locations,
      trees: [
        { id: 10, dataset_in_pool_id: 200, name: 'tree.0', head: false },
        { id: 20, dataset_in_pool_id: 200, name: 'tree.1-empty', head: true },
      ],
      branches: [
        { id: 11, dataset_tree_id: 10, name: 'branch.0', head: false },
        { id: 12, dataset_tree_id: 10, name: 'branch.1', head: true },
        { id: 21, dataset_tree_id: 20, name: 'branch.empty', head: true },
      ],
      plans: [{ id: 31, dataset_in_pool_id: 100, environment_dataset_plan_id: 41, dataset_plan_id: 51, name: 'Daily backup', action: options.disable_plans ? 'remove' : 'retain' }],
      counts: { datasets: datasets.length, copies: copies.length, snapshots: count, snapshot_locations: snapshot_locations.length, trees: 2, branches: 3, plans: 1, plans_to_disable: options.disable_plans ? 1 : 0 },
    },
  };
}
