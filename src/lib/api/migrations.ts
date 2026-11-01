import type { MigrationPlan__CreateInput, MigrationPlan__IndexInput, MigrationPlan__VpsMigration__CreateInput, MigrationPlan__VpsMigration__IndexInput } from 'vpsadmin-typescript-client';
import type { MigrationPlan__ShowOutput, MigrationPlan__VpsMigration__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { fields, positiveId, reference, rows, object, type StorageReference } from './vpsStorageOutput';

export type MigrationPlan = Omit<MigrationPlan__ShowOutput, 'id' | 'user'> & { id: number; user?: StorageReference | null; } & Record<string, unknown>;
function isMigrationPlan(value: unknown): value is MigrationPlan {
  return fields(value, ['state', 'reason', 'created_at', 'finished_at'], ['concurrency'], ['stop_on_error', 'send_mail']) && positiveId(value['id'])
    && reference(value['user']);
}

export type VpsMigration = Omit<MigrationPlan__VpsMigration__ShowOutput, 'id' | 'transaction_chain' | 'src_node' | 'vps' | 'dst_node'> & { id: number; transaction_chain?: StorageReference | null; src_node?: StorageReference | null; vps?: StorageReference | null; dst_node?: StorageReference | null; } & Record<string, unknown>;
function isVpsMigration(value: unknown): value is VpsMigration {
  return fields(value, ['state', 'created_at', 'started_at', 'finished_at'], [], ['maintenance_window', 'cleanup_data']) && positiveId(value['id'])
    && reference(value['transaction_chain'])
    && reference(value['src_node'])
    && reference(value['vps'])
    && reference(value['dst_node']);
}

import { getApi } from './sdk';

// Migration plans (admin)

export async function fetchMigrationPlans(opts?: {
  limit?: number;
  fromId?: number;
  state?: string;
  userId?: number;
}) {
  const params: MigrationPlan__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.state) params['state'] = opts.state;
  if (opts?.userId !== undefined) params['user'] = opts.userId;

  const res = await (await getApi()).migration_plan.index({
    params,
  });

  return narrowApiResult(res, data => rows(data, isMigrationPlan), 'fetchMigrationPlans');
}

export async function fetchMigrationPlan(planId: number) {
  const res = await (await getApi()).migration_plan.show({
    path: { migration_plan_id: planId },
  });
  return narrowApiResult(res, data => object(data, isMigrationPlan), 'fetchMigrationPlan');
}

export async function createMigrationPlan(opts?: MigrationPlan__CreateInput) {
  const res = await (await getApi()).migration_plan.create({
    params: opts,
  });
  return narrowApiResult(res, data => object(data, isMigrationPlan), 'createMigrationPlan');
}

export async function createMigrationPlanVpsMigration(
  planId: number,
  opts: MigrationPlan__VpsMigration__CreateInput
) {
  const res = await (await getApi()).migration_plan.vps_migration.create({
    path: { migration_plan_id: planId },
    params: opts,
  });
  return narrowApiResult(res, data => object(data, isVpsMigration), 'createMigrationPlanVpsMigration');
}

export async function fetchMigrationPlanVpsMigrations(planId: number, opts?: { limit?: number; fromId?: number }) {
  const params: MigrationPlan__VpsMigration__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (await getApi()).migration_plan.vps_migration.index({
    path: { migration_plan_id: planId },
    params,
  });

  return narrowApiResult(res, data => rows(data, isVpsMigration), 'fetchMigrationPlanVpsMigrations');
}

export async function startMigrationPlan(planId: number) {
  const res = await (await getApi()).migration_plan.start({
    path: { migration_plan_id: planId },
  });
  return narrowApiResult(res, data => object(data, isMigrationPlan), 'startMigrationPlan');
}

export async function cancelMigrationPlan(planId: number) {
  const res = await (await getApi()).migration_plan.cancel({
    path: { migration_plan_id: planId },
  });
  return narrowApiResult(res, data => object(data, isMigrationPlan), 'cancelMigrationPlan');
}

export async function deleteMigrationPlan(planId: number) {
  return (await getApi()).migration_plan.delete({
    path: { migration_plan_id: planId },
  });
}
