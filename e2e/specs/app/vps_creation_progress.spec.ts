import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['en', 'cs'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} shows accepted VPS detail during creation and after reload`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language });
    await page.addInitScript(() => {
      sessionStorage.setItem('webui-next.tracked_action_states.user-2', JSON.stringify([{
        id: 956, addedAt: Date.now(), actionLabelKey: 'action.vps.create.label',
        object: { kind: 'Vps', id: 156 }, objectLabel: 'new-vps.example',
      }]));
    });
    let detailAvailable = false;
    let result: 'pending' | 'failed' | 'unavailable' = 'pending';
    await installHaveApiMock(page, {
      user: { id: 2, login: 'member', level: 2 },
      handlers: {
        'GET vpses/156': () => detailAvailable ? { vps: {
          id: 156, hostname: 'new-vps.example', user: { id: 2, login: 'member' },
          node: { id: 3, name: 'node3', location: { id: 2, label: 'Praha' } },
          os_template: { id: 6, label: 'Debian 13' }, object_state: 'active',
          is_running: false, cpu: 2, memory: 2048, swap: 0,
        } } : failEnvelope('Detail not ready'),
        'GET action_states/956': () => result === 'unavailable' ? failEnvelope('Unavailable') : { action_state: {
          id: 956, finished: result === 'failed', status: result !== 'failed', current: 2, total: 7,
        } },
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });
    await page.goto('/app/vps/156');
    const banner = page.getByTestId('vps.creation.status');
    await expect(banner).toContainText(language === 'cs' ? 'VPS se vytváří' : 'Creating VPS');
    await expect(page.getByRole('heading', { name: /156/ })).toBeVisible();
    detailAvailable = true;
    await expect(page.getByTestId('vps.header')).toContainText('new-vps.example', { timeout: 10_000 });
    await expect(page.getByTestId('vps.action.start')).toBeDisabled();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    await page.reload();
    await expect(banner).toContainText(language === 'cs' ? 'VPS se vytváří' : 'Creating VPS');
    await expect(page.getByTestId('vps.header')).toBeVisible();
    await expect(page.getByTestId('vps.overview.control_center')).toBeVisible();
    if (process.env['VPS_CREATE_SCREENSHOTS']) await page.screenshot({
      path: `${process.env['VPS_CREATE_SCREENSHOTS']}/creation-${language}-${test.info().project.name}.png`, fullPage: true,
    });
    result = 'unavailable';
    await expect(banner).toContainText(language === 'cs' ? 'Stav vytváření není dostupný' : 'Creation status is unavailable', { timeout: 10_000 });
    await expect(page.getByTestId('vps.header')).toBeVisible();
    await expect(page.getByTestId('vps.action.start')).toBeDisabled();
    result = 'failed';
    await banner.getByRole('button', { name: language === 'cs' ? 'Zkusit znovu' : 'Retry' }).click();
    await expect(banner).toContainText(language === 'cs' ? 'Při vytváření VPS došlo k chybě' : 'VPS creation encountered an error');
    await expect(page.getByTestId('vps.header')).toBeVisible();
  });
}
