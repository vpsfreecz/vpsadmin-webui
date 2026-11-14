import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, failEnvelope, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function scene(page: Page, language: 'cs' | 'en', outcome = 'accepted', responseGate?: Promise<void>) {
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const location = { id: 2, label: 'Synthetic location', environment: { id: 1, label: 'fixture' } };
  const vps = {
    id: 123,
    hostname: 'scheduled-fixture.example',
    object_state: 'active',
    is_running: true,
    user: { id: 7 },
    node: { id: 1, domain_name: 'fixture-node1', location },
    dataset: { id: 901 },
  };
  const submitted: unknown[] = [];
  let accepted = false;
  const mock = await installHaveApiMock(page, {
    user: { id: 1, login: 'fixture-admin', level: outcome === 'support' ? 21 : 99 },
    handlers: {
      'GET vpses/123': () => ({ vps }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET os_templates': () => ({ os_templates: [] }),
      'GET locations': () => ({ locations: [location] }),
      'GET transaction_chains': () => ({
        transaction_chains: accepted ? [{ id: 510, state: 'queued', label: 'Migrate VPS' }] : [],
      }),
      'GET nodes': (ctx) => ({
        nodes: [
          { id: 1, domain_name: 'fixture-node1', location },
          { id: 2, domain_name: 'fixture-node2', location },
        ].filter(
          (n) => n.id > Number(ctx.url.searchParams.get('node[from_id]') ?? ctx.url.searchParams.get('from_id') ?? 0)
        ),
      }),
      'POST vpses/123/migrate': async (ctx) => {
        submitted.push(ctx.request.postDataJSON());
        await responseGate;
        if (outcome === 'rejected') return failEnvelope('Synthetic migration rejected');
        if (outcome === 'missing-receipt') return { vps: {}, _meta: {} };
        accepted = true;
        return { vps: {}, _meta: { action_state_id: 510 } };
      },
      'GET action_states/510': () => ({
        action_state: { id: 510, label: 'Migrate VPS', finished: false, status: true, current: 1, total: 3 },
      }),
    },
  });
  if (outcome === 'transport') {
    await page.route('**/v7.0/vpses/123/migrate', async (route) => {
      submitted.push(route.request().postDataJSON());
      await route.abort('failed');
    });
  }
  return { submitted, mock };
}

async function fill(page: Page, mode: 'maintenance' | 'custom' | 'now') {
  await page.getByTestId('vps.lifecycle.migrate.node').click();
  await page.getByTestId('vps.lifecycle.migrate.node.opt.2').click();
  await page.getByTestId('vps.lifecycle.migrate.schedule').selectOption(mode);
  if (mode === 'custom') {
    await page.getByTestId('vps.lifecycle.migrate.finish_weekday').selectOption('0');
    await page.getByTestId('vps.lifecycle.migrate.finish_hour').selectOption('0');
  }
  await page.getByTestId('vps.lifecycle.migrate.reason').fill('Isolated schedule feedback fixture');
  await page.getByTestId('vps.lifecycle.migrate.confirm').check();
}

for (const language of ['cs', 'en'] as const) {
  const leave = language === 'cs' ? 'Můžeš opustit stránku' : 'You can leave this page';
  const oldWait = language === 'cs' ? 'Vyčkej na její dokončení.' : 'Please wait until it finishes.';
  const scheduled = language === 'cs' ? 'Migrace naplánována' : 'Migration scheduled';
  for (const mode of ['maintenance', 'custom', 'now'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${mode} acceptance tracks an unfinished migration and lets the user leave`, async ({
      page,
    }, info) => {
      const { submitted } = await scene(page, language);
      await page.goto('/admin/vps/123/lifecycle/migrate');
      await fill(page, mode);
      await page.getByTestId('vps.lifecycle.migrate.submit').click();
      const toast = page.getByTestId('toast.viewport');
      await expect(toast).toContainText(leave);
      await expect(toast).toContainText('scheduled-fixture.example');
      await expect(toast).toContainText(
        mode === 'now' ? (language === 'cs' ? 'Migrace zařazena' : 'Migration queued') : scheduled
      );
      if (mode !== 'now')
        await expect(toast).toContainText(
          language === 'cs'
            ? mode === 'maintenance'
              ? 'servisním okně'
              : 'termínem dokončení'
            : mode === 'maintenance'
              ? 'maintenance window'
              : 'completion schedule'
        );
      expect(submitted).toHaveLength(1);
      expect(submitted[0]).toMatchObject({
        vps: {
          node: 2,
          maintenance_window: mode === 'maintenance',
          ...(mode === 'custom' ? { finish_weekday: 0, finish_minutes: 0 } : {}),
        },
      });
      await expect(page.getByTestId('vps.lifecycle.migrate.pending')).toContainText(leave);
      await expect(page.getByTestId('vps.lifecycle.migrate')).not.toContainText(oldWait);
      // Editing after acceptance must not rewrite the receipt from the submitted snapshot.
      await page
        .getByTestId('vps.lifecycle.migrate.schedule')
        .selectOption(mode === 'maintenance' ? 'now' : 'maintenance');
      await page.getByTestId('vps.lifecycle.migrate.confirm').check();
      await expect(page.getByTestId('vps.lifecycle.migrate.submit')).toBeDisabled();
      await expect(toast).toContainText(
        mode === 'now' ? (language === 'cs' ? 'Migrace zařazena' : 'Migration queued') : scheduled
      );
      await expect(page.getByTestId('modal.action_progress')).toBeHidden();
      await page
        .getByTestId('vps.header')
        .getByRole('link', { name: language === 'cs' ? 'Přehled' : 'Overview', exact: true })
        .click();
      await expect(page).toHaveURL('/admin/vps/123');
      await toast
        .getByRole('button', { name: language === 'cs' ? 'Otevřít úlohy' : 'Open tasks', exact: true })
        .click();
      await expect(page.getByTestId('tasks.drawer')).toBeVisible();
      await expect(page.getByTestId('tasks.drawer')).toContainText('scheduled-fixture.example');
      await page.goto('/admin/vps/123/lifecycle/migrate');
      await page.reload();
      await expect(page.getByTestId('vps.lifecycle.migrate.pending')).toContainText(leave);
      await fill(page, mode);
      await expect(page.getByTestId('vps.lifecycle.migrate.submit')).toBeDisabled();
      expect(submitted).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await info.attach('scope', {
        contentType: 'application/json',
        body: JSON.stringify({ fixtureOnly: true, liveMigration: false, submitted, unfinished: true, language, mode }),
      });
    });
  }
  for (const outcome of ['rejected', 'transport', 'missing-receipt'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${outcome} never claims scheduled acceptance`, async ({ page }) => {
      const { submitted } = await scene(page, language, outcome);
      await page.goto('/admin/vps/123/lifecycle/migrate');
      await fill(page, 'maintenance');
      await page.getByTestId('vps.lifecycle.migrate.submit').click();
      await expect.poll(() => submitted.length).toBe(1);
      await expect(page.getByTestId('vps.lifecycle.migrate')).toContainText(
        language === 'cs' ? 'Migrace' : 'Migration'
      );
      if (outcome === 'rejected') {
        await expect(page.getByText('Synthetic migration rejected', { exact: false }).first()).toBeVisible();
        await expect(page.getByTestId('vps.mutation.uncertain')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('vps.mutation.uncertain')).toBeVisible();
        await expect(page.getByTestId('vps.lifecycle.migrate.submit')).toBeDisabled();
        await page.reload();
        await fill(page, 'maintenance');
        await expect(page.getByTestId('vps.lifecycle.migrate.submit')).toBeDisabled();
      }
      await expect(page.getByTestId('toast.viewport').getByText(scheduled, { exact: true })).toHaveCount(0);
      expect(submitted).toHaveLength(1);
    });
  }
  test(`@pr-smoke @pr-smoke-mobile ${language} pending request does not claim acceptance or permit edits`, async ({
    page,
  }) => {
    let accept = () => {};
    const responseGate = new Promise<void>((resolve) => {
      accept = resolve;
    });
    const { submitted } = await scene(page, language, 'accepted', responseGate);
    await page.goto('/admin/vps/123/lifecycle/migrate');
    await fill(page, 'maintenance');
    await page.getByTestId('vps.lifecycle.migrate.submit').click();
    await expect.poll(() => submitted.length).toBe(1);
    await expect(page.getByTestId('vps.lifecycle.migrate.schedule')).toBeDisabled();
    await expect(page.getByTestId('vps.lifecycle.migrate.submit')).toBeDisabled();
    await expect(page.getByTestId('toast.viewport').getByText(scheduled, { exact: true })).toHaveCount(0);
    accept();
    await expect(page.getByTestId('toast.viewport')).toContainText(scheduled);
    expect(submitted).toHaveLength(1);
  });
  test(`@pr-smoke @pr-smoke-mobile ${language} support cannot schedule a migration`, async ({ page }) => {
    const { submitted } = await scene(page, language, 'support');
    await page.goto('/admin/vps/123/lifecycle/migrate');
    await expect(page.getByTestId('vps.lifecycle.page')).toBeVisible();
    await expect(page.getByTestId('vps.lifecycle.migrate.submit')).toHaveCount(0);
    await expect(page.getByTestId('toast.viewport').getByText(scheduled, { exact: true })).toHaveCount(0);
    expect(submitted).toEqual([]);
  });
}
