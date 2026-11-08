import { expect, test, type Request } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { openShellNavigation } from '../../helpers/shellNavigation';

test('@workflow-matrix @pr-smoke @pr-smoke-mobile @smoke @smoke-mobile authenticated user lands on dashboard and can open VPS list', async ({ page }) => {
  const vpsRequests: Request[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/vpses')) vpsRequests.push(request);
  });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST_USER_SESSION', webuiNext: { haveApi: { authHeader: 'X-HaveAPI-Auth-Token', metaNamespace: '_meta' } } });

  await installHaveApiMock(page, {
    user: { id: 10, login: 'alice', level: 1 },
    handlers: {
      'GET vpses': () => ({
        vpses: [
          { id: 101, hostname: 'alpha', is_running: true, object_state: 'active' },
          { id: 102, hostname: 'beta', is_running: false, object_state: 'active' },
        ],
        _meta: { total_count: 2 },
      }),
      'GET datasets': () => ({ datasets: [{ id: 1 }], _meta: { total_count: 1 } }),
      'GET dns_zones': () => ({ dns_zones: [{ id: 1 }], _meta: { total_count: 1 } }),
      'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
    },
  });

  await page.goto('/app');

  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByTestId('app.dashboard.header')).not.toContainText('Signed in as alice');
  await openShellNavigation(page);
  await expect(page.getByTestId('shell.user-menu-button')).toContainText('alice');
  const drawer = page.getByTestId('nav.drawer');
  if (await drawer.isVisible()) await page.keyboard.press('Escape');
  await expect(page.getByTestId('app.dashboard.kpi.vps')).toContainText('VPS');
  await expect(page.getByTestId('app.dashboard.kpi.vps')).toContainText('2');
  await expect(page.getByText('Running:')).toHaveCount(0);

  await expect(page.getByTestId('app.dashboard.kpi.vps').getByRole('link', { name: 'Open' })).toHaveCount(0);
  await openShellNavigation(page);
  const navigation = page.getByTestId(await drawer.isVisible() ? 'nav.drawer' : 'shell.sidebar');
  await navigation.getByRole('link', { name: 'VPS', exact: true }).click();

  await expect(page).toHaveURL(/\/app\/vps$/);
  await expect(page.getByRole('heading', { name: 'VPS' })).toBeVisible();
  await expect(page.getByRole('link', { name: /alpha/i })).toBeVisible();
  expect(vpsRequests.length).toBeGreaterThan(0);
  for (const request of vpsRequests) {
    expect(request.resourceType()).toBe('xhr');
    expect(request.headers()['x-haveapi-auth-token']).toBe('TEST_USER_SESSION');
  }
});

test('@smoke authenticated dashboard skips HaveAPI description bootstrap in standalone mode', async ({ page }) => {
  const descriptionRequests: string[] = [];
  const currentUserRequests: Request[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/api/v7.0/users/current') {
      currentUserRequests.push(request);
    }
    if (
      ['GET', 'OPTIONS'].includes(request.method()) &&
      ['/api', '/api/', '/api/v7.0', '/api/v7.0/'].includes(url.pathname)
    ) {
      descriptionRequests.push(url.pathname);
    }
  });

  await bootstrapVpsAdminWindow(page, {
    sessionToken: 'TEST_USER_SESSION',
    webuiNext: {
      haveApi: {
        authHeader: 'X-HaveAPI-Auth-Token',
        metaNamespace: '_meta',
      },
    },
  });
  await page.route('**/config.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'delete window.vpsAdmin.description;',
  }));

  await installHaveApiMock(page, {
    user: { id: 10, login: 'alice', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET datasets': () => ({ datasets: [], _meta: { total_count: 0 } }),
      'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
      'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
    },
  });

  await page.goto('/app');

  await expect(page.getByTestId('app.dashboard.page')).toBeVisible();
  expect(await page.evaluate(() => window.vpsAdmin?.description)).toBeUndefined();
  expect(descriptionRequests).toEqual([]);
  expect(currentUserRequests.length).toBeGreaterThan(0);
  for (const request of currentUserRequests) {
    expect(request.resourceType()).toBe('xhr');
    expect(request.headers()['x-haveapi-auth-token']).toBe('TEST_USER_SESSION');
  }
});
