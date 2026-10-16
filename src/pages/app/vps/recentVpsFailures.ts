import type { TransactionChain } from '../../../lib/api/transactions';
import { buildTransactionLockIndex, transactionLockChainIds, type TransactionLockIndex } from '../../../lib/lockIndex';

export const RECENT_FAILURE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const EVALUATION_STEP_MS = 60 * 1000;

export interface RecentVpsFailures {
  index: TransactionLockIndex;
  chainsById: ReadonlyMap<number, TransactionChain>;
}

export function mergeTransactionChains(groups: TransactionChain[][]): TransactionChain[] {
  const byId = new Map<number, TransactionChain>();

  for (const group of groups) {
    for (const chain of group) {
      if (!Number.isFinite(chain.id) || chain.id <= 0) continue;
      byId.set(chain.id, chain);
    }
  }

  return [...byId.values()].sort((a, b) => b.id - a.id);
}

export function isRecentFailedChain(
  chain: TransactionChain,
  nowMs: number,
  windowMs = RECENT_FAILURE_WINDOW_MS
): boolean {
  const createdMs = Date.parse(chain.created_at ?? '');
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs <= windowMs;
}

// Failed refetches also advance the clock so a cached failure still expires during an API outage.
export function recentFailureEvaluationTime(dataUpdatedAt: number, errorUpdatedAt: number): number {
  const latest = Math.max(dataUpdatedAt, errorUpdatedAt);
  return latest - (latest % EVALUATION_STEP_MS);
}

export function buildRecentVpsFailures(chains: TransactionChain[] | undefined, nowMs: number): RecentVpsFailures {
  const recent = (chains ?? []).filter((chain) => isRecentFailedChain(chain, nowMs));
  return {
    index: buildTransactionLockIndex(recent, { onlyActive: false }),
    chainsById: new Map(recent.map((chain) => [chain.id, chain])),
  };
}

export function recentVpsFailureChains(failures: RecentVpsFailures | undefined, vpsId: number): TransactionChain[] {
  if (!failures) return [];
  return transactionLockChainIds(failures.index, 'Vps', vpsId)
    .map((id) => failures.chainsById.get(id))
    .filter((chain): chain is TransactionChain => chain !== undefined);
}
