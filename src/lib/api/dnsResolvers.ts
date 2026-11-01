import type {
  DnsResolver__CreateInput,
  DnsResolver__DeleteInput,
  DnsResolver__IndexInput,
  DnsResolver__IndexOutput,
  DnsResolver__UpdateInput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, locationReference } from './networkingViews';
import type { LocationReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray } from './apiErrors';

export type DnsResolver = Omit<DnsResolver__IndexOutput[number], 'id' | 'location'> & {
  id: number;
  location?: LocationReference | null;
  [key: string]: unknown;
};

export async function fetchDnsResolvers(opts?: { limit?: number; fromId?: number; vpsId?: number }) {
  const params: DnsResolver__IndexInput = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.vpsId !== undefined) params['vps'] = opts.vpsId;

  const res = narrowApiResult(
    await (
      await getApi()
    ).dns_resolver.index({
      params,
      meta: { includes: 'location' },
    }),
    (data) => expectArray<unknown>(data, 'dns_resolver list').map(narrowDnsResolver),
    'dns_resolver index'
  );

  return res;
}

export async function createDnsResolver(opts: {
  ipAddr: string;
  label: string;
  isUniversal: boolean;
  locationId?: number | null;
}) {
  const params: DnsResolver__CreateInput = {
    ip_addr: opts.ipAddr,
    label: opts.label,
    is_universal: opts.isUniversal,
  };

  if (!opts.isUniversal) {
    params['location'] = opts.locationId ?? null;
  }

  return narrowApiResult(
    await (
      await getApi()
    ).dns_resolver.create({
      params,
    }),
    narrowDnsResolver,
    'dns_resolver create'
  );
}

export async function updateDnsResolver(opts: {
  id: number;
  ipAddr: string;
  label: string;
  isUniversal: boolean;
  locationId?: number | null;
}) {
  const params: DnsResolver__UpdateInput = {
    ip_addr: opts.ipAddr,
    label: opts.label,
    is_universal: opts.isUniversal,
  };

  if (!opts.isUniversal) {
    params['location'] = opts.locationId ?? null;
  }

  return narrowApiResult(
    await (
      await getApi()
    ).dns_resolver.update({
      path: { dns_resolver_id: opts.id },
      params,
    }),
    narrowDnsResolver,
    'dns_resolver update'
  );
}

export async function deleteDnsResolver(opts: { id: number; force?: boolean }) {
  const params: DnsResolver__DeleteInput = {};
  if (opts.force !== undefined) params['force'] = opts.force;

  return await (
    await getApi()
  ).dns_resolver.delete({
    path: { dns_resolver_id: opts.id },
    params,
  });
}

function isDnsResolver(value: unknown): value is DnsResolver {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(value, ['ip_addr', 'label'], [], ['is_universal']) ||
    !optional(value['location'], locationReference)
  )
    return false;
  return true;
}
function narrowDnsResolver(value: unknown): DnsResolver {
  if (!isDnsResolver(value)) throw new TypeError('Invalid DnsResolver identity or fields');
  return value;
}
