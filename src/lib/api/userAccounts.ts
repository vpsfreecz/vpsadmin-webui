import type { UserAccount__ShowOutput, UserAccount__UpdateInput } from 'vpsadmin-typescript-client';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type UserAccount = UserAccount__ShowOutput & { id: number };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isAccount(data: unknown): data is UserAccount {
  if (
    !record(data) ||
    typeof data['id'] !== 'number' ||
    !Number.isSafeInteger(data['id']) ||
    data['id'] <= 0 ||
    (data['monthly_payment'] != null &&
      (typeof data['monthly_payment'] !== 'number' || !Number.isFinite(data['monthly_payment']))) ||
    (data['paid_until'] != null && typeof data['paid_until'] !== 'string')
  )
    return false;
  return true;
}

function account(data: unknown): UserAccount {
  if (!isAccount(data)) throw new TypeError('Expected user account');
  return data;
}

export async function fetchUserAccount(userId: number) {
  return narrowApiResult(
    await (await getApi()).user_account.show({ path: { user_account_id: userId } }),
    account,
    'user account'
  );
}

export async function updateUserAccount(userId: number, params: UserAccount__UpdateInput) {
  return narrowApiResult(
    await (await getApi()).user_account.update({ path: { user_account_id: userId }, params }),
    account,
    'user account update'
  );
}
