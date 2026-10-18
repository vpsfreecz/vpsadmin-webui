import { describe, expect, it } from 'vitest';
import { buildLifecyclePayload } from './lifecyclePayload';

const expiration = '2026-11-21T08:25:00.000Z';
const reminder = '2026-11-01T08:25:00.000Z';
const active = { state: 'active', expiration, reminder: null };

describe('lifecycle payload contract', () => {
  it('reactivates an expired VPS without sending a null reminder', () => {
    expect(
      buildLifecyclePayload({ ...active, state: 'suspended', expiration: '2026-10-01T00:00:00Z' }, active, 'renew')
    ).toEqual({
      object_state: 'active',
      expiration_date: expiration,
      change_reason: 'renew',
    });
  });
  it('retains a nonempty reminder when extending expiration', () => {
    expect(
      buildLifecyclePayload({ ...active, reminder }, { ...active, reminder, expiration: '2026-12-21T00:00:00Z' }, '')
    ).toEqual({
      expiration_date: '2026-12-21T00:00:00Z',
      remind_after_date: reminder,
    });
  });
  it('clears reminders by reapplying the existing expiration', () => {
    expect(buildLifecyclePayload({ ...active, reminder }, active, '')).toEqual({ expiration_date: expiration });
  });
  it('clears expiration and its reminder with the nullable expiration alone', () => {
    expect(buildLifecyclePayload({ ...active, reminder }, { ...active, expiration: null, reminder: null }, '')).toEqual(
      { expiration_date: null }
    );
  });
  it('updates just a nonempty reminder without changing expiration', () => {
    expect(buildLifecyclePayload(active, { ...active, reminder }, '')).toEqual({ remind_after_date: reminder });
  });
  it('does not resubmit a state or an unchanged form', () => {
    expect(buildLifecyclePayload(active, active, 'reason alone')).toEqual({});
  });
  it('preserves nullable expiration on a state transition', () => {
    expect(buildLifecyclePayload(active, { state: 'suspended', expiration: null, reminder: null }, '')).toEqual({
      object_state: 'suspended',
      expiration_date: null,
    });
  });
});
