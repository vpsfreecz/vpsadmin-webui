import type {
  UserNamespaceMap__Entry__CreateInput,
  UserNamespaceMap__Entry__IndexInput,
  UserNamespaceMap__Entry__IndexOutput,
  UserNamespaceMap__Entry__UpdateInput,
  UserNamespaceMap__IndexInput,
  UserNamespaceMap__IndexOutput,
  UserNamespace__IndexInput,
  UserNamespace__IndexOutput,
  User__ShowOutput,
} from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import type { UserRole } from '../roles';

export type UserNamespace = Omit<UserNamespace__IndexOutput[number], 'id' | 'user'> & {
  id: number;
  user?: NamespaceOwner | null;
};
export type UserNamespaceMap = Omit<UserNamespaceMap__IndexOutput[number], 'id' | 'user_namespace'> & {
  id: number;
  user_namespace?: Partial<UserNamespace> | null;
};
export type UserNamespaceMapEntry = UserNamespaceMap__Entry__IndexOutput[number] & { id: number };
type NamespaceOwner = Pick<User__ShowOutput, 'id' | 'login'>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function reference(value: unknown): boolean {
  return (
    record(value) &&
    (value['id'] == null ||
      (typeof value['id'] === 'number' && Number.isSafeInteger(value['id']) && value['id'] > 0)) &&
    ['label', 'login'].every((key) => value[key] == null || typeof value[key] === 'string')
  );
}
function namespaceRef(value: unknown): value is Partial<UserNamespace> {
  return (
    record(value) &&
    reference(value) &&
    ['offset', 'block_count', 'size'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    (value['user'] == null || reference(value['user']))
  );
}

function isUserNamespace(value: unknown): value is UserNamespace {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['offset', 'block_count', 'size'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    (value['user'] == null || reference(value['user']))
  );
}
function readUserNamespace(value: unknown): UserNamespace {
  if (!isUserNamespace(value)) throw new TypeError('Expected UserNamespace');
  return value;
}
function readUserNamespaceList(value: unknown): UserNamespace[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserNamespace collection');
  return value.map(readUserNamespace);
}
function isUserNamespaceMap(value: unknown): value is UserNamespaceMap {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['label'].every((key) => value[key] == null || typeof value[key] === 'string') &&
    (value['user_namespace'] == null || namespaceRef(value['user_namespace']))
  );
}
function readUserNamespaceMap(value: unknown): UserNamespaceMap {
  if (!isUserNamespaceMap(value)) throw new TypeError('Expected UserNamespaceMap');
  return value;
}
function readUserNamespaceMapList(value: unknown): UserNamespaceMap[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserNamespaceMap collection');
  return value.map(readUserNamespaceMap);
}
function isUserNamespaceMapEntry(value: unknown): value is UserNamespaceMapEntry {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['kind'].every((key) => value[key] == null || typeof value[key] === 'string') &&
    ['vps_id', 'ns_id', 'count'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function readUserNamespaceMapEntry(value: unknown): UserNamespaceMapEntry {
  if (!isUserNamespaceMapEntry(value)) throw new TypeError('Expected UserNamespaceMapEntry');
  return value;
}
function readUserNamespaceMapEntryList(value: unknown): UserNamespaceMapEntry[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserNamespaceMapEntry collection');
  return value.map(readUserNamespaceMapEntry);
}

export type UserNamespaceEntryKind = 'uid' | 'gid';

/** Administrators bypass the backend owner restriction and need exact scope. */
export function explicitUserNamespaceOwnerId(input: {
  viewerRole: UserRole;
  fixedOwnerId?: number;
  requestedOwnerId?: number;
  allowRequestedOwner?: boolean;
}): number | undefined {
  if (input.viewerRole !== 'admin') return undefined;
  if (validResourceId(input.fixedOwnerId)) return input.fixedOwnerId;
  if (input.allowRequestedOwner && validResourceId(input.requestedOwnerId)) return input.requestedOwnerId;
  return undefined;
}

function validResourceId(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export async function fetchUserNamespaces(opts?: {
  limit?: number;
  fromId?: number;
  size?: number;
  userId?: number;
  blockCount?: number;
}) {
  const params: UserNamespace__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.size !== undefined) params['size'] = opts.size;
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.blockCount !== undefined) params['block_count'] = opts.blockCount;

  const res = narrowApiResult(
    await (await getApi()).user_namespace.index({ params }),
    readUserNamespaceList,
    'fetchUserNamespaces'
  );

  return { ...res, data: res.data };
}

export async function fetchUserNamespace(id: number) {
  return narrowApiResult(
    await (await getApi()).user_namespace.show({ path: { user_namespace_id: id } }),
    readUserNamespace,
    'fetchUserNamespace'
  );
}

export async function fetchUserNamespaceMaps(opts?: {
  limit?: number;
  fromId?: number;
  userId?: number;
  userNamespaceId?: number;
  includeUserNamespace?: boolean;
}) {
  const params: UserNamespaceMap__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.userNamespaceId !== undefined) params['user_namespace'] = opts.userNamespaceId;

  const res = narrowApiResult(
    await (
      await getApi()
    ).user_namespace_map.index({
      params,
      meta: opts?.includeUserNamespace ? { includes: 'user_namespace' } : undefined,
    }),
    readUserNamespaceMapList,
    'fetchUserNamespaceMaps'
  );

  return { ...res, data: res.data };
}

export async function fetchUserNamespaceMap(mapId: number) {
  return narrowApiResult(
    await (await getApi()).user_namespace_map.show({ path: { user_namespace_map_id: mapId } }),
    readUserNamespaceMap,
    'fetchUserNamespaceMap'
  );
}

export async function createUserNamespaceMap(payload: { userNamespaceId: number; label: string }) {
  return narrowApiResult(
    await (
      await getApi()
    ).user_namespace_map.create({
      params: {
        user_namespace: payload.userNamespaceId,
        label: payload.label,
      },
    }),
    readUserNamespaceMap,
    'createUserNamespaceMap'
  );
}

export async function updateUserNamespaceMap(mapId: number, payload: { label: string; userNamespaceId: number }) {
  return narrowApiResult(
    await (
      await getApi()
    ).user_namespace_map.update({
      path: { user_namespace_map_id: mapId },
      params: {
        // API requires both label and namespace reference (parity with old UI).
        user_namespace: payload.userNamespaceId,
        label: payload.label,
      },
    }),
    readUserNamespaceMap,
    'updateUserNamespaceMap'
  );
}

export async function deleteUserNamespaceMap(mapId: number) {
  return await (await getApi()).user_namespace_map.delete({ path: { user_namespace_map_id: mapId } });
}

export async function fetchUserNamespaceMapEntries(mapId: number, opts?: { limit?: number; fromId?: number }) {
  const params: UserNamespaceMap__Entry__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = narrowApiResult(
    await (await getApi()).user_namespace_map.entry.index({ path: { user_namespace_map_id: mapId }, params }),
    readUserNamespaceMapEntryList,
    'fetchUserNamespaceMapEntries'
  );

  return { ...res, data: res.data };
}

export async function createUserNamespaceMapEntry(mapId: number, payload: UserNamespaceMap__Entry__CreateInput) {
  return narrowApiResult(
    await (await getApi()).user_namespace_map.entry.create({ path: { user_namespace_map_id: mapId }, params: payload }),
    readUserNamespaceMapEntry,
    'createUserNamespaceMapEntry'
  );
}

export async function updateUserNamespaceMapEntry(
  mapId: number,
  entryId: number,
  payload: UserNamespaceMap__Entry__UpdateInput
) {
  return narrowApiResult(
    await (
      await getApi()
    ).user_namespace_map.entry.update({ path: { user_namespace_map_id: mapId, entry_id: entryId }, params: payload }),
    readUserNamespaceMapEntry,
    'updateUserNamespaceMapEntry'
  );
}

export async function deleteUserNamespaceMapEntry(mapId: number, entryId: number) {
  return await (
    await getApi()
  ).user_namespace_map.entry.delete({ path: { user_namespace_map_id: mapId, entry_id: entryId } });
}
