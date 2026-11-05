import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type TestInfo } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

// Shared synthetic evidence for the baseline and candidate; assertions apply to both.
// Dashboard/security unit tests separately protect which aggregate notices disappear.
for (const language of ['cs', 'en'] as const) {
  test(`content visibility retains useful context in ${language}`, async ({ page, isMobile }, testInfo: TestInfo) => {
    await page.setViewportSize({ width: isMobile ? 393 : 1440, height: isMobile ? 851 : 1100 });
    await page.clock.setFixedTime(new Date('2026-11-04T12:00:00Z'));
    await setUiSettingsLocalStorage(page, { language, theme: 'light' });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'CONTENT_VISIBILITY_FIXTURE' });

    const user = {
      id: 1,
      login: 'fixture-member',
      level: 1,
      time_zone: 'UTC',
      monthly_payment: 200,
      paid_until: '2099-01-01T00:00:00Z',
      enable_basic_auth: true,
      enable_token_auth: true,
      enable_oauth2_auth: false,
      enable_single_sign_on: true,
      enable_new_login_notification: true,
      enable_multi_factor_auth: true,
      preferred_session_length: 1200,
      preferred_logout_all: false,
    };
    let nodesUnavailable = false;
    await installHaveApiMock(page, {
      user,
      handlers: {
        'GET users/current': () => ({ user }),
        'GET vpses': () => ({
          vpses: [
            { id: 101, hostname: 'web.example.test', is_running: true, object_state: 'active' },
            { id: 102, hostname: 'backup.example.test', is_running: false, object_state: 'active' },
          ],
          _meta: { total_count: 2 },
        }),
        'GET datasets': () => ({ datasets: [{ id: 10 }], _meta: { total_count: 1 } }),
        'GET dns_zones': () => ({ dns_zones: [{ id: 20 }], _meta: { total_count: 1 } }),
        'GET nodes/public_status': () =>
          nodesUnavailable
            ? { status: false, message: 'Synthetic node status unavailable', response: null }
            : {
                nodes: [
                  {
                    id: 1,
                    name: 'node-a.prg',
                    fqdn: 'node-a.prg.example.test',
                    status: true,
                    location: { label: 'Praha' },
                    last_report: '2026-11-04T12:00:00Z',
                    vps_count: 2,
                    vps_free: 8,
                    cpu_idle: 75,
                    kernel: '6.1.0',
                    cgroup_version: 'v2',
                    pool_state: 'ONLINE',
                    pool_status: true,
                  },
                ],
              },
        'GET outages': () => ({ outages: [] }),
        'GET news_logs': () => ({ news_logs: [] }),
        'GET security_advisories': () => ({ security_advisories: [], _meta: { total_count: 0 } }),
        'GET users/1/get_payment_instructions': () => ({
          user: {
            instructions:
              '<h3>Payment in CZK</h3><table><tr><td>IBAN:</td><td>CZ00TEST</td></tr><tr><td>Variable symbol:</td><td>1</td></tr></table>',
          },
        }),
        'GET user_payments': () => ({
          user_payments: [
            {
              id: 300,
              amount: 200,
              created_at: '2026-10-01T09:00:00Z',
              from_date: '2026-10-01T00:00:00Z',
              to_date: '2026-11-01T00:00:00Z',
            },
          ],
        }),
      },
    });

    const capture = async (name: string) => {
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expectNoDocumentHorizontalOverflow(page);
      if (process.env['E2E_CAPTURE_SCREENSHOTS'] !== '1') return;
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const directory = process.env['E2E_SCREENSHOT_DIR']?.trim() || testInfo.outputDir;
      fs.mkdirSync(directory, { recursive: true });
      const screenshotPath = path.join(directory, `${name}-${language}-${testInfo.project.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled', scale: 'css' });
      await testInfo.attach(name, { path: screenshotPath, contentType: 'image/png' });
    };

    await page.goto('/app');
    const dashboard = page.getByTestId('app.dashboard.page');
    await expect(dashboard).toBeVisible();
    await expect(page.getByTestId('app.dashboard.kpi.vps')).toContainText('2');
    await expect(page.getByTestId('app.dashboard.kpi.vps').getByRole('link')).toHaveAttribute('href', '/app/vps');
    await expect(page.getByTestId('app.dashboard.cluster.card')).toContainText('node-a.prg');
    await capture('dashboard-available');

    nodesUnavailable = true;
    await page.goto('/app');
    await expect(page.getByTestId('app.dashboard.cluster.card')).toContainText(
      language === 'cs' ? 'Nepodařilo se načíst stav nodů' : 'Failed to load node status'
    );
    await expect(page.getByTestId('app.dashboard.status-alert')).toBeVisible();
    await capture('dashboard-unavailable');

    await page.goto('/app/profile/security');
    const posture = page.getByTestId('profile.security.posture.card');
    await expect(posture).toBeVisible();
    await expect(posture).toContainText(language === 'cs' ? 'Bezpečnostní stav' : 'Security posture');
    for (const item of ['interactive_login', 'mfa', 'new_login_notification', 'session_length']) {
      await expect(page.getByTestId(`profile.security.posture.item.${item}`)).toBeVisible();
    }
    await expect(page.getByTestId('profile.security.posture.item.session_length')).toContainText('20');
    await expect(page.getByTestId('profile.security.password.save')).toBeDisabled();
    await capture('profile-security-ready');

    user.enable_multi_factor_auth = false;
    await page.goto('/app/profile/security');
    await expect(page.getByTestId('profile.security.posture.summary')).toContainText('1');
    await expect(posture).toContainText(language === 'cs' ? 'Vyžaduje pozornost' : 'Needs attention');
    await capture('profile-security-recommendation');

    await page.goto('/app/payments');
    await expect(
      page.getByRole('heading', { name: language === 'cs' ? 'Platby' : 'Payments', exact: true })
    ).toBeVisible();
    await expect(page.getByTestId('payments.my.stat.payment_id')).toContainText(
      language === 'cs'
        ? 'Použij tento identifikátor při platbě (např. variabilní symbol).'
        : 'Use this identifier when paying (e.g. variable symbol).'
    );
    await expect(page.getByTestId('payments.my.stat.paid_until')).toContainText('2099');
    await expect(page.getByTestId('payments.my.stat.monthly_payment')).toContainText('200');
    const instructions = page.getByTestId('payments.my.instructions.text');
    await expect(
      instructions.getByRole('heading', { name: language === 'cs' ? 'Platba v CZK' : 'Payment in CZK' })
    ).toBeVisible();
    await expect(instructions).toContainText('CZ00TEST');
    await expect(page.getByTestId('payments.my.instructions.copy')).toBeVisible();
    const history = page.getByTestId('payments.my.history.table');
    await expect(history.locator('tbody tr')).toHaveCount(1);
    await expect(
      page.getByText(
        language === 'cs' ? 'Zaúčtované platby prodlužující účet.' : 'Accepted payments extending your account.',
        { exact: true }
      )
    ).toBeVisible();
    await capture('payments');
  });
}
