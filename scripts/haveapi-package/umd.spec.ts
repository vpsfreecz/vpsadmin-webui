import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

// Read the package's unchanged main artifact; this page never imports it through Vite.
const description = {
  authentication: {},
  meta: { namespace: '_meta' },
  resources: {
    widgets: {
      resources: {},
      actions: {
        show: {
          aliases: ['get'],
          blocking: false,
          method: 'GET',
          path: '/v1/widgets/{widget_id}',
          input: null,
          output: {
            layout: 'object',
            namespace: 'widget',
            parameters: { id: { type: 'Integer' }, name: { type: 'String' } },
          },
        },
      },
    },
  },
};
const reply = { widget: { id: 7, name: 'seven' }, _meta: { path_params: [7] } };
const envelope = (response: unknown) => ({ version: '2.0', status: true, message: null, errors: null, response });
declare global {
  interface Window {
    HaveAPI: typeof import('haveapi-client');
  }
}

test('ordinary UMD script supports callback and Promise clients through native XHR', async ({ page }) => {
  const bundle = readFileSync(createRequire(import.meta.url).resolve('haveapi-client'), 'utf8');
  const requests: string[] = [];
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/umd-fixture') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><link rel="icon" href="data:,"><script src="/umd-client.js"></script>',
      });
    }
    if (pathname === '/umd-client.js') return route.fulfill({ contentType: 'application/javascript', body: bundle });
    const key = `${request.method()} ${pathname}`;
    requests.push(key);
    if (key === 'OPTIONS /umd-api/v1/' || key === 'GET /umd-api/v1/widgets/7') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(envelope(key.startsWith('OPTIONS') ? description : reply)),
      });
    }
    unexpected.push(key);
    await route.abort();
  });
  await page.goto('/umd-fixture');
  const result = await page.evaluate(async () => {
    const api = window.HaveAPI;
    const constructors = {
      callback: typeof api.Client,
      async: typeof api.AsyncClient,
      hasDefault: Object.hasOwn(api, 'default'),
    };
    type LegacyClient = InstanceType<typeof api.Client>;
    // This fixture supplies the schema for the legacy dynamic properties.
    type Widget = { id: number; name: string; apiResponse(): { isOk(): boolean } };
    const legacy = new api.Client(`${location.origin}/umd-api`, { version: 1 }) as LegacyClient & {
      widgets: { show(id: number, opts: { onReply(client: LegacyClient, value: Widget): void }): void };
    };
    let setupReturn: unknown;
    const setup = await new Promise<boolean>((resolve) => {
      setupReturn = legacy.setup((_client, ok) => resolve(ok));
    });
    if (!setup) throw new Error('Callback setup failed');
    let callReturn: unknown;
    const callback = await new Promise((resolve) => {
      callReturn = legacy.widgets.show(7, {
        onReply: (_client, value) =>
          resolve({
            id: value.id,
            name: value.name,
            ok: value.apiResponse().isOk(),
          }),
      });
    });
    const modern = new api.AsyncClient(`${location.origin}/umd-api`, { version: 1 });
    await modern.setup();
    const receipt = await modern.resource('widgets').action('show')<import('haveapi-client').AsyncResourceInstance>(7);
    return {
      constructors,
      setup,
      setupReturnsUndefined: setupReturn === undefined,
      callbackReturnsUndefined: callReturn === undefined,
      callback,
      async: {
        id: receipt.value.get('id'),
        name: receipt.value.get('name'),
        data: receipt.response.data,
        envelope: receipt.response.envelope,
        meta: receipt.response.meta,
        httpStatus: receipt.response.httpStatus,
      },
    };
  });
  expect(result.constructors).toEqual({ callback: 'function', async: 'function', hasDefault: false });
  expect(result.setup).toBe(true);
  expect(result.setupReturnsUndefined).toBe(true);
  expect(result.callbackReturnsUndefined).toBe(true);
  expect(result.callback).toEqual({ id: 7, name: 'seven', ok: true });
  expect(result.async).toEqual({
    id: 7,
    name: 'seven',
    data: reply.widget,
    envelope: envelope(reply),
    meta: { path_params: [7] },
    httpStatus: 200,
  });
  expect(requests).toEqual([
    'OPTIONS /umd-api/v1/',
    'GET /umd-api/v1/widgets/7',
    'OPTIONS /umd-api/v1/',
    'GET /umd-api/v1/widgets/7',
  ]);
  expect(unexpected).toEqual([]);
  expect(errors).toEqual([]);
});
