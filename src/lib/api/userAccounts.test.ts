import { afterEach, describe, expect, it, vi } from 'vitest';
import { installHaveApiXhr } from '../../test/haveapiXhr';
import { fetchUserAccount, updateUserAccount } from './userAccounts';
import { isAmbiguousMutationError } from './apiErrors';

function fixture(data: unknown) {
  window.vpsAdmin = {
    api: { url: 'https://accounts.example.test', version: '7.0' },
    description: { meta: { namespace: '_meta' } },
  };
  const respond = vi.fn(
    async (..._args: Parameters<typeof fetch>) =>
      new Response(
        JSON.stringify({ status: true, response: { user_account: data, _meta: { extension: 'receipt' } } }),
        { status: 200 }
      )
  );
  installHaveApiXhr(respond);
  return respond;
}
afterEach(() => {
  window.vpsAdmin = undefined;
});

describe('generated user accounts', () => {
  it('preserves null observations, zero and the complete receipt', async () => {
    fixture({ id: 42, monthly_payment: 0, paid_until: null });
    await expect(fetchUserAccount(42)).resolves.toMatchObject({
      data: { id: 42, monthly_payment: 0, paid_until: null },
      meta: { extension: 'receipt' },
      httpStatus: 200,
    });
  });
  it('sends a valid date or zero and leaves omitted paid_until untouched', async () => {
    const respond = fixture({ id: 42 });
    await updateUserAccount(42, { monthly_payment: 0 });
    expect(JSON.parse(String(respond.mock.calls[0]![1]?.body))).toEqual({ user_account: { monthly_payment: 0 } });
    await updateUserAccount(42, { paid_until: '2026-11-20' });
    expect(JSON.parse(String(respond.mock.calls[1]![1]?.body))).toEqual({ user_account: { paid_until: '2026-11-20' } });
  });
  it('rejects an unsupported date clear before dispatch and classifies it as local', async () => {
    const respond = fixture({ id: 42 });
    // @ts-expect-error paid_until is deliberately nonnullable in the API.
    const result = updateUserAccount(42, { paid_until: null });
    const error = await result.catch((failure: unknown) => failure);
    expect(error).toMatchObject({ phase: 'pre-dispatch' });
    expect(isAmbiguousMutationError(error)).toBe(false);
    expect(respond).not.toHaveBeenCalled();
  });
  it('retains the mutation receipt when identity cannot be validated', async () => {
    fixture({ paid_until: null });
    const error = await updateUserAccount(42, { monthly_payment: 1 }).catch((failure: unknown) => failure);
    expect(error).toMatchObject({
      phase: 'post-dispatch',
      result: { httpStatus: 200, meta: { extension: 'receipt' } },
    });
    expect(isAmbiguousMutationError(error)).toBe(true);
  });
});
