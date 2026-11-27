/** Application narrowing of the API's versioned Custom manifest, not SDK inputs. */
export interface SnapshotRemovalManifest {
  root_dataset_id: number;
  options: { recursive: boolean; disable_plans: boolean };
  datasets: Array<{
    id: number; parent_id: number | null; user_id: number; name: string;
    full_name: string; current_history_id: number;
  }>;
  copies: Array<{
    id: number; dataset_id: number; pool_id: number; pool_label: string;
    pool_role: 'primary' | 'hypervisor' | 'backup'; pool_filesystem: string;
    pool_open: boolean; node_id: number; node_name: string;
  }>;
  snapshot_locations: Array<{
    snapshot_id: number; snapshot_name: string; snapshot_label: string | null;
    created_at: string | null; history_id: number; dataset_in_pool_id: number;
    snapshot_in_pool_id: number; snapshot_in_pool_in_branch_id: number | null;
    branch_id: number | null; origin_snapshot_in_pool_in_branch_id: number | null;
  }>;
  trees: Array<{ id: number; dataset_in_pool_id: number; name: string; head: boolean }>;
  branches: Array<{ id: number; dataset_tree_id: number; name: string; head: boolean }>;
  plans: Array<{
    id: number; dataset_in_pool_id: number; environment_dataset_plan_id: number;
    dataset_plan_id: number; name: string; action: 'remove' | 'retain';
  }>;
  counts: {
    datasets: number; copies: number; snapshots: number; snapshot_locations: number;
    trees: number; branches: number; plans: number; plans_to_disable: number;
  };
}

export interface SnapshotRemovalPreview {
  manifest_version: 1;
  manifest_digest: string;
  manifest: SnapshotRemovalManifest;
}

type Row = Record<string, unknown>;
const record = (v: unknown): v is Row => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const id = (v: unknown): v is number => integer(v) && v > 0;
const nullableId = (v: unknown) => v === null || id(v);
const string = (v: unknown) => typeof v === 'string';
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error('Invalid snapshot removal inventory');
}
function rowFields(v: unknown, ids: string[], strings: string[], numbers: string[] = []): v is Row {
  return record(v) && ids.every(key => id(v[key])) && strings.every(key => string(v[key]))
    && numbers.every(key => integer(v[key]));
}
function collection(v: unknown, valid: (v: unknown) => boolean): asserts v is Row[] {
  requireValid(Array.isArray(v) && v.every(valid));
}
function uniqueIds(rows: Array<{ id: number }>) {
  requireValid(new Set(rows.map(row => row.id)).size === rows.length);
}

/** Validate completeness at the Custom boundary; storage safety remains server-owned. */
export function parseSnapshotRemovalPreview(value: unknown): SnapshotRemovalPreview {
  requireValid(record(value) && value['manifest_version'] === 1
    && typeof value['manifest_digest'] === 'string' && /^v1:[a-f0-9]{64}$/.test(value['manifest_digest']));
  const m = value['manifest'];
  requireValid(record(m) && id(m['root_dataset_id']) && record(m['options'])
    && typeof m['options']['recursive'] === 'boolean' && typeof m['options']['disable_plans'] === 'boolean');
  collection(m['datasets'], v => rowFields(v, ['id', 'user_id'], ['name', 'full_name'], ['current_history_id']) && nullableId(v['parent_id']));
  collection(m['copies'], v => rowFields(v, ['id', 'dataset_id', 'pool_id', 'node_id'], ['pool_label', 'pool_filesystem', 'node_name'])
    && typeof v['pool_role'] === 'string' && ['primary', 'hypervisor', 'backup'].includes(v['pool_role']) && typeof v['pool_open'] === 'boolean');
  collection(m['snapshot_locations'], v => rowFields(v, ['snapshot_id', 'dataset_in_pool_id', 'snapshot_in_pool_id'], ['snapshot_name'], ['history_id'])
    && (v['snapshot_label'] === null || string(v['snapshot_label']))
    && (v['created_at'] === null || (typeof v['created_at'] === 'string'
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(v['created_at']) && Number.isFinite(Date.parse(v['created_at']))))
    && ['snapshot_in_pool_in_branch_id', 'branch_id', 'origin_snapshot_in_pool_in_branch_id'].every(key => nullableId(v[key])));
  collection(m['trees'], v => rowFields(v, ['id', 'dataset_in_pool_id'], ['name']) && typeof v['head'] === 'boolean');
  collection(m['branches'], v => rowFields(v, ['id', 'dataset_tree_id'], ['name']) && typeof v['head'] === 'boolean');
  collection(m['plans'], v => rowFields(v, ['id', 'dataset_in_pool_id', 'environment_dataset_plan_id', 'dataset_plan_id'], ['name'])
    && (v['action'] === 'remove' || v['action'] === 'retain'));
  const counts = m['counts'];
  requireValid(record(counts) && ['datasets', 'copies', 'snapshots', 'snapshot_locations', 'trees', 'branches', 'plans', 'plans_to_disable']
    .every(key => integer(counts[key])));
  // All fields have been checked before this narrowing. Never drop invalid rows.
  const manifest = m as unknown as SnapshotRemovalManifest;
  for (const rows of [manifest.datasets, manifest.copies, manifest.trees, manifest.branches, manifest.plans]) uniqueIds(rows);
  const datasets = new Map(manifest.datasets.map(row => [row.id, row]));
  const copies = new Map(manifest.copies.map(row => [row.id, row]));
  const trees = new Map(manifest.trees.map(row => [row.id, row]));
  const branches = new Map(manifest.branches.map(row => [row.id, row]));
  requireValid(datasets.has(manifest.root_dataset_id));
  requireValid(manifest.copies.every(row => datasets.has(row.dataset_id)));
  requireValid(manifest.trees.every(row => copies.has(row.dataset_in_pool_id)));
  requireValid(manifest.branches.every(row => trees.has(row.dataset_tree_id)));
  requireValid(manifest.plans.every(row => copies.has(row.dataset_in_pool_id)
    && row.action === (manifest.options.disable_plans ? 'remove' : 'retain')));
  const membershipIds = new Set<number>();
  const sourceIds = new Set<number>();
  for (const row of manifest.snapshot_locations) {
    const copy = copies.get(row.dataset_in_pool_id);
    requireValid(copy);
    if (copy.pool_role === 'backup') {
      requireValid(row.snapshot_in_pool_in_branch_id !== null && row.branch_id !== null);
      requireValid(!membershipIds.has(row.snapshot_in_pool_in_branch_id));
      membershipIds.add(row.snapshot_in_pool_in_branch_id);
      const branch = branches.get(row.branch_id);
      requireValid(branch && trees.get(branch.dataset_tree_id)?.dataset_in_pool_id === copy.id);
    } else {
      requireValid(row.snapshot_in_pool_in_branch_id === null && row.branch_id === null
        && row.origin_snapshot_in_pool_in_branch_id === null && !sourceIds.has(row.snapshot_in_pool_id));
      sourceIds.add(row.snapshot_in_pool_id);
    }
  }
  requireValid(manifest.snapshot_locations.every(row => row.origin_snapshot_in_pool_in_branch_id === null
    || membershipIds.has(row.origin_snapshot_in_pool_in_branch_id)));
  for (const key of ['datasets', 'copies', 'snapshot_locations', 'trees', 'branches', 'plans'] as const) {
    requireValid(manifest.counts[key] === manifest[key].length);
  }
  requireValid(manifest.counts.snapshots === new Set(manifest.snapshot_locations.map(row => row.snapshot_id)).size);
  requireValid(manifest.counts.plans_to_disable === manifest.plans.filter(row => row.action === 'remove').length);
  return { manifest_version: 1, manifest_digest: value['manifest_digest'], manifest };
}
