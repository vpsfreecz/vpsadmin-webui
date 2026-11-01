import type { Cluster__FullStatsOutput, Cluster__ShowOutput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import {} from './apiErrors';

export type ClusterShow = Omit<Cluster__ShowOutput, 'maintenance_lock'> & {
  maintenance_lock: boolean;
  [k: string]: unknown;
};

export type ClusterFullStats = Cluster__FullStatsOutput & { [k: string]: unknown };

export async function fetchClusterFullStats() {
  return narrowApiResult(await (await getApi()).cluster.full_stats(), narrowClusterFullStats, 'cluster.full_stats');
}


export async function fetchCluster() {
  return narrowApiResult(await (await getApi()).cluster.show(), narrowClusterShow, 'cluster.show');
}

export async function setClusterMaintenance(opts: { lock: boolean; reason?: string }) {
  return (await getApi()).cluster.set_maintenance({ params: { lock: opts.lock, reason: opts.reason } });
}

function isOperationsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isClusterShow(value: unknown): value is ClusterShow {
  return (
    isOperationsRecord(value) &&
    typeof value['maintenance_lock'] === 'boolean' &&
    ['maintenance_lock_reason'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['maintenance_lock'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean'
    )
  );
}
function narrowClusterShow(value: unknown): ClusterShow {
  if (!isClusterShow(value)) throw new TypeError('Invalid ClusterShow fields');
  return value;
}
function narrowClusterShowList(value: unknown): ClusterShow[] {
  if (!Array.isArray(value)) throw new TypeError('Expected ClusterShow list');
  return value.map(narrowClusterShow);
}

function isClusterFullStats(value: unknown): value is ClusterFullStats {
  return (
    isOperationsRecord(value) &&
    [
      'ipv4_count',
      'ipv4_used',
      'node_count',
      'nodes_online',
      'user_active',
      'user_count',
      'user_deleted',
      'user_suspended',
      'vps_count',
      'vps_deleted',
      'vps_running',
      'vps_stopped',
      'vps_suspended',
    ].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function narrowClusterFullStats(value: unknown): ClusterFullStats {
  if (!isClusterFullStats(value)) throw new TypeError('Invalid ClusterFullStats fields');
  return value;
}
function narrowClusterFullStatsList(value: unknown): ClusterFullStats[] {
  if (!Array.isArray(value)) throw new TypeError('Expected ClusterFullStats list');
  return value.map(narrowClusterFullStats);
}
