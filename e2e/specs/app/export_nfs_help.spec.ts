import { expect, test, type Locator, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

type Role = 'member' | 'support' | 'admin' | 'my';
async function activate(locator: Locator, hasTouch: boolean) {
  if (hasTouch) await locator.tap();
  else await locator.click();
}
async function setup(page: Page, language: 'cs' | 'en', role: Role, snapshot = false) {
  await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const user = { id: 90, login: 'nfs-help-fixture' };
  const dataset = {
    id: 20,
    name: 'archive',
    full_name: 'tank/fixture/archive',
    object_state: 'active',
    user,
    export: { id: 70 },
  };
  const ex = {
    id: 70,
    dataset,
    user,
    host_ip_address: { id: 80, addr: '192.0.2.20' },
    path: '/fixture/archive',
    enabled: true,
    all_vps: false,
    rw: true,
    sync: true,
    subtree_check: false,
    root_squash: false,
    threads: 8,
    ...(snapshot ? { snapshot: { id: 101, name: 'backup-a' } } : {}),
  };
  const writes: string[] = [];
  const rejectWrite = (method: string) => {
    writes.push(method);
    return {
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ status: false, message: 'Unexpected fixture mutation' }),
    };
  };
  await installHaveApiMock(page, {
    user: { ...user, level: role === 'member' ? 1 : role === 'support' ? 21 : 99 },
    handlers: {
      'GET datasets': () => ({ datasets: [dataset], _meta: { total_count: 1 } }),
      'GET datasets/20': () => ({ dataset }),
      'GET datasets/20/snapshots': () => ({ snapshots: [], _meta: { total_count: 0 } }),
      'GET exports': () => ({ exports: [ex], _meta: { total_count: 1 } }),
      'GET exports/70': () => ({ export: ex }),
      'GET exports/70/hosts': () => ({ hosts: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [], _meta: { total_count: 0 } }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'POST exports': () => rejectWrite('POST exports'),
      'PUT exports/70': () => rejectWrite('PUT exports/70'),
      'POST exports/70/hosts': () => rejectWrite('POST exports/70/hosts'),
    },
  });
  return { base: role === 'admin' || role === 'support' ? '/admin' : '/app', writes };
}
async function expectManual(page: Page, testId: string, language: 'cs' | 'en') {
  const help = page.getByTestId(testId);
  await expect(help).toContainText(
    language === 'cs' ? 'mapování klientského uživatele root' : 'mapping of the client root user'
  );
  const link = page.getByTestId(`${testId}.manual`);
  await expect(link).toHaveAttribute('href', 'https://www.man7.org/linux/man-pages/man5/exports.5.html');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).toHaveAccessibleName(
    language === 'cs'
      ? 'Volby serveru NFS (exports(5)) (otevře se na nové kartě)'
      : 'NFS server options (exports(5)) (opens in a new tab)'
  );
  return link;
}
for (const language of ['cs', 'en'] as const) {
  for (const role of ['member', 'support', 'admin', 'my'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${role} contextual NFS help preserves forms and mount examples`, async ({
      page,
      hasTouch,
    }, info) => {
      const fixture = await setup(page, language, role);
      await page.goto(`${fixture.base}/exports`);
      await activate(page.getByTestId('exports.create.open'), hasTouch);
      const create = page.getByTestId('exports.create');
      const sync = create.getByRole('checkbox', { name: language === 'cs' ? 'Synchronně' : 'Sync', exact: true });
      await activate(sync, hasTouch);
      await expect(sync).not.toBeChecked();
      const manual = await expectManual(page, 'exports.create.nfs_help', language);
      await create
        .getByRole('checkbox', { name: language === 'cs' ? 'Omezení roota' : 'Root squash', exact: true })
        .focus();
      await page.keyboard.press('Tab');
      await expect(manual).toBeFocused();
      await expect(sync).not.toBeChecked();
      await expectNoDocumentHorizontalOverflow(page);
      if (role === 'member')
        await page.screenshot({ path: info.outputPath(`nfs-create-${language}.png`), scale: 'css' });
      await page.keyboard.press('Escape');
      await expect(create).toBeHidden();

      await page.goto(`${fixture.base}/exports/70`);
      await expectManual(page, 'exports.detail.nfs_help', language);
      const nix = page.getByTestId('exports.detail.instructions.nixos');
      await expect(nix).toContainText('fileSystems.');
      await expect(nix).toContainText('fsType = "nfs";');
      const rootfs = nix.locator('..').getByTestId('exports.detail.instructions.nixos.rootfs');
      await expect(rootfs).toContainText(
        language === 'cs'
          ? 'kořenový souborový systém kontejneru hostitel'
          : 'the host provides the container root filesystem'
      );
      await rootfs.scrollIntoViewIfNeeded();
      await expectNoDocumentHorizontalOverflow(page);
      if (role === 'member')
        await page.screenshot({ path: info.outputPath(`nfs-rootfs-${language}.png`), scale: 'css' });

      await activate(page.getByTestId('exports.detail.edit.open'), hasTouch);
      const edit = page.getByTestId('exports.detail.edit.drawer');
      await activate(page.getByTestId('exports.edit.sync'), hasTouch);
      await expect(page.getByTestId('exports.edit.sync')).not.toBeChecked();
      const editManual = await expectManual(page, 'exports.edit.nfs_help', language);
      await page.getByTestId('exports.edit.root_squash').focus();
      await page.keyboard.press('Tab');
      await expect(editManual).toBeFocused();
      await expect(page.getByTestId('exports.edit.sync')).not.toBeChecked();
      await page.keyboard.press('Escape');
      await expect(edit).toBeHidden();
      await activate(page.getByTestId('exports.detail.hosts.add'), hasTouch);
      const host = page.getByTestId('exports.detail.host.editor');
      const hostManual = await expectManual(page, 'exports.host.nfs_help', language);
      await page.getByTestId('exports.host.root_squash').focus();
      await page.keyboard.press('Tab');
      await expect(hostManual).toBeFocused();
      await expectNoDocumentHorizontalOverflow(page);
      await page.keyboard.press('Escape');
      await expect(host).toBeHidden();
      expect(fixture.writes).toEqual([]);
    });
  }
  test(`@pr-smoke @pr-smoke-mobile ${language} temporary snapshot keeps command-only mount guidance`, async ({
    page,
  }, info) => {
    const fixture = await setup(page, language, 'member', true);
    await page.goto(`${fixture.base}/exports/70`);
    await expectManual(page, 'exports.detail.nfs_help', language);
    await expect(page.getByTestId('exports.detail.instructions.command')).toBeVisible();
    await expect(page.getByTestId('exports.detail.instructions.nixos')).toHaveCount(0);
    await expect(page.getByTestId('exports.detail.instructions.nixos.rootfs')).toHaveCount(0);
    await expect(page.getByTestId('exports.detail.instructions.fstab')).toHaveCount(0);
    await expect(page.getByTestId('exports.detail.instructions.systemd')).toHaveCount(0);
    await page.getByTestId('exports.detail.instructions').scrollIntoViewIfNeeded();
    await expectNoDocumentHorizontalOverflow(page);
    await page.screenshot({ path: info.outputPath(`nfs-temporary-${language}.png`), scale: 'css' });
    expect(fixture.writes).toEqual([]);
  });
}
