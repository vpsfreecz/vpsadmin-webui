import { describe, expect, it } from 'vitest';
import type { I18nContextValue } from '../../../app/i18n';
import { en } from '../../../i18n/en';
import { cs } from '../../../i18n/cs';
import { vpsMigrateReceipt } from './vpsMigrateReceipt';

for (const [language, dictionary] of [
  ['en', en],
  ['cs', cs],
] as const) {
  const t: I18nContextValue['t'] = (key, vars) => {
    const text = (dictionary as Record<string, string>)[key] ?? key;
    return text.replace('{target}', String(vars?.['target'] ?? ''));
  };
  describe(`${language} submitted migration timing`, () => {
    it('respects the API maintenance default when the request omits the flag', () => {
      const receipt = vpsMigrateReceipt(t, 'vps.example', Object.freeze({ node: 2 }), () => {});
      expect(receipt.title).toBe(language === 'en' ? 'Migration scheduled' : 'Migrace naplánována');
      expect(receipt.body).toContain(language === 'en' ? 'maintenance window' : 'servisním okně');
      expect(receipt.body).toContain('vps.example');
    });
    it('recognizes an explicitly submitted Sunday midnight as custom completion', () => {
      const submitted = Object.freeze({ node: 2, maintenance_window: false, finish_weekday: 0, finish_minutes: 0 });
      const receipt = vpsMigrateReceipt(t, 'vps.example', submitted, () => {});
      expect(receipt.body).toContain(
        language === 'en' ? 'requested completion schedule' : 'požadovaným termínem dokončení'
      );
      expect(receipt.body).not.toContain(language === 'en' ? 'maintenance window' : 'servisním okně');
    });
  });
}
