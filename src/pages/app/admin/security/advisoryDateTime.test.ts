import { describe, expect, it } from 'vitest';
import { advisoryDateInput, advisoryDateValue } from './advisoryDateTime';
import { securityAdvisoryEditorPayload } from './SecurityAdvisoryEditorModal';
import { securityAdvisoryNodeFormValues, buildSecurityAdvisoryNodeStatusPayload } from './SecurityAdvisoryNodeForm';
describe('advisory timestamp and note preservation', () => {
  it('preserves the original exact timestamp and explicit null on correction', () => {
    const original = '2026-10-15T12:34:56.123456+02:00';
    expect(advisoryDateValue(advisoryDateInput(original), original)).toBe(original);
    expect(advisoryDateValue('', original)).toBeNull();
    expect(
      securityAdvisoryEditorPayload({ name: '', cves: '', translations: {}, publishedAt: '' }).published_at
    ).toBeNull();
  });
  it('writes localized notes without touching an unloaded language or truncating mitigation time', () => {
    const status = {
      id: 9,
      state: 'mitigated',
      vulnerable_until: '2026-10-15T12:34:17+02:00',
      mitigated_since: '2026-10-15T12:34:43+02:00',
      cs_note: 'Ošetřeno',
      en_note: 'Preserved separately',
    };
    const values = securityAdvisoryNodeFormValues(status, [{ id: 1, code: 'cs' }]);
    values.notes['cs'] = '';
    const result = buildSecurityAdvisoryNodeStatusPayload(4, values);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload).toMatchObject({
        vulnerable_until: status.vulnerable_until,
        mitigated_since: status.mitigated_since,
        cs_note: null,
      });
      expect(result.payload).not.toHaveProperty('en_note');
      expect(result.payload).not.toHaveProperty('note');
    }
  });
});
