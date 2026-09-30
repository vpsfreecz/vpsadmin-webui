import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

// Default CI fixture mirrors the pinned router's 600px terminal + 280px keyboard.
// Operators can also exercise the unmodified pinned renderer with synthetic feed
// responses by pointing E2E_CONSOLE_ROUTER_SOURCE at its console_router directory.
const geometryFixture = `<!doctype html><html><body>
<div id="terminal" style="height:600px;background:black;color:white;font:16px monospace">Synthetic console: login:</div>
<div class="keyboardContainer" style="height:280px;background:#ddd">Synthetic keyboard <button>Enter</button></div>
</body></html>`;
const assets = new Set([
  'xterm.css',
  'simple-keyboard.css',
  'keyboard.css',
  'xterm.js',
  'addon-fit.js',
  'console.js',
  'simple-keyboard.js',
  'keyboard.js',
  'haveapi-client.js',
]);

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile console and keyboard fit the viewport (${language})`, async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.includes('mobile');
    if (!mobile) await page.setViewportSize({ width: 1366, height: 768 });
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    let creations = 0;
    const source = process.env['E2E_CONSOLE_ROUTER_SOURCE'];
    await page.route('https://console.example.test/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/console/feed/')) {
        return route.fulfill({
          json: { data: Buffer.from('Synthetic console: login: ').toString('base64'), session: false },
        });
      }
      if (url.pathname === '/console/123') {
        const body = source
          ? (await readFile(path.join(source, 'views/console.erb'), 'utf8'))
              .replace(/<%= Time.now.to_i %>/g, 'fixture')
              .replace('<%= vps_id %>', '123')
              .replace('<%= session %>', 'FIXTURE')
          : geometryFixture;
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body });
      }
      const file = url.pathname.slice(1);
      if (source && assets.has(file)) {
        return route.fulfill({
          contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript; charset=utf-8',
          body: await readFile(path.join(source, 'public', file)),
        });
      }
      return route.abort();
    });
    await installHaveApiMock(page, {
      user: { id: 1, login: 'console-review', level: language === 'cs' ? 90 : 1 },
      handlers: {
        'GET vpses/123': () => ({
          vps: {
            id: 123,
            hostname: 'console-demo.example',
            is_running: true,
            object_state: 'active',
            node: { id: 1, location: { remote_console_server: 'https://console.example.test' } },
          },
        }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'POST vpses/123/console_token': () => {
          creations++;
          return { token: 'FIXTURE', expiration: '2027-12-31T00:00:00Z' };
        },
      },
    });
    await page.goto(`/${language === 'cs' ? 'admin' : 'app'}/vps/123/console`);
    const viewport = page.getByTestId('vps.console.viewport');
    const iframe = page.getByTestId('vps.console.iframe');
    const keyboard = page.frameLocator('[data-testid="vps.console.iframe"]').locator('.keyboardContainer');
    await expect(keyboard).toBeVisible();
    await expect(page.getByTestId('vps.header')).toHaveCount(0);
    await expect(page.getByTestId('contextual.help.panel')).toHaveCount(0);
    await expect(page.getByTestId('vps.console.header')).toContainText('console-demo.example');
    const assertFits = async () => {
      const height = page.viewportSize()!.height;
      await expect
        .poll(async () => (await viewport.boundingBox())!.y + (await viewport.boundingBox())!.height)
        .toBeLessThanOrEqual(height);
      // Playwright's cross-frame box adds the parent offset without applying
      // ancestor CSS transforms. Project the child's rectangle through the iframe.
      const frameBox = (await iframe.boundingBox())!;
      const localBottom = await keyboard.evaluate((element) => element.getBoundingClientRect().bottom);
      const innerHeight = await iframe
        .contentFrame()
        .locator('body')
        .evaluate(() => window.innerHeight);
      expect(frameBox.y + (localBottom * frameBox.height) / innerHeight).toBeLessThanOrEqual(height);
      const frame = await iframe
        .contentFrame()
        .locator('body')
        .evaluate((body) => ({
          width: body.scrollWidth,
          height: body.scrollHeight,
          viewWidth: window.innerWidth,
          viewHeight: window.innerHeight,
        }));
      expect(frame.height).toBeLessThanOrEqual(frame.viewHeight);
      expect(frame.width).toBeLessThanOrEqual(frame.viewWidth);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    };
    await assertFits();
    await page.screenshot({ path: testInfo.outputPath(`console-${language}-${mobile ? 'mobile' : 'laptop'}.png`) });
    if (!mobile) {
      await page.setViewportSize({ width: 1280, height: 640 });
      await assertFits();
      await page.setViewportSize({ width: 1920, height: 1080 });
      await assertFits();
    }
    await page.getByTestId('vps.console.focus').click();
    await expect(page.getByTestId('vps.console.exit_focus')).toBeVisible();
    await page.getByTestId('vps.console.exit_focus').click();
    await assertFits();
    expect(creations).toBe(1);
  });
}
