import { expect, test } from '@playwright/test';

import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const monitoredEvent = {
  id: 201,
  label: 'Production probe',
  monitor: 'production-probe',
  state: 'confirmed',
  created_at: '2026-08-30T18:00:00.000Z',
  updated_at: '2026-08-30T18:01:00.000Z',
};

test('@pr-smoke @pr-smoke-mobile rejected monitoring decisions stay in their dialog for retry', async ({ page }) => {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'MONITORING_ACTION_RETRY' });

  let acknowledgeAttempts = 0;
  let ignoreAttempts = 0;
  await installHaveApiMock(page, {
    user: { id: 1, login: 'user', level: 1 },
    handlers: {
      'GET monitored_events/201': () => ({ monitored_event: monitoredEvent }),
      'GET monitored_events/201/logs': () => ({ logs: [] }),
      'POST monitored_events/201/acknowledge': () => {
        acknowledgeAttempts += 1;
        if (acknowledgeAttempts === 1) return failEnvelope('Acknowledgement was rejected');
        return { monitored_event: {} };
      },
      'POST monitored_events/201/ignore': () => {
        ignoreAttempts += 1;
        if (ignoreAttempts === 1) return failEnvelope('Ignore request was rejected');
        return { monitored_event: {} };
      },
    },
  });

  await page.goto('/app/monitoring/201');

  await page.getByTestId('monitoring.event.ack.open').click();
  const acknowledgeDialog = page.getByTestId('monitoring.event.ack');
  await acknowledgeDialog.getByRole('button', { name: /acknowledge|potvrdit/i }).click();
  await expect(acknowledgeDialog.getByTestId('monitoring.event.ack.error')).toContainText(
    'Acknowledgement was rejected'
  );
  await expect(acknowledgeDialog).toBeVisible();
  await acknowledgeDialog.getByRole('button', { name: /acknowledge|potvrdit/i }).click();
  await expect(acknowledgeDialog).toHaveCount(0);

  await page.getByTestId('monitoring.event.ignore.open').click();
  const ignoreDialog = page.getByTestId('monitoring.event.ignore');
  await ignoreDialog.getByRole('button', { name: /ignore|ignorovat/i }).click();
  await expect(ignoreDialog.getByTestId('monitoring.event.ignore.error')).toContainText('Ignore request was rejected');
  await expect(ignoreDialog).toBeVisible();
  await ignoreDialog.getByRole('button', { name: /ignore|ignorovat/i }).click();
  await expect(ignoreDialog).toHaveCount(0);

  expect(acknowledgeAttempts).toBe(2);
  expect(ignoreAttempts).toBe(2);
});

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  test(`@pr-smoke @pr-smoke-mobile monitoring custom-date validation is readable in ${language}`, async ({
    page,
  }, testInfo) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes.push(request.url());
    });
    await setUiSettingsLocalStorage(page, { language, theme });
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'READABLE_MONITORING_DATE',
      webuiNext: { uiSettings: { persistence: 'local' } },
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'presentation-audit', level: 1 },
      handlers: {
        'GET monitored_events/201': () => ({ monitored_event: monitoredEvent }),
        'GET monitored_events/201/logs': () => ({ logs: [] }),
      },
    });
    await page.goto('/app/monitoring/201');
    for (const kind of ['ack', 'ignore']) {
      await page.getByTestId(`monitoring.event.${kind}.open`).click();
      const dialog = page.getByTestId(`monitoring.event.${kind}`);
      await page.getByTestId(`monitoring.event.${kind}.until_preset`).selectOption('custom');
      const message = dialog.getByText(language === 'cs' ? 'Neplatné datum/čas' : 'Invalid date/time', { exact: true });
      await expect(message).toBeVisible();
      await expect(page.getByTestId(`monitoring.event.${kind}.confirm`)).toBeDisabled();
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
      await page.getByTestId(`monitoring.event.${kind}.until_custom`).fill('2026-12-01T12:30');
      await expect(page.getByTestId(`monitoring.event.${kind}.confirm`)).toBeEnabled();
      await page.getByTestId(`monitoring.event.${kind}.until_custom`).focus();
      await page.keyboard.press('Tab');
      await page.screenshot({ path: testInfo.outputPath(`readable-${kind}-validation.png`), fullPage: true });
      await page.getByTestId(`monitoring.event.${kind}.cancel`).click();
      await expect(dialog).toHaveCount(0);
    }
    expect(writes).toEqual([]);
  });
}
