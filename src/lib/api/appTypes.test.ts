import { describe, expect, it } from 'vitest';
import { narrowLocation } from './appTypes';

describe('generated-backed location view', () => {
  it('keeps nullable fields and partial association facts without defaults', () => {
    const row = { id: 7, label: null, domain: null, has_ipv6: false, environment: { label: 'env' } };
    expect(narrowLocation(row)).toBe(row);
  });

  it.each([{ id: null }, { id: 0 }, { id: Number.MAX_SAFE_INTEGER + 1 }, { id: 7, label: 3 }, { id: 7, environment: [] }])(
    'does not invent a valid location from %j', value => {
      expect(() => narrowLocation(value)).toThrow();
    },
  );
});
