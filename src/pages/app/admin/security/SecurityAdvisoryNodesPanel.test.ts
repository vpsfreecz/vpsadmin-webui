import { describe, expect, it } from 'vitest';

import {
  buildSecurityAdvisoryNodeStatusPayload,
  remainingSecurityAdvisoryBulkNodeIds,
  securityAdvisoryNodeStatusNodeId,
  type SecurityAdvisoryNodeFormValues,
} from './SecurityAdvisoryNodeForm';

function values(overrides: Partial<SecurityAdvisoryNodeFormValues> = {}): SecurityAdvisoryNodeFormValues {
  return {
    state: 'unknown',
    vulnerableUntil: '',
    mitigatedSince: '',
    notes: {},
    ...overrides,
  };
}

describe('security advisory node status panel helpers', () => {
  it('clears both timestamps for not affected nodes', () => {
    expect(
      buildSecurityAdvisoryNodeStatusPayload(
        42,
        values({
          state: 'not_affected',
          vulnerableUntil: '2026-07-01T10:00',
          mitigatedSince: '2026-07-02T10:00',
          notes: { en: '  unaffected kernel  ' },
        })
      )
    ).toEqual({
      valid: true,
      payload: {
        node: 42,
        state: 'not_affected',
        vulnerable_until: null,
        mitigated_since: null,
        en_note: 'unaffected kernel',
      },
    });
  });

  it('requires both timestamps for mitigated nodes', () => {
    expect(
      buildSecurityAdvisoryNodeStatusPayload(42, values({ state: 'mitigated', mitigatedSince: '2026-07-02T10:00' }))
    ).toEqual({ valid: false, reason: 'vulnerable_until_required' });

    expect(
      buildSecurityAdvisoryNodeStatusPayload(42, values({ state: 'mitigated', vulnerableUntil: '2026-07-01T10:00' }))
    ).toEqual({ valid: false, reason: 'mitigated_since_required' });

    const parsed = buildSecurityAdvisoryNodeStatusPayload(
      42,
      values({
        state: 'mitigated',
        vulnerableUntil: '2026-07-01T10:00',
        mitigatedSince: '2026-07-02T10:00',
      })
    );
    expect(parsed.valid).toBe(true);
    if (parsed.valid) {
      expect(parsed.payload.vulnerable_until).toMatch(/^2026-07-01T/);
      expect(parsed.payload.mitigated_since).toMatch(/^2026-07-02T/);
    }
  });

  it('never repeats completed nodes after a partial bulk failure', () => {
    const completed = new Set([2, 4]);
    expect(remainingSecurityAdvisoryBulkNodeIds([1, 2, 3, 4, 5], completed)).toEqual([1, 3, 5]);
  });

  it('resolves node ids from both flattened and included references', () => {
    expect(securityAdvisoryNodeStatusNodeId({ id: 1, node_id: 9 })).toBe(9);
    expect(securityAdvisoryNodeStatusNodeId({ id: 1, node: 10 })).toBe(10);
    expect(securityAdvisoryNodeStatusNodeId({ id: 1, node: { id: 11, name: 'node11' } })).toBe(11);
    expect(securityAdvisoryNodeStatusNodeId({ id: 1 })).toBeNull();
  });

  it.each<{
    selection: Record<string, boolean>;
    notes: Record<string, string>;
    expected: Record<string, string | null>;
  }>([
    { selection: {}, notes: { en: '', cs: '' }, expected: {} },
    { selection: { en: false }, notes: { en: 'Retained draft', cs: '' }, expected: {} },
    { selection: { en: true }, notes: { en: '  Changed note  ', cs: '' }, expected: { en_note: 'Changed note' } },
    { selection: { en: true }, notes: { en: '', cs: 'Leave alone' }, expected: { en_note: null } },
    { selection: { cs: true }, notes: { en: 'Leave alone', cs: '  ' }, expected: { cs_note: null } },
    { selection: { en: true, cs: true }, notes: { en: 'New', cs: '' }, expected: { en_note: 'New', cs_note: null } },
  ])('serializes only explicitly selected bulk languages: $selection / $notes', ({ selection, notes, expected }) => {
    expect(buildSecurityAdvisoryNodeStatusPayload(7, values({ notes, bulkNoteSelection: selection }))).toEqual({
      valid: true,
      payload: { node: 7, state: 'unknown', vulnerable_until: null, mitigated_since: null, ...expected },
    });
  });

  it('rejects an unsupported bulk language even when it is not selected', () => {
    expect(buildSecurityAdvisoryNodeStatusPayload(7, values({ notes: { de: '' }, bulkNoteSelection: {} }))).toEqual({
      valid: false,
      reason: 'unsupported_language',
    });
  });

  it.each([
    { note: 'Existing note', expected: {} },
    { note: '  New note  ', expected: { en_note: 'New note' } },
    { note: '', expected: { en_note: null } },
  ])('preserves ordinary editor note comparison: $note', ({ note, expected }) => {
    expect(
      buildSecurityAdvisoryNodeStatusPayload(
        7,
        values({ notes: { en: note }, original: { id: 11, en_note: 'Existing note', state: 'unknown' } })
      )
    ).toEqual({
      valid: true,
      payload: { node: 7, state: 'unknown', vulnerable_until: null, mitigated_since: null, ...expected },
    });
  });
});
