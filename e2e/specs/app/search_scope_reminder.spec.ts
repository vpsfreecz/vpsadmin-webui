import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function setup(page: Page, language: 'cs' | 'en', level = 99, mode = 'app') {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let adminSearches = 0;
  await installHaveApiMock(page, {
    user: { id: 42, login: 'search-review', level },
    handlers: {
      'GET vpses': ({ searchParams }) => ({ vpses: searchParams.get('vps[hostname_any]') === 'owned' ? [{ id: 123, hostname: 'owned.example', user: { id: 42 } }] : [] }),
      'GET dns_zones': () => ({ dns_zones: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'POST cluster/search': () => {
        adminSearches++;
        return { cluster_search: [] };
      },
    },
  });
  await page.goto(`/${mode}/profile`);
  return () => adminSearches;
}

async function searchInput(page: Page, mobile: boolean) {
  if (mobile) await page.getByTestId('palette.open').tap();
  return page.getByTestId(mobile ? 'palette.input' : 'shell.inline-search.input');
}

for (const language of ['cs', 'en'] as const) {
  test(`@pr-smoke @pr-smoke-mobile My view search explains scope and switches explicitly (${language})`, async ({
    page,
    isMobile,
  }, testInfo) => {
    const adminSearches = await setup(page, language);
    const input = await searchInput(page, isMobile);
    await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
    await input.fill('1234');
    const reminder = page.getByTestId('search.scope-reminder');
    await expect(reminder).toContainText(language === 'cs' ? 'Jsi v uživatelském pohledu' : 'You are in My view');
    await expect(page.getByTestId(isMobile ? 'palette.no_results' : 'shell.inline-search.status')).toContainText(
      language === 'cs' ? 'Žádné výsledky' : 'No results'
    );
    expect(adminSearches()).toBe(0);
    await input.press('Enter');
    await expect(page).toHaveURL(/\/app\/profile$/);
    await page.screenshot({ path: testInfo.outputPath(`scope-${language}.png`), fullPage: false });
    const switchButton = page.getByTestId('search.scope-reminder.switch');
    if (isMobile) await switchButton.tap();
    else {
      await input.press('Tab');
      await expect(switchButton).toBeFocused();
      await page.waitForTimeout(180); // Exceed the previous blur-dismiss timer.
      await switchButton.press('Escape');
      await expect(input).toBeFocused();
      await expect(reminder).toHaveCount(0);
      await input.press('ArrowDown');
      await input.press('Tab');
      await switchButton.press('Enter');
    }
    await expect(page).toHaveURL(/\/admin\/profile$/);
    await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
    if (isMobile) await expect(page.getByTestId('palette.input')).toHaveValue('1234');
    else await page.getByTestId('shell.inline-search.input').fill('1234');
    await expect.poll(adminSearches).toBeGreaterThan(0);
    await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
  });
}

test('@pr-smoke @pr-smoke-mobile ordinary members do not get an administrative prompt', async ({ page, isMobile }) => {
  const adminSearches = await setup(page, 'en', 1);
  const input = await searchInput(page, isMobile);
  await input.fill('1234');
  await expect(page.getByTestId(isMobile ? 'palette.no_results' : 'shell.inline-search.status')).toContainText(
    'No results'
  );
  await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
  expect(adminSearches()).toBe(0);
});

test('@pr-smoke @pr-smoke-mobile support sees the reminder for names too; clearing hides it', async ({
  page,
  isMobile,
}) => {
  const adminSearches = await setup(page, 'en', 21);
  const input = await searchInput(page, isMobile);
  await input.fill('member-name');
  await expect(page.getByTestId('search.scope-reminder')).toBeVisible();
  expect(adminSearches()).toBe(0);
  await input.fill('');
  await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
  await input.fill('?');
  await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
});


test('@pr-smoke @pr-smoke-mobile the reminder does not block opening an owned result', async ({ page, isMobile }) => {
  const adminSearches = await setup(page, 'en');
  const input = await searchInput(page, isMobile);
  await input.fill('owned');
  const result = page.getByTestId(isMobile ? 'palette.result.0' : 'shell.inline-search.result.0');
  await expect(result).toContainText('owned.example');
  await expect(page.getByTestId('search.scope-reminder')).toBeVisible();
  if (isMobile) await result.tap();
  else await result.click();
  await expect(page).toHaveURL(/\/app\/vps\/123$/);
  expect(adminSearches()).toBe(0);
});
