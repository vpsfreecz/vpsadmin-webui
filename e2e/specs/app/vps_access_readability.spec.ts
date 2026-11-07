import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock } from '../../fixtures';
import { setUiSettingsLocalStorage } from '../../fixtures/uiSettings';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';
const vps = {
  id: 123,
  hostname: 'vps123.example',
  object_state: 'active',
  is_running: true,
  enable_network: true,
  cpus: 2,
  memory: 2048,
  swap: 0,
  diskspace: 20480,
  used_memory: 768,
  used_swap: 0,
  used_diskspace: 5120,
  uptime: 12345,
  loadavg1: 0.12,
  node: { id: 1, domain_name: 'node1.example', location: { id: 2, label: 'Praha' } },
  user: { id: 42, login: 'owner' },
  os_template: { id: 6, label: 'Debian 12' },
  dns_resolver: 'inherit',
};

const longPublicKeyLabel = `workstation-${'primary'.repeat(18)}`;
const longPublicKeyFingerprint = `SHA256:${'abcdefghijklmnopqrstuvwxyz0123456789'.repeat(4)}`;
const longPublicKeyComment = `main-laptop-${'comment'.repeat(24)}`;

const publicKeys = [
  {
    id: 8,
    label: longPublicKeyLabel,
    fingerprint: longPublicKeyFingerprint,
    comment: longPublicKeyComment,
    auto_add: true,
  },
  { id: 9, label: 'backup', fingerprint: 'SHA256:def', comment: 'backup key', auto_add: false },
];

const hostKeys = [
  {
    id: 1,
    key_type: 'ssh-ed25519',
    fingerprint: 'SHA256:host-ed25519',
    public_key: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITestHostKey',
    bits: 256,
    created_at: '2026-01-24T12:00:00Z',
  },
  { id: 2, key_type: 'ssh-rsa', fingerprint: 'SHA256:host-rsa', public_key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ' },
];

for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'dark'],
  ['cs', 'light'],
  ['en', 'light'],
] as const) {
  test(`VPS access groups and controls remain readable ${language} ${theme}`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST' });
    await setUiSettingsLocalStorage(page, { language, theme });
    await installHaveApiMock(page, {
      user: { id: 42, login: 'owner', level: 1 },
      handlers: {
        'GET vpses/123': () => ({ vps }),
        'GET ip_addresses': () => ({ ip_addresses: [] }),
        'GET transaction_chains': () => ({ transaction_chains: [] }),
        'GET users/42/public_keys': () => ({ public_keys: publicKeys, _meta: { total_count: 2 } }),
        'GET vpses/123/ssh_host_keys': () => ({ ssh_host_keys: hostKeys, _meta: { total_count: 2 } }),
      },
    });
    await page.goto('/app/vps/123/access');
    await expect(page.getByTestId('vps.access.ssh.card')).toBeVisible();
    await expect(page.getByTestId('vps.access.ssh.key')).toBeVisible();
    await expectNoDocumentHorizontalOverflow(page);
    await page
      .getByTestId('vps.access.page')
      .screenshot({ path: testInfo.outputPath('access-' + language + '-' + theme + '.png') });
    for (const id of ['vps.access.ssh.card', 'vps.access.host_keys', 'vps.access.password.card']) {
      const section = page.getByTestId(id);
      const heading = section.getByRole('heading', { level: 2 });
      await expect(heading).toBeVisible();
      const sizes = await heading.evaluate((el) => ({
        heading: parseFloat(getComputedStyle(el).fontSize),
        body: parseFloat(getComputedStyle(el.parentElement!).fontSize),
      }));
      expect(sizes.heading).toBeGreaterThan(sizes.body);
    }
    for (const id of ['vps.access.ssh.key', 'vps.access.password_type']) {
      const control = page.getByTestId(id);
      const colors = await control.evaluate((el) => {
        const s = getComputedStyle(el);
        return { border: s.borderColor, background: s.backgroundColor };
      });
      const luminance = (color: string) => {
        const nums = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((n) => n / 255)
          .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
        return nums.reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i]!, 0);
      };
      const a = luminance(colors.border),
        b = luminance(colors.background);
      expect((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toBeGreaterThan(2);
      await control.focus();
      await expect(control).toBeFocused();
    }
    await page.getByTestId('vps.access.ssh.key').selectOption('9');
    await page.getByTestId('vps.access.ssh.deploy').click();
    await expect(page.getByTestId('vps.access.ssh.confirm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('vps.access.ssh.confirm')).toBeHidden();
    await page.getByTestId('vps.access.password_type').selectOption('simple');
    await page.getByTestId('vps.access.password.generate').click();
    await expect(page.getByTestId('vps.access.password.confirm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('vps.access.password.confirm')).toBeHidden();
  });
}
