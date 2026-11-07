import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, jsonFulfill } from '../../fixtures';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { openShellNavigation } from '../../helpers/shellNavigation';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  enable_network: true,
  cpus: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  used_memory: 768,
  used_swap: 0,
  used_diskspace: 5120,
  uptime: 12345,
  loadavg1: 0.12,
  dataset: { id: 10, name: 'tank/data' },
  node: {
    id: 1,
    domain_name: 'node1.example',
    location: { id: 2, label: 'Praha', remote_console_server: '/_console', environment: { id: 1, label: 'prod' } },
  },
  user: { id: 10, login: 'alice' },
  os_template: { id: 6, label: 'Debian 12' },
  dns_resolver: 'inherit',
};

async function closeNavigation(page: Page) {
  if (await page.getByTestId('nav.drawer').isVisible()) {
    await page.getByTestId('nav.drawer.close').click();
  }
}
async function expectOrder(page: Page, contentId: string, placement: 'top' | 'bottom') {
  const help = page.getByTestId('contextual.help.panel');
  await expect(help).toBeVisible();
  const content = page.getByTestId(contentId);
  await expect(content).toBeVisible();
  await expect
    .poll(() =>
      content.evaluate((element, next) => {
        const panel = document.querySelector('[data-testid="contextual.help.panel"]');
        if (!panel) return false;
        const following = Boolean(element.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING);
        return following === (next === 'bottom');
      }, placement)
    )
    .toBe(true);
}
for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile help placement preserves content and survives reload ${language} ${theme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(
        testInfo.project.name.includes('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
      );
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme });
      const writes: string[] = [];
      page.on('request', (request) => {
        if (
          new URL(request.url()).pathname.startsWith('/api/') &&
          !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
        )
          writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      });
      await installHaveApiMock(page, {
        user: { id: 10, login: 'synthetic-admin', level: 99 },
        handlers: {
          'GET webui_user_settings': () => ({
            webui_user_setting: { namespace: 'ui', key: 'settings', value: JSON.stringify({ language, theme }) },
          }),
          'GET vpses/123': () => ({ vps }),
          'GET vpses/124': () => jsonFulfill(failEnvelope('Synthetic VPS load failure'), 503),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET oom_reports': () => ({ oom_reports: [] }),
          'GET help_boxes': () => ({
            help_boxes: [{ id: 401, content: '<p>Synthetic contextual help</p>', order: 1 }],
          }),
          'GET languages': () => ({ languages: [] }),
        },
      });
      await page.goto('/app/vps/123');
      await expectOrder(page, 'vps.header', 'top');
      await page.getByTestId('contextual.help.toggle').click();
      await expect(page.getByTestId('contextual.help.toggle')).toHaveAttribute('aria-expanded', 'true');
      await page
        .frameLocator('[data-testid="contextual.help.box.401"] iframe')
        .getByText('Synthetic contextual help')
        .waitFor();
      if (process.env['CAPTURE_SIDE'] === 'baseline') {
        await page.screenshot({
          path: testInfo.outputPath(`help-position-${language}-${theme}-before.png`),
          fullPage: true,
        });
        return;
      }
      await openShellNavigation(page);
      // Older experiment baseline keeps preferences in the account menu; the
      // cumulative preview retains the dedicated settings trigger.
      const dedicated = page.getByTestId('shell.interface-preferences-button');
      await ((await dedicated.count()) ? dedicated : page.getByTestId('shell.user-menu-button')).click();
      const bottom = page.getByTestId('shell.interface-preferences.help-placement.bottom');
      await expect(bottom).toHaveText(language === 'cs' ? 'Dole' : 'Bottom');
      expect((await bottom.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await bottom.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('contextual.help.toggle')).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await closeNavigation(page);
      await expectOrder(page, 'vps.header', 'bottom');
      await expect(page.getByTestId('contextual.help.toggle')).toHaveAttribute('aria-expanded', 'true');
      await page.screenshot({
        path: testInfo.outputPath(`help-position-${language}-${theme}-after.png`),
        fullPage: true,
      });
      await page.reload();
      await expectOrder(page, 'vps.header', 'bottom');
      await expect(page.getByTestId('contextual.help.toggle')).toHaveAttribute('aria-expanded', 'true');
      await page.goto('/app/vps/124');
      await expectOrder(page, 'vps.detail.error', 'bottom');
      await expect(page.getByTestId('vps.detail.error')).toContainText('Synthetic VPS load failure');
      await page.goto('/app/profile');
      await expectOrder(page, 'profile.prefs.card', 'bottom');
      const choice = page.getByRole('combobox', { name: language === 'cs' ? 'Umístění nápovědy' : 'Help position' });
      await expect(choice).toHaveValue('bottom');
      await choice.selectOption('top');
      await expectOrder(page, 'profile.prefs.card', 'top');
      await page.reload();
      await expect(choice).toHaveValue('top');
      await expectOrder(page, 'profile.prefs.card', 'top');
      await expectNoDocumentHorizontalOverflow(page);
      expect(writes).toEqual([]);
    });
  }
}
