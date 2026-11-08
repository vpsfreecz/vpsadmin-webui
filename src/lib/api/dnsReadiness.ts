import type {
  DnsServerZonePrimaryTransferState__IndexInput,
  DnsServerZonePrimaryTransferState__IndexOutput,
} from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { expectArray } from './apiErrors';
import { fields, isId, isRecord, optional, reference, type DnsReference } from './networkingViews';
import { getApi } from './sdk';
import { withoutDnsSecrets } from './dnsSecretScrubber';

export type DnsPrimaryTransferState = Omit<
  DnsServerZonePrimaryTransferState__IndexOutput[number],
  'id' | 'dns_server_zone' | 'dns_zone_transfer' | 'last_transfer_log'
> & {
  id: number;
  dns_server_zone?: DnsReference | null;
  dns_zone_transfer?: DnsReference | null;
  last_transfer_log?: DnsReference | null;
};

export interface DnsReadinessCapabilities {
  paths: boolean;
  aggregates: boolean;
  serving: boolean;
  sources: boolean;
}

/** Discover signed-in permissions; anonymous bootstrap descriptions cannot grant these reads. */
export async function fetchDnsReadinessCapabilities() {
  return narrowApiResult(
    await (await getApi()).describe(),
    (description): DnsReadinessCapabilities => {
      if (!isRecord(description)) throw new TypeError('Invalid DNS capability description');
      const resources = description['resources'];
      const supports = (name: string, required: Record<string, string>) => {
        if (!isRecord(resources)) return false;
        const resource = resources[name];
        const actions = isRecord(resource) ? resource['actions'] : undefined;
        const index = isRecord(actions) ? actions['index'] : undefined;
        const output = isRecord(index) ? index['output'] : undefined;
        const parameters = isRecord(output) ? output['parameters'] : undefined;
        return (
          isRecord(parameters) &&
          Object.entries(required).every(([field, type]) => {
            const parameter = parameters[field];
            return isRecord(parameter) && parameter['type'] === type;
          })
        );
      };
      return {
        paths: supports('dns_server_zone_primary_transfer_state', {
          status: 'String',
          evidence_current: 'Boolean',
          last_attempt_at: 'Datetime',
          dns_server_zone: 'Resource',
          dns_zone_transfer: 'Resource',
          last_attempt_kind: 'String',
        }),
        aggregates: supports('dns_zone_transfer', {
          transfer_check_status: 'String',
          last_transfer_check_at: 'Datetime',
          transfer_check_failed_count: 'Integer',
          transfer_check_success_count: 'Integer',
          transfer_check_pending_count: 'Integer',
          transfer_check_server_count: 'Integer',
        }),
        serving: supports('dns_server_zone', { zone_status: 'String' }),
        sources: supports('dns_server_zone_transfer_log', { attempt_kind: 'String' }),
      };
    },
    'DNS readiness capability'
  );
}

export async function fetchDnsPrimaryTransferStates(opts: { dnsZone: number; fromId?: number; limit?: number }) {
  const params: DnsServerZonePrimaryTransferState__IndexInput = { dns_zone: opts.dnsZone };
  if (opts.fromId !== undefined) params.from_id = opts.fromId;
  if (opts.limit !== undefined) params.limit = opts.limit;
  return narrowApiResult(
    withoutDnsSecrets(
      await (
        await getApi()
      ).dns_server_zone_primary_transfer_state.index({
        params,
        meta: {
          includes: 'dns_server_zone__dns_server,dns_zone_transfer__host_ip_address',
        },
      })
    ),
    (data) => expectArray<unknown>(data, 'DNS readiness paths').map(narrowDnsPrimaryTransferState),
    'DNS readiness paths'
  );
}

function narrowDnsPrimaryTransferState(value: unknown): DnsPrimaryTransferState {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(
      value,
      [
        'status',
        'failure_class',
        'last_attempt_kind',
        'last_attempt_at',
        'last_success_at',
        'failed_since',
        'reason_observed_at',
        'alert_eligible_at',
        'reason_code',
        'reason',
        'secondary_source_addr',
        'created_at',
        'updated_at',
      ],
      ['primary_serial', 'secondary_serial'],
      ['evidence_current']
    ) ||
    !['dns_server_zone', 'dns_zone_transfer', 'last_transfer_log'].every((key) => optional(value[key], reference))
  ) {
    throw new TypeError('Invalid DNS readiness path');
  }
  // New API fields are narrowed here; generated bindings own the operation and wire contract.
  return value as DnsPrimaryTransferState;
}
