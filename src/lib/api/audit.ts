import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  Location__ShowOutput,
  ObjectHistory__IndexOutput,
} from 'vpsadmin-typescript-client';
import type { ObjectHistory__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

export type ResourceRef = OperationsReference;

export type ObjectHistoryEvent = Omit<ObjectHistory__IndexOutput[number], 'id' | 'user' | 'user_session'> & {
  id: number;
  user?: OperationsReference | null;
  user_session?: OperationsReference | null;
  [k: string]: unknown;
};

export async function fetchObjectHistoryEvents(opts?: {
  limit?: number;
  fromId?: number;
  /** Request an exact total for the active server-side filters. */
  count?: boolean;
  userId?: number;
  userSessionId?: number;
  object?: string;
  objectId?: number;
  eventType?: string;
}) {
  const params: ObjectHistory__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.userSessionId !== undefined) params['user_session'] = opts.userSessionId;

  const obj = opts?.object ? String(opts.object).trim() : '';
  if (obj) params['object'] = obj;

  if (opts?.objectId !== undefined) params['object_id'] = opts.objectId;

  const et = opts?.eventType ? String(opts.eventType).trim() : '';
  if (et) params['event_type'] = et;

  const res = await (
    await getApi()
  ).object_history.index({ params,
    meta: { includes: 'user,user_session', ...(opts?.count ? { count: true } : {}) } });

  return narrowApiResult(res, narrowObjectHistoryEventList, 'object_histories#index');
}

export async function fetchObjectHistoryEvent(historyId: number) {
  return narrowApiResult(
    await (await getApi()).object_history.show({ path: { object_history_id: historyId } }),
    narrowObjectHistoryEvent,
    'object_history.show'
  );
}

function isObjectHistoryEvent(value: unknown): value is ObjectHistoryEvent {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['created_at', 'event_type', 'object'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['object_id'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['user', 'user_session'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowObjectHistoryEvent(value: unknown): ObjectHistoryEvent {
  if (!isObjectHistoryEvent(value)) throw new TypeError('Invalid ObjectHistoryEvent fields');
  return value;
}
function narrowObjectHistoryEventList(value: unknown): ObjectHistoryEvent[] {
  if (!Array.isArray(value)) throw new TypeError('Expected ObjectHistoryEvent list');
  return value.map(narrowObjectHistoryEvent);
}
