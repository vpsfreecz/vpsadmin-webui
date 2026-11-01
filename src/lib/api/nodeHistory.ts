import type {
  Node__KernelHistory__IndexOutput,
  NodeSystemState__IndexOutput,
  NodeKernelParameter__IndexOutput,
  NodeSysctl__IndexOutput,
  NodeSoftwareVersion__IndexOutput,
  NodeKernelEvidence__IndexOutput,
} from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

export type KernelHistoryEvent = Omit<Node__KernelHistory__IndexOutput[number], 'id'> & {
  id: number };
export type NodeSystemState = Omit<NodeSystemState__IndexOutput[number], 'id'> & {
  id: number };
export type KernelParameter = Omit<NodeKernelParameter__IndexOutput[number], 'id'> & { id: number };
export type NodeSysctl = Omit<NodeSysctl__IndexOutput[number], 'id'> & {
  id: number };
export type NodeSoftwareVersion = Omit<NodeSoftwareVersion__IndexOutput[number], 'id'> & {
  id: number };
export type KernelEvidence = Omit<NodeKernelEvidence__IndexOutput[number], 'id'> & { id: number };

export interface NodeHistoryPageOptions { fromId?: number; signal?: AbortSignal;
}
export const NODE_HISTORY_PAGE_SIZE = 50;

/** History views keep absent/null observations; only rendered entity identity is mandatory. */
function historyRows<T extends { id?: number | null }>(data: T[]): Array<T & { id: number }> {
  if (!Array.isArray(data)) throw new TypeError('Expected node history list');
  return data.map((value) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      typeof value.id !== 'number' ||
      !Number.isSafeInteger(value.id) ||
      value.id <= 0
    )
      throw new TypeError('Invalid node history identity');
    for (const [key, field] of Object.entries(value)) {
      if (field == null || key === '_meta') continue;
      if (['current', 'available', 'revision_dirty'].includes(key)) {
        if (typeof field !== 'boolean') throw new TypeError('Invalid node history flag');
      } else if (['id', 'cpus', 'total_memory', 'total_swap', 'position'].includes(key)) {
        if (typeof field !== 'number' || !Number.isFinite(field)) throw new TypeError('Invalid node history number');
      } else if (
        [
          'event_type',
          'livepatch_action',
          'booted_release',
          'reported_release',
          'effective_at',
          'observed_after',
          'observed_before',
          'source',
          'confidence',
          'cgroup_version',
          'first_observed_at',
          'last_observed_at',
          'name',
          'value',
          'configured_value',
          'effective_value',
          'generation',
          'component',
          'version',
          'revision',
          'kernel_command_line',
          'observed_at',
        ].includes(key) &&
        typeof field !== 'string'
      )
        throw new TypeError('Invalid node history text');
    }
    return { ...value, id: value.id };
  });
}

export async function fetchNodeKernelHistory(nodeId: number, options: NodeHistoryPageOptions = {}) {
  const result = await (
    await getApi()
  ).node.kernel_history.index({
    path: { node_id: nodeId },
    params: { limit: NODE_HISTORY_PAGE_SIZE, from_id: options.fromId },
    signal: options.signal,
  });
  const rows = narrowApiResult(result, historyRows, 'node history').data;
  return rows;
}

export async function fetchNodeSystemHistory(nodeId: number, options: NodeHistoryPageOptions = {}) {
  const result = await (
    await getApi()
  ).node_system_state.index({
    params: { node: nodeId, limit: NODE_HISTORY_PAGE_SIZE, from_id: options.fromId },
    signal: options.signal,
  });
  const rows = narrowApiResult(result, historyRows, 'node history').data;
  return rows;
}

export async function fetchNodeKernelParameters(nodeId: number, options: NodeHistoryPageOptions = {}) {
  const result = await (
    await getApi()
  ).node_kernel_parameter.index({
    params: { node: nodeId, source: 'current', limit: NODE_HISTORY_PAGE_SIZE, from_id: options.fromId },
    signal: options.signal,
  });
  const rows = narrowApiResult(result, historyRows, 'node history').data;
  return rows;
}

export async function fetchNodeSysctls(nodeId: number, options: NodeHistoryPageOptions = {}) {
  const result = await (
    await getApi()
  ).node_sysctl.index({
    params: { node: nodeId, source: 'current', limit: NODE_HISTORY_PAGE_SIZE, from_id: options.fromId },
    signal: options.signal,
  });
  const rows = narrowApiResult(result, historyRows, 'node history').data;
  return rows;
}

export async function fetchNodeSoftwareVersions(nodeId: number, options: NodeHistoryPageOptions = {}) {
  const result = await (
    await getApi()
  ).node_software_version.index({
    params: { node: nodeId, source: 'current', limit: NODE_HISTORY_PAGE_SIZE, from_id: options.fromId },
    signal: options.signal,
  });
  const rows = narrowApiResult(result, historyRows, 'node history').data;
  return rows;
}

export async function fetchNodeKernelEvidence(nodeId: number, signal?: AbortSignal) {
  const result = await (await getApi()).node_kernel_evidence.index({ params: { node: nodeId, limit: 1 }, signal });
  const rows = narrowApiResult(result, historyRows, 'node history').data;
  return rows[0] ?? null;
}
