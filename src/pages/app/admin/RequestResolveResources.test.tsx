// i18n-ignore-file
import { describe, expect, it } from 'vitest';
import { isRequestTemplateEligible } from './RequestResolveResources';

describe('authenticated request template eligibility', () => {
  it('requires both real enabled and supported flags', () => {
    expect(isRequestTemplateEligible({ id: 7, enabled: true, supported: true })).toBe(true);
    for (const flags of [
      { enabled: false, supported: true },
      { enabled: true, supported: false },
      { enabled: null, supported: true },
      { enabled: true, supported: null },
      {},
    ]) {
      expect(isRequestTemplateEligible({ id: 7, ...flags })).toBe(false);
    }
  });
});
