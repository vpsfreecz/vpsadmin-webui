import { expect, test, type Locator } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

for (const language of ['cs', 'en'] as const) {
  for (const role of ['member', 'support-my', 'admin-my', 'admin-all'] as const) {
    test(`@pr-smoke @pr-smoke-mobile DNS Create stays anchored ${role} ${language}`, async ({
      page,
      hasTouch,
    }, info) => {
      const admin = role === 'admin-all';
      const base = admin ? '/admin' : '/app';
      await page.setViewportSize(hasTouch ? { width: 320, height: 844 } : { width: 1440, height: 1000 });
      await bootstrapVpsAdminWindow(page, { webuiNext: { uiSettings: { persistence: 'local' } } });
      await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
      const user = {
        id: 7,
        login: 'dns-position-fixture',
        level: role === 'member' ? 1 : role === 'support-my' ? 21 : 99,
      };
      let creates = 0;
      let release: (() => void) | undefined;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await installHaveApiMock(page, {
        user,
        handlers: {
          'GET dns_zones': () => ({ dns_zones: [], _meta: { total_count: 0 } }),
          'GET users': () => ({ users: [user] }),
          'GET users/7': () => ({ user }),
          'GET transaction_chains': () => ({ transaction_chains: [] }),
          'GET help_boxes': () => ({ help_boxes: [] }),
          'POST dns_zones': async () => {
            creates += 1;
            await pending;
            return { status: false, response: null, errors: {}, message: 'Synthetic DNS Create rejection' };
          },
        },
      });
      const press = async (locator: Locator) => (hasTouch ? locator.tap() : locator.click());
      await page.goto(base + '/dns');
      const open = page.getByTestId('dns.zones.create.open');
      await press(open);
      const dialog = page.getByTestId('dns.zones.create.modal');
      await expect(dialog).toBeVisible();
      const initial = await dialog.boundingBox();
      expect(initial).not.toBeNull();
      async function anchored() {
        await expect
          .poll(async () => {
            const rect = await dialog.boundingBox();
            return rect ? Math.abs(rect.y - initial!.y) : Infinity;
          })
          .toBeLessThanOrEqual(1);
        const bounds = await dialog.boundingBox();
        const viewport = page.viewportSize()!;
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
        expect(Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
        const footer = page.getByTestId('dns.zones.create.cancel');
        await expect(footer).toBeInViewport();
        const rect = await footer.boundingBox();
        expect(rect!.height).toBeGreaterThanOrEqual(hasTouch ? 44 : 36);
        await expectNoDocumentHorizontalOverflow(page);
      }
      await anchored();
      await page.getByTestId('dns.zones.create.name').fill('position.example.test');
      // Validation adds content without moving the title or losing the draft.
      await anchored();
      await page.getByTestId('dns.zones.create.email').fill('hostmaster@example.test');
      await page.getByTestId('dns.zones.create.enabled').uncheck();
      await page.getByTestId('dns.zones.create.dnssec').check();
      if (admin) await page.getByTestId('dns.zones.create.ttl').selectOption('600');
      await press(page.getByTestId('dns.zones.create.kind.secondary'));
      await expect(page.getByTestId('dns.zones.create.email')).toHaveCount(0);
      await expect(page.getByTestId('dns.zones.create.name')).toHaveValue('position.example.test');
      await expect(page.getByTestId('dns.zones.create.enabled')).not.toBeChecked();
      await anchored();
      await press(page.getByTestId('dns.zones.create.kind.primary'));
      await expect(page.getByTestId('dns.zones.create.email')).toHaveValue('hostmaster@example.test');
      await expect(page.getByTestId('dns.zones.create.dnssec')).toBeChecked();
      if (admin) await expect(page.getByTestId('dns.zones.create.ttl')).toHaveValue('600');
      else await expect(page.getByTestId('dns.zones.create.ttl')).toHaveCount(0);
      await anchored();
      try {
        await press(page.getByTestId('dns.zones.create.submit'));
        await expect(page.getByTestId('dns.zones.create.submit')).toBeDisabled();
        await expect(page.getByTestId('dns.zones.create.cancel')).toBeDisabled();
        await expect.poll(() => creates).toBe(1);
        await anchored();
      } finally {
        release?.();
      }
      await expect(dialog).toContainText('Synthetic DNS Create rejection');
      await expect(page.getByTestId('dns.zones.create.submit')).toBeEnabled();
      await expect(page.getByTestId('dns.zones.create.name')).toHaveValue('position.example.test');
      await anchored();
      expect(creates).toBe(1);
      await page.screenshot({ path: info.outputPath(`dns-position-${role}-${language}.png`), fullPage: false });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(open).toBeFocused();
      await press(open);
      await expect(page.getByTestId('dns.zones.create.name')).toHaveValue('position.example.test');
      await anchored();
      await press(page.getByTestId('dns.zones.create.cancel'));
      await expect(dialog).toBeHidden();
      expect(creates).toBe(1);
    });
  }
}
