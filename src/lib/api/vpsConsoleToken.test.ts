import { expect, test, vi } from 'vitest';
import { createConsoleToken, fetchConsoleToken, deleteConsoleToken } from './vps';

test('console token lifecycle calls the legacy VPS console_token action', async () => {
  const respond = vi.fn<typeof fetch>(
    async () =>
      new Response(
        JSON.stringify({
          status: true,
          response: { console_token: { token: 'T1', expiration: '2027-01-01T00:00:00Z' } },
        }),
        { status: 200 }
      )
  );
  globalThis.fetch = respond;

  await createConsoleToken(12);

  let [url, init] = respond.mock.calls.at(-1)!;
  expect(new URL(String(url)).pathname).toBe('/v7.0/vpses/12/console_token');
  expect(init?.method).toBe('POST');
  expect(JSON.parse(String(init?.body))).toEqual({});

  const current = await fetchConsoleToken(12);
  expect(current.data.token).toBe('T1');
  [url, init] = respond.mock.calls.at(-1)!;
  expect(new URL(String(url)).pathname).toBe('/v7.0/vpses/12/console_token');
  expect(init?.method).toBe('GET');

  await deleteConsoleToken(12);

  [url, init] = respond.mock.calls.at(-1)!;
  expect(new URL(String(url)).pathname).toBe('/v7.0/vpses/12/console_token');
  expect(init?.method).toBe('DELETE');
  expect(JSON.parse(String(init?.body))).toEqual({});
});
