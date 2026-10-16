import { expect, test } from '@playwright/test';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, jsonFulfill, setUiSettingsLocalStorage } from '../../fixtures';

const nodes = [
  { id: 1, name: 'node1', fqdn: 'node1.prg.example', type: 'node', maintenance_lock: 'no', status: true, location: { label: 'Praha' } },
  { id: 2, name: 'backup1', fqdn: 'backup1.prg.example', type: 'storage', maintenance_lock: 'no', status: true, location: { label: 'Praha' } },
  { id: 3, name: 'locked', fqdn: 'locked.prg.example', type: 'node', maintenance_lock: 'lock', status: true, location: { label: 'Praha' } },
  { id: 4, name: 'dns', fqdn: 'dns.prg.example', type: 'dns_server', maintenance_lock: 'no', status: true, location: { label: 'Praha' } },
];

for (const language of ['cs', 'en'] as const) {
  for (const entry of ['/', '/admin/nodes', '/app/nodes', '/admin', '/app']) {
    test(`@pr-smoke @pr-smoke-mobile heatmaps use legacy configuration and eligibility in ${language} at ${entry}`, async ({ page, isMobile }) => {
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await installHaveApiMock(page, {
        user: { id: 1, login: 'test', level: entry.startsWith('/admin') ? 99 : 1 },
        handlers: {
          ...(entry === '/' ? { 'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401) } : {}),
          'GET system_configs/webui/goresheat_url': () => ({ system_config: { value: 'https://heatmap.example/charts/' } }),
          'GET nodes': () => ({ nodes }),
          'GET nodes/public_status': () => ({ nodes }),
          'GET cluster/public_stats': () => ({ public_stats: { user_count: 1, vps_count: 1, ipv4_left: 1 } }),
        },
      });
      let frameRequests = 0;
      await page.route('https://heatmap.example/**', route => {
        frameRequests++;
        return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Fixture heatmap</title><body style="background:#16273f;color:white">Synthetic CPU / disk I/O heatmap</body>' });
      });
      await page.goto(entry);
      const trigger = page.locator('[data-testid="nodes.heatmap.open.node1.prg.example"]:visible');
      await expect(trigger).toBeVisible();
      await expect(trigger).toHaveText('');
      const label = `${language === 'cs' ? 'Heatmapa' : 'Heatmap'} · node1.prg.example`;
      await expect(trigger).toHaveAccessibleName(label);
      await expect(trigger).toHaveAttribute('title', label);
      await expect(page.locator('[data-testid="nodes.heatmap.open.backup1.prg.example"]:visible')).toBeVisible();
      await expect(page.getByTestId('nodes.heatmap.open.locked.prg.example')).toHaveCount(0);
      await expect(page.getByTestId('nodes.heatmap.open.dns.prg.example')).toHaveCount(0);
      expect(frameRequests).toBe(0);
      await trigger.scrollIntoViewIfNeeded();
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: test.info().outputPath('heatmap-list.png') });
      const previousUrl = page.url();
      if (isMobile) await trigger.tap();
      else await trigger.click();
      await expect(page).toHaveURL(previousUrl);
      const modal = page.getByTestId('nodes.heatmap.modal');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('node1.prg.example');
      await expect(page.getByTestId('nodes.heatmap.frame')).toHaveAttribute('src', 'https://heatmap.example/charts/node1.prg.example/');
      await expect(page.frameLocator('[data-testid="nodes.heatmap.frame"]').getByText('Synthetic CPU / disk I/O heatmap')).toBeVisible();
      await expect(page.getByTestId('nodes.heatmap.external')).toHaveAttribute('href', 'https://heatmap.example/charts/node1.prg.example/');
      const box = await modal.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      await page.screenshot({ path: test.info().outputPath('heatmap-dialog.png') });
      await page.getByTestId('nodes.heatmap.close').click();
      await expect(modal).toHaveCount(0);
      await expect(page.getByTestId('nodes.heatmap.frame')).toHaveCount(0);
      if (!isMobile) await expect(trigger).toBeFocused();
      // WebKit taps do not focus buttons; verify focus restoration with keyboard activation.
      await trigger.focus();
      await trigger.press('Enter');
      await expect(modal).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(modal).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  }
}

for (const entry of ['/', '/admin', '/app']) {
for (const unavailable of [false, true]) {
test(`missing heatmap configuration leaves the node list usable at ${entry} (error: ${unavailable})`, async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, { user: { id: 1, login: 'test', level: entry === '/admin' ? 99 : 1 }, handlers: {
    ...(entry === '/' ? { 'GET users/current': () => jsonFulfill(failEnvelope('Unauthorized'), 401) } : {}),
    'GET system_configs/webui/goresheat_url': () => unavailable ? jsonFulfill(failEnvelope('Unavailable'), 503) : ({ system_config: { value: '' } }),
    'GET nodes/public_status': () => ({ nodes }),
  } });
  await page.goto(entry);
  await expect(page.getByTestId(entry === '/' ? 'public.nodes.section' : 'app.dashboard.cluster.groups')).toContainText('node1');
  await expect(page.locator('[data-testid^="nodes.heatmap.open."]')).toHaveCount(0);
});
}
}
