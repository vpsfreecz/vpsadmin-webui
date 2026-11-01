import { describe, expect, it } from 'vitest';
import { ClientInputError } from 'vpsadmin-typescript-client';
import { isAmbiguousMutationError } from './apiErrors';
import { ApiOutputError, narrowApiResult } from './apiOutput';

const result = {
  data: { id: null }, meta: { action_state_id: 19, extension: false },
  envelope: { status: true, response: { thing: { id: null }, _meta: { action_state_id: 19 } } },
  httpStatus: 202,
};

describe('application output narrowing', () => {
  it('preserves all receipt fields when narrowing valid output', () => {
    const narrowed = narrowApiResult({ ...result, data: { id: 7 } }, data => ({ id: data.id }), 'thing');
    expect(narrowed).toEqual({ ...result, data: { id: 7 } });
    expect(narrowed.envelope).toBe(result.envelope);
    expect(narrowed.meta).toBe(result.meta);
  });

  it('keeps malformed post-dispatch output uncertain with the entire receipt', () => {
    const cause = new Error('missing identity');
    const error = (() => {
      try { narrowApiResult(result, () => { throw cause; }, 'thing'); } catch (value) { return value; }
    })();
    expect(error).toBeInstanceOf(ApiOutputError);
    expect(error).toMatchObject({ phase: 'post-dispatch', result, cause });
    expect(isAmbiguousMutationError(error)).toBe(true);
  });

  it('distinguishes proven local client input failure from transport TypeError', () => {
    expect(isAmbiguousMutationError(new ClientInputError('Invalid input'))).toBe(false);
    expect(isAmbiguousMutationError(new TypeError('Network lost'))).toBe(true);
  });
});
