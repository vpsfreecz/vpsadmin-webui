import { describe, expect, it } from 'vitest';
import { narrowNewsLogRecord, narrowPublicNewsLog } from './newsLogViews';

describe('news domain views', () => {
  it('keeps optional editing fields distinct from localized display content', () => {
    const row = { id: 7, message: null, cs_message: '', en_message: 'English', published_at: null };
    expect(narrowNewsLogRecord(row)).toBe(row);
    expect(() => narrowPublicNewsLog(row)).toThrow('Missing localized news message');
    expect(narrowPublicNewsLog({ ...row, message: 'Localized' })).toMatchObject({
      message: 'Localized',
      en_message: 'English',
    });
  });
  it('rejects missing or malformed identity and text', () => {
    expect(() => narrowNewsLogRecord({ id: null })).toThrow();
    expect(() => narrowPublicNewsLog({ id: 7, message: false })).toThrow();
  });
});
