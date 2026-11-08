import type {
  DnsServerZoneTransferLog__IndexInput,
  DnsServerZoneTransferLog__IndexOutput,
  DnsZoneTransfer__CreateInput,
  DnsZoneTransfer__IndexInput,
  DnsZoneTransfer__IndexOutput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, reference, ipReference, optionalId } from './networkingViews';
import type { DnsReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray } from './apiErrors';
import type { HostIpAddress } from './networking';
import type { DnsServerZone } from './dns';
import { withoutDnsSecrets } from './dnsSecretScrubber';

export type DnsZoneTransfer = Omit<
  DnsZoneTransfer__IndexOutput[number],
  'id' | 'dns_zone' | 'dns_tsig_key' | 'host_ip_address'
> & {
  id: number;
  dns_zone?: DnsReference | null;
  dns_tsig_key?: DnsReference | null;
  host_ip_address?: Partial<HostIpAddress> | null;
  [key: string]: unknown;
};

export type DnsServerZoneTransferLog = Omit<DnsServerZoneTransferLog__IndexOutput[number], 'id' | 'dns_server_zone'> & {
  id: number;
  dns_server_zone?: Partial<DnsServerZone> | null;
  [key: string]: unknown;
};

export async function fetchDnsZoneTransfers(opts?: {
  fromId?: number;
  limit?: number;
  dns_zone?: number;
  host_ip_address?: number;
  peer_type?: string;
  dns_tsig_key?: number;
}) {
  const params: DnsZoneTransfer__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.dns_zone !== undefined) params['dns_zone'] = opts.dns_zone;
  if (opts?.host_ip_address !== undefined) params['host_ip_address'] = opts.host_ip_address;
  if (opts?.peer_type !== undefined) params['peer_type'] = opts.peer_type;
  if (opts?.dns_tsig_key !== undefined) params['dns_tsig_key'] = opts.dns_tsig_key;

  const raw = withoutDnsSecrets(
    await (
      await getApi()
    ).dns_zone_transfer.index({
      params,
      meta: {
        includes: 'dns_zone,host_ip_address__ip_address__network_interface,host_ip_address__ip_address__user,dns_tsig_key',
      },
    })
  );
  const safeRes = narrowApiResult(
    raw,
    (data) => expectArray<unknown>(data, 'dns_zone_transfer list').map(narrowDnsZoneTransfer),
    'dns_zone_transfer index'
  );
  return safeRes;
}

export async function createDnsZoneTransfer(payload: DnsZoneTransfer__CreateInput) {
  return narrowApiResult(
    withoutDnsSecrets(
      await (
        await getApi()
      ).dns_zone_transfer.create({
        params: payload,
      })
    ),
    narrowDnsZoneTransfer,
    'dns_zone_transfer create'
  );
}

export async function deleteDnsZoneTransfer(id: number) {
  return await (
    await getApi()
  ).dns_zone_transfer.delete({
    path: { dns_zone_transfer_id: id },
  });
}

export async function fetchDnsServerZoneTransferLogs(opts?: {
  fromId?: number;
  limit?: number;
  dns_zone?: number;
  dns_server_zone?: number;
  status?: string;
  reason_code?: string;
  primary_addr?: string;
  order?: 'oldest' | 'latest';
}) {
  const params: DnsServerZoneTransferLog__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.dns_zone !== undefined) params['dns_zone'] = opts.dns_zone;
  if (opts?.dns_server_zone !== undefined) params['dns_server_zone'] = opts.dns_server_zone;
  if (opts?.status !== undefined) params['status'] = opts.status;
  if (opts?.reason_code !== undefined) params['reason_code'] = opts.reason_code;
  if (opts?.primary_addr !== undefined) params['primary_addr'] = opts.primary_addr;
  if (opts?.order !== undefined) params['order'] = opts.order;

  const res = narrowApiResult(
    await (
      await getApi()
    ).dns_server_zone_transfer_log.index({
      params,
      meta: { includes: 'dns_server_zone__dns_server,dns_server_zone__dns_zone' },
    }),
    (data) => expectArray<unknown>(data, 'dns_server_zone_transfer_log list').map(narrowDnsServerZoneTransferLog),
    'dns_server_zone_transfer_log index'
  );

  return res;
}

function isDnsZoneTransfer(value: unknown): value is DnsZoneTransfer {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(value, ['created_at', 'peer_type', 'updated_at', 'transfer_check_status', 'last_transfer_check_at'], [
      'transfer_check_failed_count', 'transfer_check_success_count', 'transfer_check_pending_count',
      'transfer_check_server_count',
    ]) ||
    !['dns_zone', 'dns_tsig_key'].every((key) => optional(value[key], reference)) ||
    !optional(value['host_ip_address'], hostReference)
  )
    return false;
  return true;
}
function narrowDnsZoneTransfer(value: unknown): DnsZoneTransfer {
  if (!isDnsZoneTransfer(value)) throw new TypeError('Invalid DnsZoneTransfer identity or fields');
  return value;
}

function isDnsServerZoneTransferLog(value: unknown): value is DnsServerZoneTransferLog {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      [
        'created_at',
        'event_at',
        'event_key',
        'message',
        'primary_addr',
        'raw_message',
        'reason',
        'reason_code',
        'source_cursor',
        'status',
        'attempt_kind',
        'failure_class',
        'updated_at',
      ],
      ['serial', 'primary_serial', 'secondary_serial'],
      []
    ) ||
    !optional(value['dns_server_zone'], serverZoneReference) ||
    !optional(value['dns_zone_transfer'], reference)
  )
    return false;
  return true;
}
function narrowDnsServerZoneTransferLog(value: unknown): DnsServerZoneTransferLog {
  if (!isDnsServerZoneTransferLog(value)) throw new TypeError('Invalid DnsServerZoneTransferLog identity or fields');
  return value;
}

function hostReference(value: unknown): boolean {
  return (
    isRecord(value) &&
    optionalId(value['id']) &&
    fields(value, ['addr', 'reverse_record_value'], [], ['assigned', 'user_created']) &&
    optional(value['ip_address'], ipReference)
  );
}

function serverZoneReference(value: unknown): boolean {
  return (
    reference(value) &&
    isRecord(value) &&
    fields(
      value,
      [
        'type',
        'loaded_at',
        'expires_at',
        'refresh_at',
        'last_check_at',
        'last_transfer_at',
        'last_transfer_status',
        'last_transfer_reason_code',
        'last_transfer_reason',
        'last_transfer_primary_addr',
        'created_at',
        'updated_at',
      ],
      ['serial', 'last_transfer_serial', 'last_transfer_log_id']
    ) &&
    optional(value['dns_zone'], reference) &&
    optional(value['dns_server'], reference)
  );
}
