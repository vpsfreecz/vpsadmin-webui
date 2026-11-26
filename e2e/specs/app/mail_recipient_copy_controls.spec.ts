import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const actor of [{ level: 1, selected: false }, { level: 21, selected: false }, { level: 99, selected: true }]) {
  for (const language of ['cs', 'en'] as const) {
    test(`@pr-smoke @pr-smoke-mobile recipient copy is a visible button with unchanged content ${actor.level} ${language}`, async ({ page, hasTouch }) => {
      await page.setViewportSize({ width: hasTouch ? 320 : 1440, height: 1000 });
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_MAIL_COPY', webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const id = actor.selected ? 42 : 1, user = { id: 1, login: 'fixture', level: actor.level }, owner = { id, login: 'mail-owner', level: 1, email: 'member@example.test', mailer_enabled: true };
      let copied = '';
      const writes: string[] = [];
      page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push(r.method()); });
      await page.exposeFunction('recipientCopyValue', (text: string) => { copied = text; });
      await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text: string) => (window as unknown as { recipientCopyValue: (value: string) => Promise<void> }).recipientCopyValue(text) } }));
      await installHaveApiMock(page, { user, handlers: {
        [`GET users/${id}`]: () => ({ user: owner }),
        'GET languages': () => ({ languages: [{ id: 1, label: 'English' }] }),
        [`GET users/${id}/mail_role_recipients`]: () => ({ mail_role_recipients: [{ id: 'account', label: 'Account messages', to: 'member@example.test,backup@example.test' }] }),
        [`GET users/${id}/mail_template_recipients`]: () => ({ mail_template_recipients: [{ id: 'vps_created', label: 'VPS created', roles: 'account', to: 'created@example.test', enabled: true }] }),
      } });
      await page.goto(actor.selected ? '/admin/users/42/mail' : '/app/profile/mail');
      for (const [testId, value] of [['mail.roles.copy.account', 'member@example.test,backup@example.test'], ['mail.templates.copy.vps_created', 'created@example.test']] as const) {
        const button = page.getByTestId(testId); await expect(button).toBeVisible();
        await expect(button).toHaveAccessibleName(/.+/);
        const style = await button.evaluate(e => { const s = getComputedStyle(e); return { tag: e.tagName, borderWidth: Number.parseFloat(s.borderTopWidth), borderStyle: s.borderTopStyle, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height }; });
        expect(style.tag).toBe('BUTTON'); expect(style.borderWidth).toBeGreaterThanOrEqual(1); expect(style.borderStyle).toBe('solid');
        if (hasTouch) { expect(style.height).toBeGreaterThanOrEqual(44); expect(style.width).toBeGreaterThanOrEqual(44); await button.tap(); } else await button.click();
        await expect.poll(() => copied).toBe(value); await expect(button).toHaveText(language === 'cs' ? 'Zkopírováno' : 'Copied');
        copied = ''; await button.focus(); await page.keyboard.press('Enter'); await expect.poll(() => copied).toBe(value);
        copied = ''; await page.keyboard.press('Space'); await expect.poll(() => copied).toBe(value);
        await expect(button.locator('..').getByRole('status')).toContainText(language === 'cs' ? 'Zkopírováno' : 'Copied');
      }
      expect(writes).toEqual([]);
    });
  }
}
