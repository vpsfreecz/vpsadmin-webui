import type { Page } from '@playwright/test';
import { expect, test, bootstrapVpsAdminWindow } from '../../fixtures/bootstrap';
import { failEnvelope, installHaveApiMock } from '../../fixtures/haveapi';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { withAppUrl } from '../../fixtures/url';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

type Language = 'cs' | 'en';
type Actor = { name: string; base: '/app' | '/admin'; level: number };
const actors: Actor[] = [
  { name: 'member', base: '/app', level: 1 },
  { name: 'administrator', base: '/admin', level: 99 },
  { name: 'administrator My', base: '/app', level: 99 },
  { name: 'support', base: '/admin', level: 30 },
];
const cgroup = '/lxc/901/system.slice/synthetic-worker-with-complete-diagnostic-context.service';
const processName = 'synthetic-memory-worker-with-complete-process-identity';
async function fixture(page: Page, actor: Actor, language: Language, missing = false) {
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => document.documentElement.setAttribute('data-oom-copied', text) },
    });
  });
  const state = { failTasks: false, failStats: false };
  const writes: string[] = [],
    errors: string[] = [],
    reads: { limit: number; from: number; failed: boolean }[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()))
      writes.push(request.method() + ' ' + new URL(request.url()).pathname);
  });
  const report = {
    id: 101,
    created_at: missing ? null : '2026-11-14T12:00:00Z',
    reported_at: missing ? null : '2026-11-14T12:06:00Z',
    vps: missing
      ? null
      : { id: 901, hostname: 'synthetic-oom.example.test', node: { id: 42, domain_name: 'node42.example.test' } },
    cgroup: missing ? null : cgroup,
    killed_name: missing ? null : 'synthetic-worker',
    killed_pid: missing ? null : 4242,
    invoked_by_name: missing ? null : 'systemd',
    invoked_by_pid: missing ? null : 1,
    count: missing ? 0 : 2,
    oom_report_rule: missing ? null : { id: 11, action: 'notify', cgroup_pattern: '/lxc/901/*' },
  };
  const tasks = [
    {
      id: 501,
      name: processName,
      host_pid: 104242,
      vps_pid: 4242,
      vps_uid: 1000,
      tgid: 4242,
      total_vm: 524288,
      rss: 262144,
      pgtables_bytes: 8388608,
      swapents: 4096,
      oom_score_adj: 750,
    },
  ];
  const rejected = () => ({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify(failEnvelope('Synthetic OOM process read unavailable')),
  });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'synthetic-oom-member', level: actor.level },
    handlers: {
      'GET oom_reports': () => ({ oom_reports: [report] }),
      'GET oom_reports/101': () => ({ oom_report: report }),
      'GET oom_reports/101/usages': () => ({
        usages: [{ id: 1, memtype: 'memory', usage: 1048576, limit: 2097152, failcnt: 3 }],
      }),
      'GET oom_reports/101/stats': () =>
        state.failStats ? rejected() : { stats: [{ id: 1, parameter: 'oom_kill', value: 2 }] },
      'GET oom_reports/101/tasks': ({ searchParams }) => {
        const limit = Number(searchParams.get('task[limit]')),
          from = Number(searchParams.get('task[from_id]') ?? 0);
        reads.push({ limit, from, failed: state.failTasks });
        if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
          return {
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify(failEnvelope('Synthetic API limit 0–1000')),
          };
        return state.failTasks ? rejected() : { tasks };
      },
      'GET help_boxes': () => ({ help_boxes: [] }),
      'GET users': () => ({ users: [] }),
      'GET vpses': () => ({ vpses: [] }),
      'GET nodes': () => ({ nodes: [] }),
      'GET locations': () => ({ locations: [] }),
      'GET environments': () => ({ environments: [] }),
    },
  });
  return { state, writes, errors, reads };
}
const names = (language: Language) => ({
  title: language === 'cs' ? 'OOM hlášení jádra' : 'Kernel OOM reports',
  detail: language === 'cs' ? 'OOM hlášení #101' : 'OOM report #101',
  created: language === 'cs' ? 'Vytvořeno' : 'Created at',
  reported: language === 'cs' ? 'Nahlášeno' : 'Reported at',
  stats: language === 'cs' ? 'Statistiky' : 'Stats',
  tasks: language === 'cs' ? 'Procesy' : 'Tasks',
  overview: language === 'cs' ? 'Přehled' : 'Overview',
  retry: language === 'cs' ? 'Zkusit znovu' : 'Retry',
  status: language === 'cs' ? 'Přehled služby' : 'Service overview',
});
for (const language of ['cs', 'en'] as const) {
  for (const actor of actors)
    test(`OOM headings retain kernel diagnostics ${actor.name} ${language} @pr-smoke @pr-smoke-mobile`, async ({
      page,
      hasTouch,
    }) => {
      const journal = await fixture(page, actor, language),
        label = names(language),
        base = actor.base + '/oom-reports';
      await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
      await page.goto(withAppUrl(base));
      const listHeader = page.getByTestId('oom.list.header');
      await expect(listHeader.getByRole('heading', { level: 1 })).toHaveText(label.title);
      await expect(listHeader).not.toContainText(
        language === 'cs' ? 'Události kernelu (OOM kill).' : 'Kernel OOM kill events.'
      );
      await page.goto(withAppUrl(base + '/101'));
      const header = page.getByTestId('oom.detail.header'),
        summary = page.getByTestId('oom.detail.overview.summary');
      await expect(header.getByRole('heading', { level: 1 })).toHaveText(label.detail);
      await expect(header.getByRole('heading')).toHaveCount(1);
      await expect(header.locator('a[href="' + base + '"]')).toHaveCount(0);
      await expect(header).not.toContainText(label.created);
      await expect(header).not.toContainText(cgroup);
      await expect(summary.getByText(label.created, { exact: true })).toHaveCount(1);
      await expect(summary.getByText(label.reported, { exact: true })).toHaveCount(1);
      const created = await summary.getByText(label.created, { exact: true }).locator('..').innerText();
      const reported = await summary.getByText(label.reported, { exact: true }).locator('..').innerText();
      expect(created.replace(label.created, '').trim()).toMatch(/\d/);
      expect(reported.replace(label.reported, '').trim()).toMatch(/\d/);
      expect(created.replace(label.created, '').trim()).not.toBe(reported.replace(label.reported, '').trim());
      await expect(summary.getByRole('link', { name: 'synthetic-oom.example.test', exact: true })).toHaveAttribute(
        'href',
        actor.base + '/vps/901'
      );
      for (const value of [cgroup, 'node42.example.test', 'synthetic-worker', '(4242)', 'systemd', '(1)'])
        await expect(summary).toContainText(value);
      await expect(page.getByTestId('oom.detail.open_vps')).toHaveAttribute('href', actor.base + '/vps/901');
      await expect(page.getByTestId('oom.detail.rules')).toHaveAttribute('href', base + '/rules/901');
      const tabs = page.getByTestId('oom.detail.tabs');
      await tabs.getByRole('link', { name: label.stats, exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('oom.detail.stats.table')).toContainText('oom_kill');
      await tabs.getByRole('link', { name: label.tasks, exact: true }).focus();
      await page.keyboard.press('Enter');
      const row = page.getByTestId('oom.detail.tasks.row.501');
      await expect(row).toBeVisible();
      await expect(row.locator('td')).toHaveCount(10);
      for (const value of [
        processName,
        '104242',
        '4242',
        '1000',
        '2.00 GiB',
        '1.00 GiB',
        '8.00 MiB',
        '16.0 MiB',
        '750',
      ])
        await expect(row).toContainText(value);
      expect(journal.reads.every((read) => read.limit > 0 && read.limit <= 1000)).toBe(true);
      await tabs.getByRole('link', { name: label.overview, exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(summary).toContainText(cgroup);
      await expectNoDocumentHorizontalOverflow(page);
      expect(journal.writes).toEqual([]);
      expect(journal.errors).toEqual([]);
    });
  test(`OOM missing references keep safe diagnostic fallbacks ${language} @pr-smoke @pr-smoke-mobile`, async ({
    page,
    hasTouch,
  }) => {
    const actor = actors[0]!,
      journal = await fixture(page, actor, language, true),
      label = names(language);
    await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
    await page.goto(withAppUrl('/app/oom-reports/101'));
    const summary = page.getByTestId('oom.detail.overview.summary');
    await expect(summary).toBeVisible();
    await expect(summary.getByText(label.created, { exact: true })).toHaveCount(1);
    await expect(summary.getByText(label.reported, { exact: true })).toHaveCount(1);
    await expect(summary.getByText(language === 'cs' ? 'Počet' : 'Count', { exact: true }).locator('..')).toContainText(
      '0'
    );
    await expect(page.getByTestId('oom.detail.open_vps')).toHaveCount(0);
    await expect(page.getByTestId('oom.detail.rules')).toHaveCount(0);
    await expect(summary.getByRole('link')).toHaveCount(0);
    await expectNoDocumentHorizontalOverflow(page);
    expect(journal.writes).toEqual([]);
    expect(journal.errors).toEqual([]);
  });
  for (const actor of actors.slice(0, 2))
    test(`OOM recovery controls remain real keyboard actions ${actor.name} ${language} @pr-smoke @pr-smoke-mobile`, async ({
      page,
      hasTouch,
    }) => {
      const journal = await fixture(page, actor, language),
        label = names(language),
        base = actor.base + '/oom-reports/101';
      await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
      await page.goto(withAppUrl(base));
      await expect(page.getByTestId('oom.detail.overview.summary')).toBeVisible();
      journal.state.failTasks = true;
      const target = withAppUrl(base + '/tasks?limit=25&page=1');
      await page.goto(target);
      const error = page.getByTestId('oom.detail.tasks.error'),
        retry = page.getByTestId('oom.detail.tasks.error.retry');
      await expect(error).toBeVisible();
      const status = page.getByTestId('oom.detail.tasks.error.status'),
        copy = page.getByTestId('oom.detail.tasks.error.copy_details');
      await expect(status).toHaveText(label.status);
      await expect(status).toHaveAttribute('href', '/');
      expect(await status.evaluate((el) => el.tagName)).toBe('A');
      expect(await retry.locator('..').evaluate((el) => getComputedStyle(el).justifyContent)).toBe('flex-end');
      const heights: number[] = [];
      for (const suffix of ['retry', 'back', 'status', 'copy_details']) {
        const control = page.getByTestId('oom.detail.tasks.error.' + suffix);
        await expect(control).toBeVisible();
        const rect = await control.boundingBox();
        expect(rect).not.toBeNull();
        heights.push(rect!.height);
        expect(rect!.height).toBeGreaterThanOrEqual(hasTouch ? 44 : 36);
        expect(rect!.x).toBeGreaterThanOrEqual(-1);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual((hasTouch ? 320 : 1440) + 1);
        await control.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(control).toBeFocused();
        expect(await control.evaluate((el) => el.matches(':focus-visible'))).toBe(true);
      }
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      const backBorder = await page
        .getByTestId('oom.detail.tasks.error.back')
        .evaluate((el) => getComputedStyle(el).borderColor);
      expect(backBorder).not.toBe('rgba(0, 0, 0, 0)');
      for (const control of [status, copy])
        expect(await control.evaluate((el) => getComputedStyle(el).borderColor)).toBe(backBorder);
      const details = page.getByTestId('oom.detail.tasks.error.details');
      await details.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('open', '');
      await expect(details.locator('pre')).toContainText('Synthetic OOM process read unavailable');
      const text = await details.locator('pre').textContent();
      await copy.focus();
      await page.keyboard.press('Space');
      await expect.poll(() => page.locator('html').getAttribute('data-oom-copied')).toBe(text);
      journal.state.failTasks = false;
      await retry.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('oom.detail.tasks.row.501')).toBeVisible();
      await expect(page).toHaveURL(/limit=25/);
      expect(journal.reads.at(-1)?.limit).toBe(26);
      journal.state.failTasks = true;
      await page.reload();
      await expect(error).toBeVisible();
      await status.focus();
      await page.keyboard.press('Enter');
      // The existing authenticated public-index redirect replaces / with /app.
      // Wait for that destination before navigating Back, not the transient /.
      await expect(page).toHaveURL(withAppUrl('/app'));
      await expect(page.getByTestId('app.dashboard.page')).toBeVisible();
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(base + '/tasks\\?'));
      await expect(error).toBeVisible();
      await page.getByTestId('oom.detail.tasks.error.back').focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(new RegExp(base + '$'));
      await expectNoDocumentHorizontalOverflow(page);
      expect(journal.writes).toEqual([]);
      expect(journal.errors).toEqual([]);
    });
  test(`OOM opt-in leaves ordinary error controls unchanged ${language} @pr-smoke @pr-smoke-mobile`, async ({
    page,
    hasTouch,
  }) => {
    const journal = await fixture(page, actors[0]!, language);
    journal.state.failStats = true;
    await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
    await page.goto(withAppUrl('/app/oom-reports/101/stats'));
    const stats = page.getByTestId('oom.detail.stats'),
      retry = stats.getByRole('button', { name: names(language).retry, exact: true });
    await expect(retry).toBeVisible();
    expect(await retry.locator('..').evaluate((el) => getComputedStyle(el).justifyContent)).not.toBe('flex-end');
    await expect(stats.getByRole('link', { name: language === 'cs' ? 'Stav' : 'Status', exact: true })).toHaveAttribute(
      'href',
      '/'
    );
    await stats.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(stats.locator('details pre')).toContainText('Synthetic OOM process read unavailable');
    expect(journal.writes).toEqual([]);
    expect(journal.errors).toEqual([]);
  });
}
