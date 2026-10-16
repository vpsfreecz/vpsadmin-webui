import { expect, test, type Page } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

async function setup(page: Page, language: 'cs' | 'en', level = 99, mode = 'app') {
  await bootstrapVpsAdminWindow(page);
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let adminSearches = 0;
  const mock = await installHaveApiMock(page, {
    user: { id: 42, login: 'search-review', level },
    handlers: {
      'GET vpses': ({ searchParams }) => ({ vpses: searchParams.get('vps[hostname_any]') === 'imgtpx.cz' ? [{ id: 123, hostname: 'imgtpx.cz', user: { id: 42 } }] : [] }),
      'GET dns_zones': () => ({ dns_zones: [] }),
      'GET ip_addresses': () => ({ ip_addresses: [] }),
      'POST cluster/search': () => {
        adminSearches++;
        return { cluster_search: [] };
      },
    },
  });
  await page.goto(`/${mode}/profile`);
  return { adminSearches: () => adminSearches, mock };
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
    const { adminSearches } = await setup(page, language);
    const input = await searchInput(page, isMobile);
    await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
    await input.fill('1234');
    const reminder = page.getByTestId('search.scope-reminder');
    await expect(reminder).toContainText(language === 'cs' ? 'Jsi v uživatelském pohledu' : 'You are in My view');
    await expect(page.getByTestId(isMobile ? 'palette.no_results' : 'shell.inline-search.status')).toContainText(
      language === 'cs' ? 'Žádné výsledky' : 'No results'
    );
    expect(adminSearches()).toBe(0);
    expect((await reminder.boundingBox())!.height).toBeLessThanOrEqual(isMobile ? 72 : 60);
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
  const { adminSearches } = await setup(page, 'en', 1);
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
  const { adminSearches } = await setup(page, 'en', 21);
  const input = await searchInput(page, isMobile);
  await input.fill('member-name');
  await expect(page.getByTestId('search.scope-reminder')).toBeVisible();
  expect(adminSearches()).toBe(0);
  await input.fill('');
  await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
  await input.fill('?');
  await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
});

test('@pr-smoke @pr-smoke-mobile owned hostname results hide the reminder and open on one tap', async ({ page, isMobile }, testInfo) => {
  const { adminSearches } = await setup(page, 'en');
  const input = await searchInput(page, isMobile);
  await input.fill('missing');
  await expect(page.getByTestId('search.scope-reminder')).toBeVisible();
  await input.fill('imgtpx.cz');
  const result = page.getByTestId(isMobile ? 'palette.result.0' : 'shell.inline-search.result.0');
  await expect(result).toContainText('imgtpx.cz');
  await expect(page.getByTestId('search.scope-reminder')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('owned-result.png'), fullPage: false });
  if (isMobile) await result.tap();
  else await result.click();
  await expect(page).toHaveURL(/\/app\/vps\/123$/);
  expect(adminSearches()).toBe(0);
});

test('@pr-smoke @pr-smoke-mobile reminder waits for the current query and stays hidden on errors', async ({ page, isMobile }) => {
  const { mock, adminSearches } = await setup(page, 'en');
  const input = await searchInput(page, isMobile);
  const reminder = page.getByTestId('search.scope-reminder');
  await input.fill('missing-first');
  await expect(reminder).toBeVisible();

  let releaseResponse!: () => void;
  const responseGate = new Promise<void>((resolve) => { releaseResponse = resolve; });
  let requested = false;
  mock.addHandler('GET vpses', async () => {
    requested = true;
    await responseGate;
    return { vpses: [] };
  });
  await input.fill('missing-second');
  try {
    await expect(reminder).toHaveCount(0);
    await expect.poll(() => requested).toBe(true);
    await expect(page.getByTestId(isMobile ? 'palette.loading' : 'shell.inline-search.status')).toContainText(/searching/i);
    await expect(reminder).toHaveCount(0);
  } finally {
    releaseResponse();
  }
  await expect(reminder).toBeVisible();

  mock.addHandler('GET vpses', () => ({ status: false, message: 'Synthetic search failure', response: null }));
  await input.fill('unavailable');
  await expect(page.getByTestId(isMobile ? 'palette.error' : 'shell.inline-search.status')).toContainText('Synthetic search failure');
  await expect(reminder).toHaveCount(0);
  expect(adminSearches()).toBe(0);
});
