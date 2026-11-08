import { describe, expect, it } from 'vitest';
import { formatMoneyLike, safeInt } from './paymentsFormat';

describe('localized membership amounts', () => {
  it('retains existing whole-unit payment formatting with an optional explicit UI locale', () => {
    expect(formatMoneyLike(safeInt(12345), 'cs')).toBe('12\u00a0345');
    expect(formatMoneyLike(safeInt(12345), 'en')).toBe('12,345');
    expect(formatMoneyLike(safeInt(0), 'cs')).toBe('0');
    expect(formatMoneyLike(safeInt(undefined), 'en')).toBe('—');
    expect(formatMoneyLike(safeInt(Number.NaN), 'cs')).toBe('—');
  });
});
