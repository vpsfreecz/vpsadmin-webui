import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

test('regular user cannot discover or open incident creation', async ({ page }) => {
  let createCalls = 0;
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await installHaveApiMock(page, {
    user: { id: 41, login: 'member', level: 1 },
    handlers: {
      'GET incident_reports': () => ({ incident_reports: [] }),
      'POST incident_reports': () => {
        createCalls += 1;
        return {
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ status: false, message: 'Forbidden', response: null }),
        };
      },
    },
  });

  await page.goto('/app/incidents');
  await expect(page.getByTestId('incidents.list.new')).toHaveCount(0);

  await page.goto('/app/incidents/new');
  await expect(page.getByTestId('incidents.new.forbidden')).toBeVisible();
  await expect(page.getByTestId('incidents.new.forbidden')).toContainText(/access denied|přístup odepřen/i);
  await expect.poll(() => createCalls).toBe(0);
});

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  test(`@pr-smoke @pr-smoke-mobile incident VPS lookup failure is readable in ${language}`, async ({
    page,
  }, testInfo) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    await setUiSettingsLocalStorage(page, { language, theme });
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'READABLE_INCIDENT_LOOKUP',
      webuiNext: { uiSettings: { persistence: 'local' } },
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'presentation-audit', level: 100 },
      handlers: {
        'GET vpses/101': () => failEnvelope('Synthetic VPS read failure'),
        'GET ip_address_assignments': () => ({ ip_address_assignments: [] }),
      },
    });
    await page.goto('/admin/incidents/new?vps=101');
    const message = page.getByText(language === 'cs' ? 'VPS nebylo nalezeno' : 'VPS not found', { exact: true });
    await expect(message).toBeVisible();
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const metrics = await message.evaluate((element) => {
        const style = getComputedStyle(element);
        let parent: Element | null = element;
        let background = 'rgba(0, 0, 0, 0)';
        while (parent && background === 'rgba(0, 0, 0, 0)') {
          background = getComputedStyle(parent).backgroundColor;
          parent = parent.parentElement;
        }
        const luminance = (color: string) =>
          color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((value) => {
              const n = value / 255;
              return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
            })
            .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
        const a = luminance(style.color),
          b = luminance(background);
        return {
          contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          weight: Number(style.fontWeight),
          marker: parseFloat(style.borderLeftWidth),
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      expect(metrics.contrast).toBeGreaterThanOrEqual(4.5);
      expect(metrics.weight).toBeGreaterThanOrEqual(500);
      expect(metrics.marker).toBe(2);
      expect(metrics.overflow).toBe(false);
    }
    await expect(page.getByTestId('incidents.new.vps')).toHaveValue('101');
    await expect(page.getByTestId('incidents.new.subject')).toHaveValue('');
    await page.screenshot({ path: testInfo.outputPath('readable-incident-lookup.png'), fullPage: true });
    expect(writes).toEqual([]);
  });
}
