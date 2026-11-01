import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type { Node__CreateInput, Node__UpdateInput, ActionDescription } from 'vpsadmin-typescript-client';
import type {
  Node__EvacuateOutput,
  Node__IndexOutput,
  Node__Status__IndexOutput,
  Pool__IndexOutput,
} from 'vpsadmin-typescript-client';
import type { Node__IndexInput, Node__Status__IndexInput, Pool__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import { HaveApiError, ClientInputError, isAmbiguousMutationError } from './apiErrors';

export type Node = Omit<Node__IndexOutput[number], 'id' | 'location'> & {
  id: number;
  location?: OperationsReference | null;
  vps_running?: number | null;
  vps_stopped?: number | null;
  vps_total?: number | null;
  vps_free?: number | null;
  [k: string]: unknown;
};

export type NodeStatus = Omit<Node__Status__IndexOutput[number], 'id'> & { id: number; [k: string]: unknown };

export type NodeEvacuateResult = Node__EvacuateOutput & { [k: string]: unknown };

export type NodePool = Omit<Pool__IndexOutput[number], 'id' | 'node'> & {
  id: number;
  node?: OperationsReference | null;
  [k: string]: unknown;
};

export type NodeCreateInput = Node__CreateInput;

export type NodeUpdateInput = Omit<Node__UpdateInput, 'type' | 'location'>;

export type NodeCreateCapacityField = 'cpus' | 'total_memory' | 'total_swap';

export interface NodeWriteCapabilityDescription {
  input?: {
    parameters?: Record<string, unknown>;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

export interface NodeCreateCapacityRequirements {
  cpus: boolean;
  total_memory: boolean;
  total_swap: boolean;
}

export type NodeNullableUpdateField = 'max_tx' | 'max_rx' | 'max_vps';
export type NodeUpdateNullability = Record<NodeNullableUpdateField, boolean>;

const NODE_CREATE_CAPACITY_FIELDS: readonly NodeCreateCapacityField[] = [
  'cpus',
  'total_memory',
  'total_swap'];

/** Read requiredness from the effective OPTIONS contract of the deployed API. */
export function nodeCreateCapacityRequirements(
  capability: NodeWriteCapabilityDescription | undefined
): NodeCreateCapacityRequirements {
  const parameters = capability?.input?.parameters;
  const result: NodeCreateCapacityRequirements = {
    cpus: false,
    total_memory: false,
    total_swap: false,
  };

  for (const field of NODE_CREATE_CAPACITY_FIELDS) {
    const descriptor = parameters?.[field];
    result[field] = Boolean(
      descriptor
      && typeof descriptor === 'object'
      && isOperationsRecord(descriptor) && descriptor['required'] === true
    );
  }
  return result;
}

/** The saved generated contract restricts these limits to numbers, even if newer live metadata expands it. */
export function nodeUpdateNullability(
  capability: NodeWriteCapabilityDescription | undefined
): NodeUpdateNullability {
  void capability;
  return {
    max_tx: false,
    max_rx: false,
    max_vps: false };
}

/**
 * Node creation is not idempotent. A lost response or HTTP 5xx can therefore
 * mean that the node was already registered. Callers must refresh and verify
 * the node list before another POST is enabled.
 */
export class NodeCreateIndeterminateError extends Error {
  readonly originalError: unknown;

  constructor(originalError: unknown) {
    super('The node create result is unknown; refresh and verify the node list before retrying.');
    this.name = 'NodeCreateIndeterminateError';
    this.originalError = originalError;
  }
}

// Nodes (admin)

export async function fetchNodes(
  opts: {
    limit?: number;
    fromId?: number;
    state?: 'all' | 'active' | 'inactive';
    location?: number;
    type?: string;
    hypervisorType?: string;
    includes?: string;
  } = {}
) {
  const params: Node__IndexInput = {};
  if (opts.limit !== undefined) params['limit'] = opts.limit;
  if (opts.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts.state) params['state'] = opts.state;
  if (opts.location !== undefined) params['location'] = opts.location;
  if (opts.type) params['type'] = opts.type;
  if (opts.hypervisorType) params['hypervisor_type'] = opts.hypervisorType;

  const res = await (
    await getApi()
  ).node.index({ params,
    meta: opts.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(res, narrowNodeList, 'nodes');
}

/** Admin-only enrichment; preserves the paginated Node.Index inventory. */
export async function fetchNodeOverview(signal?: AbortSignal) {
  const res = await (await getApi()).node.overview_list({ signal });
  return narrowApiResult(res, narrowNodeList, 'nodes/overview_list');
}

export async function fetchNodeMaintenanceCapability(nodeId: number) {
  return narrowApiResult(
    await (await getApi()).node.set_maintenance.describe({ path: { node_id: nodeId } }),
    narrowNodeCapability,
    'node capability'
  );
}

export async function fetchNode(nodeId: number) {
  return narrowApiResult(await (await getApi()).node.show({ path: { node_id: nodeId } }), narrowNode, 'node.show');
}

/**
 * HaveAPI exposes per-action authorization and the effective input contract
 * through OPTIONS. Keep write controls fail-closed when this probe is denied
 * or unavailable instead of showing a form that cannot be submitted.
 */
export async function fetchNodeCreateCapability() {
  return narrowApiResult(await (await getApi()).node.create.describe(), narrowNodeCapability, 'node capability');
}

export async function fetchNodeUpdateCapability(nodeId: number) {
  return narrowApiResult(
    await (await getApi()).node.update.describe({ path: { node_id: nodeId } }),
    narrowNodeCapability,
    'node capability'
  );
}

export async function createNode(payload: NodeCreateInput) {
  try {
    return narrowApiResult(await (await getApi()).node.create({ params: { ...payload } }), narrowNode, 'node.create');
  } catch (error) {
    if (error instanceof ClientInputError || (error instanceof HaveApiError && !isAmbiguousMutationError(error)))
      throw error;
    throw new NodeCreateIndeterminateError(error);
  }
}

export async function updateNode(nodeId: number, payload: NodeUpdateInput) {
  return (await getApi()).node.update({ path: { node_id: nodeId }, params: { ...payload } });
}

export async function fetchNodePools(nodeId: number, opts?: { limit?: number; signal?: AbortSignal }) {
  const params: Pool__IndexInput = { node: nodeId };
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (await getApi()).pool.index({ params, signal: opts?.signal });

  return narrowApiResult(res, narrowNodePoolList, 'node pools');
}

export async function fetchPool(poolId: number, opts?: { signal?: AbortSignal }) {
  const res = await (await getApi()).pool.show({ path: { pool_id: poolId }, signal: opts?.signal });
  return narrowApiResult(
    res,
    (data) => {
      const pool = narrowNodePool(data);
      if (pool.id !== poolId) throw new TypeError('response id does not match requested pool');
      return pool;
    },
    'pool'
  );
}

export async function setPoolMaintenance(poolId: number, opts: { lock: boolean; reason?: string }) {
  return (await getApi()).pool.set_maintenance({
    path: { pool_id: poolId },
    params: { lock: opts.lock, reason: opts.reason },
  });
}

export async function setNodeMaintenance(nodeId: number, opts: { lock: boolean; reason?: string }) {
  return (await getApi()).node.set_maintenance({
    path: { node_id: nodeId },
    params: { lock: opts.lock, reason: opts.reason },
  });
}

export async function evacuateNode(
  nodeId: number,
  opts: {
    dst_node: number;
    stop_on_error?: boolean;
    maintenance_window?: boolean;
    concurrency?: number;
    cleanup_data?: boolean;
    send_mail?: boolean;
    reason?: string;
  }
) {
  return narrowApiResult(
    await (await getApi()).node.evacuate({ path: { node_id: nodeId }, params: opts }),
    narrowNodeEvacuateResult,
    'node.evacuate'
  );
}

export async function fetchNodeStatuses(
  nodeId: number,
  opts?: { limit?: number; fromId?: number; from?: string; to?: string }
) {
  const params: Node__Status__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.from) params['from'] = opts.from;
  if (opts?.to) params['to'] = opts.to;

  const res = await (await getApi()).node.status.index({ path: { node_id: nodeId }, params });
  return narrowApiResult(res, narrowNodeStatusList, `nodes/${nodeId}/statuses`);
}

function isNode(value: unknown): value is Node {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    [
      'cgroup_version',
      'domain_name',
      'fqdn',
      'hypervisor_type',
      'ip_addr',
      'kernel',
      'maintenance_lock',
      'maintenance_lock_reason',
      'name',
      'pool_checked_at',
      'pool_scan',
      'pool_state',
      'type',
      'version',
    ].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    [
      'arc_c',
      'arc_c_max',
      'arc_hitpercent',
      'arc_size',
      'cpu_guest',
      'cpu_idle',
      'cpu_iowait',
      'cpu_irq',
      'cpu_nice',
      'cpu_softirq',
      'cpu_system',
      'cpu_user',
      'cpus',
      'loadavg1',
      'loadavg15',
      'loadavg5',
      'max_rx',
      'max_tx',
      'max_vps',
      'pool_scan_percent',
      'process_count',
      'total_memory',
      'total_swap',
      'uptime',
      'used_memory',
      'used_swap',
      'vps_running',
      'vps_stopped',
      'vps_total',
      'vps_free',
    ].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['active', 'pool_status', 'status'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean'
    ) &&
    ['location'].every((key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key]))
  );
}
function narrowNode(value: unknown): Node {
  if (!isNode(value)) throw new TypeError('Invalid Node fields');
  return value;
}
function narrowNodeList(value: unknown): Node[] {
  if (!Array.isArray(value)) throw new TypeError('Expected Node list');
  return value.map(narrowNode);
}

function isNodeStatus(value: unknown): value is NodeStatus {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['cgroup_version', 'created_at', 'kernel', 'version'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    [
      'arc_c',
      'arc_c_max',
      'arc_hitpercent',
      'arc_size',
      'cpu_guest',
      'cpu_idle',
      'cpu_iowait',
      'cpu_irq',
      'cpu_nice',
      'cpu_softirq',
      'cpu_system',
      'cpu_user',
      'cpus',
      'loadavg1',
      'loadavg15',
      'loadavg5',
      'process_count',
      'total_memory',
      'total_swap',
      'uptime',
      'used_memory',
      'used_swap',
    ].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function narrowNodeStatus(value: unknown): NodeStatus {
  if (!isNodeStatus(value)) throw new TypeError('Invalid NodeStatus fields');
  return value;
}
function narrowNodeStatusList(value: unknown): NodeStatus[] {
  if (!Array.isArray(value)) throw new TypeError('Expected NodeStatus list');
  return value.map(narrowNodeStatus);
}

function isNodeEvacuateResult(value: unknown): value is NodeEvacuateResult {
  return (
    isOperationsRecord(value) &&
    ['migration_plan_id'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function narrowNodeEvacuateResult(value: unknown): NodeEvacuateResult {
  if (!isNodeEvacuateResult(value)) throw new TypeError('Invalid NodeEvacuateResult fields');
  return value;
}
function isNodePool(value: unknown): value is NodePool {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    [
      'checked_at',
      'filesystem',
      'label',
      'maintenance_lock',
      'maintenance_lock_reason',
      'name',
      'role',
      'scan',
      'sharenfs',
      'state',
      'sync',
    ].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    [
      'avail',
      'available_space',
      'compressratio',
      'max_datasets',
      'quota',
      'recordsize',
      'refcompressratio',
      'referenced',
      'refquota',
      'scan_percent',
      'total_space',
      'used',
      'used_space',
    ].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['atime', 'compression', 'is_open', 'refquota_check', 'relatime'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean'
    ) &&
    ['node'].every((key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key]))
  );
}
function narrowNodePool(value: unknown): NodePool {
  if (!isNodePool(value)) throw new TypeError('Invalid NodePool fields');
  return value;
}
function narrowNodePoolList(value: unknown): NodePool[] {
  if (!Array.isArray(value)) throw new TypeError('Expected NodePool list');
  return value.map(narrowNodePool);
}

function narrowNodeCapability(value: ActionDescription): NodeWriteCapabilityDescription {
  if (!isOperationsRecord(value)) throw new TypeError('Invalid node capability');
  const input = value['input'];
  if (input === undefined || input === null) throw new TypeError('Missing node capability input');
  if (!isOperationsRecord(input)) throw new TypeError('Invalid node capability input');
  const parameters = input['parameters'];
  if (parameters === undefined || parameters === null) throw new TypeError('Missing node capability parameters');
  if (!isOperationsRecord(parameters)) throw new TypeError('Invalid node capability parameters');
  for (const descriptor of Object.values(parameters)) {
    if (
      !isOperationsRecord(descriptor) ||
      ['required', 'nullable', 'protected'].some(
        (key) => descriptor[key] != null && typeof descriptor[key] !== 'boolean'
      )
    )
      throw new TypeError('Invalid node parameter description');
  }
  return { ...value, input: { ...input, parameters } };
}
