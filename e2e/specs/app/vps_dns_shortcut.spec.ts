import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function setup(page: Page, language: 'cs' | 'en', level: number) {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let resolverId = 3;
  const writes: unknown[] = [];
  const resolver = (id: number) => ({
    id,
    label: id === 3 ? 'Default DNS' : 'Alternate DNS',
    ip_addr: id === 3 ? '192.0.2.53' : '198.51.100.53',
  });
  await installHaveApiMock(page, {
    user: { id: 53, login: 'sample-member', level },
    handlers: {
      'GET vpses/123': () => ({
        vps: {
          id: 123,
          hostname: 'sample.example',
          user: { id: 53, login: 'sample-member' },
          object_state: 'active',
          is_running: true,
          cpu: 2,
          memory: 2048,
          swap: 0,
          manage_hostname: true,
          dns_resolver: resolver(resolverId),
          node: { id: 1, location: { id: 1, label: 'Praha' } },
        },
      }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET dns_resolvers': () => ({ dns_resolvers: [resolver(3), resolver(4)] }),
      'GET user_namespace_maps': () => ({ user_namespace_maps: [] }),
      'PUT vpses/123': (ctx) => {
        const payload = ctx.request.postDataJSON() as { vps: { dns_resolver?: number } };
        writes.push(payload);
        resolverId = payload.vps.dns_resolver ?? resolverId;
        return { _meta: { action_state_id: 801 } };
      },
      'GET action_states/801': () => ({
        action_state: { id: 801, finished: true, status: true, current: 1, total: 1 },
      }),
    },
  });
  return { writes };
}

for (const language of ['cs', 'en'] as const) {
  for (const mode of ['member', 'admin'] as const) {
    test(`@pr-smoke @pr-smoke-mobile ${language} ${mode} opens DNS from the top menu and saves only the resolver`, async ({
      page,
    }, info) => {
      const { writes } = await setup(page, language, mode === 'admin' ? 100 : 1);
      const base = mode === 'admin' ? '/admin' : '/app';
      await page.goto(`${base}/vps/123${mode === 'admin' ? '?user=53' : ''}`);
      const menu = page.getByTestId('vps.actions.menu');
      const label = language === 'cs' ? 'DNS servery' : 'DNS servers';
      await expect(menu.locator('optgroup').first().locator('option').first()).toHaveText(label);
      await menu.selectOption({ label });
      await expect(page).toHaveURL(/\/config\?/);
      expect(new URL(page.url()).searchParams.get('section')).toBe('dns');
      if (mode === 'admin') expect(new URL(page.url()).searchParams.get('user')).toBe('53');
      const section = page.getByTestId('vps.config.dns');
      const selector = page.getByTestId('vps.config.dns.resolver');
      await expect(selector).toHaveValue('3');
      await expect(page.getByTestId('vps.config.additional')).toHaveAttribute('open', '');
      await expect(section).toBeFocused();
      const box = await section.boundingBox();
      expect(box?.y).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeLessThan((page.viewportSize()?.height ?? 720) / 2);
      expect(writes).toEqual([]);
      await page.screenshot({ path: info.outputPath('dns-settings.png'), scale: 'css' });
      await selector.selectOption('4');
      await page.getByTestId('vps.config.dns.save').click();
      const confirm = page.getByTestId('vps.config.confirm');
      await expect(confirm).toContainText('Alternate DNS');
      expect(writes).toEqual([]);
      await page.getByTestId('vps.config.confirm.confirm').click();
      await expect(confirm).toBeHidden();
      expect(writes).toEqual([{ vps: { dns_resolver: 4 } }]);
      await page.reload();
      await expect(selector).toHaveValue('4');
      await page.getByTestId('vps.config.additional').locator('summary').click();
      await expect(selector).toBeHidden();
      await menu.selectOption({ label });
      await expect(selector).toBeVisible();
      await expect(section).toBeFocused();
      expect(writes).toHaveLength(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}

test('@pr-smoke @pr-smoke-mobile opening DNS keeps other unsaved configuration changes in the common review', async ({
  page,
}) => {
  const { writes } = await setup(page, 'en', 1);
  await page.goto('/app/vps/123/config?section=resources');
  await page.getByLabel('CPU', { exact: true }).fill('4');
  await page.getByTestId('vps.actions.menu').selectOption({ label: 'DNS servers' });
  await expect(page.getByLabel('CPU', { exact: true })).toHaveValue('4');
  await page.getByTestId('vps.config.dns.resolver').selectOption('4');
  await expect(page.getByTestId('vps.config.dns.save')).toHaveText('Save (2)');
  await page.getByTestId('vps.config.dns.save').click();
  await expect(page.getByTestId('vps.config.confirm')).toContainText('CPU');
  await expect(page.getByTestId('vps.config.confirm')).toContainText('Alternate DNS');
  await page.getByTestId('vps.config.confirm.cancel').click();
  expect(writes).toEqual([]);
});

test('@pr-smoke @pr-smoke-mobile support can find DNS settings but retains read-only permissions', async ({ page }) => {
  const { writes } = await setup(page, 'en', 21);
  await page.goto('/admin/vps/123');
  await page.getByTestId('vps.actions.menu').selectOption({ label: 'DNS servers' });
  await expect(page.getByTestId('vps.config.dns.resolver')).toHaveValue('3');
  await expect(page.getByTestId('vps.config.dns.resolver')).toBeDisabled();
  await expect(page.getByTestId('vps.config.dns.save')).toBeDisabled();
  expect(writes).toEqual([]);
});
