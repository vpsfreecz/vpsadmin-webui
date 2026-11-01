import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiWire, installHaveApiXhr } from '../../test/haveapiXhr';
import { ApiOutputError } from './apiOutput';
import { isAmbiguousMutationError } from './apiErrors';
import { cancelActionState, fetchActionState, fetchActionStates, pollActionState } from './actionStates';

beforeEach(() => {
  window.vpsAdmin = {
    api: { url: 'https://action-state.example.test/mount', version: '7.0' }, sessionToken: 'token',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  };
});
afterEach(() => { window.vpsAdmin = undefined; });
const reply = (response: unknown) => new Response(JSON.stringify({ status: true, response }), { status: 200 });

describe('generated action-state operations', () => {
  it('preserves a list receipt and nullable fields without inventing task state', async () => {
    const rows = [{ id: 7, finished: null, status: false, current: 0, label: null }];
    const wire = { action_states: rows, _meta: { total_count: 1, extension: false } };
    installHaveApiXhr(() => reply(wire));
    const result = await fetchActionStates({ limit: 0, fromId: 0, order: 'oldest' });
    expect(result).toEqual({ data: rows, meta: wire._meta, envelope: { status: true, response: wire }, httpStatus: 200 });
    const url = new URL(apiWire.requests[0]!.url);
    expect(url.pathname).toBe('/mount/v7.0/action_states');
    expect(url.searchParams.get('action_state[limit]')).toBe('0');
    expect(url.searchParams.get('action_state[from_id]')).toBe('0');
  });

  it.each([{ id: null }, { id: 0 }, { id: 7, finished: 'yes' }, { id: 7, total: '10' }])(
    'rejects malformed task output with the original receipt: %j', async data => {
      const wire = { action_state: data };
      installHaveApiXhr(() => reply(wire));
      const error = await fetchActionState(7).catch(value => value);
      expect(error).toBeInstanceOf(ApiOutputError);
      expect(error.result).toMatchObject({ data, envelope: { status: true, response: wire }, httpStatus: 200 });
      expect(isAmbiguousMutationError(error)).toBe(true);
    },
  );

  it('sends false/zero poll fields using the generated route and retains completion state', async () => {
    installHaveApiXhr(() => reply({ action_state: { id: 7, finished: false, status: false, current: 0 } }));
    expect((await pollActionState(7, { status: false, current: 0, total: 0, timeout: 0, updateIn: 0 })).data)
      .toMatchObject({ id: 7, finished: false, status: false, current: 0 });
    const url = new URL(apiWire.requests[0]!.url);
    expect(url.pathname).toBe('/mount/v7.0/action_states/7/poll');
    expect(url.searchParams.get('action_state[status]')).toBe('false');
    expect(url.searchParams.get('action_state[current]')).toBe('0');
    expect(url.searchParams.get('action_state[update_in]')).toBe('0');
  });

  it('uses generated cancel once without fabricating output or completion receipts', async () => {
    installHaveApiXhr(() => reply({ action_state: {} }));
    const result = await cancelActionState(7);
    expect(result.data).toEqual({});
    expect(apiWire.requests).toHaveLength(1);
    expect(apiWire.requests[0]).toMatchObject({ method: 'POST', url: 'https://action-state.example.test/mount/v7.0/action_states/7/cancel' });
  });
});
