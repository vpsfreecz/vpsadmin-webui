import { clickShellControl, openShellNavigation } from '../../helpers/shellNavigation';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function expectNormalizedVpsListUrl(page: Page, pathname: '/app/vps' | '/admin/vps') {
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        page: url.searchParams.get('page'),
        limit: url.searchParams.get('limit'),
      };
    })
    .toEqual({ pathname, page: '1', limit: '50' });
}

test.describe('@smoke @smoke-mobile Admin scope switcher', () => {
  test('switches between All and Mine views preserving safe routes', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    await installHaveApiMock(page, {
      user: { id: 42, login: 'admin', level: 100 },
      handlers: {
        'GET vpses': () => ({
          vpses: [{ id: 1, hostname: 'vps1.example', object_state: 'active', is_running: true }],
          _meta: { total_count: 1 },
        }),
        'GET datasets': () => ({ datasets: [], _meta: { total_count: 0 } }),
        'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
        'GET nodes': () => ({
          nodes: [
            { id: 1, domain_name: 'node1', fqdn: 'node1.example' },
            { id: 2, domain_name: 'node2', fqdn: 'node2.example' },
          ],
        }),
        'GET nodes/public_status': () => [
          { id: 1, domain_name: 'node1', fqdn: 'node1.example', status: 'online', last_report: '2026-01-01T00:00:00Z' },
          { id: 2, domain_name: 'node2', fqdn: 'node2.example', status: 'online', last_report: '2026-01-01T00:00:00Z' },
        ],
      },
    });

    // Switching scopes lands on the matching list and lets the target list normalize
    // pagination to its stable first-page query params.
    await page.goto('/admin/vps?from_id=50&page=2');
    await expect(page.getByTestId('vps.list')).toBeVisible();

    await clickShellControl(page, 'shell.user-menu-button');
    await page.getByTestId('shell.interface-preferences.scope.mine').click();

    await expectNormalizedVpsListUrl(page, '/app/vps');
    await openShellNavigation(page);
    await expect(page.getByTestId('scope.indicator')).toHaveText(/^(Mine|Moje)$/);

    // When switching to Mine from an admin-only page, fall back to /app.
    await page.goto('/admin/nodes');
    await expect(page.getByTestId('admin.nodes.page')).toBeVisible();

    await clickShellControl(page, 'shell.user-menu-button');
    await page.getByTestId('shell.interface-preferences.scope.mine').click();

    await expect(page).toHaveURL('/app');
  });

  test('shows a warning toast when switching to All objects view', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });

    await installHaveApiMock(page, {
      user: { id: 42, login: 'admin', level: 100 },
      handlers: {
        'GET vpses': () => ({
          vpses: [{ id: 1, hostname: 'vps1.example', object_state: 'active', is_running: true }],
          _meta: { total_count: 1 },
        }),
        'GET datasets': () => ({ datasets: [], _meta: { total_count: 0 } }),
        'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
      },
    });

    await page.goto('/app/vps');
    await expect(page.getByTestId('vps.list')).toBeVisible();

    await clickShellControl(page, 'shell.user-menu-button');
    await page.getByTestId('shell.interface-preferences.scope.all').click();

    await expectNormalizedVpsListUrl(page, '/admin/vps');
    await openShellNavigation(page);
    await expect(page.getByTestId('scope.indicator')).toHaveText(/^(All|Všechny)$/);
    await expect(page.getByTestId('toast.scope.all.back')).toBeVisible();
  });
});

for (const section of ['datasets', 'nas'] as const) {
  test(`keeps a long ${section} scope-mismatch label inside its card @prsmoke @smoke-mobile`, async ({ page }) => {
    const label = 'tank/synthetic_unbroken_dataset_label_for_narrow_ownership_scope_mismatch_123456789';
    await page.setViewportSize({ width: 320, height: 750 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_SCOPE_WRAP' });
    await setUiSettingsLocalStorage(page, { language: 'en', theme: 'dark' });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'synthetic-admin', level: 99 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: { id: 42, name: label, full_name: label, user: { id: 42, login: 'synthetic-owner' }, vps: null },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });
    await page.goto(`/app/${section}/42/snapshots?synthetic_return=1#synthetic`);
    const card = page.getByTestId('datasets.scope-mismatch');
    await expect(card).toBeVisible();
    await expect(card).toContainText(label);
    await expect(page.getByTestId('scope.mismatch.open-admin')).toHaveAttribute(
      'href',
      `/admin/${section}/42/snapshots?synthetic_return=1#synthetic`
    );
    await expect(page.getByTestId('scope.mismatch.back')).toHaveAttribute('href', `/app/${section}`);
    const bounds = await card.evaluate((element) => {
      const paragraph = element.querySelector('p');
      if (!paragraph) throw new Error('Missing scope-mismatch message');
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      return {
        width: document.documentElement.scrollWidth,
        card: element.getBoundingClientRect().toJSON(),
        fragments: [...range.getClientRects()].map((rect) => rect.toJSON()),
      };
    });
    expect(bounds.width).toBeLessThanOrEqual(321);
    expect(bounds.fragments.length).toBeGreaterThan(0);
    for (const fragment of bounds.fragments) {
      expect(fragment.left).toBeGreaterThanOrEqual(bounds.card.left - 1);
      expect(fragment.right).toBeLessThanOrEqual(bounds.card.right + 1);
    }
    await page.getByTestId('scope.mismatch.open-admin').focus();
    await expect(page.getByTestId('scope.mismatch.open-admin')).toBeFocused();
  });
}

for (const section of ['datasets', 'nas'] as const) {
  test(`keeps a long ${section} management identity inside its card @prsmoke @smoke-mobile`, async ({ page }) => {
    const name = 'synthetic_unbroken_dataset_label_for_narrow_management_identity_123456789';
    await page.setViewportSize({ width: 320, height: 750 });
    await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_DATASET_IDENTITY_WRAP' });
    await setUiSettingsLocalStorage(page, { language: 'en', theme: 'dark' });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'synthetic-admin', level: 99 },
      handlers: {
        'GET datasets/42': () => ({
          dataset: {
            id: 42,
            name,
            full_name: `tank/${name}`,
            user: { id: 42, login: 'synthetic-owner' },
            vps: null,
            object_state: 'active',
          },
        }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });
    await page.goto(`/admin/${section}/42`);
    const card = page.getByTestId('dataset.manage');
    await expect(card).toBeVisible();
    const hint = card.locator('.mb-4');
    await expect(hint).toContainText(name);
    const bounds = await hint.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return {
        width: document.documentElement.scrollWidth,
        hint: element.getBoundingClientRect().toJSON(),
        fragments: [...range.getClientRects()].map((rect) => rect.toJSON()),
      };
    });
    expect(bounds.width).toBeLessThanOrEqual(321);
    for (const fragment of bounds.fragments) {
      expect(fragment.left).toBeGreaterThanOrEqual(bounds.hint.left - 1);
      expect(fragment.right).toBeLessThanOrEqual(bounds.hint.right + 1);
    }
  });
}
