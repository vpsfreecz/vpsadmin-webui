import { describe, expect, it } from 'vitest';
import { recentVpsOomReports, RECENT_OOM_WINDOW_MS } from './recentVpsOomReports';
import type { OomReport } from '../../../lib/api/oom';

const now = Date.parse('2026-11-07T12:00:00Z');
const report = (id: number, vps: number, offset: number): OomReport => ({
  id,
  vps: { id: vps, hostname: 'synthetic.example' },
  created_at: new Date(now + offset).toISOString(),
});
describe('recent VPS OOM evidence', () => {
  it('selects the latest dated event per VPS, independent of response order', () => {
    const older = report(2, 10, -2000),
      newer = report(1, 10, -1000),
      other = report(3, 11, -500);
    const index = recentVpsOomReports([newer, other, older], now);
    expect(index.get(10)).toBe(newer);
    expect(index.get(11)).toBe(other);
    expect(index.get(12)).toBeUndefined();
  });
  it('expires old cached evidence without treating future or missing times as measurements', () => {
    const recent = report(1, 10, -1000);
    expect(recentVpsOomReports([recent], now).size).toBe(1);
    expect(recentVpsOomReports([recent], now + RECENT_OOM_WINDOW_MS).size).toBe(0);
    expect(
      recentVpsOomReports(
        [
          report(2, 10, 1),
          report(3, 10, -RECENT_OOM_WINDOW_MS - 1),
          { id: 4, vps: { id: 10, hostname: 'synthetic.example' } },
          { id: 5, vps: { id: 10, hostname: 'synthetic.example' }, created_at: 'invalid' },
          { id: 6, created_at: new Date(now).toISOString() },
          report(-1, 10, -1000),
          report(7, 0, -1000),
        ],
        now
      ).size
    ).toBe(0);
    expect(recentVpsOomReports(undefined, now).size).toBe(0);
  });
});
