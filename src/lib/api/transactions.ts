import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  Location__ShowOutput,
  TransactionChain__IndexOutput,
  Transaction__IndexOutput,
} from 'vpsadmin-typescript-client';
import type { TransactionChain__IndexInput, Transaction__IndexInput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import type { ResourceRef } from './appTypes';
import type { Node } from './nodes';
import type { User } from './users';

export type TransactionChain = Omit<TransactionChain__IndexOutput[number], 'id' | 'user' | 'user_session'> & {
  id: number;
  user?: OperationsReference | null;
  user_session?: OperationsReference | null;
  [k: string]: unknown;
};

export type Transaction = Omit<
  Transaction__IndexOutput[number],
  'id' | 'depends_on' | 'node' | 'transaction_chain' | 'user' | 'vps'
> & {
  id: number;
  depends_on?: OperationsReference | null;
  node?: OperationsReference | null;
  transaction_chain?: OperationsReference | null;
  user?: OperationsReference | null;
  vps?: OperationsReference | null;
  [k: string]: unknown;
};

export async function fetchTransactionChains(opts?: {
  limit?: number;
  fromId?: number;
  state?: string;
  name?: string;
  className?: string;
  rowId?: number;
  userId?: number;
  userSessionId?: number;
  count?: boolean;
}) {
  const params: TransactionChain__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.state) params['state'] = opts.state;
  if (opts?.name) params['name'] = opts.name;
  if (opts?.className) params['class_name'] = opts.className;
  if (opts?.rowId !== undefined) params['row_id'] = opts.rowId;
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.userSessionId !== undefined) params['user_session'] = opts.userSessionId;

  const res = await (
    await getApi()
  ).transaction_chain.index({ params,
    meta: opts?.count ? { count: true } : undefined });
  return narrowApiResult(res, narrowTransactionChainList, 'transaction_chains');
}

/**
 * Convenience helper: fetch only active (non-finished) transaction chains.
 *
 * Chain state space observed in vpsAdmin: staged, queued, rollbacking, done,
 * failed, fatal, resolved.
 */
export async function fetchActiveTransactionChains(opts?: {
  limit?: number;
  fromId?: number;
  name?: string;
  className?: string;
  rowId?: number;
  userId?: number;
  userSessionId?: number;
}) {
  const limit = opts?.limit ?? 100;
  const states = ['staged', 'queued', 'rollbacking'] as const;

  const res = await Promise.all(
    states.map((st) =>
      fetchTransactionChains({
        limit,
        fromId: opts?.fromId,
        state: st,
        name: opts?.name,
        className: opts?.className,
        rowId: opts?.rowId,
        userId: opts?.userId,
        userSessionId: opts?.userSessionId,
      })
    )
  );

  const combined = res.flatMap((r) => r.data ?? []);
  const byId = new Map<number, TransactionChain>();
  for (const c of combined) {
    const id = typeof c.id === 'number' ? c.id : Number(c.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    byId.set(id, c);
  }

  return [...byId.values()].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

export async function fetchTransactionChain(chainId: number) {
  return narrowApiResult(
    await (await getApi()).transaction_chain.show({ path: { transaction_chain_id: chainId } }),
    narrowTransactionChain,
    'transaction_chain.show'
  );
}

export async function fetchTransactions(opts?: {
  limit?: number;
  fromId?: number;
  transactionChainId?: number;
  nodeId?: number;
  type?: number;
  success?: 0 | 1;
  done?: 'waiting' | 'staged' | 'done';
}) {
  const params: Transaction__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.transactionChainId !== undefined) params['transaction_chain'] = opts.transactionChainId;
  if (opts?.nodeId !== undefined) params['node'] = opts.nodeId;
  if (opts?.type !== undefined) params['type'] = opts.type;
  if (opts?.success !== undefined) params['success'] = opts.success;
  if (opts?.done) params['done'] = opts.done;

  const res = await (await getApi()).transaction.index({ params });
  return narrowApiResult(res, narrowTransactionList, 'transactions');
}

export async function fetchTransaction(transactionId: number) {
  return narrowApiResult(
    await (await getApi()).transaction.show({ path: { transaction_id: transactionId } }),
    narrowTransaction,
    'transaction.show'
  );
}

function isTransactionChain(value: unknown): value is TransactionChain {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['created_at', 'label', 'name', 'state'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['progress', 'size'].every(
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
function narrowTransactionChain(value: unknown): TransactionChain {
  if (!isTransactionChain(value)) throw new TypeError('Invalid TransactionChain fields');
  return value;
}
function narrowTransactionChainList(value: unknown): TransactionChain[] {
  if (!Array.isArray(value)) throw new TypeError('Expected TransactionChain list');
  return value.map(narrowTransactionChain);
}

function isTransaction(value: unknown): value is Transaction {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['created_at', 'done', 'finished_at', 'input', 'label', 'name', 'output', 'started_at'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['priority', 'success', 'type'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['urgent'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'boolean') &&
    ['depends_on', 'node', 'transaction_chain', 'user', 'vps'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowTransaction(value: unknown): Transaction {
  if (!isTransaction(value)) throw new TypeError('Invalid Transaction fields');
  return value;
}
function narrowTransactionList(value: unknown): Transaction[] {
  if (!Array.isArray(value)) throw new TypeError('Expected Transaction list');
  return value.map(narrowTransaction);
}
