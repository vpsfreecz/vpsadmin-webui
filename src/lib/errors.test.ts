import { afterEach, describe, expect, it } from 'vitest';
import { HaveApiError } from './api/haveapi';
import { makeStaticTranslator } from './staticI18n';
import { formatErrorMessage } from './errors';

afterEach(() => {
  document.documentElement.lang = '';
});
describe('member-facing API errors', () => {
  it.each(['en', 'cs'])('explains snapshot backup/dependency rejection in %s without the class name', (language) => {
    document.documentElement.lang = language;
    for (const message of [
      'cannot destroy snapshot with backups',
      'this snapshot cannot be destroyed as others are depending on it',
    ]) {
      const error = new HaveApiError({ status: false, message });
      const text = formatErrorMessage(error, makeStaticTranslator(language as 'cs' | 'en'));
      expect(text).toContain(language === 'cs' ? 'nelze' : 'cannot be deleted');
      expect(text).not.toContain('HaveApiError');
      expect(text).not.toBe(message);
      expect(error.message).toBe(message);
      expect(error.envelope.message).toBe(message);
    }
  });
  it('keeps unknown API messages and developer error names available', () => {
    expect(formatErrorMessage(new HaveApiError({ status: false, message: 'Unexpected server message' }))).toBe(
      'Unexpected server message'
    );
    expect(formatErrorMessage(new TypeError('bad value'))).toBe('TypeError: bad value');
  });
});
