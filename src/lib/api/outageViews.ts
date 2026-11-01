import type {
  Outage__ShowOutput,
  Outage__Entity__ShowOutput,
  Outage__Handler__ShowOutput,
  OutageUpdate__ShowOutput,
  User__ShowOutput,
} from 'vpsadmin-typescript-client';

type OutageUser = Pick<User__ShowOutput, 'id' | 'login'> & Record<string, unknown>;
type OutageReference = Pick<Outage__ShowOutput, 'id' | 'begins_at'> & Record<string, unknown>;
export type Outage = Outage__ShowOutput & { id: number } & Record<string, unknown>;
export type OutageEntity = Outage__Entity__ShowOutput & { id: number; name: string };
export type OutageHandler = Omit<Outage__Handler__ShowOutput, 'user'> & {
  id: number;
  user?: OutageUser | null;
};
export type OutageUpdate = Omit<OutageUpdate__ShowOutput, 'outage' | 'reported_by'> & {
  id: number;
  outage?: OutageReference | null;
  reported_by?: OutageUser | null;
} & Record<string, unknown>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function strings(row: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => row[key] === undefined || row[key] === null || typeof row[key] === 'string');
}

function numbers(row: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every(
    (key) => row[key] === undefined || row[key] === null || (typeof row[key] === 'number' && Number.isFinite(row[key]))
  );
}

function user(value: unknown): value is OutageUser | null | undefined {
  return (
    value === undefined ||
    value === null ||
    (record(value) && (value['id'] == null || positiveId(value['id'])) && strings(value, ['login']))
  );
}

function isOutage(value: unknown): value is Outage {
  return (
    record(value) &&
    positiveId(value['id']) &&
    strings(value, [
      'begins_at',
      'finished_at',
      'type',
      'state',
      'impact',
      'en_summary',
      'en_description',
      'cs_summary',
      'cs_description',
    ]) &&
    numbers(value, [
      'duration',
      'affected_user_count',
      'affected_direct_vps_count',
      'affected_indirect_vps_count',
      'affected_export_count',
    ]) &&
    ['auto_resolve', 'affected'].every((key) => value[key] == null || typeof value[key] === 'boolean')
  );
}

export function narrowOutage(value: unknown): Outage {
  if (!isOutage(value)) throw new Error('Invalid outage identity or fields');
  return value;
}

function isEntity(value: unknown): value is OutageEntity {
  return (
    record(value) &&
    positiveId(value['id']) &&
    typeof value['name'] === 'string' &&
    (value['entity_id'] == null || positiveId(value['entity_id'])) &&
    strings(value, ['entity_type', 'label'])
  );
}

export function narrowOutageEntity(value: unknown): OutageEntity {
  if (!isEntity(value)) throw new Error('Invalid outage entity identity or fields');
  return value;
}

function isHandler(value: unknown): value is OutageHandler {
  return record(value) && positiveId(value['id']) && strings(value, ['full_name', 'note']) && user(value['user']);
}

export function narrowOutageHandler(value: unknown): OutageHandler {
  if (!isHandler(value)) throw new Error('Invalid outage handler identity or fields');
  return value;
}

/** Scope compensation needs the actual administrator-visible user identity. */
export function narrowAdminOutageHandler(value: unknown): OutageHandler {
  const handler = narrowOutageHandler(value);
  if (!positiveId(handler.user?.id)) throw new Error('Missing outage handler user identity');
  return handler;
}

function isUpdate(value: unknown): value is OutageUpdate {
  if (
    !record(value) ||
    !positiveId(value['id']) ||
    !strings(value, [
      'begins_at',
      'finished_at',
      'type',
      'state',
      'impact',
      'created_at',
      'reporter_name',
      'en_summary',
      'en_description',
      'cs_summary',
      'cs_description',
    ]) ||
    !numbers(value, ['duration']) ||
    !user(value['reported_by'])
  )
    return false;
  const outage = value['outage'];
  return (
    outage === undefined ||
    outage === null ||
    (record(outage) && (outage['id'] == null || positiveId(outage['id'])) && strings(outage, ['begins_at']))
  );
}

export function narrowOutageUpdate(value: unknown): OutageUpdate {
  if (!isUpdate(value)) throw new Error('Invalid outage update identity or fields');
  return value;
}
