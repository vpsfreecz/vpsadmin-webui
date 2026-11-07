import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const) {
  for (const scenario of [
    { name: 'member', level: 1, base: '/app' },
    { name: 'admin-personal', level: 99, base: '/app' },
    { name: 'admin', level: 99, base: '/admin' },
    { name: 'support', level: 21, base: '/admin' },
  ]) {
    test(`@pr-smoke @pr-smoke-mobile scrolling status links: ${scenario.name} ${language}`, async ({ page }, testInfo) => {
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'STATUS_FIXTURE' });
      await installHaveApiMock(page, {
        user: { id: 10, login: 'status-review', level: scenario.level },
        handlers: {
          'GET vpses': () => ({ vpses: [] }),
          'GET outages': () => ({ outages: [] }),
          'GET security_advisories': () => ({ security_advisories: [] }),
          'GET environments': () => ({ environments: [] }),
          'GET locations': () => ({ locations: [] }),
          'GET nodes': () => ({ nodes: [] }),
          'GET components': () => ({ components: [] }),
        },
      });
      await page.goto(`${scenario.base}/vps`);
      const mobile = page.viewportSize()!.width < 768;
      const surface = mobile ? 'drawer' : 'sidebar';
      if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
      const container = page.getByTestId(mobile ? 'nav.drawer' : 'shell.sidebar');
      const navigation = container.locator('nav[data-document-title-nav="section"]');
      const outages = navigation.getByTestId(`nav.${surface}.outages`);
      const advisories = navigation.getByTestId(`nav.${surface}.security-advisories`);
      const links = navigation.locator('section a');
      await expect(links.nth(-2)).toHaveAttribute('data-testid', `nav.${surface}.outages`);
      await expect(links.last()).toHaveAttribute('data-testid', `nav.${surface}.security-advisories`);
      if (!mobile) {
        await page.setViewportSize({ width: page.viewportSize()!.width, height: 700 });
        const before = await advisories.boundingBox();
        await navigation.evaluate((nav) => { nav.scrollTop = nav.scrollHeight; });
        const after = await advisories.boundingBox();
        expect(after!.y).toBeLessThan(before!.y);
        expect(await navigation.evaluate((nav) => nav.scrollTop)).toBeGreaterThan(0);
      }
      await advisories.scrollIntoViewIfNeeded();
      await expect(advisories).toBeInViewport();
      await expect(outages).toHaveText(language === 'cs' ? 'Odstávky a výpadky' : 'Outages');
      await expect(advisories).toHaveText(language === 'cs' ? 'Bezpečnostní upozornění' : 'Security advisories');
      await expect(container.getByTestId(`nav.${surface}.security-advisories`)).toHaveCount(1);
      await expect(outages).toHaveAttribute('href', `${scenario.base}/outages`);
      const advisoryPath = scenario.name === 'support' ? '/admin/status/security-advisories' : `${scenario.base}/security-advisories`;
      await expect(advisories).toHaveAttribute('href', advisoryPath);
      const statusBox = (await advisories.boundingBox())!;
      const aboutBox = (await container.getByTestId('build.footer').boundingBox())!;
      expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(aboutBox.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`status-${scenario.name}-${language}.png`), scale: 'css' });
      await outages.click();
      await expect(page).toHaveURL((url) => url.pathname === `${scenario.base}/outages`);
      await expect(page.getByTestId('nav.drawer')).toBeHidden();
      await expect(page.getByTestId(page.viewportSize()!.width < 768 ? 'shell.mobile-nav-button' : 'shell.sidebar')).toBeVisible();
      await expect(page.getByTestId('public.main')).toHaveCount(0);
      if (scenario.name === 'admin') {
        await page.getByTestId('admin.outages.new').click();
        await expect(page.getByTestId('admin.outages.create.modal')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`outage-create-${language}.png`), scale: 'css' });
        await page.keyboard.press('Escape');
      } else {
        await expect(page.getByTestId('admin.outages.new')).toHaveCount(0);
      }
      await page.goto(`${scenario.base}/vps`);
      if (mobile) await page.getByTestId('shell.mobile-nav-button').click();
      await page.getByTestId(`nav.${surface}.security-advisories`).click();
      await expect(page).toHaveURL((url) => url.pathname === advisoryPath);
      await expect(page.getByTestId('nav.drawer')).toBeHidden();
      await expect(page.getByTestId(page.viewportSize()!.width < 768 ? 'shell.mobile-nav-button' : 'shell.sidebar')).toBeVisible();
      await expect(page.getByTestId('public.main')).toHaveCount(0);
    });
  }
}

// Real routed content, including shared URLs and cross-links, stays in the shell.
for (const language of ['cs', 'en'] as const) {
  for (const scenario of [
    { name: 'member', level: 1, prefix: '/app' },
    { name: 'admin-personal', level: 99, prefix: '/app' },
    { name: 'support', level: 21, prefix: '/admin/status' },
  ]) {
    test(`@pr-smoke @pr-smoke-mobile signed-in status journey ${scenario.name} ${language}`, async ({
      page,
    }, testInfo) => {
      const outage = {
        id: 42,
        state: 'announced',
        type: 'outage',
        impact: 'network',
        begins_at: '2099-01-05T12:00:00Z',
        en_summary: 'Status outage example',
        cs_summary: 'Ukázková odstávka',
      };
      const advisory = {
        id: 17,
        name: 'Status advisory example',
        state: 'published',
        published_at: '2026-11-01T12:00:00Z',
        cves: [],
        affected: false,
        en_summary: 'Read-only member information',
        cs_summary: 'Informace pro člena',
      };
      const writes: string[] = [];
      page.on('request', (request) => {
        if (
          !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
          /\/(outages|outage_updates|security_advisories|security_advisory_updates|outage_security_advisories|vpses)(?:[/?]|$)/.test(
            request.url()
          )
        ) {
          writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
        }
      });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'STATUS_READING_FIXTURE' });
      await installHaveApiMock(page, {
        user: { id: 10, login: 'status-reader', level: scenario.level },
        handlers: {
          'GET vpses': () => ({ vpses: [] }),
          'GET outages': () => ({ outages: [outage] }),
          'GET outages/42': () => ({ outage }),
          'GET outages/42/entities': () => ({ entities: [] }),
          'GET outages/42/handlers': () => ({ handlers: [] }),
          'GET outage_updates': () => ({ outage_updates: [] }),
          'GET security_advisories': () => ({ security_advisories: [advisory] }),
          'GET security_advisories/17': () => ({ security_advisory: advisory }),
          'GET security_advisory_cves': () => ({ security_advisory_cves: [] }),
          'GET security_advisories/17/node_statuses': () => ({ node_statuses: [] }),
          'GET security_advisory_updates': () => ({ security_advisory_updates: [] }),
          'GET vps_security_advisories': () => ({ vps_security_advisories: [] }),
          'GET outage_security_advisories': () => ({
            outage_security_advisories: [{ id: 1, security_advisory_id: 17, outage_id: 42, outage }],
          }),
        },
      });
      const assertShell = async () => {
        await expect(
          page.getByTestId(page.viewportSize()!.width < 768 ? 'shell.mobile-nav-button' : 'shell.sidebar')
        ).toBeVisible();
        await expect(page.getByTestId('public.main')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      };
      await page.goto(`${scenario.prefix}/outages`);
      await expect(page.getByTestId('public.outages.page')).toBeVisible();
      await assertShell();
      await expect(
        page.getByText(
          language === 'cs'
            ? 'Pro pokročilou správu výpadků se přihlas a použij administrační rozhraní.'
            : 'For advanced outage management, sign in and use the administration interface.'
        )
      ).toHaveCount(0);
      await page.locator(`main a[href="${scenario.prefix}/outages/42"]`).click();
      await expect(page.getByTestId('public.outage_detail.page')).toBeVisible();
      await assertShell();
      await page.reload();
      await expect(page.getByTestId('public.outage_detail.page')).toBeVisible();
      await page.locator(`main a[href="${scenario.prefix}/outages"]`).click();
      await expect(page.getByTestId('public.outages.page')).toBeVisible();
      await page.goto(`${scenario.prefix}/security-advisories`);
      await expect(page.getByTestId('public.security_advisories.page')).toBeVisible();
      await assertShell();
      await page.locator(`main a[href="${scenario.prefix}/security-advisories/17"]`).first().click();
      await expect(page.getByTestId('public.security_advisory_detail.page')).toBeVisible();
      await assertShell();
      await expect(page.getByTestId('public.security_advisory_detail.own_affected_vps')).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`signed-in-advisory-${scenario.name}-${language}.png`),
        scale: 'css',
      });
      await page.locator(`main a[href="${scenario.prefix}/outages/42"]`).click();
      await expect(page.getByTestId('public.outage_detail.page')).toBeVisible();
      await assertShell();
      await page.goBack();
      await expect(page.getByTestId('public.security_advisory_detail.page')).toBeVisible();
      await page.locator(`main a[href="${scenario.prefix}/security-advisories"]`).click();
      await expect(page.getByTestId('public.security_advisories.page')).toBeVisible();
      // Previously shared/public URLs also enter the signed-in reader and retain URL state.
      await page.goto('/security-advisories/17?source=shared#details');
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === '/app/security-advisories/17' && url.search === '?source=shared' && url.hash === '#details'
      );
      await expect(page.getByTestId('public.security_advisory_detail.page')).toBeVisible();
      await assertShell();
      await page.goto('/outages/42?source=shared#details');
      await expect(page).toHaveURL(
        (url) => url.pathname === '/app/outages/42' && url.search === '?source=shared' && url.hash === '#details'
      );
      await expect(page.getByTestId('public.outage_detail.page')).toBeVisible();
      await assertShell();
      await page.setViewportSize({ width: 320, height: 740 });
      await assertShell();
      expect(writes).toEqual([]);
    });
  }
}
