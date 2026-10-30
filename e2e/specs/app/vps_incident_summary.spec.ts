import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['en', 'cs'] as const) {
  for (const admin of [false, true]) {
    test(`@pr-smoke @pr-smoke-mobile memory incident summary ${language} admin=${admin}`, async ({ page }, testInfo) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      let warning: number | null = 5;
      let stop: number | null = 10;
      let enabled = true;
      const writes: unknown[] = [];
      const vps = () => ({
        id: 123, hostname: 'memory.example.test', object_state: 'active', is_running: true,
        user: { id: 7 }, node: { id: 1 }, memory: 2048,
        incident_policy: 'oomd', incident_policy_label: language === 'en' ? 'VPS memory-pressure incidents' : 'Incidenty přetížení paměti VPS',
        incident_count_7d: 5, incident_count_30d: 10, incident_warning_limit: warning ?? 5, incident_stop_limit: stop ?? 10,
        ...(admin ? { incident_warning_limit_override: warning, incident_stop_limit_override: stop } : {}),
        incident_enforcement_enabled: enabled, incident_stop_enforced: enabled, incident_mode: 'enforce',
        incident_status: 'stop_threshold', incident_action_state: 'none',
        incident_last_stop_at: '2026-10-29T12:00:00Z', incident_next_stop_allowed_at: '2026-10-30T12:00:00Z',
      });
      await installHaveApiMock(page, {
        user: { id: 7, login: 'synthetic-member', level: admin ? 90 : 1 },
        handlers: {
          'GET vpses/123': () => ({ vps: vps() }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'PUT vpses/123': ctx => {
            writes.push(ctx.json);
            const body = ctx.json as { vps?: Record<string, unknown> };
            const payload = body.vps ?? {};
            warning = typeof payload['incident_warning_limit_override'] === 'number' ? payload['incident_warning_limit_override'] : null;
            stop = typeof payload['incident_stop_limit_override'] === 'number' ? payload['incident_stop_limit_override'] : null;
            enabled = payload['incident_enforcement_enabled'] === true;
            return { vps: vps(), _meta: {} };
          },
        },
      });
      const prefix = admin ? '/admin' : '/app';
      await page.goto(`${prefix}/vps/123`);
      const card = page.getByTestId('vps.incident');
      await expect(card).toContainText('5 / 5');
      await expect(card).toContainText('10 / 10');
      await expect(card).toContainText(language === 'en' ? 'No stop is scheduled' : 'není naplánované vypnutí');
      await expect(card.getByRole('link').first()).toHaveAttribute('href', `${prefix}/incidents?vps=123&codename=oomd`);
      await expect(page.getByTestId('vps.incident.settings')).toHaveCount(admin ? 1 : 0);
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('memory-summary.png'), fullPage: true, scale: 'css' });
      if (admin) {
        await card.getByRole('button', { name: language === 'en' ? 'Use default limits' : 'Použít výchozí limity' }).click();
        await card.getByRole('checkbox').check();
        expect(writes).toHaveLength(0);
        await card.getByRole('button', { name: language === 'en' ? 'Save incident settings' : 'Uložit nastavení incidentů', exact: true }).click();
        await page.getByTestId('vps.incident.confirm.confirm').click();
        await expect(page.getByTestId('vps.incident.confirm')).toHaveCount(0);
        expect(writes).toEqual([{ vps: { incident_policy: 'oomd', incident_warning_limit_override: null, incident_stop_limit_override: null, incident_enforcement_enabled: false } }]);
        await expect(card).toContainText(language === 'en' ? 'Exempt from automatic stops' : 'Výjimka z automatického vypnutí');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test('@pr-smoke @pr-smoke-mobile admin incident overview filters the existing VPS list on the server', async ({ page }, testInfo) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language: 'en' });
  const queries: Record<string, unknown>[] = [];
  await installHaveApiMock(page, {
    user: { id: 7, login: 'synthetic-admin', level: 90 },
    handlers: {
      'GET vpses': ctx => {
        queries.push(ctx.params);
        return { vpses: [{ id: 123, hostname: 'memory.example.test', object_state: 'active', is_running: true,
          user: { id: 7 }, incident_policy: 'oomd', incident_policy_label: 'VPS memory-pressure incidents', incident_count_7d: 4, incident_count_30d: 9, incident_warning_limit: 5,
          incident_stop_limit: 10, incident_status: 'near_limit', incident_enforcement_enabled: false }] };
      },
      'GET transaction_chains': () => ({ transaction_chains: [] }),
    },
  });
  await page.goto('/admin/vps');
  await expect(page.getByTestId('vps.incident.filters')).toBeVisible();
  await page.getByLabel('Incident status').selectOption('near_limit');
  await page.getByLabel('Automatic stop exemption', { exact: true }).selectOption('false');
  await expect.poll(() => queries.some(query => query['vps[incident_policy]'] === 'oomd' && query['vps[incident_status]'] === 'near_limit' && String(query['vps[incident_enforcement_enabled]']) === 'false')).toBe(true);
  await expect(page).toHaveURL(/incident_status=near_limit/);
  await page.screenshot({ path: testInfo.outputPath('memory-overview.png'), fullPage: true, scale: 'css' });
});

test('@pr-smoke @pr-smoke-mobile an older API keeps the normal VPS overview', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, { user: { id: 7, login: 'synthetic-member', level: 1 }, handlers: {
    'GET vpses/123': () => ({ vps: { id: 123, hostname: 'older.example.test', object_state: 'active', user: { id: 7 }, node: { id: 1 } } }),
    'GET transaction_chains': () => ({ transaction_chains: [] }),
  } });
  await page.goto('/app/vps/123');
  await expect(page.getByTestId('vps.overview.control_center')).toBeVisible();
  await expect(page.getByTestId('vps.incident')).toHaveCount(0);
});
