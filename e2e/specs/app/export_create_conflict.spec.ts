import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

type Role = 'member' | 'support' | 'admin' | 'my';
async function setup(page: Page, language: 'cs' | 'en', role: Role, snapshot = false, message?: string) {
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const user = {
    id: 90,
    login: 'export-conflict-fixture',
    level: role === 'member' ? 1 : role === 'support' ? 21 : 99,
  };
  const dataset = {
    id: 20,
    full_name: 'tank/member/archive',
    name: 'archive',
    object_state: 'active',
    user,
    export: { id: 70 },
  };
  const writes: unknown[] = [];
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await installHaveApiMock(page, {
    user,
    handlers: {
      'GET exports': () => ({ exports: [], _meta: { total_count: 0 } }),
      'GET exports/70': () => ({
        export: {
          id: 70,
          dataset,
          user,
          host_ip_address: { id: 80, addr: '192.0.2.20' },
          path: '/fixture/archive',
          enabled: false,
          all_vps: false,
          rw: false,
          sync: true,
          subtree_check: false,
          root_squash: true,
        },
      }),
      'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
      'GET datasets/20': () => ({ dataset }),
      'GET datasets/21': () => ({ dataset: { ...dataset, id: 21, full_name: 'tank/member/later' } }),
      'GET datasets/20/snapshots': () => ({
        snapshots: [{ id: 101, name: 'backup-a', dataset }],
        _meta: { total_count: 1 },
      }),
      'GET datasets/21/snapshots': () => ({ snapshots: [], _meta: { total_count: 0 } }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'POST exports': async ({ json }) => {
        writes.push(json);
        await pending;
        return {
          status: false,
          response: null,
          errors: {},
          message:
            message ??
            (snapshot
              ? 'snapshot tank/member/archive@backup-a is already exported'
              : 'dataset tank/member/archive is already exported'),
        };
      },
    },
  });
  const base = role === 'admin' || role === 'support' ? '/admin' : '/app';
  await page.goto(base + '/exports');
  await page.getByTestId('exports.create.open').click();
  const picker = page.getByTestId('exports.create.dataset');
  // The cumulative preview uses the approved name picker; focused base retains exact-ID input.
  if ((await picker.getAttribute('role')) === 'combobox') {
    await picker.fill('archive');
    await page.getByTestId('exports.create.dataset.opt.20').click();
  } else {
    await picker.fill('20');
  }
  if (snapshot) {
    await page
      .getByRole('combobox', { name: language === 'cs' ? 'Typ zdroje' : 'Source type' })
      .selectOption('snapshot');
    const choices = page.getByRole('combobox', { name: /Snapshot/ });
    await choices.selectOption('101');
  }
  await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
  return { base, writes, release: () => release?.() };
}
for (const language of ['cs', 'en'] as const) {
  for (const role of ['member', 'support', 'admin', 'my'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${role} duplicate export retains draft and offers its dataset`, async ({
      page,
      hasTouch,
    }, testInfo) => {
      const fixture = await setup(page, language, role);
      try {
        const submit = page.getByTestId('exports.create.submit');
        if (hasTouch) await submit.tap();
        else await submit.click();
        await expect(submit).toBeDisabled();
        await expect.poll(() => fixture.writes.length).toBe(1);
        await page
          .getByRole('combobox', { name: language === 'cs' ? 'Typ zdroje' : 'Source type' })
          .selectOption('snapshot');
        await page.getByRole('combobox', { name: /Snapshot/ }).selectOption('101');
      } finally {
        fixture.release();
      }
      const failure = page.getByTestId('exports.create.failure');
      await expect(failure).toBeVisible();
      await expect(failure).toContainText(language === 'cs' ? 'Export už existuje' : 'Export already exists');
      await expect(failure).toContainText('tank/member/archive');
      const link = page.getByTestId('exports.create.conflict.open');
      await expect(link).toHaveAttribute('href', fixture.base + '/datasets/20/exports');
      await expect(page.getByTestId('exports.create.submit')).toBeEnabled();
      expect(fixture.writes).toHaveLength(1);
      await expect(page.getByTestId('exports.create')).toBeVisible();
      await expectNoDocumentHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`export-conflict-${language}.png`), fullPage: true });
      // Editing after rejection must not redirect the receipt to another dataset.
      await page.getByTestId('exports.create.dataset').fill('21');
      await expect(link).toHaveAttribute('href', fixture.base + '/datasets/20/exports');
      await expect(failure).toContainText('tank/member/archive');
      expect(fixture.writes).toHaveLength(1);
      if (role === 'member') {
        if (hasTouch) await link.tap();
        else await link.click();
        await expect(page).toHaveURL(fixture.base + '/datasets/20/exports');
        await expect(page.getByTestId('exports.create')).toHaveCount(0);
        await expect(page.getByTestId('dataset.exports.page')).toBeVisible();
        expect(fixture.writes).toHaveLength(1);
        return;
      }
      const cancel = page.getByRole('button', { name: language === 'cs' ? 'Zrušit' : 'Cancel', exact: true });
      if (hasTouch) await cancel.tap();
      else await cancel.click();
      await expect(page.getByTestId('exports.create')).toHaveCount(0);
      await page.getByTestId('exports.create.open').click();
      await expect(failure).toHaveCount(0);
    });
  }
  test(`@pr-smoke @pr-smoke-mobile ${language} unrelated API rejection keeps its real reason`, async ({ page }) => {
    const fixture = await setup(
      page,
      language,
      'member',
      false,
      'This dataset cannot be exported or mounted via vpsAdmin'
    );
    await page.getByTestId('exports.create.submit').click();
    fixture.release();
    await expect(page.getByTestId('exports.create.failure')).toContainText(
      'This dataset cannot be exported or mounted via vpsAdmin'
    );
    await expect(page.getByTestId('exports.create.conflict')).toHaveCount(0);
    expect(fixture.writes).toHaveLength(1);
  });

  test(`@pr-smoke @pr-smoke-mobile ${language} duplicate snapshot points to its captured snapshots`, async ({
    page,
  }) => {
    const fixture = await setup(page, language, 'member', true);
    await page.getByTestId('exports.create.submit').click();
    fixture.release();
    const failure = page.getByTestId('exports.create.failure');
    await expect(failure).toContainText('tank/member/archive@backup-a');
    await expect(page.getByTestId('exports.create.conflict.open')).toHaveAttribute(
      'href',
      fixture.base + '/datasets/20/snapshots'
    );
    expect(fixture.writes).toHaveLength(1);
  });
}
