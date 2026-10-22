import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';
import { expectNoDocumentHorizontalOverflow } from '../../helpers/horizontalOverflow';

const prefix = 'admin.user.password';

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile admin password: generate, copy and submit for the selected member (${language})`, async ({ page }, testInfo) => {
    await bootstrapVpsAdminWindow(page);
    await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
        writeText: async (text: string) => { document.documentElement.dataset['copiedTestPassword'] = text; },
      } });
    });
    let user = { id: 42, login: 'alice-demo', level: 2, password_reset: false };
    const writes: Record<string, unknown>[] = [];
    await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
      'GET users/42': () => ({ user }),
      'PUT users/42': ({ reqJson }) => {
        const payload = (reqJson as { user: Record<string, unknown> }).user;
        writes.push(payload);
        user = { ...user, password_reset: Boolean(payload['password_reset']) };
        return { user };
      },
    } });
    await page.goto('/admin/users/42');
    const open = page.getByTestId(`${prefix}.open`);
    const edit = page.getByTestId('admin.user.edit.open');
    expect(await open.evaluate((element) => element.nextElementSibling?.getAttribute('data-testid'))).toBe('admin.user.edit.open');
    await expect(edit).toBeVisible();
    await open.click();
    const dialog = page.getByTestId(`${prefix}.dialog`);
    const password = page.getByTestId(`${prefix}.new`);
    const repeat = page.getByTestId(`${prefix}.repeat`);
    const required = page.getByTestId(`${prefix}.require_change`).getByRole('checkbox');
    await expect(dialog).toContainText('alice-demo');
    await expect(required).toBeChecked();
    await expect(page.getByTestId(`${prefix}.logout_sessions`).getByRole('checkbox')).toBeChecked();
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveAttribute('autocomplete', 'new-password');
    await password.fill('short');
    await repeat.fill('short');
    await expect(page.getByTestId(`${prefix}.save`)).toBeDisabled();
    await password.fill('Manual-test@12');
    await repeat.fill('Mismatch@12');
    await expect(page.getByTestId(`${prefix}.save`)).toBeDisabled();
    await required.uncheck();
    await page.getByTestId(`${prefix}.generate`).click();
    const generated = await password.inputValue();
    expect(generated).toHaveLength(10);
    expect(generated).toMatch(/[a-z]/);
    expect(generated).toMatch(/[A-Z]/);
    expect(generated).toMatch(/[0-9]/);
    expect(generated).toMatch(/[!@#$%&*\-]/);
    await expect(repeat).toHaveValue(generated);
    await expect(required).toBeChecked();
    expect(writes).toEqual([]);
    await page.getByTestId(`${prefix}.copy`).click();
    await expect(page.locator('html')).toHaveAttribute('data-copied-test-password', generated);
    await expectNoDocumentHorizontalOverflow(page);
    if (process.env['E2E_CAPTURE_PASSWORD_SCREENSHOTS'] === '1') {
      await page.screenshot({ path: `/tmp/webui-admin-password-${language}-${testInfo.project.name}.png` });
    }
    await page.getByTestId(`${prefix}.save`).click();
    await expect(dialog).toHaveCount(0);
    expect(writes).toEqual([{ new_password: generated, password_reset: true, logout_sessions: true }]);
    await expect(page.getByTestId('admin.user.status.password_reset')).toHaveAttribute('data-state', 'required');
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(stored).not.toContain(generated);
    await open.click();
    await expect(password).toHaveValue('');
    await expect(repeat).toHaveValue('');
    await page.getByTestId(`${prefix}.cancel`).click();
    expect(writes).toHaveLength(1);
  });
}

test('@pr-smoke @pr-smoke-mobile admin password: failure keeps the draft, does not reflect secrets and allows a manual retry', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  const writes: Record<string, unknown>[] = [];
  const secret = 'Synthetic-test@12';
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/42': () => ({ user: { id: 42, login: 'alice-demo', level: 2 } }),
    'PUT users/42': ({ reqJson }) => {
      writes.push((reqJson as { user: Record<string, unknown> }).user);
      if (writes.length === 1) return { status: false, message: secret, errors: { new_password: [secret] } };
      return { user: { id: 42, login: 'alice-demo', level: 2 } };
    },
  } });
  await page.goto('/admin/users/42');
  await page.getByTestId(`${prefix}.open`).click();
  await page.getByTestId(`${prefix}.new`).fill(secret);
  await page.getByTestId(`${prefix}.repeat`).fill(secret);
  await page.getByTestId(`${prefix}.require_change`).getByRole('checkbox').uncheck();
  await page.getByTestId(`${prefix}.logout_sessions`).getByRole('checkbox').uncheck();
  await page.getByTestId(`${prefix}.save`).click();
  await expect(page.getByTestId(`${prefix}.error`)).toBeVisible();
  await expect(page.getByTestId(`${prefix}.error`)).not.toContainText(secret);
  await expect(page.getByTestId(`${prefix}.new`)).toHaveValue(secret);
  expect(writes).toHaveLength(1);
  await page.getByTestId(`${prefix}.save`).click();
  await expect(page.getByTestId(`${prefix}.dialog`)).toHaveCount(0);
  expect(writes).toEqual([
    { new_password: secret, password_reset: false, logout_sessions: false },
    { new_password: secret, password_reset: false, logout_sessions: false },
  ]);
});

test('@pr-smoke @pr-smoke-mobile admin password: generation requires Web Crypto and cancel clears secrets', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/42': () => ({ user: { id: 42, login: 'alice-demo', level: 2 } }),
  } });
  await page.goto('/admin/users/42');
  await page.getByTestId(`${prefix}.open`).click();
  await page.evaluate(() => { Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value: () => { throw new Error('Fixture crypto unavailable'); } }); });
  await page.getByTestId(`${prefix}.generate`).click();
  await expect(page.getByTestId(`${prefix}.generate_error`)).toBeVisible();
  await expect(page.getByTestId(`${prefix}.new`)).toHaveValue('');
  await expect(page.getByTestId(`${prefix}.save`)).toBeDisabled();
  await page.getByTestId(`${prefix}.new`).fill('Temporary-test@12');
  await page.getByTestId(`${prefix}.repeat`).fill('Temporary-test@12');
  await page.getByTestId(`${prefix}.cancel`).click();
  await page.getByTestId(`${prefix}.open`).click();
  await expect(page.getByTestId(`${prefix}.new`)).toHaveValue('');
  await expect(page.getByTestId(`${prefix}.repeat`)).toHaveValue('');
});

for (const [level, path] of [[21, '/admin/users/42'], [2, '/app/profile'], [99, '/app/profile']] as const) {
  test(`admin password: no shortcut for level ${level} at ${path}`, async ({ page }) => {
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, { user: { id: 1, login: 'viewer', level }, handlers: {
      'GET users/42': () => ({ user: { id: 42, login: 'alice-demo', level: 2 } }),
    } });
    await page.goto(path);
    await expect(page.getByTestId('shell.user-menu-button')).toBeVisible();
    await expect(page.getByTestId(`${prefix}.open`)).toHaveCount(0);
  });
}

test('@pr-smoke @pr-smoke-mobile admin password: pending submission is single and stays bound to its original member', async ({ page }) => {
  await bootstrapVpsAdminWindow(page);
  let release: (() => void) | undefined;
  const writes: string[] = [];
  await installHaveApiMock(page, { user: { id: 1, login: 'admin', level: 99 }, handlers: {
    'GET users/42': () => ({ user: { id: 42, login: 'alice-demo', level: 2 } }),
    'GET users/43': () => ({ user: { id: 43, login: 'bob-demo', level: 2 } }),
    'PUT users/42': async () => {
      writes.push('42');
      await new Promise<void>((resolve) => { release = resolve; });
      return { user: { id: 42, login: 'alice-demo', level: 2, password_reset: true } };
    },
    'PUT users/43': () => { writes.push('43'); return { user: { id: 43, login: 'bob-demo', level: 2 } }; },
  } });
  await page.goto('/admin/users/42');
  await page.getByTestId(`${prefix}.open`).click();
  await page.getByTestId(`${prefix}.generate`).click();
  await page.getByTestId(`${prefix}.save`).click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.getByTestId(`${prefix}.save`)).toBeDisabled();
  await expect(page.getByTestId(`${prefix}.new`)).toBeDisabled();
  await expect(page.getByTestId(`${prefix}.repeat`)).toBeDisabled();
  await expect(page.getByTestId(`${prefix}.generate`)).toBeDisabled();
  await expect(page.getByTestId(`${prefix}.cancel`)).toBeDisabled();
  await page.getByTestId(`${prefix}.save`).evaluate((element) => { (element as HTMLButtonElement).click(); });
  expect(writes).toEqual(['42']);
  await page.evaluate(() => {
    history.pushState({}, '', '/admin/users/43');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByTestId('admin.user.header')).toContainText('bob-demo');
  await expect(page.getByTestId(`${prefix}.dialog`)).toHaveCount(0);
  await page.getByTestId(`${prefix}.open`).click();
  await expect(page.getByTestId(`${prefix}.new`)).toHaveValue('');
  await expect(page.getByTestId(`${prefix}.repeat`)).toHaveValue('');
  await page.getByTestId(`${prefix}.new`).fill('Bob-draft@123');
  release?.();
  await expect(page.getByTestId('toast.viewport')).toContainText('alice-demo');
  await expect(page.getByTestId(`${prefix}.dialog`)).toBeVisible();
  await expect(page.getByTestId(`${prefix}.new`)).toHaveValue('Bob-draft@123');
  expect(writes).toEqual(['42']);
});
