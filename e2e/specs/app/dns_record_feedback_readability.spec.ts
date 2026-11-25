import { expect, test } from '@playwright/test';

import {
  bootstrapVpsAdminWindow,
  failEnvelope,
  installHaveApiMock,
  jsonFulfill,
  setUiSettingsLocalStorage,
} from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const configurations: { language: 'cs' | 'en'; theme: 'light' | 'dark'; role: 'member' | 'admin'; field: string }[] =
  [];
for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const role of ['member', 'admin'] as const) {
    for (const field of ['name', 'content', 'ttl', 'priority', 'api'])
      configurations.push({ language, theme, role, field });
  }
}
configurations.push(
  { language: 'cs', theme: 'light', role: 'member', field: 'ttl' },
  { language: 'en', theme: 'dark', role: 'member', field: 'ttl' }
);

for (const { language, theme, role, field } of configurations) {
  test(`@pr-smoke @pr-smoke-mobile DNS record field feedback stays readable ${language} ${theme} ${role} ${field}`, async ({
    page,
  }) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('request', (request) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
        writes.push(request.method() + ' ' + new URL(request.url()).pathname);
    });
    await setUiSettingsLocalStorage(page, { language, theme });
    await bootstrapVpsAdminWindow(page, {
      sessionToken: 'TEST_SESSION',
      webuiNext: { uiSettings: { persistence: 'local' } },
    });
    await installHaveApiMock(page, {
      user: { id: 7, login: 'dns-feedback-test', level: role === 'admin' ? 100 : 1 },
      handlers: {
        'GET dns_zones/42': () => ({
          dns_zone: {
            id: 42,
            name: 'example.test',
            email: 'hostmaster@example.test',
            default_ttl: 3600,
            source: 'internal_source',
            enabled: true,
            user: { id: 7 },
          },
        }),
        'GET dns_records': () => ({ dns_records: [] }),
        'GET dns_record_logs': () => ({ dns_record_logs: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'POST dns_records': () =>
          jsonFulfill(failEnvelope('Synthetic field rejection', { ttl: ['Synthetic TTL rejection'] }), 422),
      },
    });
    await page.goto(`/${role === 'admin' ? 'admin' : 'app'}/dns/zones/42`);
    await expect(page.getByTestId('dns.records.loading')).toHaveCount(0);
    await page.getByTestId('dns.records.create.open').click();
    await page.getByTestId('dns.records.create.name').fill('overeni');
    await page.getByTestId('dns.records.create.content').fill('192.0.2.10');
    await page.getByTestId('dns.records.create.ttl').fill('3600');
    const submit = page.getByTestId('dns.records.create.submit');
    if (field === 'priority') {
      await page.getByTestId('dns.records.create.type').selectOption('MX');
      await page.getByTestId('dns.records.create.content').fill('mx.example.test.');
      await page.getByTestId('dns.records.create.priority').fill('70000');
    } else if (field === 'api') {
      await submit.click();
      await expect(page.getByTestId('dns.records.create.error')).toContainText('Synthetic field rejection');
    } else {
      await page
        .getByTestId('dns.records.create.' + field)
        .fill(field === 'name' ? 'bad name' : field === 'content' ? 'not-an-address' : '-1');
    }
    if (field !== 'api') await expect(submit).toBeDisabled();
    const fieldName = field === 'api' ? 'ttl' : field;
    const feedback = page
      .getByTestId('dns.records.create.' + fieldName + '.validation')
      .locator('div')
      .first();
    await expect(feedback).toBeVisible();
    if (field === 'api') await expect(feedback).toHaveText('Synthetic TTL rejection');
    const originalText = await feedback.textContent();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const metrics = await feedback.evaluate((element) => {
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
            .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i]!, 0);
        const a = luminance(style.color),
          b = luminance(background);
        return {
          contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
          weight: Number(style.fontWeight),
          marker: parseFloat(style.borderLeftWidth),
        };
      });
      expect(metrics.contrast).toBeGreaterThanOrEqual(4.5);
      expect(metrics.weight).toBeGreaterThanOrEqual(500);
      expect(metrics.marker).toBe(2);
      await expect(feedback).toHaveText(originalText!);
      const input = page.getByTestId('dns.records.create.' + fieldName);
      await input.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(input).toBeFocused();
      expect(await input.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
      await expectNoDocumentHorizontalOverflow(page);
    }
    if (field === 'api') await expect(page.getByTestId('dns.records.create.ttl')).toHaveValue('3600');
    else {
      await page
        .getByTestId('dns.records.create.' + field)
        .fill(field === 'name' ? 'overeni' : field === 'content' ? '192.0.2.10' : field === 'priority' ? '10' : '3600');
      await expect(page.getByTestId('dns.records.create.' + field + '.validation')).toHaveCount(0);
      await expect(submit).toBeEnabled();
    }
    await page.getByTestId('dns.records.create.cancel').click();
    expect(writes).toEqual(field === 'api' ? ['POST /api/v7.0/dns_records'] : []);
    expect(errors).toEqual([]);
  });
}
