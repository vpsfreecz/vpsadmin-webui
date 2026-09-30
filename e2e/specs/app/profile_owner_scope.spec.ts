import { test, expect } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage, jsonFulfill, failEnvelope } from '../../fixtures';

for (const language of ['en', 'cs'] as const) {
  for (const base of ['/app', '/admin']) {
    test(`@pr-smoke @pr-smoke-mobile personal account stays owned for admin: ${base} ${language}`, async ({ page }, info) => {
      const user = { id: 1, login: 'demo-admin', level: 99 };
      const other = { id: 2, login: 'other-user', level: 1 };
      const own = { id: 50, user, label: 'My laptop', auth_type: 'oauth2', closed_at: null, client_ip_addr: '192.0.2.10' };
      const foreign = { ...own, id: 100, user: other, label: 'Other account session' };
      const ownToken = { id: 3, user, metric_prefix: 'my_monitoring_', use_count: 0 };
      const foreignToken = { id: 4, user: other, metric_prefix: 'other_monitoring_', use_count: 0 };
      const sessionOwners: (string | null)[] = [];
      const metricOwners: (string | null)[] = [];
      let failSessions = false;
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC' });
      await installHaveApiMock(page, { user, handlers: {
        'GET users/1': () => ({ user }),
        'GET users/2': () => ({ user: other }),
        'GET user_sessions': (ctx) => {
          const owner = ctx.searchParams.get('user_session[user]');
          sessionOwners.push(owner);
          if (failSessions) return jsonFulfill(failEnvelope('Synthetic service failure'), 500);
          if (owner === '2') return { user_sessions: [foreign] };
          if (owner !== '1') return { user_sessions: [foreign, own] };
          return { user_sessions: ctx.searchParams.has('user_session[from_id]') ? [] : Array.from({ length: 25 }, (_, i) => ({ ...own, id: 50 - i })) };
        },
        'GET user_sessions/100': () => ({ user_session: foreign }),
        'GET user_sessions/50': () => ({ user_session: own }),
        'GET metrics_access_tokens': (ctx) => {
          const owner = ctx.searchParams.get('metrics_access_token[user]');
          metricOwners.push(owner);
          return { metrics_access_tokens: owner === '1' ? [ownToken] : owner === '2' ? [foreignToken] : [ownToken, foreignToken] };
        },
        'POST metrics_access_tokens': (ctx) => {
          expect(ctx.reqJson).toMatchObject({ metrics_access_token: { user: 1, metric_prefix: 'new_monitoring_' } });
          return { metrics_access_token: { ...ownToken, id: 5, access_token: 'synthetic-new-token' } };
        },
      } });
      await page.goto(`${base}/profile/sessions?user=2`);
      await expect(page.getByTestId('profile.sessions.row.50').filter({ visible: true })).toBeVisible();
      await expect(page.getByText('Other account session')).toHaveCount(0);
      await expect(page.getByTestId('profile.sessions.summary')).toContainText('25');
      await page.getByTestId('profile.sessions.pagination.next').click();
      await expect(page.getByTestId('profile.sessions.row.50')).toHaveCount(0);
      await expect(page.getByTestId('profile.sessions.pagination.next')).toBeDisabled();
      await page.getByTestId('profile.sessions.pagination.prev').click();
      await expect(page.getByTestId('profile.sessions.row.50').filter({ visible: true })).toBeVisible();
      await page.getByTestId('profile.sessions.exact_id').fill('100');
      await expect(page.getByTestId('profile.sessions.empty')).toBeVisible();
      await expect(page.getByTestId('profile.sessions.row.100')).toHaveCount(0);
      await expect(page.getByText('Other account session')).toHaveCount(0);
      await page.getByTestId('profile.sessions.exact_id').fill('50');
      await expect(page.getByTestId('profile.sessions.row.50').filter({ visible: true })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`personal-sessions-${language}.png`), fullPage: true });
      await page.getByTestId('profile.sessions.exact_id').fill('');
      failSessions = true;
      await page.getByTestId('profile.sessions.refresh').click();
      await expect(page.getByTestId('profile.sessions.card').getByText(language === 'cs' ? 'Načtení relací selhalo.' : 'Failed to load sessions.', { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(page.getByTestId('profile.sessions.row.100')).toHaveCount(0);
      expect(sessionOwners.every((id) => id === '1')).toBe(true);
      failSessions = false;
      await page.getByTestId('shell.user-menu-button').click();
      await page.getByTestId('shell.user-menu.account').click();
      await expect(page).toHaveURL(new RegExp(`${base}/profile$`));
      await page.locator(`a[href="${base}/profile/sessions"]`).click();
      await expect(page.getByTestId('profile.sessions.row.50').filter({ visible: true })).toBeVisible();
      await expect(page.getByText('Other account session')).toHaveCount(0);

      await page.goto(`${base}/profile/metrics?user=2`);
      await expect(page.getByText('my_monitoring_', { exact: true }).filter({ visible: true })).toBeVisible();
      await expect(page.getByText('other_monitoring_', { exact: true })).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`personal-metrics-${language}.png`), fullPage: true });
      await page.getByTestId('profile.metrics.create').click();
      await page.getByTestId('profile.metrics.create_modal.prefix').fill('new_monitoring_');
      await page.getByTestId('profile.metrics.create_modal.create').click();
      await expect(page.getByTestId('profile.metrics.created_modal')).toBeVisible();
      expect(metricOwners.every((id) => id === '1')).toBe(true);

      // Dedicated administration still targets the selected other account.
      await page.goto('/admin/users/2/sessions');
      await expect(page.getByTestId('admin.user.sessions.row.100').filter({ visible: true })).toBeVisible();
      expect(sessionOwners.at(-1)).toBe('2');
      await page.goto('/admin/users/2/metrics');
      await expect(page.getByText('other_monitoring_', { exact: true }).filter({ visible: true })).toBeVisible();
      expect(metricOwners.at(-1)).toBe('2');
    });
  }
}

for (const level of [1, 21]) {
  test(`@pr-smoke personal metrics retains API-enforced scope for level ${level}`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC' });
    await installHaveApiMock(page, { user: { id: 1, login: 'member', level }, handlers: {
      'GET metrics_access_tokens': (ctx) => {
        expect(ctx.searchParams.has('metrics_access_token[user]')).toBe(false);
        return { metrics_access_tokens: [{ id: 3, metric_prefix: 'own_', use_count: 0 }] };
      },
      'POST metrics_access_tokens': (ctx) => {
        expect(ctx.reqJson).toEqual({ metrics_access_token: { metric_prefix: 'vpsadmin_' } });
        return { metrics_access_token: { id: 4, metric_prefix: 'vpsadmin_', access_token: 'synthetic' } };
      },
    } });
    await page.goto('/app/profile/metrics');
    await expect(page.getByText('own_', { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByTestId('profile.metrics.create').click();
    await page.getByTestId('profile.metrics.create_modal.create').click();
    await expect(page.getByTestId('profile.metrics.created_modal')).toBeVisible();
  });
}

test('@pr-smoke @pr-smoke-mobile personal namespace deep links reject foreign ownership before mounting details', async ({ page }) => {
  const user = { id: 1, login: 'demo-admin', level: 99 };
  const childRequests: string[] = [];
  await setUiSettingsLocalStorage(page, { language: 'en' });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC' });
  await installHaveApiMock(page, { user, handlers: {
    'GET user_namespaces/10': () => ({ user_namespace: { id: 10, user, size: 65536 } }),
    'GET user_namespaces/20': () => ({ user_namespace: { id: 20, user: { id: 2, login: 'Foreign owner' }, size: 65536 } }),
    'GET user_namespace_maps/20': () => ({ user_namespace_map: { id: 20, user_namespace: { id: 20 }, label: 'Foreign map' } }),
    'GET user_namespace_maps/20/entries': () => { childRequests.push('entries'); return { entries: [] }; },
    'GET vpses': () => { childRequests.push('vps'); return { vpses: [] }; },
  } });
  await page.goto('/admin/profile/user-namespaces/namespaces/10');
  await expect(page.getByTestId('profile.userns.namespace.card')).toContainText('demo-admin');
  await page.goto('/admin/profile/user-namespaces/namespaces/20');
  await expect(page.getByText('Not found', { exact: true })).toBeVisible();
  await expect(page.getByText('Foreign owner')).toHaveCount(0);
  await page.goto('/app/profile/user-namespaces/maps/20');
  await expect(page.getByText('Not found', { exact: true })).toBeVisible();
  await expect(page.getByText('Foreign map')).toHaveCount(0);
  expect(childRequests).toEqual([]);
});
