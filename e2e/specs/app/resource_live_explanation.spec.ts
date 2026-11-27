import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const language of ['cs', 'en'] as const)
  for (const level of [1, 99]) {
    test(`@pr-smoke @pr-smoke-mobile live resource explanation ${language} level ${level}`, async ({ page }, info) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_RESOURCES' });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const owner = { id: 42, login: 'synthetic-member' };
      const vps = {
        id: 123,
        hostname: 'resources.example',
        object_state: 'active',
        is_running: true,
        manage_hostname: true,
        cpu: 2,
        memory: 2048,
        swap: 0,
        diskspace: 20480,
        user: owner,
        node: { id: 1 },
        dataset: { id: 10 },
        allow_admin_modifications: true,
      };
      const writes: string[] = [];
      page.on('request', (r) => {
        if (new URL(r.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method()))
          writes.push(r.method() + ' ' + new URL(r.url()).pathname);
      });
      await installHaveApiMock(page, {
        user: { ...owner, level },
        handlers: {
          'GET help_boxes': () => ({ help_boxes: [] }),
          'GET webui_user_settings': () => ({
            webui_user_settings: [
              {
                id: 1,
                namespace: 'ui',
                key: 'settings',
                value: JSON.stringify({ language, theme: language === 'cs' ? 'dark' : 'light' }),
              },
            ],
          }),
          'GET vpses/123': () => ({ vps }),
          'GET datasets/10': () => ({
            dataset: {
              id: 10,
              name: 'root',
              full_name: 'tank/root',
              object_state: 'active',
              refquota: 20480,
              used: 5120,
              user: owner,
            },
          }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET ip_addresses': () => ({ ip_addresses: [] }),
          'GET dns_resolvers': () => ({ dns_resolvers: [] }),
          'GET user_namespace_maps': () => ({ user_namespace_maps: [] }),
        },
      });
      await page.goto((level === 99 ? '/admin' : '/app') + '/vps/123/config?section=resources');
      const workspace = page.getByTestId('vps.resources.workspace');
      await expect(workspace).toBeVisible();
      const sentence =
        language === 'cs'
          ? 'Změny CPU, paměti a swapu se provádějí za běhu, bez restartu VPS.'
          : 'CPU, memory and swap changes are applied while the VPS is running, without a restart.';
      await expect(workspace.getByText(sentence, { exact: false })).toHaveCount(1);
      await expect(
        workspace.getByText(language === 'cs' ? 'Aplikuje se za běhu' : 'Applied live', { exact: true })
      ).toHaveCount(level === 99 ? 1 : 0);
      if (level === 99)
        await expect(workspace).toContainText(
          language === 'cs'
            ? 'Výkon VPS a velikost disku se ukládají samostatně.'
            : 'VPS performance and disk size are saved separately.'
        );
      const cpu = page.getByRole('spinbutton', { name: 'CPU', exact: true });
      await expect(cpu).toHaveValue('2');
      await cpu.fill('3');
      await expect(page.getByTestId('vps.config.review')).toContainText(
        language === 'cs' ? 'Aplikuje se za běhu' : 'Applied live'
      );
      expect(writes).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: info.outputPath('resource-explanation.png'),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
