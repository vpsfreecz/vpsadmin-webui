import { beforeEach, afterEach, describe, expect, test, vi } from 'vitest';

import type { RuntimeConfig } from '../../app/config';
import { readStoredOAuthToken } from './tokenStore';
import { completeOAuth2Login, startOAuth2Login } from './oauth2Client';

const LOGIN_STATE_KEY = 'vpsadmin_ui_next.oauth2.login_state';

function createRuntimeConfig(): RuntimeConfig {
  return {
    apiUrl: 'https://api.example.test',
    apiVersion: '7.0',
    apiBaseUrl: 'https://api.example.test/v7.0',
    routerBasename: '',
    auth: { kind: 'none' },
    oauth2: {
      authorizeUrl: 'https://auth.example.test/oauth2/authorize',
      tokenUrl: 'https://auth.example.test/oauth2/token',
      clientId: 'ui-next-test',
      scope: 'all',
      redirectPath: '/oauth/callback',
      type: 'web_server',
      flow: 'implicit',
      storage: 'session',
    },
    publicStatus: { ipv4Warn: 128, ipv4Critical: 32 },
    uiSettings: {
      persistence: 'local',
      server: { path: '/webui_user_settings', namespace: 'general', field: 'settings' },
    },
    haveApi: {},
  };
}

function writeLoginState(overrides: Record<string, unknown> = {}): void {
  window.sessionStorage.setItem(
    LOGIN_STATE_KEY,
    JSON.stringify({
      createdAt: Date.now(),
      state: 'state-1',
      nextPath: '/app/profile',
      flow: 'implicit',
      ...overrides,
    })
  );
}

describe('oauth2Client security hardening', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  test('accepts implicit-flow state from the callback hash and stores the token', async () => {
    writeLoginState();

    await expect(
      completeOAuth2Login(
        createRuntimeConfig(),
        `${window.location.origin}/oauth/callback#access_token=TOKEN&token_type=Bearer&state=state-1`
      )
    ).resolves.toEqual({ nextPath: '/app/profile' });

    expect(readStoredOAuthToken('session')).toMatchObject({ accessToken: 'TOKEN', tokenType: 'Bearer' });
    expect(window.sessionStorage.getItem(LOGIN_STATE_KEY)).toBeNull();
  });

  test('rejects stale OAuth2 login state before accepting a callback', async () => {
    writeLoginState({ createdAt: Date.now() - 11 * 60 * 1000 });

    await expect(
      completeOAuth2Login(
        createRuntimeConfig(),
        `${window.location.origin}/oauth/callback#access_token=TOKEN&state=state-1`
      )
    ).rejects.toThrow('OAuth2 state mismatch');

    expect(readStoredOAuthToken('session')).toBeNull();
    expect(window.sessionStorage.getItem(LOGIN_STATE_KEY)).toBeNull();
  });

  test('sanitizes a stored next path before redirecting after login', async () => {
    writeLoginState({ nextPath: 'https://evil.example/phish' });

    await expect(
      completeOAuth2Login(
        createRuntimeConfig(),
        `${window.location.origin}/oauth/callback#access_token=TOKEN&state=state-1`
      )
    ).resolves.toEqual({ nextPath: '/app' });
  });
});

describe('OAuth theme validation boundary', () => {
  test.each(['dark', 'auto', 'unknown', 'dark&theme=light'])('uses bounded returned %s only on valid success', async (returned) => {
    writeLoginState({ theme: 'light', themeReturn: true });
    await completeOAuth2Login(createRuntimeConfig(), `${window.location.origin}/oauth/callback#access_token=TOKEN&state=state-1&theme=${returned}`);
    const expected = returned === 'dark' ? 'dark' : returned === 'auto' ? 'auto' : 'light';
    expect(document.cookie).toContain(`vpsadmin_oauth_theme=${expected}.light`);
    document.cookie = 'vpsadmin_oauth_theme=; Path=/; Max-Age=0';
  });

  test('does not trust a callback theme for an old pending transaction', async () => {
    writeLoginState();
    await completeOAuth2Login(createRuntimeConfig(), `${window.location.origin}/oauth/callback#access_token=TOKEN&state=state-1&theme=dark`);
    expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
  });

  test('does not accept response theme on denied or invalid-state callbacks', async () => {
    for (const callback of ['?error=access_denied&theme=dark', '#access_token=TOKEN&state=wrong&theme=dark']) {
      writeLoginState({ theme: 'light', themeReturn: true });
      await expect(completeOAuth2Login(createRuntimeConfig(), `${window.location.origin}/oauth/callback${callback}`)).rejects.toThrow();
      expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
    }
  });
});


afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

test('direct/new-tab login carries its initiating preference and an independent opt-in', async () => {
  const assign = vi.fn();
  vi.stubGlobal('window', { location: { origin: window.location.origin, assign }, sessionStorage: window.sessionStorage });
  await startOAuth2Login(createRuntimeConfig(), '/app/profile', 'system');
  const url = new URL(assign.mock.calls[0]![0]);
  expect(url.searchParams.get('theme')).toBe('auto');
  expect(url.searchParams.get('theme_return')).toBe('1');
  const state = JSON.parse(window.sessionStorage.getItem(LOGIN_STATE_KEY)!);
  expect(state.theme).toBe('system');
  expect(state.themeReturn).toBe(true);
  expect(url.searchParams.get('state')).toBe(state.state);
});

test('sessionStorage denial remains fail-closed despite optional theme persistence', async () => {
  const assign = vi.fn();
  const fakeWindow = Object.defineProperty({ location: { origin: window.location.origin, assign } }, 'sessionStorage', { get() { throw new Error('denied'); } });
  vi.stubGlobal('window', fakeWindow);
  await expect(startOAuth2Login(createRuntimeConfig(), '/app', 'dark')).rejects.toThrow('session storage');
  expect(assign).not.toHaveBeenCalled();
});

test('failed PKCE exchange consumes state and never accepts response theme', async () => {
  const cfg = createRuntimeConfig();
  cfg.oauth2.flow = 'pkce';
  writeLoginState({ flow: 'pkce', codeVerifier: 'verifier', theme: 'light', themeReturn: true });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'unavailable' }) }));
  await expect(completeOAuth2Login(cfg, `${window.location.origin}/oauth/callback?code=code&state=state-1&theme=dark`)).rejects.toThrow('unavailable');
  expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
  expect(window.sessionStorage.getItem(LOGIN_STATE_KEY)).toBeNull();
});
