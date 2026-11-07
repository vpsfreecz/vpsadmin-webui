import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
const root = { id: 10, name: 'tank/vps123', user: { id: 1 }, object_state: 'active' };
const child = { id: 2, name: 'tank/vps123/data-00', user: { id: 1 }, object_state: 'active' };
const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  enable_network: true,
  cpus: 2,
  memory: 2048,
  diskspace: 20480,
  dataset: root,
  user: { id: 1, login: 'member' },
  node: { id: 1, domain_name: 'node1.example', hypervisor_type: 'vpsadminos' },
  os_template: { label: 'Debian' },
};

for (const language of ['cs', 'en'] as const) {
  for (const [mode, level] of [
    ['app', 1],
    ['app', 99],
    ['admin', 99],
  ] as const) {
    test(`@pr-smoke @pr-smoke-mobile mount dataset picker ${language} ${mode} ${level}`, async ({ page }, testInfo) => {
      await page.setViewportSize(
        testInfo.project.name.startsWith('mobile') ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
      );
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const writes: unknown[] = [];
      const queries: URL[] = [];
      let limited = false;
      let fail = false;
      const children = Array.from({ length: 27 }, (_, i) => ({
        ...child,
        id: 50 - i,
        name: `tank/vps123/data-${String(i).padStart(2, '0')}`,
      }));
      await installHaveApiMock(page, {
        user: { id: 1, login: 'member', level },
        handlers: {
          'GET vpses/123': () => ({ vps }),
          'GET datasets/10': () => ({ dataset: root }),
          'GET vpses/123/mounts': () => ({ mounts: [] }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET datasets': ({ url }) => {
            queries.push(url);
            if (url.searchParams.get('dataset[dataset]') === '2') return { datasets: [child] };
            return fail
              ? { status: 503, body: 'unavailable' }
              : {
                  datasets: [
                    root,
                    ...children,
                    { ...child, id: 90, name: 'tank/remote' },
                    { ...child, id: 91, user: { id: 9 } },
                  ],
                  _meta: { total_count: limited ? 1001 : 30 },
                };
          },
          'GET datasets/find_by_name': async ({ url }) => {
            if (url.searchParams.get('dataset[name]')?.includes('slow'))
              await new Promise((resolve) => setTimeout(resolve, 500));
            return { dataset: child };
          },
          'POST vpses/123/mounts': ({ json }) => {
            writes.push(json);
            return { mount: { id: 31, dataset: child }, _meta: { action_state_id: 733 } };
          },
          'GET action_states/733': () => ({
            action_state: { id: 733, finished: false, current: 1, total: 2, status: true },
          }),
        },
      });
      await page.goto(`/${mode}/vps/123/storage`);
      await page.getByTestId('vps.storage.mounts.add').click();
      const modal = page.getByTestId('vps.storage.mounts.create');
      await modal.getByTestId('vps.storage.mounts.create.mountpoint').fill('/mnt/data');
      const open = modal.getByTestId('vps.storage.dataset_picker.open');
      if (process.env['CAPTURE_SIDE'] === 'baseline') {
        await modal.getByTestId('vps.storage.mounts.create.dataset').fill('tank/vps123/data-00');
        await modal.screenshot({ path: testInfo.outputPath('dataset-picker-before.png'), scale: 'css' });
        return;
      }
      await open.click();
      const search = modal.getByTestId('vps.storage.dataset_picker.search');
      const choose = modal.getByTestId('vps.storage.dataset_picker.choose');
      const submit = modal.getByTestId('vps.storage.mounts.create.submit');
      await expect(modal.getByTestId('vps.storage.dataset_picker.candidate.50')).toBeVisible();
      await expect(choose).toBeDisabled();
      await expect(submit).toBeDisabled();
      await expect(modal.getByTestId('vps.storage.dataset_picker.candidate.90')).toHaveCount(0);
      await expect(modal.getByTestId('vps.storage.dataset_picker.candidate.91')).toHaveCount(0);
      const firstQuery = queries[0]!;
      expect(firstQuery.searchParams.get('dataset[dataset]')).toBe('10');
      expect(firstQuery.searchParams.get('dataset[role]')).toBe('hypervisor');
      expect(firstQuery.searchParams.get('dataset[limit]')).toBe('1000');
      expect(firstQuery.searchParams.get('dataset[user]')).toBe(level === 99 ? '1' : null);
      expect(firstQuery.searchParams.has('dataset[from_id]')).toBe(false);
      await modal.getByTestId('vps.storage.dataset_picker.next').click();
      await expect(modal.getByTestId('vps.storage.dataset_picker.candidate.24')).toBeVisible();
      expect(queries).toHaveLength(1);
      await search.fill('data-26');
      await modal.getByTestId('vps.storage.dataset_picker.candidate.24').click();
      await expect(submit).toBeDisabled();
      await search.fill('nothing');
      await expect(choose).toBeDisabled();
      await expect(submit).toBeDisabled();
      await expect(modal).toContainText(language === 'cs' ? 'Žádný dostupný' : 'No available');
      await search.fill('DATA-00');
      await modal.getByTestId('vps.storage.dataset_picker.candidate.50').focus();
      await page.keyboard.press('Enter');
      await expect(choose).toBeEnabled();
      await expectNoDocumentHorizontalOverflow(page);
      await open.scrollIntoViewIfNeeded();
      if (language === 'cs' && mode === 'app' && level === 1)
        await modal.screenshot({ path: testInfo.outputPath('dataset-picker-after.png'), scale: 'css' });
      await choose.click();
      await expect(open).toBeFocused();
      await expect(submit).toBeEnabled();
      await expect(modal.getByTestId('vps.storage.dataset_picker.selected')).toContainText('data-00');
      expect(writes).toHaveLength(0);
      // Reopening explicitly clears the prior selection, including on a failed refresh.
      fail = true;
      await open.click();
      await expect(modal.getByRole('alert')).toContainText(language === 'cs' ? 'nepodařilo' : 'could not');
      await expect(submit).toBeDisabled();
      await expect(choose).toBeDisabled();
      fail = false;
      limited = true;
      await modal.getByRole('button', { name: language === 'cs' ? 'Zkusit znovu' : 'Retry', exact: true }).click();
      await expect(modal).toContainText(language === 'cs' ? 'neúplný' : 'incomplete');
      await search.fill('tank/vps123/slow');
      await modal.getByTestId('vps.storage.dataset_picker.find').click();
      await search.fill('changed');
      await page.waitForTimeout(650);
      await expect(choose).toBeDisabled();
      await expect(submit).toBeDisabled();
      await search.fill('tank/vps123/data-00');
      await modal.getByTestId('vps.storage.dataset_picker.find').click();
      await modal.getByTestId('vps.storage.dataset_picker.candidate.2').click();
      await choose.click();
      await expect(submit).toBeEnabled();
      await submit.click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0]).toEqual({
        mount: {
          dataset: 2,
          mountpoint: '/mnt/data',
          mode: 'rw',
          on_start_fail: 'ignore',
          enabled: true,
        },
      });
    });
  }
}

for (const level of [1, 21]) {
  test(`@pr-smoke @pr-smoke-mobile unknown node or read-only role never offers a mount candidate (${level})`, async ({
    page,
  }) => {
    if (process.env['CAPTURE_SIDE'] === 'baseline') return;
    await bootstrapVpsAdminWindow(page);
    let queries = 0;
    await installHaveApiMock(page, {
      user: { id: 1, login: 'member', level },
      handlers: {
        'GET vpses/123': () => ({ vps: { ...vps, node: { id: 1 } } }),
        'GET datasets/10': () => ({ dataset: root }),
        'GET vpses/123/mounts': () => ({ mounts: [] }),
        'GET datasets': () => {
          queries++;
          return { datasets: [child] };
        },
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
      },
    });
    await page.goto(`/${level === 21 ? 'admin' : 'app'}/vps/123/storage`);
    await expect(page.getByTestId('vps.storage.page')).toBeVisible();
    if (level === 21) {
      await expect(page.getByTestId('vps.storage.mounts.add')).toHaveCount(0);
    } else {
      await page.getByTestId('vps.storage.mounts.add').click();
      await page.getByTestId('vps.storage.dataset_picker.open').click();
      await expect(page.getByTestId('vps.storage.dataset_picker')).toContainText('supported VPS node');
      await expect(page.getByTestId('vps.storage.dataset_picker.choose')).toBeDisabled();
      await expect(page.getByTestId('vps.storage.mounts.create.submit')).toBeDisabled();
    }
    expect(queries).toBe(0);
  });
}
