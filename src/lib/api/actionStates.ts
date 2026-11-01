import type { ActionState__IndexInput, ActionState__PollInput, ActionState__ShowOutput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

/** Task view: validated identity, generated nullable fields and unknown diagnostics. */
export type ActionState = Omit<ActionState__ShowOutput, 'id'> & { id: number; [key: string]: unknown };

function actionState(value: ActionState__ShowOutput): ActionState {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.id !== 'number' || !Number.isSafeInteger(value.id) || value.id <= 0) {
    throw new Error('Invalid action-state identity');
  }
  for (const key of ['label', 'unit', 'created_at', 'updated_at'] as const) {
    if (value[key] != null && typeof value[key] !== 'string') throw new Error(`Invalid action-state ${key}`);
  }
  for (const key of ['finished', 'status', 'can_cancel'] as const) {
    if (value[key] != null && typeof value[key] !== 'boolean') throw new Error(`Invalid action-state ${key}`);
  }
  for (const key of ['current', 'total'] as const) {
    if (value[key] != null && (typeof value[key] !== 'number' || !Number.isFinite(value[key]))) {
      throw new Error(`Invalid action-state ${key}`);
    }
  }
  return { ...value, id: value.id };
}

export async function fetchActionStates(opts?: { limit?: number; fromId?: number; order?: 'newest' | 'oldest' }) {
  const params: ActionState__IndexInput = {
    limit: opts?.limit, from_id: opts?.fromId, order: opts?.order,
  };
  const result = await (await getApi()).action_state.index({ params });
  return narrowApiResult(result, data => {
    if (!Array.isArray(data)) throw new Error('Invalid action-state collection');
    return data.map(actionState);
  }, 'action states');
}

export async function fetchActionState(actionStateId: number) {
  const result = await (await getApi()).action_state.show({ path: { action_state_id: actionStateId } });
  return narrowApiResult(result, actionState, 'action state');
}

export async function pollActionState(
  actionStateId: number,
  opts?: { timeout?: number; updateIn?: number; status?: boolean; current?: number; total?: number },
) {
  const params: ActionState__PollInput = {
    timeout: opts?.timeout, update_in: opts?.updateIn, status: opts?.status, current: opts?.current, total: opts?.total,
  };
  const result = await (await getApi()).action_state.poll({ path: { action_state_id: actionStateId }, params });
  return narrowApiResult(result, actionState, 'action-state poll');
}

export async function cancelActionState(actionStateId: number) {
  return (await getApi()).action_state.cancel({ path: { action_state_id: actionStateId } });
}
