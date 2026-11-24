import { expect, it } from 'vitest';
import { ApiOutputError } from './apiOutput';
import { readAdminIncidentPage } from './adminIncidentOutput';
import { adminIncidentMeta, evaluationFixture, exposureFixture } from '../../test/adminIncidentFixtures';

function result(data: unknown, meta = adminIncidentMeta) {
  return { data, meta, status: true, errors: {}, envelope: { status: true }, httpStatus: 200 };
}
it('preserves zero, false and null facts plus the original metadata and receipt', () => {
  const row = exposureFixture({ count_7d: 0, stop_enforced: false, warning_permitted: null });
  const response = result([row], { ...adminIncidentMeta, total_count: 1 });
  const parsed = readAdminIncidentPage(response, 'overview', { offset: 0, limit: 25 });
  expect(parsed.data[0]).toMatchObject({ count_7d: 0, stop_enforced: false, warning_permitted: null });
  expect(parsed.meta).toBe(response.meta);
  expect(parsed.envelope).toBe(response.envelope);
});
it('keeps retired original-owner history and confirmed stop distinct from completed warning mail', () => {
  const row = evaluationFixture({ vps_id: null, hostname: null, user_id: 8, user_login: null });
  expect(
    readAdminIncidentPage(result([row], { ...adminIncidentMeta, total_count: 1 }), 'history', { offset: 0, limit: 25 })
      .data[0]
  ).toMatchObject({
    policy_key: 'retired-policy',
    user_id: 8,
    stop_completed_at: null,
    action_state: 'completed',
    mail_state: 'suppressed',
  });
});
it.each([{ total_count: 40, next_offset: null }, { next_offset: 25 }, { as_of: 'bad' }, { offset: 25 }])(
  'refuses inconsistent endpoint metadata %j with its original receipt',
  (meta) => {
    const response = result([exposureFixture()], { ...adminIncidentMeta, ...meta });
    try {
      readAdminIncidentPage(response, 'overview', { offset: 0, limit: 25 });
      throw new Error('accepted malformed page');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiOutputError);
      expect((error as ApiOutputError).result).toBe(response);
    }
  }
);
it('refuses changed cutoff, absent required fields and raw identity substitutes', () => {
  expect(() =>
    readAdminIncidentPage(result([], { ...adminIncidentMeta, total_count: 0 }), 'overview', {
      offset: 0,
      limit: 25,
      as_of: '2026-11-24T11:00:00Z',
    })
  ).toThrow(ApiOutputError);
  const { vps: _, ...row } = exposureFixture();
  expect(() =>
    readAdminIncidentPage(result([{ ...row, vps_id: 12 }], { ...adminIncidentMeta, total_count: 1 }), 'overview', {
      offset: 0,
      limit: 25,
    })
  ).toThrow(ApiOutputError);
});
it('accepts an empty page beyond the final offset without inventing a cursor', () => {
  expect(
    readAdminIncidentPage(result([], { ...adminIncidentMeta, offset: 50, total_count: 2 }), 'history', {
      offset: 50,
      limit: 25,
    }).data
  ).toEqual([]);
});

it('preserves a normalized UTC cutoff but rejects duplicate or mismatched pair identity', () => {
  const response = result([exposureFixture()], {
    ...adminIncidentMeta,
    as_of: '2026-11-24T12:00:00+00:00',
    total_count: 1,
  });
  expect(
    readAdminIncidentPage(response, 'overview', { offset: 0, limit: 25, as_of: '2026-11-24T12:00:00Z' }).data
  ).toHaveLength(1);
  expect(() =>
    readAdminIncidentPage(result([exposureFixture(), exposureFixture()]), 'overview', { offset: 0, limit: 25 })
  ).toThrow(ApiOutputError);
  expect(() =>
    readAdminIncidentPage(
      result([exposureFixture({ id: 'wrong' })], { ...adminIncidentMeta, total_count: 1 }),
      'overview',
      { offset: 0, limit: 25 }
    )
  ).toThrow(ApiOutputError);
});
