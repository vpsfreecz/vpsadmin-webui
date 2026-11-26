import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

type Language = 'cs' | 'en';
type State = 'pending' | 'ready' | 'failed' | 'expired' | 'missing_link' | 'unknown';
const titles = {
  cs: {
    pending: 'Záloha se připravuje ke stažení',
    ready: 'Záloha je připravená',
    failed: 'Příprava zálohy selhala',
    other: 'Stažení snapshotu',
  },
  en: {
    pending: 'Backup is being prepared',
    ready: 'Backup is ready',
    failed: 'Backup preparation failed',
    other: 'Snapshot download',
  },
};
const states = ['pending', 'ready', 'failed', 'expired', 'missing_link', 'unknown'] as const;

async function setup(page: Page, info: TestInfo, language: Language, state: State, admin = false, tracked = false) {
  const mobile = info.project.name.includes('mobile');
  await page.clock.install({ time: new Date('2026-11-11T19:00:00Z') });
  await page.setViewportSize(mobile ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
  const errors: string[] = [],
    writes: string[] = [],
    payloads: unknown[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      payloads.push(request.postDataJSON());
    }
  });
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  let finished = false,
    failed = false,
    progressReads = 0;
  const failure = language === 'cs' ? 'Testovací příprava selhala' : 'Synthetic preparation failed';
  await installHaveApiMock(page, {
    user: { id: admin ? 7 : 2, login: 'synthetic-viewer', level: admin ? 99 : 1 },
    handlers: {
      'GET datasets/10': () => ({
        dataset: {
          id: 10,
          full_name: 'tank/vps/ds10',
          name: 'ds10',
          user: { id: 2, login: 'synthetic-owner' },
          used: 2048,
          refquota: 10240,
          snapshots_count: 1,
          vps: { id: 300, hostname: 'alpha.example' },
        },
      }),
      'GET transaction_chains': () => ({ transaction_chains: [], _meta: { total_count: 0 } }),
      'GET datasets/10/snapshots': () => ({
        snapshots: [
          {
            id: 200,
            dataset: { id: 10 },
            name: 'snap-200',
            label: 'before-upgrade',
            created_at: '2026-01-26T00:00:00Z',
          },
        ],
      }),
      'POST snapshot_downloads': () => ({
        snapshot_download: {
          id: 301,
          snapshot: { id: 200, name: 'snap-200' },
          format: 'archive',
          ...(state === 'pending' ? { ready: false, state: 'pending' } : {}),
          ...(state === 'ready' ? { ready: true, url: '/downloads/snapshot-301.tar.gz' } : {}),
          ...(state === 'failed' ? { ready: false, state: 'failed', error: failure } : {}),
          ...(state === 'expired' ? { ready: true, expires_at: '2025-01-01T00:00:00Z' } : {}),
          ...(state === 'missing_link' ? { ready: true, url: 'javascript:invalid' } : {}),
          ...(state === 'unknown' ? { url: 'javascript:invalid' } : {}),
        },
        ...(tracked ? { _meta: { action_state_id: 702 } } : {}),
      }),
      'GET action_states/702': () => {
        progressReads++;
        return {
          action_state: {
            id: 702,
            label: 'Create snapshot download',
            status: !failed,
            finished,
            current: finished ? 1 : 0,
            total: 1,
          },
        };
      },
    },
  });
  const prefix = admin ? '/admin' : '/app',
    query = admin ? '?user=2' : '';
  await page.goto(`${prefix}/datasets/10/snapshots${query}`);
  await page
    .locator(
      '[data-testid="dataset.snapshots.row.200.download"]:visible,[data-testid="dataset.snapshots.card.200.download"]:visible'
    )
    .click();
  const modal = page.getByTestId('dataset.snapshots.download.created');
  await expect(modal).toBeVisible();
  return {
    modal,
    dialog: page.getByRole('dialog').filter({ has: modal }),
    errors,
    writes,
    payloads,
    mobile,
    prefix,
    query,
    failure,
    progressReads: () => progressReads,
    complete: (isFailed: boolean) => {
      finished = true;
      failed = isFailed;
    },
  };
}

async function journal(info: TestInfo, context: Awaited<ReturnType<typeof setup>>) {
  expect(context.writes).toHaveLength(1);
  expect(context.writes[0]).toMatch(/^POST .*\/snapshot_downloads$/);
  expect(context.payloads).toEqual([{ snapshot_download: { snapshot: 200, format: 'archive', send_mail: true } }]);
  expect(context.errors).toEqual([]);
  await info.attach('download-feedback-journal', {
    body: JSON.stringify({
      writes: context.writes,
      payloads: context.payloads,
      errors: context.errors,
      fixtureOnly: true,
    }),
    contentType: 'application/json',
  });
}

test.describe('@pr-smoke @pr-smoke-mobile Approved BAK09/10 download feedback', () => {
  for (const language of ['cs', 'en'] as const)
    for (const state of states) {
      test(`${language} member ${state} truthful single explanation`, async ({ page }, info) => {
        const context = await setup(page, info, language, state);
        const title =
          titles[language][state === 'pending' || state === 'ready' || state === 'failed' ? state : 'other'];
        await expect(context.dialog).toHaveAccessibleName(title);
        const text = await context.modal.innerText();
        if (state === 'pending') {
          expect(text.match(language === 'cs' ? /e-mailem/g : /email/g)).toHaveLength(1);
          expect(text.match(language === 'cs' ? /Downloady/g : /Downloads/g)).toHaveLength(1);
          expect(text).not.toContain(language === 'cs' ? 'Úlohách' : 'Tasks');
        }
        if (state === 'failed') await expect(context.modal).toContainText(context.failure);
        if (state !== 'pending')
          expect(text).not.toMatch(/Příprava běží|Preparation is running|pošleme|send it by email/);
        const open = page.getByTestId('dataset.snapshots.download.created.open');
        if (state === 'ready') await expect(open).toHaveAttribute('href', /\/downloads\/snapshot-301.tar.gz$/);
        else await expect(open).toBeDisabled();
        await expect(page.getByTestId('dataset.snapshots.download.created.downloads')).toHaveAttribute(
          'href',
          '/app/datasets/10/downloads'
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await context.dialog.screenshot({ path: info.outputPath('created-dialog.png') });
        await page.getByTestId('dataset.snapshots.download.created.close').focus();
        await page.keyboard.press('Escape');
        await expect(context.modal).toBeHidden();
        expect(context.progressReads()).toBe(0);
        await journal(info, context);
      });
    }
  for (const language of ['cs', 'en'] as const)
    for (const state of ['pending', 'failed'] as const) {
      test(`${language} selected-owner admin ${state}`, async ({ page }, info) => {
        const context = await setup(page, info, language, state, true);
        await expect(context.dialog).toHaveAccessibleName(titles[language][state]);
        await expect(page.getByTestId('dataset.snapshots.download.created.downloads')).toHaveAttribute(
          'href',
          '/admin/datasets/10/downloads'
        );
        expect(new URL(page.url()).searchParams.get('user')).toBe('2');
        await journal(info, context);
      });
    }
  for (const language of ['cs', 'en'] as const)
    for (const outcome of ['running', 'done', 'failed'] as const) {
      test(`${language} tracked preparation ${outcome} preserves Tasks and notification`, async ({ page }, info) => {
        const context = await setup(page, info, language, 'pending', false, true);
        await expect(context.modal).toContainText(
          language === 'cs' ? 'Průběh přípravy můžeš sledovat v Úlohách.' : 'Follow preparation progress in Tasks.'
        );
        await expect(page.getByTestId('modal.action_progress')).toBeVisible();
        await page.getByTestId('dataset.snapshots.download.created.close').click();
        await page.getByTestId('modal.action_progress.continue').click();
        if (context.mobile) await page.getByTestId('shell.mobile-nav-button').click();
        await page.locator('[data-testid="tasks.open-button"]:visible').click();
        await expect(page.getByTestId('tasks.inspect.open.702')).toBeVisible();
        if (outcome !== 'running') {
          context.complete(outcome === 'failed');
          await page.clock.runFor(6000);
          await expect(page.getByTestId('toast.action.open_tasks.702')).toBeVisible();
          const toast = page
            .locator('[data-overlay="toast"]')
            .filter({ has: page.getByTestId('toast.action.open_tasks.702') });
          await expect(toast).toContainText(
            outcome === 'failed'
              ? language === 'cs'
                ? 'Selhalo:'
                : 'Failed:'
              : language === 'cs'
                ? 'Hotovo:'
                : 'Done:'
          );
        }
        expect(context.progressReads()).toBeGreaterThan(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: info.outputPath('background-tasks.png') });
        await journal(info, context);
      });
    }
});
