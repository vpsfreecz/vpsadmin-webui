import type { Node__ShowOutput, OsTemplate__ShowOutput, User__ShowOutput, Vps__ShowOutput } from 'vpsadmin-typescript-client';

/** Partial includes used by the VPS/storage views; no full related entity is implied. */
export type StorageReference = Pick<User__ShowOutput, 'id' | 'login'>
  & Pick<OsTemplate__ShowOutput, 'name' | 'label'>
  & Pick<Node__ShowOutput, 'domain_name'>
  & Pick<Vps__ShowOutput, 'hostname'>
  & Record<string, unknown>;

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function positiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Validate only fields consumed by these views, retaining the original object. */
export function fields(value: unknown, strings: readonly string[] = [], numbers: readonly string[] = [], booleans: readonly string[] = []): value is Record<string, unknown> {
  return record(value)
    && strings.every(key => value[key] == null || typeof value[key] === 'string')
    && numbers.every(key => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key])))
    && booleans.every(key => value[key] == null || typeof value[key] === 'boolean');
}

export function reference(value: unknown): value is StorageReference | null | undefined {
  return value == null || (fields(value, ['name', 'label', 'login', 'hostname', 'domain_name'])
    && (value['id'] == null || positiveId(value['id'])));
}

export function rows<T>(value: unknown, guard: (row: unknown) => row is T): T[] {
  if (!Array.isArray(value) || !value.every(guard)) throw new Error('Invalid VPS/storage collection');
  return value;
}

export function object<T>(value: unknown, guard: (row: unknown) => row is T): T {
  if (!guard(value)) throw new Error('Invalid VPS/storage object');
  return value;
}
