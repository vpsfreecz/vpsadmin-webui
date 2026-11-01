import { describe, expect, it } from 'vitest';
import { narrowAdminOutageHandler, narrowOutage, narrowOutageEntity, narrowOutageHandler } from './outageViews';

describe('outage domain views', () => {
  it('retains nullable fields and absent public admin fields', () => {
    expect(narrowOutage({ id: 7, begins_at: null, affected: false })).toEqual({
      id: 7,
      begins_at: null,
      affected: false,
    });
    expect(narrowOutageHandler({ id: 3, full_name: 'Operator' })).toEqual({ id: 3, full_name: 'Operator' });
    expect(narrowOutageEntity({ id: 2, name: 'Cluster', entity_id: null })).toMatchObject({ entity_id: null });
  });
  it('requires actual user identity only for admin scope compensation', () => {
    expect(narrowAdminOutageHandler({ id: 3, user: { id: 9 } })).toMatchObject({ user: { id: 9 } });
    expect(() => narrowAdminOutageHandler({ id: 3, user_id: 9 })).toThrow('Missing outage handler user identity');
    expect(() => narrowAdminOutageHandler({ id: 3, user: {} })).toThrow('Missing outage handler user identity');
  });
  it('rejects malformed identities and present scalar/association shapes', () => {
    expect(() => narrowOutage({ id: 0 })).toThrow();
    expect(() => narrowOutage({ id: 7, affected: 'false' })).toThrow();
    expect(() => narrowOutageEntity({ id: 2 })).toThrow();
    expect(() => narrowOutageHandler({ id: 3, user: { id: '9' } })).toThrow();
  });
});
