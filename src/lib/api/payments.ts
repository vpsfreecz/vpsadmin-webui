import type {
  IncomingPayment__ShowOutput,
  IncomingPayment__IndexInput,
  IncomingPayment__UpdateInput,
  UserPayment__ShowOutput,
  UserPayment__CreateInput,
  UserPayment__IndexInput,
  PaymentStats__EstimateIncomeInput,
  PaymentStats__EstimateIncomeOutput,
  User__ShowOutput,
  OsTemplate__ShowOutput,
} from 'vpsadmin-typescript-client';
import { expectArray } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

export type ResourceRef = Pick<OsTemplate__ShowOutput, 'id' | 'label' | 'name'> &
  Pick<User__ShowOutput, 'login'> &
  Record<string, unknown>;
export type IncomingPayment = IncomingPayment__ShowOutput & { id: number };
export type IncomingPaymentState = NonNullable<IncomingPayment__UpdateInput['state']>;
export type UserPayment = Omit<UserPayment__ShowOutput, 'incoming_payment' | 'user' | 'accounted_by'> & {
  id: number;
  incoming_payment?: ResourceRef | null;
  user?: ResourceRef | null;
  accounted_by?: ResourceRef | null;
};
export type CreateUserPaymentInput = UserPayment__CreateInput &
  ({ user: number; incoming_payment: number } | { user: number; amount: number });
export type IncomeEstimateSelection = 'exactly_until' | 'all_until';
export type EstimateIncomeInput = PaymentStats__EstimateIncomeInput & { select: IncomeEstimateSelection };
export type IncomeEstimate = {
  [K in keyof PaymentStats__EstimateIncomeOutput]-?: NonNullable<PaymentStats__EstimateIncomeOutput[K]>;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function strings(row: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => row[key] == null || typeof row[key] === 'string');
}

function reference(value: unknown): value is ResourceRef | null | undefined {
  return (
    value == null ||
    (record(value) &&
      (value['id'] == null || id(value['id'])) &&
      strings(value, ['label', 'name', 'login', 'transaction_id']))
  );
}

function isIncomingPayment(value: unknown): value is IncomingPayment {
  return (
    record(value) &&
    id(value['id']) &&
    strings(value, [
      'transaction_id',
      'state',
      'date',
      'currency',
      'src_currency',
      'account_name',
      'user_ident',
      'user_message',
      'vs',
      'ks',
      'ss',
      'transaction_type',
      'comment',
      'created_at',
    ]) &&
    ['amount', 'src_amount'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}

function incomingPayment(value: unknown): IncomingPayment {
  if (!isIncomingPayment(value)) throw new Error('Invalid incoming payment identity or fields');
  return value;
}

function isUserPayment(value: unknown): value is UserPayment {
  return (
    record(value) &&
    id(value['id']) &&
    strings(value, ['from_date', 'to_date', 'created_at']) &&
    (value['amount'] == null || (typeof value['amount'] === 'number' && Number.isFinite(value['amount']))) &&
    reference(value['incoming_payment']) &&
    reference(value['user']) &&
    reference(value['accounted_by'])
  );
}

function userPayment(value: unknown): UserPayment {
  if (!isUserPayment(value)) throw new Error('Invalid user payment identity or fields');
  return value;
}

export async function fetchIncomingPayments(opts?: {
  limit?: number;
  fromId?: number;
  state?: string;
  count?: boolean;
}) {
  const params: IncomingPayment__IndexInput = {
    limit: opts?.limit,
    from_id: opts?.fromId,
    state: opts?.state || undefined,
  };
  const res = await (
    await getApi()
  ).incoming_payment.index({ params, meta: opts?.count ? { count: true } : undefined });
  return narrowApiResult(
    res,
    (data) => expectArray<unknown>(data, 'incoming payments').map(incomingPayment),
    'incoming payments'
  );
}

export async function fetchIncomingPayment(paymentId: number) {
  const res = await (await getApi()).incoming_payment.show({ path: { incoming_payment_id: paymentId } });
  return narrowApiResult(res, incomingPayment, 'incoming payment');
}

export async function updateIncomingPaymentState(paymentId: number, state: IncomingPaymentState) {
  const res = await (
    await getApi()
  ).incoming_payment.update({ path: { incoming_payment_id: paymentId }, params: { state } });
  return narrowApiResult(res, incomingPayment, 'incoming payment update');
}

export async function createUserPayment(params: CreateUserPaymentInput) {
  const res = await (await getApi()).user_payment.create({ params });
  return narrowApiResult(res, userPayment, 'user payment create');
}

export async function fetchUserPayments(opts?: {
  limit?: number;
  fromId?: number;
  userId?: number;
  accountedById?: number;
  includes?: string;
}) {
  const params: UserPayment__IndexInput = {
    limit: opts?.limit,
    from_id: opts?.fromId,
    user: opts?.userId,
    accounted_by: opts?.accountedById,
  };
  const res = await (
    await getApi()
  ).user_payment.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });
  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'user payments').map(userPayment), 'user payments');
}

export async function fetchPaymentInstructions(userId: number) {
  const res = await (await getApi()).user.get_payment_instructions({ path: { user_id: userId } });
  return narrowApiResult(
    res,
    (data) => {
      if (!record(data) || typeof data['instructions'] !== 'string') throw new Error('Missing payment instructions');
      return { instructions: data['instructions'] };
    },
    'payment instructions'
  );
}

/** Currency is not declared by this action; present estimated_income as the raw API value. */
export async function estimateIncome(input: EstimateIncomeInput, opts?: { signal?: AbortSignal }) {
  const res = await (await getApi()).payment_stats.estimate_income({ params: input, signal: opts?.signal });
  return narrowApiResult(
    res,
    (data) => {
      if (typeof data.user_count !== 'number' || !Number.isSafeInteger(data.user_count) || data.user_count < 0) {
        throw new Error('payment_stats#estimate_income: invalid user_count');
      }
      if (typeof data.estimated_income !== 'number' || !Number.isFinite(data.estimated_income)) {
        throw new Error('payment_stats#estimate_income: invalid estimated_income');
      }
      return { user_count: data.user_count, estimated_income: data.estimated_income };
    },
    'income estimate'
  );
}
