import { test, expect } from '../../fixtures/bootstrap';
import { setupHaveApiMock } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { withAppUrl } from '../../fixtures/url';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const hostname = 'long-hostname-for-incident-layout-regression.example.test';
const ip = '2001:db8:1234:5678:abcd:ef01:2345:6789';
const subject = 'PROKI IPv6-Accessible-SMTP 2026-10-03 — ' + 'LongUnbrokenIncidentSubject'.repeat(4);
const codename = 'IPv6-Accessible-SMTP-' + 'LongDiagnosticCode'.repeat(4);

for (const admin of [false, true]) {
  for (const language of ['cs', 'en'] as const) {
    test(`incident list fits ${admin ? 'admin' : 'My'} view in ${language} @pr-smoke @pr-smoke-mobile`, async ({ page }, testInfo) => {
      const basePath = admin ? '/admin' : '/app';
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await setupHaveApiMock(page, {
        user: { id: 1, login: 'admin', level: 100 },
        handlers: {
          'GET incident_reports': () => ({
            incident_reports: [
              {
                id: 101,
                detected_at: '2026-10-03T08:00:00Z',
                subject,
                codename,
                vps_action: 'suspend',
                cpu_limit: 50,
                vps: { id: 7, hostname },
                user: { id: 1, login: 'long-owner-login-for-layout-regression' },
                filed_by: { id: 2, login: 'long-reporter-login-for-layout-regression' },
                ip_address_assignment: { id: 55, ip_addr: ip },
              },
              {
                id: 100,
                detected_at: '2026-10-02T08:00:00Z',
                subject: 'PROKI Accessible-SSH 2026-10-02',
                codename: 'Accessible-SSH',
                vps_action: 'none',
                raw_vps_id: 8,
                ip_address_assignment: { id: 54, ip_addr: '203.0.113.10' },
              },
            ],
          }),
        },
      });
      const mobile = testInfo.project.name === 'mobile-chrome';
      await page.goto(withAppUrl(`${basePath}/incidents`));
      // Exercise both sides of the cards/table breakpoint and the reported
      // laptop width; document containment alone misses a scrolling table.
      const widths = mobile ? [360, 393] : [1280, 1920, 1100, 1440];
      for (const width of widths) {
        await page.setViewportSize({ width, height: mobile ? 851 : 1000 });
        const tableLayout = width >= 1280;
        const item = page.getByTestId(`incidents.list.${tableLayout ? 'row' : 'card'}.101`);
        await expect(item).toBeVisible();
        await expect(item).toContainText(subject);
        await expect(item).toContainText(codename);
        await expect(item).toContainText(ip);
        await expect(item.getByRole('link', { name: hostname, exact: true })).toHaveAttribute('href', `${basePath}/vps/7`);
        await expectNoDocumentHorizontalOverflow(page);
        if (tableLayout) {
          await expect(item.locator('td')).toHaveCount(admin ? 9 : 7);
          const metrics = await page.getByTestId('incidents.list.table').evaluate((table) => {
            const parent = table.parentElement!;
            return { client: parent.clientWidth, scroll: parent.scrollWidth };
          });
          expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
        }
        const overflowing = await item.evaluate((root) =>
          [root, ...root.querySelectorAll<HTMLElement>('td, div, span, a')]
            .filter((element) => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1)
            .map((element) => ({ tag: element.tagName, text: element.textContent, width: element.clientWidth, scroll: element.scrollWidth }))
        );
        expect(overflowing).toEqual([]);
      }
      await page.screenshot({ path: testInfo.outputPath(`incidents-${admin ? 'admin' : 'my'}-${language}.png`), fullPage: true });
      const item = page.getByTestId(`incidents.list.${mobile ? 'card' : 'row'}.101`);
      await item.getByRole('link', { name: '#101', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${basePath}/incidents/101(?:\\?|$)`));
    });
  }
}
