import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

// Synthetic API/router contract: these accelerated checks do not prove live
// router renewal, permission enforcement or actual elapsed console lifetime.
async function setup(page: Page, language: 'cs' | 'en') {
  await page.clock.install();
  await bootstrapVpsAdminWindow(page, { sessionToken: 'SYNTHETIC_CONSOLE_LIFETIME' });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  const initial = await page.evaluate(() => Date.now());
  const state = { creates: 0, deletes: 0, reads: 0, status: 200, token: 'SYNTHETIC_T1', expiration: initial + 3600000 };
  await page.route('**/_console/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body>Synthetic terminal; no live VPS</body></html>' }));
  await installHaveApiMock(page, {
    user: { id: 1, login: 'console-lifetime-fixture', level: 1 },
    handlers: {
      'GET vpses/123': () => ({ vps: {
        id: 123, hostname: 'synthetic-console.example', object_state: 'active', is_running: true,
        cpus: 2, memory: 2048, swap: 0, diskspace: 20480, os_template: { label: 'debian' },
        node: { id: 1, location: { label: 'fixture', remote_console_server: '/_console' } },
      } }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'GET transaction_chains': () => ({ transaction_chains: [] }),
      'POST vpses/123/console_token': () => {
        state.creates++;
        return { console_token: { token: state.token, expiration: new Date(initial + 60000).toISOString() } };
      },
      'GET vpses/123/console_token': () => {
        state.reads++;
        if (state.status !== 200) return { status: state.status, contentType: 'application/json', body: JSON.stringify({ status: false, message: 'Synthetic validation failure', response: null }) };
        return { console_token: { token: state.token, expiration: new Date(state.expiration).toISOString() } };
      },
      'DELETE vpses/123/console_token': () => {
        state.deletes++;
        return { console_token: {} };
      },
    },
  });
  await page.goto('/app/vps/123/console');
  await expect(page.getByTestId('vps.console.iframe')).toBeVisible();
  await expect.poll(() => state.reads).toBeGreaterThan(0);
  return state;
}

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile ${language} retains a renewed console beyond the original deadline and reconnects without replacement`, async ({ page }, info) => {
    const state = await setup(page, language);
    const frame = page.getByTestId('vps.console.iframe');
    await frame.evaluate(element => element.setAttribute('data-original-frame', 'true'));
    await page.clock.fastForward(70000);
    await expect.poll(() => state.reads).toBeGreaterThan(1);
    await expect(frame).toHaveAttribute('data-original-frame', 'true');
    await expect(page.getByTestId('vps.console.expired')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`console-renewed-${language}.png`), fullPage: true });
    await page.getByTestId('vps.console.header').getByRole('link', { name: /^(Overview|Přehled)$/ }).click();
    await page.getByRole('link', { name: /^(Console|Konzole)$/ }).first().click();
    await expect(frame).toBeVisible();
    expect(state.creates).toBe(1);
    await page.getByTestId('vps.console.reconnect').click();
    await expect(frame).toBeVisible();
    expect(state.creates).toBe(1);
    expect(state.deletes).toBe(0);
    // A known session still requires explicit replacement confirmation after
    // its original deadline, since that timestamp is not current validity.
    await page.getByTestId('vps.console.new_session').click();
    await expect(page.getByTestId('vps.console.new_session_dialog')).toBeVisible();
    await page.getByTestId('vps.console.new_session_dialog.cancel').click();
    expect(state.deletes).toBe(0);
    await page.getByTestId('vps.console.revoke_session').click();
    await page.getByTestId('vps.console.revoke_session_dialog.confirm').click();
    await expect(frame).toHaveCount(0);
    await page.clock.fastForward(70000);
    expect(state.creates).toBe(1);
    expect(state.deletes).toBe(1);
  });

  for (const denied of [403, 404] as const) {
    test(`${language} authoritative ${denied} removes a revoked or expired console without automatic recreation`, async ({ page }) => {
      const state = await setup(page, language);
      state.status = denied;
      await page.clock.fastForward(16000);
      await expect(page.getByTestId('vps.console.expired')).toBeVisible();
      await expect(page.getByTestId('vps.console.iframe')).toHaveCount(0);
      await page.clock.fastForward(70000);
      expect(state.creates).toBe(1);
      expect(state.deletes).toBe(0);
    });
  }

  test(`${language} fresh expired evidence and explicit recovery never DELETE an already invalid session`, async ({ page }) => {
    const state = await setup(page, language);
    state.expiration = 1;
    await page.clock.fastForward(16000);
    await expect(page.getByTestId('vps.console.expired')).toBeVisible();
    state.token = 'SYNTHETIC_T2';
    state.expiration = await page.evaluate(() => Date.now() + 60000);
    await page.getByTestId('vps.console.expired.new_session').click();
    await expect(page.getByTestId('vps.console.iframe')).toHaveAttribute('src', /SYNTHETIC_T2/);
    expect(state.creates).toBe(2);
    expect(state.deletes).toBe(0);
  });

  test(`${language} a server-side replacement invalidates the cached token without adopting the new secret`, async ({ page }) => {
    const state = await setup(page, language);
    state.token = 'SYNTHETIC_REPLACED_ELSEWHERE';
    await page.clock.fastForward(16000);
    await expect(page.getByTestId('vps.console.expired')).toBeVisible();
    await expect(page.getByTestId('vps.console.iframe')).toHaveCount(0);
    expect(state.creates).toBe(1);
    expect(state.deletes).toBe(0);
  });

  test(`${language} an uncertain validation keeps the terminal and recovery controls without creating tokens`, async ({ page }) => {
    const state = await setup(page, language);
    state.status = 503;
    await page.clock.fastForward(70000);
    await expect(page.getByTestId('vps.console.validation_error')).toBeVisible();
    await expect(page.getByTestId('vps.console.iframe')).toBeVisible();
    await expect(page.getByTestId('vps.console.expired')).toHaveCount(0);
    expect(state.creates).toBe(1);
    expect(state.deletes).toBe(0);
    state.status = 200;
    await page.clock.fastForward(16000);
    await expect(page.getByTestId('vps.console.validation_error')).toHaveCount(0);
  });

  test(`${language} navigation and reload use bounded entry requests without DELETE`, async ({ page }) => {
    const state = await setup(page, language);
    await page.getByTestId('vps.console.header').getByRole('link', { name: /^(Overview|Přehled)$/ }).click();
    await page.getByRole('link', { name: /^(Console|Konzole)$/ }).first().click();
    await expect(page.getByTestId('vps.console.iframe')).toBeVisible();
    expect(state.creates).toBe(1);
    await page.reload();
    await expect(page.getByTestId('vps.console.iframe')).toBeVisible();
    expect(state.creates).toBe(2);
    expect(state.deletes).toBe(0);
  });
}
