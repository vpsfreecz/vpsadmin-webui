import type {
  DnsTsigKey__CreateInput,
  DnsTsigKey__IndexInput,
  DnsTsigKey__IndexOutput,
} from 'vpsadmin-typescript-client';
import { isRecord, isId, fields, optional, reference } from './networkingViews';
import type { OwnerReference } from './networkingViews';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { expectArray } from './apiErrors';
import { withoutDnsSecrets } from './dnsSecretScrubber';

export type DnsTsigKeySummary = Omit<DnsTsigKey__IndexOutput[number], 'id' | 'user' | 'secret'> & {
  id: number;
  user?: OwnerReference | null;
  [key: string]: unknown;
};

export interface DnsTsigKeyOneTimeSecret {
  name: string;
  secret: string;
}

export interface CreateDnsTsigKeyOptions {
  /**
   * Receives the secret synchronously before the API result is scrubbed. The
   * returned promise never contains the secret, so query state cannot retain it.
   */
  onOneTimeSecret?: (value: DnsTsigKeyOneTimeSecret) => void;
}

/** Algorithms accepted by the upstream DnsTsigKey model. */
export const DNS_TSIG_ALGORITHMS = ['hmac-sha224', 'hmac-sha256', 'hmac-sha384', 'hmac-sha512'] as const;

export async function fetchDnsTsigKeys(opts?: {
  fromId?: number;
  limit?: number;
  user?: number;
  algorithm?: string;
  count?: boolean;
}) {
  const params: DnsTsigKey__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.algorithm !== undefined) params['algorithm'] = opts.algorithm;

  const result = withoutDnsSecrets(
    await (
      await getApi()
    ).dns_tsig_key.index({
      params,
      meta: { includes: 'user', ...(opts?.count ? { count: true } : {}) },
    })
  );
  return narrowApiResult(
    result,
    (data) => expectArray<unknown>(data, 'TSIG key list').map(narrowDnsTsigKey),
    'TSIG key list'
  );
}

export async function createDnsTsigKey(payload: DnsTsigKey__CreateInput, options?: CreateDnsTsigKeyOptions) {
  const result = await (await getApi()).dns_tsig_key.create({ params: payload });

  const secret = typeof result.data?.secret === 'string' ? result.data.secret : '';
  if (secret) {
    options?.onOneTimeSecret?.({
      name: String(result.data?.name ?? payload.name),
      secret,
    });
  }

  return narrowApiResult(withoutDnsSecrets(result), narrowDnsTsigKey, 'TSIG key summary');
}

export async function deleteDnsTsigKey(id: number) {
  return await (
    await getApi()
  ).dns_tsig_key.delete({
    path: { dns_tsig_key_id: id },
  });
}

function isDnsTsigKey(value: unknown): value is DnsTsigKeySummary {
  if (
    !isRecord(value) ||
    !isId(value['id']) ||
    !fields(value, ['algorithm', 'created_at', 'name', 'updated_at'], [], []) ||
    !optional(value['user'], reference)
  )
    return false;
  return true;
}
function narrowDnsTsigKey(value: unknown): DnsTsigKeySummary {
  if (!isDnsTsigKey(value)) throw new TypeError('Invalid DnsTsigKey identity or fields');
  return value;
}
