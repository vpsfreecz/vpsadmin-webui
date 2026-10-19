import { test, expect } from '@playwright/test';
import { bootstrapVpsAdminWindow } from '../../e2e/fixtures/bootstrap';
import { installHaveApiMock, jsonFulfill, failEnvelope } from '../../e2e/fixtures/haveapi';
import type { pilot } from './browser';

declare global {
  interface Window {
    haveapiPilot: typeof pilot;
  }
}
const key = 'a'.repeat(64);
test.beforeEach(async ({ page }) => {
  await bootstrapVpsAdminWindow(page, {
    apiUrl: '/api',
    webuiNext: { haveApi: { authHeader: 'X-Token', metaNamespace: '_meta' } },
  });
  await page.addInitScript(() => {
    window.vpsAdmin!.accessToken = 'old';
  });
});
async function ready(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.haveapiPilot));
  const session = await page.evaluate((key) => window.haveapiPilot.bindSyntheticBffSession(key, 'old'), key);
  expect(session).toEqual({
    auth: { kind: 'oauth2', accessToken: 'old' },
    boundKey: key,
    rememberedKey: key,
    sameRuntime: true,
  });
}

test('actual package serializes reads and mutations and returns an action receipt before completion', async ({
  page,
}) => {
  const requests: { method: string; query: string; body: unknown }[] = [];
  await installHaveApiMock(page, {
    handlers: {
      'GET things': (ctx) => {
        requests.push({ method: ctx.method, query: ctx.url.search, body: ctx.reqJson });
        return { things: [{ id: 7 }], _meta: { total_count: 1 } };
      },
      'POST things': (ctx) => {
        requests.push({ method: ctx.method, query: ctx.url.search, body: ctx.reqJson });
        return { thing: { id: 8 } };
      },
      'POST blocking': () => ({ thing: { id: 8 }, _meta: { action_state_id: 91 } }),
      'GET action_states/91': () => {
        throw new Error('Receipt must not wait for task completion');
      },
    },
  });
  await ready(page);
  const read = await page.evaluate(() =>
    window.haveapiPilot.call({
      path: '/things',
      namespace: 'thing',
      params: { owner: 3, enabled: false },
      meta: { limit: 2 },
    })
  );
  expect(read.data).toEqual([{ id: 7 }]);
  expect(read.meta).toEqual({ total_count: 1 });
  expect(new URLSearchParams(requests[0]?.query).get('thing[owner]')).toBe('3');
  expect(new URLSearchParams(requests[0]?.query).get('thing[enabled]')).toBe('false');
  expect(new URLSearchParams(requests[0]?.query).get('_meta[limit]')).toBe('2');
  await page.evaluate(() =>
    window.haveapiPilot.call({
      method: 'POST',
      path: '/things',
      namespace: 'thing',
      params: { name: 'x' },
      meta: { note: 'y' },
    })
  );
  expect(requests[1]?.body).toEqual({ thing: { name: 'x' }, _meta: { note: 'y' } });
  const receipt = await page.evaluate(() => window.haveapiPilot.receipt());
  expect(receipt.meta).toEqual({ action_state_id: 91 });
});

test('qualifying 401 read refreshes once and preserves language; writes never replay', async ({ page }) => {
  const reads: string[] = [];
  let writes = 0;
  let sessions = 0;
  await installHaveApiMock(page, {
    handlers: {
      'GET things': () => ({ things: [7] }),
      'POST things': () => {
        writes++;
        return jsonFulfill(failEnvelope('Unauthorized'), 401);
      },
    },
  });
  await page.route('**/api/v7.0/things', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    reads.push(route.request().headers()['x-token'] ?? '');
    expect(route.request().headers()['accept-language']).toBe('cs');
    return route.fulfill(
      jsonFulfill(
        reads.length === 1 ? failEnvelope('Unauthorized') : { status: true, response: { things: [7] } },
        reads.length === 1 ? 401 : 200
      )
    );
  });
  await page.route('**/session.json', (route) => {
    sessions++;
    return route.fulfill(jsonFulfill({ sessionKey: key, accessToken: sessions === 1 ? 'new' : 'newer' }));
  });
  await ready(page);
  await page.evaluate(() => {
    document.documentElement.lang = 'cs';
  });
  expect((await page.evaluate(() => window.haveapiPilot.call({ path: '/things' }))).data).toEqual([7]);
  expect(reads).toEqual(['old', 'new']);
  expect(sessions).toBe(1);
  const write = await page.evaluate(async () => {
    try {
      await window.haveapiPilot.call({ method: 'POST', path: '/things' });
      return 'unexpected';
    } catch (error) {
      return error instanceof Error ? error.name : 'unknown';
    }
  });
  expect(write).toBe('Error');
  expect(writes).toBe(1);
  expect(sessions).toBe(2);
});

test('a changed BFF session cannot authorize a read retry', async ({ page }) => {
  let reads = 0;
  await installHaveApiMock(page, {
    handlers: {
      'GET things': () => {
        reads++;
        return jsonFulfill(failEnvelope('Unauthorized'), 401);
      },
    },
  });
  await page.route('**/session.json', (route) =>
    route.fulfill(jsonFulfill({ sessionKey: 'b'.repeat(64), accessToken: 'foreign' }))
  );
  await ready(page);
  const status = await page.evaluate(async () => {
    try {
      await window.haveapiPilot.call({ path: '/things' });
      return 0;
    } catch (error) {
      return (error as { httpStatus?: number }).httpStatus;
    }
  });
  expect(status).toBe(401);
  expect(reads).toBe(1);
});

test('pre-abort sends nothing and in-flight abort rejects with AbortError', async ({ page }) => {
  let sends = 0;
  await installHaveApiMock(page, { handlers: {} });
  await page.route('**/api/v7.0/slow', async (route) => {
    sends++;
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill(jsonFulfill({ status: true, response: {} })).catch(() => {});
  });
  await ready(page);
  const pre = await page.evaluate(async () => {
    try {
      await window.haveapiPilot.abortable({ path: '/slow' }, true);
      return '';
    } catch (error) {
      return (error as Error).name;
    }
  });
  expect(pre).toBe('AbortError');
  expect(sends).toBe(0);
  const pending = page.evaluate(async () => {
    try {
      await window.haveapiPilot.abortable({ path: '/slow' });
      return '';
    } catch (error) {
      return (error as Error).name;
    }
  });
  await expect.poll(() => sends).toBe(1);
  await page.evaluate(() => window.haveapiPilot.abort());
  expect(await pending).toBe('AbortError');
});
