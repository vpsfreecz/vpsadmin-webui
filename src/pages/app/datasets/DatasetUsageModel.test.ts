import { describe, expect, it } from 'vitest';
import { datasetUsageBreakdown } from './DatasetUsageModel';

describe('datasetUsageBreakdown', () => {
  it('distinguishes referenced space from dataset and descendant usage', () => {
    expect(datasetUsageBreakdown({ referenced: 100, used: 900, refquota: 1000, quota: 2000, avail: 8000 })).toEqual([
      { kind: 'reference', used: 100, limit: 1000, free: 900, ratio: 0.1 },
      { kind: 'quota', used: 900, limit: 2000, free: 1100, ratio: 0.45 },
    ]);
  });
  it('does not infer a quota from pool availability for an unlimited dataset', () => {
    expect(datasetUsageBreakdown({ used: 1900, referenced: 100, refquota: 0, quota: 0, avail: 1400 })).toEqual([]);
    expect(datasetUsageBreakdown({ used: 1900, avail: 0 })).toEqual([]);
  });
  it('uses a dataset quota independently when no reference quota is configured', () => {
    expect(datasetUsageBreakdown({ used: 1900, referenced: 100, quota: 2000 })).toEqual([
      { kind: 'quota', used: 1900, limit: 2000, free: 100, ratio: 0.95 },
    ]);
  });
  it('keeps a configured limit visible without inventing a missing measurement', () => {
    expect(datasetUsageBreakdown({ refquota: 2000, used: 1900 })).toEqual([
      { kind: 'reference', used: null, limit: 2000, free: null, ratio: null },
    ]);
  });
  it('retains measured zero and reports over-limit values without negative free space', () => {
    expect(datasetUsageBreakdown({ referenced: 0, refquota: 2000, used: 2200, quota: 2000 })).toEqual([
      { kind: 'reference', used: 0, limit: 2000, free: 2000, ratio: 0 },
      { kind: 'quota', used: 2200, limit: 2000, free: 0, ratio: 1.1 },
    ]);
  });
  it('does not emit infinite percentages or bars from invalid limits', () => {
    expect(datasetUsageBreakdown({ referenced: 100, refquota: NaN, used: 100, quota: Infinity })).toEqual([]);
    expect(datasetUsageBreakdown({ referenced: Number.MAX_VALUE, refquota: Number.MIN_VALUE })[0]?.ratio).toBeNull();
  });
});
