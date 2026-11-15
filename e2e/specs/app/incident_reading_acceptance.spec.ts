import type { Page } from '@playwright/test';
import { test, expect, bootstrapVpsAdminWindow } from '../../fixtures/bootstrap';
import { installHaveApiMock } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { withAppUrl } from '../../fixtures/url';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

type Language = 'cs' | 'en';
type Scenario = { name: string; base: '/app' | '/admin'; level: number; privateFields: boolean };
const scenarios: Scenario[] = [
  { name: 'member', base: '/app', level: 1, privateFields: false },
  { name: 'support', base: '/admin', level: 30, privateFields: false },
  { name: 'support My', base: '/app', level: 30, privateFields: false },
  { name: 'admin', base: '/admin', level: 99, privateFields: true },
  { name: 'admin My', base: '/app', level: 99, privateFields: false },
];
const text =
  Array.from(
    { length: 36 },
    (_, i) => `Diagnostic ${i + 1}: synthetic incident; preserve every line, IPv6 2001:db8::42 and Czech text zpráva.`
  ).join('\n') +
  '\n' +
  'LongDiagnosticToken'.repeat(48) +
  '\nEND_OF_REPORT';

async function setup(page: Page, scenario: Scenario, language: Language) {
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const writes: string[] = [];
  const reads: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      writes.push(request.method() + ' ' + new URL(request.url()).pathname);
  });
  const report = {
    id: 101,
    subject: 'Synthetic incident',
    text,
    codename: 'fixture-code',
    detected_at: '2026-11-14T12:00:00Z',
    reported_at: '2026-11-14T12:04:00Z',
    vps_action: 'suspend',
    cpu_limit: 50,
    vps: { id: 901, hostname: 'synthetic-vps.example.test' },
    filed_by: { id: 2, login: 'synthetic-reporter' },
    ip_address_assignment: { id: 91, ip_addr: '2001:db8::42' },
    ...(scenario.privateFields
      ? { user: { id: 1, login: 'synthetic-owner' }, mailbox: { id: 11, label: 'Synthetic mailbox' } }
      : {}),
  };
  await installHaveApiMock(page, {
    user: { id: 1, login: 'synthetic-owner', level: scenario.level, time_zone: 'Europe/Prague' },
    handlers: {
      'GET incident_reports': (ctx) => {
        reads.push(ctx.url.search);
        return { incident_reports: [report] };
      },
      'GET incident_reports/101': () => ({ incident_report: report }),
      'GET help_boxes': () => ({ help_boxes: [] }),
      'GET vpses': () => ({ vpses: [] }),
      'GET users': () => ({ users: [] }),
      'GET mailboxes': () => ({ mailboxes: [] }),
    },
  });
  return { writes, reads, errors };
}

test.use({ timezoneId: 'Europe/Prague' });
for (const language of ['cs', 'en'] as const) {
  for (const scenario of scenarios.filter((item) => item.name === 'member' || item.name === 'admin')) {
    test(`incident filter explanations fit and remain operable ${scenario.name} ${language} @pr-smoke @pr-smoke-mobile`, async ({
      page,
      hasTouch,
    }) => {
      const journal = await setup(page, scenario, language);
      await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
      const base = scenario.base + '/incidents';
      await page.goto(withAppUrl(base));
      const filters = page.getByTestId('incidents.list.filters');
      const input = page.getByTestId('incidents.smart_filter.input');
      const help = page.getByTestId('incidents.smart_filter.help_btn');
      const advanced = page.getByTestId('incidents.filters.advanced');
      await expect(filters).toBeVisible();
      await expect(help).toHaveText(language === 'cs' ? 'Nápověda' : 'Help');
      await expect(advanced).toHaveText(language === 'cs' ? 'Pokročilé' : 'Advanced');
      await expect(advanced).toHaveAccessibleName(language === 'cs' ? 'Pokročilé filtry' : 'Advanced filters');
      const metrics = await input.evaluate((raw) => {
        const element = raw as HTMLInputElement;
        const style = getComputedStyle(element);
        const canvas = document.createElement('canvas').getContext('2d')!;
        canvas.font = style.font;
        return {
          available: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          text: canvas.measureText(element.placeholder).width,
          width: element.getBoundingClientRect().width,
        };
      });
      expect(metrics.text).toBeLessThanOrEqual(metrics.available + 1);
      if (!hasTouch) expect(metrics.width).toBeGreaterThan(320);
      for (const control of [input, help, advanced, page.getByTestId('incidents.filters.copy_link')]) {
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await help.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('incidents.smart_help')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(help).toBeFocused();
      await input.fill('?');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('incidents.smart_help')).toBeVisible();
      await page.keyboard.press('Escape');
      await input.fill('');
      await advanced.focus();
      await page.keyboard.press('Space');
      await expect(page.getByTestId('incidents.advanced.done')).toBeVisible();
      await page.getByTestId('incidents.advanced.done').click();
      await expect(advanced).toBeFocused();
      await input.fill('codename:fixture-code');
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/codename=fixture-code/);
      await expect
        .poll(() =>
          journal.reads.some((query) => new URLSearchParams(query).get('incident_report[codename]') === 'fixture-code')
        )
        .toBe(true);
      const clear = page.getByTestId('incidents.filters.clear');
      await expect(clear).toBeVisible();
      expect((await clear.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await clear.click();
      await expect(page).not.toHaveURL(/codename=/);
      await expectNoDocumentHorizontalOverflow(page);
      // Exercise keyboard intent without a parked pointer selecting a suggestion.
      await page.mouse.move(0, 0);
      await input.fill('101');
      await expect(page.getByTestId('incidents.smart.suggest.open')).toHaveAttribute('aria-selected', 'true');
      await input.press('Enter');
      await expect(page).toHaveURL(new RegExp(scenario.base + '/incidents/101(?:\\?|$)'));
      expect(journal.writes).toEqual([]);
      expect(journal.errors).toEqual([]);
    });
  }
  for (const scenario of scenarios) {
    test(`incident report stays complete in page flow ${scenario.name} ${language} @pr-smoke @pr-smoke-mobile`, async ({
      page,
      hasTouch,
    }) => {
      const journal = await setup(page, scenario, language);
      await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
      await page.goto(withAppUrl(scenario.base + '/incidents/101'));
      const header = page.getByTestId('incidents.detail.header');
      const summary = page.getByTestId('incidents.detail.summary');
      const report = page.getByTestId('incidents.detail.text').locator('pre');
      await expect(summary).toBeVisible();
      await expect(report).toBeVisible();
      const detected = language === 'cs' ? 'Zjištěno' : 'Detected at';
      const reported = language === 'cs' ? 'Nahlášeno' : 'Reported at';
      await expect(header).not.toContainText(detected);
      await expect(header).not.toContainText(reported);
      await expect(summary.getByText(detected, { exact: true })).toHaveCount(1);
      await expect(summary.getByText(reported, { exact: true })).toHaveCount(1);
      const detectedValue = (await summary.getByText(detected, { exact: true }).locator('..').innerText())
        .split('\n')
        .slice(1)
        .join(' ')
        .trim();
      const reportedValue = (await summary.getByText(reported, { exact: true }).locator('..').innerText())
        .split('\n')
        .slice(1)
        .join(' ')
        .trim();
      expect(detectedValue).toMatch(/\d/);
      expect(reportedValue).toMatch(/\d/);
      expect(detectedValue).not.toBe(reportedValue);
      await expect(summary).toContainText('2001:db8::42');
      await expect(summary).toContainText('50%');
      await expect(summary.getByRole('link', { name: 'synthetic-vps.example.test', exact: true })).toHaveAttribute(
        'href',
        scenario.base + '/vps/901'
      );
      await expect(page.getByTestId('incidents.detail.open_vps')).toHaveAttribute('href', scenario.base + '/vps/901');
      if (scenario.base === '/admin')
        await expect(summary.getByRole('link', { name: 'synthetic-reporter', exact: true })).toHaveAttribute(
          'href',
          scenario.base + '/users/2'
        );
      else {
        await expect(summary.getByText('synthetic-reporter', { exact: true })).toBeVisible();
        await expect(summary.getByRole('link', { name: 'synthetic-reporter', exact: true })).toHaveCount(0);
      }
      if (scenario.privateFields) {
        await expect(summary.getByRole('link', { name: 'synthetic-owner', exact: true })).toHaveAttribute(
          'href',
          '/admin/users/1'
        );
        await expect(summary.getByRole('link', { name: 'Synthetic mailbox', exact: true })).toHaveAttribute(
          'href',
          '/admin/mailer/mailboxes/11'
        );
      } else {
        await expect(summary.getByRole('link', { name: 'synthetic-owner', exact: true })).toHaveCount(0);
        await expect(summary.getByRole('link', { name: 'Synthetic mailbox', exact: true })).toHaveCount(0);
      }
      expect(await report.textContent()).toBe(text);
      const metrics = await report.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflow: getComputedStyle(element).overflowY,
      }));
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      expect(['auto', 'scroll']).not.toContain(metrics.overflow);
      await expectNoDocumentHorizontalOverflow(page);
      expect(journal.writes).toEqual([]);
      expect(journal.errors).toEqual([]);
    });
  }
}
