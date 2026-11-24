import { expectArray } from './apiErrors';
import type { Cluster__PublicStatsOutput, Location__ShowOutput, Node__PublicStatusOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi, getPublicApi } from './sdk';
import { narrowOutage, narrowOutageEntity, narrowOutageHandler, narrowOutageUpdate } from './outageViews';
import { narrowPublicNewsLog } from './newsLogViews';
import { narrowSecurityAdvisory, type SecurityAdvisory } from './securityAdvisories';

/** Public summaries require real counts; unknown values are never fabricated as zero. */
export type PublicClusterStats = Required<{ [K in keyof Cluster__PublicStatsOutput]: NonNullable<Cluster__PublicStatsOutput[K]> }>;
export type LocationRef = Pick<Location__ShowOutput, 'id' | 'label'>;
export type PublicNodeStatus = Omit<Node__PublicStatusOutput[number], 'status' | 'name' | 'location'> & {
  status: boolean;
  name: string;
  location?: LocationRef | null;
  [key: string]: unknown;
};

function publicStats(value: Cluster__PublicStatsOutput): PublicClusterStats {
  if (!value || typeof value !== 'object') throw new Error('Invalid public statistics');
  const { user_count, vps_count, ipv4_left } = value;
  if (typeof user_count !== 'number' || !Number.isFinite(user_count)
    || typeof vps_count !== 'number' || !Number.isFinite(vps_count)
    || typeof ipv4_left !== 'number' || !Number.isFinite(ipv4_left)) throw new Error('Invalid public counts');
  return { ...value, user_count, vps_count, ipv4_left };
}

function publicNode(value: Node__PublicStatusOutput[number]): PublicNodeStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.name !== 'string' || typeof value.status !== 'boolean') throw new Error('Invalid public node');
  for (const key of ['fqdn', 'last_report', 'kernel', 'type', 'hypervisor_type', 'maintenance_lock',
    'maintenance_lock_reason', 'cgroup_version', 'pool_checked_at', 'pool_scan', 'pool_state'] as const) {
    if (value[key] != null && typeof value[key] !== 'string') throw new Error(`Invalid public-node ${key}`);
  }
  for (const key of ['cpu_idle', 'vps_count', 'vps_free', 'pool_scan_percent'] as const) {
    if (value[key] != null && (typeof value[key] !== 'number' || !Number.isFinite(value[key]))) throw new Error(`Invalid public-node ${key}`);
  }
  if (value.pool_status != null && typeof value.pool_status !== 'boolean') throw new Error('Invalid public-node pool status');
  const { location, ...rest } = value;
  if (location == null) return { ...rest, name: value.name, status: value.status, ...(location === undefined ? {} : { location }) };
  if (typeof location !== 'object' || Array.isArray(location)) throw new Error('Invalid public-node location');
  const { id, label, ...locationDetails } = location;
  if (id != null && (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0)) throw new Error('Invalid public-node location ID');
  if (label != null && typeof label !== 'string') throw new Error('Invalid public-node location label');
  return { ...rest, name: value.name, status: value.status, location: {
    ...locationDetails, ...(id === undefined ? {} : { id }), ...(label === undefined ? {} : { label }),
  } };
}

export type { Outage, OutageEntity, OutageHandler, OutageUpdate } from './outageViews';
export type { PublicNewsLog as NewsLog } from './newsLogViews';

export async function fetchPublicStats() {
  return narrowApiResult(await getPublicApi().cluster.public_stats(), publicStats, 'public statistics');
}

export async function fetchPublicNodeStatus() {
  return narrowApiResult(await getPublicApi().node.public_status(), data => {
    if (!Array.isArray(data)) throw new Error('Invalid public node collection');
    return data.map(publicNode);
  }, 'public node status');
}

/** The signed-in status response includes node IDs needed for owned-VPS membership. */
export async function fetchAuthenticatedNodeStatus() {
  return narrowApiResult(await (await getApi()).node.public_status(), data => {
    if (!Array.isArray(data)) throw new Error('Invalid authenticated node collection');
    return data.map(node => {
      if (typeof node?.id !== 'number' || !Number.isSafeInteger(node.id) || node.id <= 0) {
        throw new Error('Missing authenticated node identity');
      }
      return { ...publicNode(node), id: node.id };
    });
  }, 'authenticated node status');
}

export async function fetchOutages(opts?: { limit?: number }) {
  return narrowApiResult(await getPublicApi().outage.index({ params: { limit: opts?.limit } }), data =>
    expectArray<unknown>(data, 'public outages').map(narrowOutage), 'public outages');
}

export async function fetchOutage(outageId: number) {
  return narrowApiResult(await getPublicApi().outage.show({ path: { outage_id: outageId } }), narrowOutage, 'public outage');
}

export async function fetchOutageEntities(outageId: number) {
  return narrowApiResult(await getPublicApi().outage.entity.index({ path: { outage_id: outageId } }), data =>
    expectArray<unknown>(data, 'public outage entities').map(narrowOutageEntity), 'public outage entities');
}

export async function fetchOutageHandlers(outageId: number) {
  return narrowApiResult(await getPublicApi().outage.handler.index({ path: { outage_id: outageId } }), data =>
    expectArray<unknown>(data, 'public outage handlers').map(narrowOutageHandler), 'public outage handlers');
}

export async function fetchOutageUpdates(outageId: number) {
  return narrowApiResult(await getPublicApi().outage_update.index({ params: { outage: outageId } }), data =>
    expectArray<unknown>(data, 'public outage updates').map(narrowOutageUpdate), 'public outage updates');
}

export async function fetchNews(opts?: { limit?: number }) {
  return narrowApiResult(await getPublicApi().news_log.index({ params: { limit: opts?.limit } }), data =>
    expectArray<unknown>(data, 'public news').map(narrowPublicNewsLog), 'public news');
}

/** A bounded homepage preview; keep credentials out even for signed-in visitors. */
export async function fetchPublicSecurityAdvisories() {
  const res = narrowApiResult(
    await getPublicApi().security_advisory.index({ params: { limit: 5, state: 'published', order: 'newest' } }),
    data => expectArray<unknown>(data, 'public security advisories').map(narrowSecurityAdvisory),
    'public security advisories'
  );
  return {
    ...res,
    data: expectArray<SecurityAdvisory>(res.data, 'security_advisories')
      .filter(advisory => advisory.state === 'published')
      .sort((a, b) => {
        const at = Date.parse(a.published_at ?? '') || 0;
        const bt = Date.parse(b.published_at ?? '') || 0;
        return bt - at || b.id - a.id;
      })
      .slice(0, 5),
  };
}
