import { describe, expect, it } from 'vitest';

import type { TransactionChain } from '../../../lib/api/transactions';
import {
  RECENT_FAILURE_WINDOW_MS,
  buildRecentVpsFailures,
  isRecentFailedChain,
  mergeTransactionChains,
  recentFailureEvaluationTime,
  recentVpsFailureChains,
} from './recentVpsFailures';

const NOW = Date.parse('2026-10-16T12:00:00Z');

function chain(id: number, createdAt: string | undefined, vpsIds: number[]): TransactionChain {
  return { id, state: 'failed', created_at: createdAt, concerns: vpsIds.map((vpsId) => ['Vps', vpsId]) };
}

describe('recentVpsFailures', () => {
  it('keeps failures inside the window and drops older or undated ones', () => {
    const edge = new Date(NOW - RECENT_FAILURE_WINDOW_MS).toISOString();
    const justOutside = new Date(NOW - RECENT_FAILURE_WINDOW_MS - 1000).toISOString();

    expect(isRecentFailedChain(chain(1, edge, [1]), NOW)).toBe(true);
    expect(isRecentFailedChain(chain(2, justOutside, [1]), NOW)).toBe(false);
    expect(isRecentFailedChain(chain(3, '2022-05-08T09:09:00Z', [1]), NOW)).toBe(false);
    expect(isRecentFailedChain(chain(4, undefined, [1]), NOW)).toBe(false);
    expect(isRecentFailedChain(chain(5, 'not a date', [1]), NOW)).toBe(false);
  });

  it('returns the newest recent failure first for each concerned VPS', () => {
    const failures = buildRecentVpsFailures(
      [
        chain(7001, '2026-10-14T10:00:00Z', [101]),
        chain(7005, '2026-10-15T10:00:00Z', [101, 202]),
        chain(6607914, '2022-08-18T14:18:25Z', [202]),
      ],
      NOW
    );

    expect(recentVpsFailureChains(failures, 101).map((c) => c.id)).toEqual([7005, 7001]);
    expect(recentVpsFailureChains(failures, 202).map((c) => c.id)).toEqual([7005]);
    expect(recentVpsFailureChains(failures, 303)).toEqual([]);
    expect(recentVpsFailureChains(undefined, 101)).toEqual([]);
  });

  it('lets a cached failure expire when later refetches fail', () => {
    const createdAt = Date.parse('2026-10-09T12:00:30Z');
    const cached = [chain(7001, new Date(createdAt).toISOString(), [101])];
    const lastSuccess = createdAt + RECENT_FAILURE_WINDOW_MS - 60_000;
    const lastError = createdAt + RECENT_FAILURE_WINDOW_MS + 120_000;

    const atSuccess = buildRecentVpsFailures(cached, recentFailureEvaluationTime(lastSuccess, 0));
    const afterError = buildRecentVpsFailures(cached, recentFailureEvaluationTime(lastSuccess, lastError));

    expect(recentVpsFailureChains(atSuccess, 101).map((c) => c.id)).toEqual([7001]);
    expect(recentVpsFailureChains(afterError, 101)).toEqual([]);
  });

  it('evaluates the window on whole minutes so unchanged refetches keep the same result', () => {
    const minute = Date.parse('2026-10-16T12:00:00Z');

    expect(recentFailureEvaluationTime(minute + 5_000, 0)).toBe(minute);
    expect(recentFailureEvaluationTime(minute + 59_999, minute + 1_000)).toBe(minute);
    expect(recentFailureEvaluationTime(minute + 1_000, minute + 61_000)).toBe(minute + 60_000);
    expect(recentFailureEvaluationTime(0, 0)).toBe(0);
  });

  it('keeps a failure created after the rounded evaluation time', () => {
    const fetchedAt = Date.parse('2026-10-16T12:00:45Z');
    const createdAt = new Date(fetchedAt - 10_000).toISOString();

    expect(isRecentFailedChain(chain(1, createdAt, [1]), recentFailureEvaluationTime(fetchedAt, 0))).toBe(true);
  });

  it('treats missing query data as no failures', () => {
    expect(recentVpsFailureChains(buildRecentVpsFailures(undefined, NOW), 101)).toEqual([]);
  });

  it('merges failed and fatal pages without duplicates, newest first', () => {
    const merged = mergeTransactionChains([
      [chain(10, undefined, []), chain(12, undefined, [])],
      [chain(12, undefined, []), chain(11, undefined, []), { id: 0 }],
    ]);

    expect(merged.map((c) => c.id)).toEqual([12, 11, 10]);
  });
});
