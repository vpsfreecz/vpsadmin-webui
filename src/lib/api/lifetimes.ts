import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  Location__ShowOutput,
  Vps__StateLog__IndexOutput,
} from 'vpsadmin-typescript-client';
import type { User__StateLog__IndexInput, Vps__StateLog__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import type { ResourceRef } from './app';

export type StateLog = Omit<Vps__StateLog__IndexOutput[number], 'id' | 'user'> & {
  id: number;
  user?: OperationsReference | null;
  [k: string]: unknown;
};

export async function fetchVpsStateLogs(vpsId: number, opts?: { limit?: number }) {
  const params: Vps__StateLog__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (
    await getApi()
  ).vps.state_log.index({ path: { vps_id: vpsId }, params, meta: { includes: 'user' } });

  return narrowApiResult(res, narrowStateLogList, `vpses/${vpsId}/state_logs#index`);
}

export async function fetchUserStateLogs(userId: number, opts?: { limit?: number }) {
  const params: User__StateLog__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (
    await getApi()
  ).user.state_log.index({ path: { user_id: userId }, params, meta: { includes: 'user' } });

  return narrowApiResult(res, narrowStateLogList, `users/${userId}/state_logs#index`);
}

function isStateLog(value: unknown): value is StateLog {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['changed_at', 'expiration', 'reason', 'remind_after', 'state'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['user'].every((key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key]))
  );
}
function narrowStateLog(value: unknown): StateLog {
  if (!isStateLog(value)) throw new TypeError('Invalid StateLog fields');
  return value;
}
function narrowStateLogList(value: unknown): StateLog[] {
  if (!Array.isArray(value)) throw new TypeError('Expected StateLog list');
  return value.map(narrowStateLog);
}
