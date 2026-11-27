import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

for (const actor of [{ mode: 'app', level: 1 }, { mode: 'app', level: 21 }, { mode: 'admin', level: 99 }] as const) {
  for (const language of ['cs', 'en'] as const) {
    test(`@pr-smoke @pr-smoke-mobile preference description follows its control ${actor.mode}/${actor.level} ${language}`, async ({ page }) => {
      await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_PREFERENCE_DESCRIPTION', webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const user = { id: 1, login: 'fixture', level: actor.level, email: 'member@example.test' };
      const writes: string[] = [];
      page.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(r.method())) writes.push(r.method()); });
      await installHaveApiMock(page, { user, handlers: { 'GET users/1': () => ({ user }) } });
      await page.goto(`/${actor.mode}/profile`);
      const select = page.getByTestId('prefs.language');
      const row = page.getByRole('group', { name: language === 'cs' ? 'Jazyk' : 'Language', exact: true });
      await expect(row).toBeVisible();
      await expect(row).toHaveAccessibleDescription(/.+/);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await select.scrollIntoViewIfNeeded();
        const geometry = await row.evaluate(e => {
          const field = e.querySelector('select')!, id = e.getAttribute('aria-describedby')!, description = document.getElementById(id)!;
          const f = field.getBoundingClientRect(), d = description.getBoundingClientRect(), r = e.getBoundingClientRect();
          return { fieldBottom: f.bottom, descriptionTop: d.top, descriptionLeft: d.left, descriptionRight: d.right, rowLeft: r.left, rowRight: r.right, scrollWidth: description.scrollWidth, clientWidth: description.clientWidth, descriptionAfterField: Boolean(field.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING) };
        });
        expect(geometry.descriptionAfterField).toBe(true);
        expect(geometry.descriptionTop).toBeGreaterThanOrEqual(geometry.fieldBottom);
        expect(geometry.descriptionLeft).toBeGreaterThanOrEqual(geometry.rowLeft);
        expect(geometry.descriptionRight).toBeLessThanOrEqual(geometry.rowRight);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
        await select.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(select).toBeFocused();
      }
      expect(writes).toEqual([]);
    });
  }
}
