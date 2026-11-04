import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { bootstrapVpsAdminWindow, installHaveApiMock, setUiSettingsLocalStorage } from '../../fixtures';

type HeaderSink = { setHeader: (name: string, value: string) => void };
type PasskeyDestinations = { origin: string; action: string; returnUrl: string };
const require = createRequire(import.meta.url);
const recovery = require('../../../bff/oauth-error-page.js') as {
  renderOAuthErrorPage: (language: string) => string;
  setOAuthRecoverySecurityHeaders: (response: HeaderSink) => void;
};
const passkey = require('../../../bff/passkey-page.js') as {
  passkeyDestinations: (authorizeUrl: string, redirectUri: string) => PasskeyDestinations;
  renderPasskeyPage: (language: string, token: string, destinations: PasskeyDestinations) => string;
  setPasskeyHeaders: (response: HeaderSink, origin: string) => void;
};

for (const language of ['cs', 'en'] as const) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`fulfilled production BFF recovery and passkey ${language} ${colorScheme}`, async ({ page }, testInfo) => {
      testInfo.annotations.push({
        type: 'evidence',
        description: 'Fulfilled production renderer HTML; no running BFF or OAuth exchange.',
      });
      await page.emulateMedia({ colorScheme });
      const headers: Record<string, string> = {};
      const sink: HeaderSink = {
        setHeader: (name, value) => {
          headers[name] = value;
        },
      };
      recovery.setOAuthRecoverySecurityHeaders(sink);
      await page.route('**/__content-fixture/oauth-error', (route) =>
        route.fulfill({
          status: 400,
          contentType: 'text/html',
          headers,
          body: recovery.renderOAuthErrorPage(language),
        })
      );
      await page.goto('/__content-fixture/oauth-error');
      await expect(
        page.getByRole('heading', { name: language === 'cs' ? 'Přihlášení se nezdařilo' : 'Sign-in failed' })
      ).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(
        page.getByRole('link', { name: language === 'cs' ? 'Přihlásit znovu' : 'Sign in again' })
      ).toHaveAttribute('href', '/oauth/login?next=%2Fapp');
      await expect(
        page.getByRole('link', { name: language === 'cs' ? 'Přejít na stav služeb' : 'Go to service status' })
      ).toHaveAttribute('href', '/');
      await page.screenshot({ path: testInfo.outputPath('bff-oauth-error.png'), fullPage: true, scale: 'css' });

      const destinations = passkey.passkeyDestinations(
        'https://auth.fixture.test/oauth2/authorize',
        'https://webui.fixture.test/oauth/callback'
      );
      passkey.setPasskeyHeaders(sink, destinations.origin);
      await page.route('**/__content-fixture/passkey', (route) =>
        route.fulfill({
          contentType: 'text/html',
          headers,
          body: passkey.renderPasskeyPage(language, 'SYNTHETIC_PASSKEY_TOKEN', destinations),
        })
      );
      await page.route('https://auth.fixture.test/**', (route) => route.fulfill({ status: 204, body: '' }));
      await page.goto('/__content-fixture/passkey');
      await expect(
        page.getByRole('heading', { name: language === 'cs' ? 'Přidat bezpečnostní klíč' : 'Add a security key' })
      ).toBeVisible();
      await expect(page.locator('main')).toContainText(
        language === 'cs' ? 'Registrační stránka je v angličtině.' : 'The registration page is in English.'
      );
      await expect(page.locator('form')).toHaveAttribute('action', destinations.action);
      await expect(page.locator('input[name="redirect_uri"]')).toHaveValue(
        'https://webui.fixture.test/app/profile/mfa'
      );
      await expect(page.getByRole('link', { name: language === 'cs' ? 'Zrušit' : 'Cancel' })).toHaveAttribute(
        'href',
        '/app/profile/mfa'
      );
      await page.screenshot({ path: testInfo.outputPath('bff-passkey.png'), fullPage: true, scale: 'css' });
      const posted = page.waitForRequest(
        (request) => request.url() === destinations.action && request.method() === 'POST'
      );
      await page.getByTestId('passkey.continue').click();
      const request = await posted;
      const form = new URLSearchParams(request.postData() ?? '');
      expect(form.get('access_token')).toBe('SYNTHETIC_PASSKEY_TOKEN');
      expect(form.get('redirect_uri')).toBe(destinations.returnUrl);
    });
  }

  test(`isolated production bootstrap failure ${language}`, async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'evidence',
      description: 'Isolated exported production component through Vite; not required-runtime integration.',
    });
    await page.route('**/__content-fixture/bootstrap', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="${language}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/src/styles/index.css"></head><body><div id="root"></div></body></html>`,
      })
    );
    await page.goto('/__content-fixture/bootstrap');
    await page.evaluate(async () => {
      const moduleUrl = '/src/app/bootstrapFailure.ts';
      const { renderBootstrapFailure } = await import(moduleUrl);
      renderBootstrapFailure(new Error('SYNTHETIC_PRIVATE_DETAIL'), document, () => {
        document.documentElement.dataset['retried'] = 'true';
      });
    });
    await expect(
      page.getByRole('heading', { name: language === 'cs' ? 'Aplikaci se nepodařilo spustit' : 'App failed to start' })
    ).toBeVisible();
    await expect(page.locator('details')).not.toHaveAttribute('open', '');
    await expect(page.locator('pre')).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('bootstrap-closed.png'), fullPage: true, scale: 'css' });
    await page.locator('summary').click();
    await expect(page.locator('pre')).toHaveText('app_start_failed');
    await expect(page.locator('body')).not.toContainText('SYNTHETIC_PRIVATE_DETAIL');
    await page.screenshot({ path: testInfo.outputPath('bootstrap-details.png'), fullPage: true, scale: 'css' });
    const retry = page.getByRole('button', { name: language === 'cs' ? 'Zkusit znovu' : 'Retry', exact: true });
    await retry.click();
    await expect(retry).toBeDisabled();
    await expect(page.locator('html')).toHaveAttribute('data-retried', 'true');
    await page.evaluate(async () => {
      const moduleUrl = '/src/app/bootstrapFailure.ts';
      const { renderBootstrapFailure } = await import(moduleUrl);
      renderBootstrapFailure(new Error('SYNTHETIC_PRIVATE_DETAIL'));
    });
    const reload = page.getByRole('button', { name: language === 'cs' ? 'Znovu načíst' : 'Reload', exact: true });
    await expect(reload).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('bootstrap-reload.png'), fullPage: true, scale: 'css' });
  });

  test(`actual React OAuth controlled failures ${language}`, async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'evidence',
      description: 'Actual mounted React routes with invalid local configuration/storage; no provider requests.',
    });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    await bootstrapVpsAdminWindow(page, {
      webuiNext: {
        oauth2: {
          authorizeUrl: 'invalid-relative-url',
          tokenUrl: 'https://auth.fixture.test/token',
          clientId: 'fixture',
          flow: 'pkce',
        },
      },
    });
    await installHaveApiMock(page, { user: { id: 10, login: 'auth-review', level: 99 } });
    const providerRequests: string[] = [];
    await page.route('https://auth.fixture.test/**', (route) => {
      providerRequests.push(route.request().url());
      return route.abort();
    });
    await page.addInitScript(() => {
      if (location.pathname === '/oauth/logout')
        Object.defineProperty(window, 'sessionStorage', {
          configurable: true,
          get() {
            throw new Error('Synthetic storage unavailable');
          },
        });
    });
    for (const [path, testId, title] of [
      [
        '/oauth/login',
        'oauth.login.page',
        language === 'cs' ? 'Přesměrování na přihlášení selhalo' : 'Sign-in redirect failed',
      ],
      ['/oauth/callback', 'oauth.callback.page', language === 'cs' ? 'Přihlášení selhalo' : 'Sign-in failed'],
      ['/oauth/logout', 'oauth.logout.page', language === 'cs' ? 'Odhlášení selhalo' : 'Sign out failed'],
    ] as const) {
      await page.goto(path);
      const view = page.getByTestId(testId);
      await expect(view.getByText(title, { exact: true }).filter({ visible: true })).toBeVisible();
      await expect(view.getByRole('link').last()).toHaveAttribute('href', '/');
      await page.screenshot({ path: testInfo.outputPath(`${testId}.png`), fullPage: true, scale: 'css' });
    }
    expect(providerRequests).toEqual([]);
  });

  test(`actual not-found and forbidden routes ${language}`, async ({ page }, testInfo) => {
    testInfo.annotations.push({
      type: 'evidence',
      description: 'Actual public/app/admin wildcard and My-view node denial integration.',
    });
    await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
    await bootstrapVpsAdminWindow(page);
    await installHaveApiMock(page, { user: { id: 10, login: 'route-review', level: 99 } });
    for (const prefix of ['', '/app', '/admin']) {
      const path = `${prefix}/content-fixture-missing`;
      await page.goto(path);
      const view = page.getByTestId('notfound.page');
      await expect(view).toContainText(path);
      await expect(view.locator('a[href="/"]')).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`not-found-${prefix.slice(1) || 'public'}.png`),
        fullPage: true,
        scale: 'css',
      });
    }
    await page.goto('/app/nodes/5');
    await expect(page.getByTestId('forbidden.page')).toBeVisible();
    await expect(page.getByTestId('forbidden.page')).toContainText('/app/nodes/5');
    await expect(page.getByTestId('node.history.page')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('my-node-forbidden.png'), fullPage: true, scale: 'css' });
  });
}

test('residual OAuth progress and navigation', async ({ page }, testInfo) => {
  testInfo.annotations.push({
    type: 'evidence',
    description:
      'Actual legacy React routes/native PKCE; intercepted .test navigation and synthetic token response, not a provider/BFF integration.',
  });
  await setUiSettingsLocalStorage(page, { language: 'en', theme: 'light' });
  await bootstrapVpsAdminWindow(page, {
    sessionToken: '',
    webuiNext: {
      oauth2: {
        authorizeUrl: 'https://auth.shared7.test/authorize',
        tokenUrl: 'https://auth.shared7.test/token',
        clientId: 'shared7-fixture',
        flow: 'pkce',
        storage: 'session',
      },
    },
  });
  await installHaveApiMock(page, {
    user: { id: 1, login: 'shared7-review', level: 1 },
    handlers: { 'GET help_boxes': () => ({ help_boxes: [] }) },
  });
  await page.addInitScript(() => {
    const nativeDigest = crypto.subtle.digest.bind(crypto.subtle);
    let release = () => {};
    const pending: Promise<ArrayBuffer>[] = [];
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    window.addEventListener(
      'shared7-release-digest',
      (event) => {
        release();
        void Promise.all(pending).then(() => (event as CustomEvent<() => void>).detail());
      },
      { once: true }
    );
    Object.defineProperty(crypto.subtle, 'digest', {
      configurable: true,
      value: (algorithm: AlgorithmIdentifier, data: BufferSource) => {
        const result = (async () => {
          if (location.pathname === '/oauth/login') await held;
          return nativeDigest(algorithm, data);
        })();
        pending.push(result);
        return result;
      },
    });
  });
  let releaseToken = () => {};
  const heldToken = new Promise<void>((resolve) => {
    releaseToken = resolve;
  });
  const authorizations: string[] = [];
  let exchanges = 0;
  await page.route('https://auth.shared7.test/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/authorize') {
      authorizations.push(route.request().url());
      return route.fulfill({ status: 204, body: '' });
    }
    if (new URL(route.request().url()).pathname === '/token') {
      exchanges++;
      await heldToken;
      return route.fulfill({
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          access_token: 'SYNTHETIC_SHARED7_ACCESS_TOKEN',
          token_type: 'Bearer',
          expires_in: 3600,
        }),
      });
    }
    return route.abort();
  });
  await page.goto('/oauth/login?next=%2Fabout%3Fshared7%3Dreturn');
  await expect(
    page.getByTestId('oauth.login.page').getByText('Redirecting to sign-in…', { exact: true }).filter({ visible: true })
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('oauth-login-progress.png'), scale: 'css' });
  // Vite DEV StrictMode can restart effects; retain the last native login state.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        window.dispatchEvent(new CustomEvent('shared7-release-digest', { detail: resolve }))
      )
  );
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('vpsadmin_ui_next.oauth2.login_state')))
    .not.toBeNull();
  const stored = await page.evaluate(
    () =>
      JSON.parse(sessionStorage.getItem('vpsadmin_ui_next.oauth2.login_state') ?? 'null') as {
        state: string;
        codeVerifier: string;
        nextPath: string;
      }
  );
  await expect
    .poll(() => authorizations.some((url) => new URL(url).searchParams.get('state') === stored.state))
    .toBe(true);
  const destination = new URL(authorizations.find((url) => new URL(url).searchParams.get('state') === stored.state)!);
  expect(stored.nextPath).toBe('/about?shared7=return');
  expect(destination.searchParams.get('state')).toBe(stored.state);
  expect(destination.searchParams.get('response_type')).toBe('code');
  expect(destination.searchParams.get('client_id')).toBe('shared7-fixture');
  expect(destination.searchParams.get('redirect_uri')).toBe(new URL('/oauth/callback', page.url()).href);
  expect(destination.searchParams.get('code_challenge_method')).toBe('S256');
  expect(destination.searchParams.get('code_challenge')).toBe(
    createHash('sha256').update(stored.codeVerifier).digest('base64url')
  );
  const exchange = page.waitForRequest(
    (request) => request.url() === 'https://auth.shared7.test/token' && request.method() === 'POST'
  );
  await page.goto(`/oauth/callback?code=SYNTHETIC_SHARED7_CODE&state=${encodeURIComponent(stored.state)}`);
  const tokenRequest = await exchange;
  const form = new URLSearchParams(tokenRequest.postData() ?? '');
  expect(form.get('code')).toBe('SYNTHETIC_SHARED7_CODE');
  expect(form.get('code_verifier')).toBe(stored.codeVerifier);
  expect(form.get('grant_type')).toBe('authorization_code');
  expect(form.get('client_id')).toBe('shared7-fixture');
  expect(form.get('redirect_uri')).toBe(new URL('/oauth/callback', page.url()).href);
  try {
    await expect(
      page.getByTestId('oauth.callback.page').getByText('Finishing sign-in…', { exact: true }).filter({ visible: true })
    ).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('oauth-callback-progress.png'), scale: 'css' });
  } finally {
    releaseToken();
  }
  await expect(page).toHaveURL(/\/about\?shared7=return$/);
  expect(
    await page.evaluate(() => JSON.parse(sessionStorage.getItem('vpsadmin_ui_next.oauth2') ?? 'null')?.accessToken)
  ).toBe('SYNTHETIC_SHARED7_ACCESS_TOKEN');
  expect(await page.evaluate(() => sessionStorage.getItem('vpsadmin_ui_next.oauth2.login_state'))).toBeNull();
  await page.goto('/oauth/logout');
  await expect(page).toHaveURL(new URL('/', page.url()).href);
  expect(await page.evaluate(() => sessionStorage.getItem('vpsadmin_ui_next.oauth2'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('vpsadmin.ui.impersonation'))).toBeNull();
  await testInfo.attach('native-oauth-request-counts', {
    body: JSON.stringify({ authorizations: authorizations.length, exchanges }),
    contentType: 'application/json',
  });
});

test('residual lazy route recovery', async ({ page }, testInfo) => {
  const language = testInfo.project.name === 'mobile-chrome' ? 'cs' : 'en';
  testInfo.annotations.push({
    type: 'evidence',
    description:
      'Actual Vite About lazy import, Suspense and nearest nested ErrorPage/reload. RootErrorPage is not reached or certified.',
  });
  await setUiSettingsLocalStorage(page, { language, theme: language === 'cs' ? 'dark' : 'light' });
  await bootstrapVpsAdminWindow(page);
  await installHaveApiMock(page, { handlers: { 'GET help_boxes': () => ({ help_boxes: [] }) } });
  let releaseModule = () => {};
  const heldModule = new Promise<void>((resolve) => {
    releaseModule = resolve;
  });
  let rejectModule = true;
  let moduleReads = 0;
  await page.route('**/src/pages/public/AboutPage.tsx*', async (route) => {
    moduleReads++;
    await heldModule;
    return rejectModule ? route.abort('failed') : route.continue();
  });
  await page.goto('/about');
  await expect(page.getByTestId('route.loading.AboutPage')).toBeVisible();
  await expect(page.getByTestId('route.loading.AboutPage')).toContainText(language === 'cs' ? 'Načítání…' : 'Loading…');
  await page.screenshot({ path: testInfo.outputPath('lazy-route-loading.png'), scale: 'css' });
  releaseModule();
  const failure = page.getByTestId('error.page');
  await expect(failure).toBeVisible();
  await expect(failure.getByTestId('error.state.retry')).toHaveText(language === 'cs' ? 'Zkusit znovu' : 'Retry');
  await expect(page.getByTestId('root.error.page')).toHaveCount(0);
  const details = page.getByTestId('error.state.details');
  await expect(details).not.toHaveAttribute('open', '');
  await expect(failure.getByTestId('error.state.status')).toHaveAttribute('href', '/');
  await page.screenshot({ path: testInfo.outputPath('lazy-route-error-closed.png'), scale: 'css' });
  await details.locator('summary').click();
  await expect(details.locator('pre')).toContainText('The application was updated while this tab was open.');
  await page.screenshot({ path: testInfo.outputPath('lazy-route-error-details.png'), scale: 'css' });
  rejectModule = false;
  await failure.getByTestId('error.state.retry').click();
  await expect(page.getByTestId('about.page')).toBeVisible();
  await expect(failure).toHaveCount(0);
  expect(moduleReads).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: testInfo.outputPath('lazy-route-recovered.png'), scale: 'css' });
});
