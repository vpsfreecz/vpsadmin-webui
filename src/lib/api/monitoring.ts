import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  Location__ShowOutput,
  MonitoredEvent__IndexOutput,
  MonitoredEvent__Log__IndexOutput,
} from 'vpsadmin-typescript-client';
import type { MonitoredEvent__IndexInput, MonitoredEvent__Log__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';

export type ResourceRef = OperationsReference;

export type MonitoredEventState =
  'monitoring'
  | 'confirmed'
  | 'unconfirmed'
  | 'acknowledged'
  | 'ignored'
  | 'closed'
  | string;

export type MonitoredEvent = Omit<MonitoredEvent__IndexOutput[number], 'id' | 'user'> & {
  id: number;
  user?: OperationsReference | null;
  [k: string]: unknown;
};

export type MonitoredEventOrder = 'oldest' | 'latest' | 'longest' | 'shortest';

export async function fetchMonitoredEvents(opts?: {
  limit?: number;
  fromId?: number;
  fromDuration?: number;
  order?: MonitoredEventOrder;
  monitor?: string;
  objectName?: string;
  objectId?: number;
  state?: string;
  userId?: number;
}) {
  const params: MonitoredEvent__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.order) params['order'] = opts.order;
  if (opts?.monitor) params['monitor'] = opts.monitor;
  if (opts?.objectName) params['object_name'] = opts.objectName;
  if (opts?.objectId !== undefined) params['object_id'] = opts.objectId;
  if (opts?.state) params['state'] = opts.state;
  if (opts?.userId !== undefined) params['user'] = opts.userId;

  // Cursor depends on order.
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.fromDuration !== undefined) params['from_duration'] = opts.fromDuration;

  const res = await (await getApi()).monitored_event.index({ params });

  return narrowApiResult(res, narrowMonitoredEventList, 'monitored_events#index');
}

export async function fetchMonitoredEvent(eventId: number) {
  return narrowApiResult(
    await (await getApi()).monitored_event.show({ path: { monitored_event_id: eventId } }),
    narrowMonitoredEvent,
    'monitored_event.show'
  );
}

export async function acknowledgeMonitoredEvent(eventId: number, opts?: { until?: string }) {
  return (await getApi()).monitored_event.acknowledge({
    path: { monitored_event_id: eventId },
    params: opts?.until ? { until: opts.until } : {},
  });
}

export async function ignoreMonitoredEvent(eventId: number, opts?: { until?: string }) {
  return (await getApi()).monitored_event.ignore({
    path: { monitored_event_id: eventId },
    params: opts?.until ? { until: opts.until } : {},
  });
}

export type MonitoredEventLog = Omit<MonitoredEvent__Log__IndexOutput[number], 'id'> & {
  id: number;
  [k: string]: unknown;
};

export type MonitoredEventLogOrder = 'oldest' | 'latest';

export async function fetchMonitoredEventLogs(
  eventId: number,
  opts?: {
    limit?: number;
    fromId?: number;
    order?: MonitoredEventLogOrder;
    passed?: boolean;
  }
) {
  const params: MonitoredEvent__Log__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.order) params['order'] = opts.order;
  if (opts?.passed !== undefined) params['passed'] = opts.passed;

  const res = await (await getApi()).monitored_event.log.index({ path: { monitored_event_id: eventId }, params });

  return narrowApiResult(res, narrowMonitoredEventLogList, `monitored_events/${eventId}/logs#index`);
}

function isMonitoredEvent(value: unknown): value is MonitoredEvent {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['created_at', 'issue', 'label', 'monitor', 'object_name', 'saved_until', 'state', 'updated_at'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['duration', 'object_id'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['user'].every((key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key]))
  );
}
function narrowMonitoredEvent(value: unknown): MonitoredEvent {
  if (!isMonitoredEvent(value)) throw new TypeError('Invalid MonitoredEvent fields');
  return value;
}
function narrowMonitoredEventList(value: unknown): MonitoredEvent[] {
  if (!Array.isArray(value)) throw new TypeError('Expected MonitoredEvent list');
  return value.map(narrowMonitoredEvent);
}

function isMonitoredEventLog(value: unknown): value is MonitoredEventLog {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['created_at'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    ['passed'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean')
  );
}
function narrowMonitoredEventLog(value: unknown): MonitoredEventLog {
  if (!isMonitoredEventLog(value)) throw new TypeError('Invalid MonitoredEventLog fields');
  return value;
}
function narrowMonitoredEventLogList(value: unknown): MonitoredEventLog[] {
  if (!Array.isArray(value)) throw new TypeError('Expected MonitoredEventLog list');
  return value.map(narrowMonitoredEventLog);
}
