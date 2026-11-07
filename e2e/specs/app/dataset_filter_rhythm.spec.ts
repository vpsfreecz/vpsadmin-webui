import { expect, test, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

async function height(control: Locator) {
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  return Math.round(box!.height);
}

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const [mode, section] of [
    ['app', 'nas'],
    ['admin', 'nas'],
    ['admin', 'datasets'],
  ] as const) {
    test(`@pr-smoke @pr-smoke-mobile dataset filter controls ${language} ${mode} ${section}`, async ({
      page,
    }, testInfo) => {
      const mobile = testInfo.project.name.startsWith('mobile');
      const baseline = process.env['CAPTURE_SIDE']?.startsWith('baseline') ?? false;
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme });
      const queries: URL[] = [];
      const writes: string[] = [];
      page.on('request', (request) => {
        if (request.method() !== 'GET') writes.push(request.method() + ' ' + new URL(request.url()).pathname);
      });
      await installHaveApiMock(page, {
        user: { id: 1, login: mode === 'admin' ? 'admin' : 'member', level: mode === 'admin' ? 99 : 1 },
        handlers: {
          'GET datasets': ({ url }) => {
            queries.push(url);
            return {
              datasets: [
                {
                  id: 53,
                  name: 'archive',
                  full_name: 'tank/nas/archive',
                  user: { id: mode === 'admin' ? 42 : 1, login: 'owner' },
                  used: 1024,
                  refquota: 4096,
                  object_state: 'active',
                },
              ],
            };
          },
          'GET users/42': () => ({ user: { id: 42, login: 'owner' } }),
          'GET users': () => ({ users: [{ id: 42, login: 'owner' }] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
        },
      });
      const owner = mode === 'admin' ? '&user=42' : '';
      await page.goto(`/${mode}/${section}?q=archive${owner}`);
      const filters = page.getByTestId('datasets.list.filters');
      const input = filters.getByTestId('datasets.search.input');
      const help = filters.getByRole('button', { name: language === 'cs' ? 'Nápověda' : 'Help', exact: true });
      const advanced = filters.getByTestId('datasets.filters.advanced.open');
      const copy = filters.getByTestId('datasets.copy_link');
      const clear = filters.getByTestId('datasets.filter.clear');
      await expect(page.getByTestId(`datasets.${mobile ? 'card' : 'row'}.53`)).toBeVisible();
      await expect(page.getByTestId('datasets.active_filters')).toBeVisible();
      expect(await height(input)).toBe(44);
      for (const action of [help, advanced, copy, clear]) {
        expect(await height(action)).toBe(baseline && !mobile ? 32 : 44);
        if (!baseline) expect((await action.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      }
      if (!mobile && !baseline) {
        const boxes = await Promise.all([input, advanced, copy, clear].map((control) => control.boundingBox()));
        for (const box of boxes) expect(Math.abs(box!.y - boxes[0]!.y)).toBeLessThanOrEqual(1);
      }
      await expectNoDocumentHorizontalOverflow(page);
      const query = queries[0]!;
      expect(query.searchParams.get('dataset[role]')).toBe(section === 'nas' ? 'primary' : null);
      expect(query.searchParams.get('dataset[user]')).toBe(mode === 'admin' ? '42' : null);
      expect(query.searchParams.has('dataset[vps]')).toBe(false);
      if (language === 'cs' && mode === 'admin' && section === 'nas') {
        await filters.screenshot({
          path: testInfo.outputPath(`dataset-filter-${baseline ? 'before' : 'after'}.png`),
          scale: 'css',
        });
      }
      await input.focus();
      await page.keyboard.press('Escape');
      for (const control of [help, advanced, copy, clear]) {
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
      }
      await help.click();
      const helpDialog = page.getByRole('dialog', { name: language === 'cs' ? 'Filtry datasetů' : 'Dataset filters' });
      await expect(helpDialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(helpDialog).toBeHidden();
      await advanced.click();
      await expect(page.getByTestId('datasets.advanced.q')).toBeVisible();
      await expect(page.getByTestId('datasets.advanced.vps')).toHaveCount(section === 'nas' ? 0 : 1);
      await expect(page.getByTestId('datasets.advanced.user')).toHaveCount(mode === 'admin' ? 1 : 0);
      await page.getByTestId('datasets.advanced.close').click();
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: async (value: string) => {
              document.documentElement.dataset['copiedDatasetLink'] = value;
            },
          },
        });
      });
      await copy.click();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.dataset['copiedDatasetLink']))
        .toBe(page.url());
      await clear.click();
      await expect(clear).toHaveCount(0);
      for (const key of ['q', 'user', 'vps']) expect(new URL(page.url()).searchParams.has(key)).toBe(false);
      expect(new URL(page.url()).searchParams.get('limit')).toBe('50');
      expect(new URL(page.url()).searchParams.get('page')).toBe('1');
      await expect.poll(() => queries.at(-1)?.searchParams.get('dataset[user]')).toBe(null);
      expect(queries.at(-1)?.searchParams.get('dataset[role]')).toBe(section === 'nas' ? 'primary' : null);
      await expectNoDocumentHorizontalOverflow(page);
      // The existing settings provider can persist the initial local UI
      // preference once. No dataset or other mutation is allowed here.
      const preferenceWrite = /^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/;
      expect(writes.filter((write) => !preferenceWrite.test(write))).toEqual([]);
      expect(writes.filter((write) => preferenceWrite.test(write)).length).toBeLessThanOrEqual(1);
    });
  }
}
