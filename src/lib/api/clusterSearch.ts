import { ClientInputError } from './apiErrors';
import type { Cluster__SearchOutput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

/**
 * Result row returned by `Cluster.Search`.
 *
 * The exact payload varies slightly across deployments. We keep the type
 * tolerant and rely on runtime guards in the UI.
 */
export type ClusterSearchHit = Omit<Cluster__SearchOutput[number], 'id'> & { id: number;
  [k: string]: unknown };

export async function clusterSearch(opts: { query: string; signal?: AbortSignal }) {
  const q = String(opts.query ?? '').trim();
  if (!q) throw new ClientInputError('Cluster search requires a query');

  const res = await (await getApi()).cluster.search({ params: { value: q },
    signal: opts.signal });

  return narrowApiResult(res, narrowClusterSearchHitList, 'cluster.search');
}

function isOperationsRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isClusterSearchHit(value: unknown): value is ClusterSearchHit {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['attribute', 'resource', 'value'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    )
  );
}
function narrowClusterSearchHit(value: unknown): ClusterSearchHit {
  if (!isClusterSearchHit(value)) throw new TypeError('Invalid ClusterSearchHit fields');
  return value;
}
function narrowClusterSearchHitList(value: unknown): ClusterSearchHit[] {
  if (!Array.isArray(value)) throw new TypeError('Expected ClusterSearchHit list');
  return value.map(narrowClusterSearchHit);
}
