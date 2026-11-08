import { expect, test } from '@playwright/test';

test('@pr-smoke @pr-smoke-mobile CI uses development React with StrictMode effects', async ({ page, baseURL }) => {
  test.skip(!process.env['CI'], 'The prepared development server is specific to CI.');
  const origin = new URL(baseURL!).origin;
  const writes: string[] = [];
  await page.route('**/*', (route) => {
    const request = route.request();
    if (request.method() !== 'GET') writes.push(request.method());
    if (new URL(request.url()).origin !== origin) return route.abort();
    return route.fallback();
  });
  await page.goto('/__e2e-react-probe');
  await expect(page.locator('body')).toHaveAttribute('data-effects', '2');
  expect(await page.evaluate(() => Reflect.get(window, '__WEBUI_E2E_REACT_PROBE__'))).toMatchObject({
    development: true,
    production: false,
    mode: 'development',
    renders: 2,
    effects: 2,
  });
  expect(writes).toEqual([]);
});
