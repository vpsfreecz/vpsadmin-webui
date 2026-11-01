import type {
  Outage__CreateInput,
  Outage__UpdateInput,
  Outage__IndexInput,
  Outage__Entity__CreateInput,
  OutageUpdate__CreateInput,
  Component__ShowOutput,
  Component__IndexInput,
  UserOutage__IndexOutput,
  VpsOutage__IndexOutput,
  ExportOutage__IndexOutput,
} from 'vpsadmin-typescript-client';
import { expectArray, isAmbiguousMutationError } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { fetchAllOutageEntities, fetchAllOutageHandlers } from './outageScopePaging';
import {
  narrowOutage,
  narrowOutageEntity,
  narrowOutageHandler,
  narrowOutageUpdate,
  type OutageHandler,
  type OutageEntity,
} from './outageViews';

export type OutageAdminState = 'staged' | 'announced' | 'cancelled' | 'resolved';
export { fetchAllOutageEntities, fetchAllOutageHandlers, OutageScopeReadError } from './outageScopePaging';
export type OutageAdminType = 'planned_outage' | 'unplanned_outage';
export type OutageImpact =
  'tbd' | 'performance' | 'network' | 'system_restart' | 'system_reset' | 'unavailability' | 'export';

export interface OutageFilters {
  limit?: number;
  fromId?: number;
  type?: string;
  state?: string;
  impact?: string;
  affected?: boolean;
  user?: number;
  handledBy?: number;
  vps?: number;
  exportId?: number;
  environment?: number;
  location?: number;
  node?: number;
  entityName?: string;
  entityId?: number;
  order?: string;
}

export type OutagePayload = Outage__CreateInput;
export type OutageSystemsPayload = {
  entities: Array<Outage__Entity__CreateInput & { name: string }>;
  handlers: number[];
};
export type OutageComponent = Component__ShowOutput & { id: number };
export type OutageUpdatePayload = OutageUpdate__CreateInput;

export function outageStateTransitionPayload(
  outageId: number,
  state: OutageAdminState,
  sendMail = true
): OutageUpdatePayload {
  return {
    outage: outageId,
    state,
    send_mail: sendMail,
  };
}

export type OutageAffectedUser = UserOutage__IndexOutput[number] & { id: number };
export type OutageAffectedVps = VpsOutage__IndexOutput[number] & { id: number };
export type OutageAffectedExport = ExportOutage__IndexOutput[number] & { id: number };

function identified<T extends { id?: number | null }>(row: T): T & { id: number } {
  if (!row || typeof row !== 'object' || !Number.isSafeInteger(row.id) || typeof row.id !== 'number' || row.id <= 0) {
    throw new Error('Invalid outage resource identity');
  }
  return { ...row, id: row.id };
}

/**
 * Outage scope is exposed by HaveAPI as separate entity/handler CRUD calls.
 * There is no bulk or transactional endpoint in either the deployed v4.1 API
 * or current upstream. This error reports whether the client managed to
 * reconcile the scope back to the exact state it received before the change.
 */
export class OutageSystemsApplyError extends Error {
  readonly outageId: number;
  readonly rollbackSucceeded: boolean;
  readonly originalError: unknown;
  readonly rollbackError?: unknown;

  constructor(opts: { outageId: number; rollbackSucceeded: boolean; originalError: unknown; rollbackError?: unknown }) {
    super(
      opts.rollbackSucceeded
        ? `Affected scope for outage #${opts.outageId} was not saved; the previous scope was restored.`
        : `Affected scope for outage #${opts.outageId} may be partially saved; reload the outage before retrying.`
    );
    this.name = 'OutageSystemsApplyError';
    this.outageId = opts.outageId;
    this.rollbackSucceeded = opts.rollbackSucceeded;
    this.originalError = opts.originalError;
    this.rollbackError = opts.rollbackError;
  }
}

/**
 * The API has no endpoint for deleting a newly staged outage. If its initial
 * scope fails, keep the staged report and direct the administrator to its
 * detail instead of allowing an unsafe retry that would create a duplicate.
 */
export class OutageCreateWithSystemsError extends Error {
  readonly outageId: number;
  readonly rollbackSucceeded: boolean;
  readonly systemsError: OutageSystemsApplyError;

  constructor(outageId: number, systemsError: OutageSystemsApplyError) {
    super(
      systemsError.rollbackSucceeded
        ? `Outage #${outageId} was created without its affected scope; open the staged report and retry the scope change.`
        : `Outage #${outageId} was created, but its affected scope may be partially saved; reload the staged report before retrying.`
    );
    this.name = 'OutageCreateWithSystemsError';
    this.outageId = outageId;
    this.rollbackSucceeded = systemsError.rollbackSucceeded;
    this.systemsError = systemsError;
  }
}

/**
 * A transport/server failure while creating the root report is ambiguous: the
 * API can commit the POST and lose its response, and it has no idempotency key.
 * Callers must refresh the outage list before offering another create attempt.
 */
export class OutageCreateIndeterminateError extends Error {
  readonly originalError: unknown;

  constructor(originalError: unknown) {
    super('The outage create result is unknown; refresh and verify the outage list before retrying.');
    this.name = 'OutageCreateIndeterminateError';
    this.originalError = originalError;
  }
}

function outageListParams(opts?: OutageFilters): Outage__IndexInput {
  const params: Outage__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.type) params['type'] = opts.type;
  if (opts?.state) params['state'] = opts.state;
  if (opts?.impact) params['impact'] = opts.impact;
  if (opts?.affected !== undefined) params['affected'] = opts.affected;
  if (opts?.user !== undefined) params['user'] = opts.user;
  if (opts?.handledBy !== undefined) params['handled_by'] = opts.handledBy;
  if (opts?.vps !== undefined) params['vps'] = opts.vps;
  if (opts?.exportId !== undefined) params['export'] = opts.exportId;
  if (opts?.environment !== undefined) params['environment'] = opts.environment;
  if (opts?.location !== undefined) params['location'] = opts.location;
  if (opts?.node !== undefined) params['node'] = opts.node;
  if (opts?.entityName) params['entity_name'] = opts.entityName;
  if (opts?.entityId !== undefined) params['entity_id'] = opts.entityId;
  if (opts?.order) params['order'] = opts.order;
  return params;
}

export async function fetchAdminOutages(opts?: OutageFilters) {
  const res = await (await getApi()).outage.index({ params: outageListParams(opts) });
  return narrowApiResult(
    res,
    (data) => expectArray<(typeof data)[number]>(data, 'outage records').map(narrowOutage),
    'outage records'
  );
}

export async function fetchOutageComponents(opts?: { limit?: number; fromId?: number }) {
  const params: Component__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).component.index({ params });
  return narrowApiResult(
    res,
    (data) => expectArray<(typeof data)[number]>(data, 'outage records').map(identified),
    'outage records'
  );
}

export async function createOutage(params: OutagePayload) {
  const res = await (await getApi()).outage.create({ params: { ...params } });
  return narrowApiResult(res, narrowOutage, 'outage.create');
}

export async function createOutageWithSystems(params: OutagePayload, systems: OutageSystemsPayload) {
  let res: Awaited<ReturnType<typeof createOutage>>;
  try {
    res = await createOutage(params);
  } catch (error) {
    if (!isAmbiguousMutationError(error)) throw error;
    throw new OutageCreateIndeterminateError(error);
  }
  const outageId = res.data.id;
  try {
    await applyOutageSystems(outageId, systems);
  } catch (error) {
    if (error instanceof OutageSystemsApplyError) {
      throw new OutageCreateWithSystemsError(outageId, error);
    }
    throw error;
  }
  return res;
}

export async function updateOutage(outageId: number, params: Outage__UpdateInput) {
  const res = await (await getApi()).outage.update({ path: { outage_id: outageId }, params: { ...params } });
  return narrowApiResult(res, narrowOutage, 'outage.update');
}

export async function rebuildOutageAffectedVps(outageId: number) {
  return (await getApi()).outage.rebuild_affected_vps({ path: { outage_id: outageId } });
}

export async function createOutageUpdate(params: OutageUpdatePayload) {
  const res = await (await getApi()).outage_update.create({ params: { ...params } });
  return narrowApiResult(res, narrowOutageUpdate, 'outage_update.create');
}

export async function createOutageEntity(outageId: number, params: Outage__Entity__CreateInput & { name: string }) {
  const res = await (await getApi()).outage.entity.create({ path: { outage_id: outageId }, params });
  return narrowApiResult(res, narrowOutageEntity, 'outage.entity.create');
}

export async function deleteOutageEntity(outageId: number, entityId: number) {
  return (await getApi()).outage.entity.delete({ path: { outage_id: outageId, entity_id: entityId } });
}

export async function createOutageHandler(outageId: number, params: { user: number }) {
  const res = await (await getApi()).outage.handler.create({ path: { outage_id: outageId }, params });
  return narrowApiResult(res, narrowOutageHandler, 'outage.handler.create');
}

export async function deleteOutageHandler(outageId: number, handlerId: number) {
  return (await getApi()).outage.handler.delete({ path: { outage_id: outageId, handler_id: handlerId } });
}

export function outageHandlerUserId(h: OutageHandler): number | null {
  const raw = h.user?.id;
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0 ? raw : null;
}

function outageEntityKey(name: string, entityId: number | null | undefined): string {
  return `${name}:${entityId ?? ''}`;
}

function currentOutageSystems(entities: OutageEntity[], handlers: OutageHandler[]): OutageSystemsPayload {
  return {
    entities: entities.map((entity) => ({
      name: entity.name,
      ...(entity.entity_id == null ? {} : { entity_id: entity.entity_id }),
    })),
    handlers: handlers.map(outageHandlerUserId).filter((value): value is number => value !== null),
  };
}

async function applyOutageSystemsUnsafe(
  outageId: number,
  currentEntities: OutageEntity[],
  currentHandlers: OutageHandler[],
  wanted: OutageSystemsPayload
) {
  const wantedEntities = wanted.entities;
  const wantedKeys = new Set(wantedEntities.map((entity) => outageEntityKey(entity.name, entity.entity_id)));
  const currentKeys = new Set(currentEntities.map((entity) => outageEntityKey(entity.name, entity.entity_id)));

  for (const entity of wantedEntities) {
    if (!currentKeys.has(outageEntityKey(entity.name, entity.entity_id))) {
      await createOutageEntity(outageId, {
        name: entity.name,
        ...(entity.entity_id == null ? {} : { entity_id: entity.entity_id }),
      });
    }
  }

  const wantedHandlers = new Set(wanted.handlers);
  const currentHandlerIds = new Set(
    currentHandlers.map(outageHandlerUserId).filter((value): value is number => value !== null)
  );

  for (const user of wantedHandlers) {
    if (!currentHandlerIds.has(user)) await createOutageHandler(outageId, { user });
  }

  for (const entity of currentEntities) {
    if (!wantedKeys.has(outageEntityKey(entity.name, entity.entity_id))) {
      await deleteOutageEntity(outageId, entity.id);
    }
  }

  for (const handler of currentHandlers) {
    const user = outageHandlerUserId(handler);
    if (user !== null && !wantedHandlers.has(user)) {
      await deleteOutageHandler(outageId, handler.id);
    }
  }

  await rebuildOutageAffectedVps(outageId);
}

export async function applyOutageSystems(outageId: number, wanted: OutageSystemsPayload) {
  // Never mutate from a possibly truncated snapshot supplied by the UI. Both
  // nested indexes are keyset-paginated, so obtain a verified complete scope
  // first. If this fails or hits a safety cap, no writes are attempted.
  const [currentEntities, currentHandlers] = await Promise.all([
    fetchAllOutageEntities(outageId),
    fetchAllOutageHandlers(outageId),
  ]);
  const original = currentOutageSystems(currentEntities, currentHandlers);

  try {
    await applyOutageSystemsUnsafe(outageId, currentEntities, currentHandlers, wanted);
  } catch (originalError) {
    try {
      // A failed HTTP request is ambiguous: the server can commit a write and
      // lose the response. Re-read the actual state before compensating.
      const [actualEntities, actualHandlers] = await Promise.all([
        fetchAllOutageEntities(outageId),
        fetchAllOutageHandlers(outageId),
      ]);
      await applyOutageSystemsUnsafe(outageId, actualEntities, actualHandlers, original);
      throw new OutageSystemsApplyError({
        outageId,
        rollbackSucceeded: true,
        originalError,
      });
    } catch (rollbackError) {
      if (rollbackError instanceof OutageSystemsApplyError) throw rollbackError;
      throw new OutageSystemsApplyError({
        outageId,
        rollbackSucceeded: false,
        originalError,
        rollbackError,
      });
    }
  }
}

export async function fetchUserOutages(outageId: number) {
  const res = await (await getApi()).user_outage.index({ params: { outage: outageId }, meta: { includes: 'user' } });
  return narrowApiResult(
    res,
    (data) => expectArray<(typeof data)[number]>(data, 'outage records').map(identified),
    'outage records'
  );
}

export async function fetchVpsOutages(outageId: number) {
  const res = await (
    await getApi()
  ).vps_outage.index({ params: { outage: outageId }, meta: { includes: 'vps,user,environment,location,node' } });
  return narrowApiResult(
    res,
    (data) => expectArray<(typeof data)[number]>(data, 'outage records').map(identified),
    'outage records'
  );
}

export async function fetchExportOutages(outageId: number) {
  const res = await (
    await getApi()
  ).export_outage.index({ params: { outage: outageId }, meta: { includes: 'export,user,environment,location,node' } });
  return narrowApiResult(
    res,
    (data) => expectArray<(typeof data)[number]>(data, 'outage records').map(identified),
    'outage records'
  );
}
