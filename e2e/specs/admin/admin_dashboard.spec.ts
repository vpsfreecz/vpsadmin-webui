import { expect, test, type Page } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test.use({ locale: 'cs-CZ' });

test.describe('Admin dashboard', () => {
  test('@smoke keeps the overview concise and groups navigation', async ({ page }) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language: 'en' });

    await installHaveApiMock(page, {
      user: { id: 1, login: 'administrator', level: 90 },
      handlers: {
        'GET cluster_full_stats': () => ({
          cluster_full_stats: [{ vps_count: 0, dataset_count: 0, dns_zone_count: 0 }],
        }),
        'GET datasets': () => ({ datasets: [], _meta: { total_count: 0 } }),
        'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
        'GET nodes/public_status': () => ({ nodes: [] }),
        'GET outages': () => ({ outages: [] }),
        'GET news_logs': () => ({ news_logs: [] }),
        'GET security_advisories': () => ({ security_advisories: [], _meta: { total_count: 0 } }),
      },
    });

    await page.goto('/admin');

    await expect(page.getByTestId('app.dashboard.page')).toBeVisible();
    await expect(page.getByTestId('admin.attention.queue')).toHaveCount(0);

    if ((page.viewportSize()?.width ?? 0) < 768) {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(page.getByTestId('nav.drawer.group.services')).toBeVisible();
      await expect(page.getByTestId('nav.drawer.group.operations')).toBeVisible();
      await expect(page.getByTestId('nav.drawer.group.users-finance')).toBeVisible();
      await expect(page.getByTestId('nav.drawer.account')).toBeVisible();
      await page.getByTestId('nav.drawer.close').click();
    } else {
      await expect(page.getByTestId('nav.sidebar.group.services')).toBeVisible();
      await expect(page.getByTestId('nav.sidebar.group.operations')).toBeVisible();
      await expect(page.getByTestId('nav.sidebar.group.users-finance')).toBeVisible();
      await expect(page.getByTestId('nav.sidebar.account')).toBeVisible();
    }
  });
});

async function newsDashboard(page: Page, language: 'cs' | 'en', level: number, path: string) {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'news-test', level },
    handlers: {
      'GET cluster_full_stats': () => ({ cluster_full_stats: [{ vps_count: 0 }] }),
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET datasets': () => ({ datasets: [], _meta: { total_count: 0 } }),
      'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({
        news_logs: [
          {
            id: 42,
            published_at: '2026-10-19T09:00:00Z',
            cs_message: 'Vyzkoušej nové webové rozhraní vpsAdminu.',
            en_message: 'Try the new vpsAdmin web interface.',
          },
        ],
      }),
      'GET security_advisories': () => ({ security_advisories: [] }),
    },
  });
  await page.goto(path);
  await expect(page.getByTestId('app.dashboard.news.card')).toBeVisible();
}

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile news administration shortcut (${language})`, async ({
    page,
    isMobile,
  }, testInfo) => {
    await newsDashboard(page, language, 90, '/admin');
    const card = page.getByTestId('app.dashboard.news.card');
    const manage = card.getByRole('link', {
      name: language === 'cs' ? 'Spravovat novinky' : 'Manage news',
      exact: true,
    });
    await expect(manage).toHaveAttribute('href', '/admin/content/news');
    const all = card.getByRole('link', { name: language === 'cs' ? 'Všechny novinky' : 'All news', exact: true });
    await expect(all).toHaveAttribute('href', '/news');
    await expect(card).toContainText(language === 'cs' ? 'Vyzkoušej nové' : 'Try the new');
    if (language === 'cs' && process.env['E2E_CAPTURE_SCREENSHOTS'] === '1') {
      await card.screenshot({ path: `docs/design/images/news-manage-${testInfo.project.name}.png`, scale: 'css' });
    }
    if (isMobile) await page.setViewportSize({ width: 320, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByTestId('app.dashboard.widget.news.collapse').click();
    await expect(manage).toBeVisible();
    if (isMobile) await manage.tap();
    else await manage.click();
    await expect(page).toHaveURL(/\/admin\/content\/news$/);
    await expect(page.getByTestId('admin.newslog.create')).toBeVisible();
    await page.getByTestId('admin.newslog.create').click();
    await expect(page.getByTestId('admin.newslog.editor.cs_message')).toBeVisible();
    await expect(page.getByTestId('admin.newslog.editor.en_message')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/admin');
    await page
      .getByTestId('app.dashboard.news.card')
      .getByRole('link', { name: language === 'cs' ? 'Všechny novinky' : 'All news', exact: true })
      .click();
    await expect(page.getByTestId('public.news.page')).toBeVisible();
  });
}

for (const scenario of [
  { label: 'member', level: 1, path: '/app' },
  { label: 'administrator in My view', level: 90, path: '/app' },
  { label: 'support', level: 21, path: '/admin' },
]) {
  test(`news administration shortcut is hidden for ${scenario.label}`, async ({ page }) => {
    await newsDashboard(page, 'en', scenario.level, scenario.path);
    await expect(page.getByTestId('app.dashboard.news.manage')).toHaveCount(0);
    await expect(
      page.getByTestId('app.dashboard.news.card').getByRole('link', { name: 'All news', exact: true })
    ).toHaveAttribute('href', '/news');
  });
}
