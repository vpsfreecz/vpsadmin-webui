import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

const prefix = 'admin.requests.resolve';

for (const language of ['cs', 'en'] as const) {
  for (const failure of ['ipv4-server', 'ipv4-validation', 'other-server', 'network'] as const) {
    test(`@pr-smoke @pr-smoke-mobile registration failure reason: ${failure} (${language})`, async ({ page }, testInfo) => {
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
      await page.route(/^https:\/\/nominatim\.openstreetmap\.org\//, route => route.fulfill({ json: [] }));
      const request = {
        id: 123, type: 'registration', state: 'awaiting', login: 'example', full_name: 'Example Applicant',
        email: 'applicant@example.test', address: 'Example City', year_of_birth: 1990,
        os_template: { id: 5 }, location: { id: 7 }, language: { id: 2, code: language }, currency: 'CZK',
      };
      const sent: unknown[] = [];
      page.on('request', request => {
        if (request.method() === 'POST' && request.url().includes('/registrations/123/resolve')) {
          sent.push(request.postDataJSON());
        }
      });
      await installHaveApiMock(page, {
        user: { id: 1, login: 'admin', level: 100 },
        handlers: {
          'GET user_request/registrations/123': () => ({ registration: request }),
          'GET locations': () => ({ locations: [{ id: 7, label: 'Prague' }] }),
          'GET os_templates': () => ({ os_templates: [{ id: 5, label: 'Debian', enabled: true, supported: true, cgroup_version: 'cgroup_v2' }] }),
          'GET nodes': () => ({ nodes: [] }),
          'POST user_request/registrations/123/resolve': () => ({
            status: failure === 'ipv4-validation' ? 422 : 500,
            contentType: 'application/json',
            body: JSON.stringify(failEnvelope(failure === 'other-server' ? 'location is disabled' : 'no ipv4 address available')),
          }),
        },
      });
      if (failure === 'network') {
        await page.route('**/api/v7.0/user_request/registrations/123/resolve', route => route.abort('failed'));
      }
      await page.goto('/admin/requests/registration/123');
      await page.getByTestId(`${prefix}.action.approve`).click();
      await expect(page.getByTestId(`${prefix}.submit`)).toBeEnabled();
      await page.getByTestId(`${prefix}.submit`).click();
      const message = language === 'cs'
        ? 'Nejsou dostupné žádné volné IPv4 adresy.'
        : 'No free IPv4 addresses are available.';
      if (failure === 'ipv4-validation') {
        await expect(page.getByTestId(`${prefix}.error`)).toContainText(message);
        await expect(page.getByTestId(`${prefix}.modal`)).toBeVisible();
        await expect(page.getByTestId(`${prefix}.uncertain`)).toHaveCount(0);
      } else {
        const warning = page.getByTestId(`${prefix}.uncertain`);
        await expect(warning).toBeVisible();
        await expect(warning).toContainText(failure === 'ipv4-server' ? message : failure === 'other-server'
          ? 'location is disabled'
          : language === 'cs' ? 'Předchozí akce má nejasný výsledek' : 'The previous action has an uncertain outcome');
        await expect(warning).toContainText(language === 'cs' ? 'Nikdy ji neopakuj naslepo.' : 'Never repeat it blindly.');
        await expect(page.getByTestId(`${prefix}.action.approve`)).toHaveCount(0);
        await expect(page.getByTestId(`${prefix}.uncertain.check`)).toBeDisabled();
        expect(await warning.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        if (failure === 'ipv4-server') {
          await expect(page.getByText(message, { exact: true })).toHaveCount(2);
          await page.screenshot({ path: testInfo.outputPath(`ipv4-${language}.png`), fullPage: true });
        }
        await page.reload();
        await expect(page.getByTestId(`${prefix}.uncertain`)).toBeVisible();
        await expect(page.getByTestId(`${prefix}.action.approve`)).toHaveCount(0);
      }
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ registration: { action: 'approve', create_vps: true } });
    });
  }
}
