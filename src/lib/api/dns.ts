import type {
  DnsRecordLog__IndexInput,
  DnsRecordLog__IndexOutput,
  DnsRecord__CreateInput,
  DnsRecord__IndexInput,
  DnsRecord__IndexOutput,
  DnsRecord__UpdateInput,
  DnsServerZone__CreateInput,
  DnsServerZone__IndexInput,
  DnsServerZone__IndexOutput,
  DnsServer__CreateInput,
  DnsServer__IndexInput,
  DnsServer__IndexOutput,
  DnsServer__UpdateInput,
  DnsZone__CreateInput,
  DnsZone__IndexInput,
  DnsZone__IndexOutput,
  DnsZone__UpdateInput,
  DnssecRecord__IndexInput,
  DnssecRecord__IndexOutput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, reference } from './networkingViews';
import type { DnsReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray } from './apiErrors';

export type ResourceRef = DnsReference;
export type DnsZone = Omit<DnsZone__IndexOutput[number], 'id' | 'user'> & {
  id: number;
  user?: DnsReference | null;
  [key: string]: unknown;
};
export type DnsRecord = Omit<DnsRecord__IndexOutput[number], 'id' | 'user' | 'dns_zone'> & {
  id: number;
  user?: DnsReference | null;
  dns_zone?: DnsReference | null;
  [key: string]: unknown;
};
export type DnsRecordLog = Omit<DnsRecordLog__IndexOutput[number], 'id' | 'user' | 'dns_zone' | 'transaction_chain'> & {
  id: number;
  user?: DnsReference | null;
  dns_zone?: DnsReference | null;
  transaction_chain?: DnsReference | null;
  [key: string]: unknown;
};

export async function fetchDnsZones(opts?: {
  fromId?: number;
  limit?: number;
  user?: number;
  enabled?: boolean;
  dnssec_enabled?: boolean;
  role?: string;
  source?: string;
  signal?: AbortSignal;
}) {
  const params: DnsZone__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.enabled !== undefined) params['enabled'] = opts.enabled;
  if (opts?.dnssec_enabled !== undefined) params['dnssec_enabled'] = opts.dnssec_enabled;
  if (opts?.role !== undefined) params['role'] = opts.role;
  if (opts?.source !== undefined) params['source'] = opts.source;

  const res = narrowApiResult(
    await (
      await getApi()
    ).dns_zone.index({
      params,
      signal: opts?.signal,
    }),
    (data) => expectArray<unknown>(data, 'dns_zone list').map(narrowDnsZone),
    'dns_zone index'
  );
  return res;
}

export async function fetchDnsZone(zoneId: number) {
  return narrowApiResult(
    await (
      await getApi()
    ).dns_zone.show({
      path: { dns_zone_id: zoneId },
    }),
    narrowDnsZone,
    'dns_zone show'
  );
}

export async function createDnsZone(payload: DnsZone__CreateInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).dns_zone.create({
      params: payload,
    }),
    narrowDnsZone,
    'dns_zone create'
  );
}

export async function updateDnsZone(zoneId: number, payload: DnsZone__UpdateInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).dns_zone.update({
      path: { dns_zone_id: zoneId },
      params: payload,
    }),
    narrowDnsZone,
    'dns_zone update'
  );
}

export async function deleteDnsZone(zoneId: number) {
  return await (
    await getApi()
  ).dns_zone.delete({
    path: { dns_zone_id: zoneId },
  });
}

export async function fetchDnsRecords(opts?: { user?: number; dns_zone?: number }) {
  const params: DnsRecord__IndexInput = {};
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.dns_zone !== undefined) params['dns_zone'] = opts.dns_zone;

  const res = narrowApiResult(
    await (
      await getApi()
    ).dns_record.index({
      params,
    }),
    (data) => expectArray<unknown>(data, 'dns_record list').map(narrowDnsRecord),
    'dns_record index'
  );

  return res;
}

export async function createDnsRecord(payload: DnsRecord__CreateInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).dns_record.create({
      params: payload,
    }),
    narrowDnsRecord,
    'dns_record create'
  );
}

export async function updateDnsRecord(recordId: number, payload: DnsRecord__UpdateInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).dns_record.update({
      path: { dns_record_id: recordId },
      params: payload,
    }),
    narrowDnsRecord,
    'dns_record update'
  );
}

export async function deleteDnsRecord(recordId: number) {
  return await (
    await getApi()
  ).dns_record.delete({
    path: { dns_record_id: recordId },
  });
}

export async function fetchDnsRecordLogs(opts?: {
  fromId?: number;
  limit?: number;
  user?: number;
  dns_zone?: number;
  dns_zone_name?: string;
  change_type?: string;
  name?: string;
  type?: string;
}) {
  const params: DnsRecordLog__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.dns_zone !== undefined) params['dns_zone'] = opts.dns_zone;
  if (opts?.dns_zone_name !== undefined) params['dns_zone_name'] = opts.dns_zone_name;
  if (opts?.change_type !== undefined) params['change_type'] = opts.change_type;
  if (opts?.name !== undefined) params['name'] = opts.name;
  if (opts?.type !== undefined) params['type'] = opts.type;

  const res = narrowApiResult(
    await (
      await getApi()
    ).dns_record_log.index({
      params,
    }),
    (data) => expectArray<unknown>(data, 'dns_record_log list').map(narrowDnsRecordLog),
    'dns_record_log index'
  );

  return res;
}

export type DnssecRecord = Omit<DnssecRecord__IndexOutput[number], 'id' | 'dns_zone'> & {
  id: number;
  dns_zone?: DnsReference | null;
  [key: string]: unknown;
};

export type DnsServer = Omit<DnsServer__IndexOutput[number], 'id' | 'node'> & {
  id: number;
  node?: DnsReference | null;
  [key: string]: unknown;
};

export type DnsServerZone = Omit<DnsServerZone__IndexOutput[number], 'id' | 'dns_server' | 'dns_zone'> & {
  id: number;
  dns_server?: DnsReference | null;
  dns_zone?: DnsReference | null;
  [key: string]: unknown;
};

export async function fetchDnssecRecords(opts?: { fromId?: number; limit?: number; dns_zone?: number }) {
  const params: DnssecRecord__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.dns_zone !== undefined) params['dns_zone'] = opts.dns_zone;
  const res = narrowApiResult(
    await (
      await getApi()
    ).dnssec_record.index({
      params,
      meta: { includes: 'dns_zone' },
    }),
    (data) => expectArray<unknown>(data, 'dnssec_record list').map(narrowDnssecRecord),
    'dnssec_record index'
  );
  return res;
}

export async function fetchDnsServers(opts?: { fromId?: number; limit?: number; count?: boolean }) {
  const params: DnsServer__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  const res = narrowApiResult(
    await (
      await getApi()
    ).dns_server.index({
      params,
      meta: { includes: 'node', ...(opts?.count ? { count: true } : {}) },
    }),
    (data) => expectArray<unknown>(data, 'dns_server list').map(narrowDnsServer),
    'dns_server index'
  );
  return res;
}

export async function createDnsServer(payload: DnsServer__CreateInput) {
  return narrowApiResult(
    await (await getApi()).dns_server.create({ params: payload }),
    narrowDnsServer,
    'dns_server create'
  );
}

export async function updateDnsServer(id: number, payload: DnsServer__UpdateInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).dns_server.update({
      path: { dns_server_id: id },
      params: payload,
    }),
    narrowDnsServer,
    'dns_server update'
  );
}

export async function deleteDnsServer(id: number) {
  return await (
    await getApi()
  ).dns_server.delete({
    path: { dns_server_id: id },
  });
}

export async function fetchDnsServerZones(opts?: {
  fromId?: number;
  limit?: number;
  dns_server?: number;
  dns_zone?: number;
}) {
  const params: DnsServerZone__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.dns_server !== undefined) params['dns_server'] = opts.dns_server;
  if (opts?.dns_zone !== undefined) params['dns_zone'] = opts.dns_zone;
  const res = narrowApiResult(
    await (
      await getApi()
    ).dns_server_zone.index({
      params,
      meta: { includes: 'dns_server,dns_zone' },
    }),
    (data) => expectArray<unknown>(data, 'dns_server_zone list').map(narrowDnsServerZone),
    'dns_server_zone index'
  );
  return res;
}

export async function createDnsServerZone(payload: DnsServerZone__CreateInput) {
  return narrowApiResult(
    await (await getApi()).dns_server_zone.create({ params: payload }),
    narrowDnsServerZone,
    'dns_server_zone create'
  );
}

export async function deleteDnsServerZone(id: number) {
  return await (
    await getApi()
  ).dns_server_zone.delete({
    path: { dns_server_zone_id: id },
  });
}

export * from './dnsTransfers';
export * from './dnsTsigKeys';

function isDnsZone(value: unknown): value is DnsZone {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      [
        'created_at',
        'email',
        'label',
        'name',
        'reverse_network_address',
        'reverse_network_prefix',
        'role',
        'source',
        'updated_at',
      ],
      ['default_ttl', 'serial'],
      ['dnssec_enabled', 'enabled']
    ) ||
    !['user'].every((key) => optional(value[key], reference))
  )
    return false;
  return true;
}
function narrowDnsZone(value: unknown): DnsZone {
  if (!isDnsZone(value)) throw new TypeError('Invalid DnsZone identity or fields');
  return value;
}

function isDnsRecord(value: unknown): value is DnsRecord {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      ['comment', 'content', 'created_at', 'dynamic_update_url', 'name', 'type', 'updated_at'],
      ['priority', 'ttl'],
      ['dynamic_update_enabled', 'enabled', 'managed']
    ) ||
    !['user', 'dns_zone'].every((key) => optional(value[key], reference))
  )
    return false;
  return true;
}
function narrowDnsRecord(value: unknown): DnsRecord {
  if (!isDnsRecord(value)) throw new TypeError('Invalid DnsRecord identity or fields');
  return value;
}

function isDnsRecordLog(value: unknown): value is DnsRecordLog {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(value, ['change_type', 'created_at', 'dns_zone_name', 'name', 'type', 'updated_at'], ['raw_user_id'], []) ||
    !['user', 'dns_zone', 'transaction_chain'].every((key) => optional(value[key], reference))
  )
    return false;
  return true;
}
function narrowDnsRecordLog(value: unknown): DnsRecordLog {
  if (!isDnsRecordLog(value)) throw new TypeError('Invalid DnsRecordLog identity or fields');
  return value;
}

function isDnssecRecord(value: unknown): value is DnssecRecord {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      ['created_at', 'dnskey_pubkey', 'ds_digest', 'updated_at'],
      ['dnskey_algorithm', 'ds_algorithm', 'ds_digest_type', 'keyid'],
      []
    ) ||
    !['dns_zone'].every((key) => optional(value[key], reference))
  )
    return false;
  return true;
}
function narrowDnssecRecord(value: unknown): DnssecRecord {
  if (!isDnssecRecord(value)) throw new TypeError('Invalid DnssecRecord identity or fields');
  return value;
}

function isDnsServer(value: unknown): value is DnsServer {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      ['created_at', 'ipv4_addr', 'ipv6_addr', 'name', 'updated_at', 'user_dns_zone_type'],
      [],
      ['enable_user_dns_zones', 'hidden']
    ) ||
    !['node'].every((key) => optional(value[key], reference))
  )
    return false;
  return true;
}
function narrowDnsServer(value: unknown): DnsServer {
  if (!isDnsServer(value)) throw new TypeError('Invalid DnsServer identity or fields');
  return value;
}

function isDnsServerZone(value: unknown): value is DnsServerZone {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      [
        'created_at',
        'expires_at',
        'last_check_at',
        'last_transfer_at',
        'last_transfer_primary_addr',
        'last_transfer_reason',
        'last_transfer_reason_code',
        'last_transfer_status',
        'loaded_at',
        'refresh_at',
        'type',
        'updated_at',
      ],
      ['last_transfer_log_id', 'last_transfer_serial', 'serial'],
      []
    ) ||
    !['dns_server', 'dns_zone'].every((key) => optional(value[key], reference))
  )
    return false;
  return true;
}
function narrowDnsServerZone(value: unknown): DnsServerZone {
  if (!isDnsServerZone(value)) throw new TypeError('Invalid DnsServerZone identity or fields');
  return value;
}
