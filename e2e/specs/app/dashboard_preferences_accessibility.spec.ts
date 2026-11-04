import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test('@pr-smoke @pr-smoke-mobile dashboard preferences: preserves disclosure focus and responsive touch targets', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.startsWith('mobile-');
  const viewportWidth = mobile ? 320 : 1440;
  await page.setViewportSize({ width: viewportWidth, height: mobile ? 844 : 1000 });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'DASHBOARD_PREFERENCES_ACCESSIBILITY' });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET vpses': () => ({ vpses: [], _meta: { total_count: 0 } }),
      'GET datasets': () => ({ datasets: [], _meta: { total_count: 0 } }),
      'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
      'GET nodes/public_status': () => ({ nodes: [] }),
      'GET outages': () => ({ outages: [] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET security_advisories': () => ({ security_advisories: [], _meta: { total_count: 0 } }),
    },
  });

  await page.goto('/app');

  const card = page.getByTestId('app.dashboard.preferences.card');
  const trigger = page.getByTestId('app.dashboard.preferences.toggle');
  const panel = page.locator('#app-dashboard-preferences-panel');

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAttribute('aria-controls', 'app-dashboard-preferences-panel');
  await expect(panel).toBeHidden();

  await trigger.focus();
  await trigger.press('Enter');

  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();

  for (const id of ['news', 'outages', 'security', 'cluster']) {
    const widget = page.getByTestId(`app.dashboard.preferences.widget.${id}`);
    const controls = widget.getByRole('group');
    await expect(controls).toHaveAccessibleName(/\S/);
    for (const action of ['visible', 'up', 'down', 'collapse']) {
      await expect(controls.getByTestId(`app.dashboard.preferences.widget.${id}.${action}`)).toBeVisible();
    }
  }

  const assertControlGeometry = async (width: number, expectedButtonHeight: number, expectedSelectHeight: number) => {
    const buttons = card.getByRole('button');
    const buttonCount = await buttons.count();
    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(buttonCount).toBeGreaterThan(1);
    for (let index = 0; index < buttonCount; index += 1) {
      const box = await buttons.nth(index).boundingBox();
      expect(box, `button ${index + 1} should be visible`).not.toBeNull();
      expect(box!.height, `button ${index + 1} should meet its target size`).toBe(expectedButtonHeight);
      expect(box!.x, `button ${index + 1} should stay inside the card`).toBeGreaterThanOrEqual(cardBox!.x - 0.5);
      expect(box!.x + box!.width, `button ${index + 1} should stay inside the card`).toBeLessThanOrEqual(
        cardBox!.x + cardBox!.width + 0.5,
      );
      expect(box!.x + box!.width, `button ${index + 1} should stay inside the viewport`).toBeLessThanOrEqual(width + 0.5);
    }

    const densityBox = await page.getByTestId('app.dashboard.preferences.density').boundingBox();
    expect(densityBox).not.toBeNull();
    expect(densityBox!.height).toBe(expectedSelectHeight);
    const widths = await card.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    expect(widths.document).toBeLessThanOrEqual(width);
  };

  expect(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)).toBe(mobile);
  expect(await page.evaluate(() => window.matchMedia('(any-pointer: coarse)').matches)).toBe(mobile);
  await assertControlGeometry(viewportWidth, mobile ? 44 : 32, mobile ? 44 : 36);

  if (mobile) {
    await page.setViewportSize({ width: 844, height: 390 });
    expect(await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches)).toBe(true);
    expect(await page.evaluate(() => window.matchMedia('(any-pointer: coarse)').matches)).toBe(true);
    await assertControlGeometry(844, 44, 44);
  }

  await trigger.press('Enter');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
});

for (const language of ['cs', 'en'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`@pr-smoke @pr-smoke-mobile dashboard editor has distinct groups and text hierarchy in ${language} ${theme}`, async ({ page }, testInfo) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'DASHBOARD_CONTRAST_FIXTURE' });
      await setUiSettingsLocalStorage(page, { language, theme });
      await installHaveApiMock(page, {
        user: { id: 1, login: 'test', level: 1 },
        handlers: {
          'GET vpses': () => ({ vpses: [] }),
          'GET datasets': () => ({ datasets: [] }),
          'GET dns_zones': () => ({ dns_zones: [] }),
          'GET nodes/public_status': () => ({ nodes: [] }),
          'GET outages': () => ({ outages: [] }),
          'GET news_logs': () => ({ news_logs: [] }),
          'GET security_advisories': () => ({ security_advisories: [] }),
        },
      });
      await page.goto('/app');
      const card = page.getByTestId('app.dashboard.preferences.card');
      await page.getByTestId('app.dashboard.preferences.toggle').click();
      await expect(page.locator('#app-dashboard-preferences-panel')).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath('dashboard-editor.png'), fullPage: true });
      const presentation = await card.evaluate(element => {
        const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number)
          .map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
          .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index]!, 0);
        const contrast = (first: string, second: string) => {
          const a = luminance(first), b = luminance(second);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        };
        const row = element.querySelector('[data-testid^="app.dashboard.preferences.widget."]')!;
        const panelStyle = getComputedStyle(element), rowStyle = getComputedStyle(row);
        const title = element.querySelector('#app-dashboard-preferences-title')!;
        const widgetTitle = row.querySelector('h3');
        const description = row.querySelector('.space-y-2 > .text-xs.text-muted')!;
        return {
          panelBorder: contrast(panelStyle.borderTopColor, panelStyle.backgroundColor),
          rowBorder: contrast(rowStyle.borderTopColor, rowStyle.backgroundColor),
          titleSize: parseFloat(getComputedStyle(title).fontSize),
          widgetSize: widgetTitle ? parseFloat(getComputedStyle(widgetTitle).fontSize) : 0,
          widgetWeight: widgetTitle ? Number(getComputedStyle(widgetTitle).fontWeight) : 0,
          descriptionSize: parseFloat(getComputedStyle(description).fontSize),
          descriptionContrast: contrast(getComputedStyle(description).color, rowStyle.backgroundColor),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      expect(presentation.panelBorder).toBeGreaterThanOrEqual(2);
      expect(presentation.rowBorder).toBeGreaterThanOrEqual(1.6);
      expect(presentation.titleSize).toBeGreaterThan(presentation.widgetSize);
      expect(presentation.widgetSize).toBeGreaterThan(presentation.descriptionSize);
      expect(presentation.widgetWeight).toBeGreaterThanOrEqual(600);
      expect(presentation.descriptionContrast).toBeGreaterThanOrEqual(4.5);
      expect(presentation.overflow).toBe(false);
    });
  }
}

test('@pr-smoke @pr-smoke-mobile dashboard widgets share insets after reordering and hiding', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'DASHBOARD_WIDGET_INSETS' });
  const now = new Date().toISOString();
  await installHaveApiMock(page, {
    user: { id: 1, login: 'test', level: 1 },
    handlers: {
      'GET outages': () => ({ outages: [{ id: 55, state: 'announced', begins_at: now, duration: 60 }] }),
      'GET security_advisories': () => ({ security_advisories: [{ id: 77, name: 'Example', state: 'published', published_at: now }] }),
      'GET news_logs': () => ({ news_logs: [] }),
      'GET nodes/public_status': () => ({ nodes: [] }),
    },
  });
  await page.goto('/app');

  const widget = (id: string) => page.getByTestId(`app.dashboard.${id}.card`);
  const expectInsets = async (ids: string[], inset: string) => {
    for (const id of ids) {
      const card = widget(id);
      await expect(card).toBeVisible();
      for (const edge of ['padding-left', 'padding-right']) {
        await expect(card.locator(':scope > div').nth(0)).toHaveCSS(edge, inset);
        await expect(card.locator(':scope > div').nth(1)).toHaveCSS(edge, inset);
      }
    }
  };
  await expectInsets(['news', 'outages', 'security', 'cluster'], '12px');

  await page.getByTestId('app.dashboard.preferences.toggle').click();
  await page.getByTestId('app.dashboard.preferences.widget.outages.up').click();
  await page.getByTestId('app.dashboard.preferences.widget.news.visible').click();
  await expect(widget('news')).toHaveCount(0);
  await page.getByTestId('app.dashboard.preferences.density').selectOption('comfortable');
  await expectInsets(['outages', 'security', 'cluster'], '16px');
  await page.getByTestId('app.dashboard.preferences.widget.news.visible').click();
  await expectInsets(['outages', 'news', 'security', 'cluster'], '16px');
  const [outages, news] = await Promise.all([widget('outages').boundingBox(), widget('news').boundingBox()]);
  expect(outages!.y).toBeLessThan(news!.y);
});
