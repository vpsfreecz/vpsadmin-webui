// i18n-ignore-file

import React, { useEffect, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  status: 'authenticated' as string,
}));

const settingsApi = vi.hoisted(() => ({ fetch: vi.fn(), save: vi.fn() }));

vi.mock('./auth', () => ({ useAuth: () => ({ status: authState.status }) }));
vi.mock('../lib/api/webuiUserSettings', () => ({
  fetchWebuiUserSetting: settingsApi.fetch,
  saveWebuiUserSetting: settingsApi.save,
}));

import { getRuntimeConfig } from './config';
import { ThemeProvider, useTheme } from './theme';
import { completeOAuth2Login } from '../lib/auth/oauth2Client';
import { UiSettingsProvider, useUiSettings } from './uiSettings';
import { HELP_PLACEMENT_STORAGE_KEY, DEFAULT_SETTINGS, STORAGE_KEY, toUiSettingsJson } from './uiSettingsModel';

function serverWindowConfig() {
  window.vpsAdmin = {
    api: {
      url: 'https://api.example.test',
      version: '7.0',
    },
    sessionToken: 'session-token',
    description: {
      authentication: {
        token: {
          http_header: 'X-Auth',
        },
      },
      meta: {
        namespace: '_meta',
      },
    },
    webuiNext: {
      uiSettings: {
        persistence: 'server',
        server: {
          path: '/webui_user_settings',
          namespace: 'ui_setting',
          field: 'settings',
        },
      },
    },
  } as any;
}

function Probe() {
  const ui = useUiSettings();

  return (
    <div>
      <div data-testid="help-placement">{ui.helpPlacement}</div>
      <button type="button" onClick={() => ui.setHelpPlacement('bottom')}>
        bottom help
      </button>
      <div data-testid="theme">{ui.settings.theme}</div>
      <div data-testid="tip">{ui.settings.tips.sidebarTimeZone}</div>
      <div data-testid="status">{ui.sync.status}</div>
      <div data-testid="load-error">{ui.sync.lastLoadError || ''}</div>
      <div data-testid="save-error">{ui.sync.lastSaveError || ''}</div>
      <button type="button" onClick={() => ui.setTheme('dark')}>
        dark
      </button>
      <button type="button" onClick={() => ui.setSidebarTimeZoneTipState('dismissed')}>
        dismiss tip
      </button>
      <button type="button" onClick={() => ui.resetPreferences()}>
        reset keep tips
      </button>
      <button type="button" onClick={() => ui.resetPreferences({ includeTips: true })}>
        reset tips
      </button>
      <button type="button" onClick={() => ui.retryLoad()}>
        retry
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <UiSettingsProvider>
      <Probe />
    </UiSettingsProvider>
  );
}

beforeEach(() => {
  authState.status = 'authenticated';
  settingsApi.fetch.mockReset();
  settingsApi.save.mockReset();
  window.localStorage.clear();
  document.cookie = 'vpsadmin_oauth_theme=; Path=/; Max-Age=0';
  serverWindowConfig();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
  window.sessionStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  window.localStorage.clear();
  window.vpsAdmin = undefined;
});

function waitForDebounce() {
  return act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 550));
  });
}

describe('UiSettingsProvider', () => {
  it('persists help placement locally across remount and server loads without API writes', async () => {
    settingsApi.fetch.mockResolvedValue(toUiSettingsJson(DEFAULT_SETTINGS));
    settingsApi.save.mockResolvedValue(undefined);
    const first = renderProvider();
    await waitForDebounce();
    fireEvent.click(screen.getByText('bottom help'));
    await waitForDebounce();
    expect(screen.getByTestId('help-placement')).toHaveTextContent('bottom');
    expect(window.localStorage.getItem(HELP_PLACEMENT_STORAGE_KEY)).toBe('bottom');
    first.unmount();
    renderProvider();
    await waitForDebounce();
    expect(screen.getByTestId('help-placement')).toHaveTextContent('bottom');
    expect(settingsApi.save).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByText('reset keep tips'));
    });
    expect(screen.getByTestId('help-placement')).toHaveTextContent('top');
    expect(settingsApi.save).toHaveBeenCalledOnce();
    expect(settingsApi.save.mock.calls[0]?.[2]).not.toHaveProperty('helpPlacement');
  });

  it('defaults to top for unknown stored help positions', async () => {
    window.localStorage.setItem(HELP_PLACEMENT_STORAGE_KEY, 'hidden');
    settingsApi.fetch.mockResolvedValue(toUiSettingsJson(DEFAULT_SETTINGS));
    settingsApi.save.mockResolvedValue(undefined);
    renderProvider();
    await waitForDebounce();
    expect(screen.getByTestId('help-placement')).toHaveTextContent('top');
  });

  it('keeps local settings available when server load fails', async () => {
    window.localStorage.setItem(STORAGE_KEY, toUiSettingsJson({ ...DEFAULT_SETTINGS, theme: 'dark' }));
    settingsApi.fetch.mockRejectedValueOnce(new Error('load failed'));
    renderProvider();
    expect(await screen.findByTestId('theme')).toHaveTextContent('dark');
    await waitFor(() => expect(screen.getByTestId('load-error')).toHaveTextContent('load failed'));
    expect(settingsApi.fetch).toHaveBeenCalledWith('ui_setting', 'settings', { signal: expect.any(AbortSignal) });
  });

  it('keeps changed settings visible when a debounced server save fails', async () => {
    settingsApi.fetch.mockResolvedValueOnce(toUiSettingsJson(DEFAULT_SETTINGS));
    settingsApi.save.mockRejectedValueOnce(new Error('save failed'));
    renderProvider();
    await waitFor(() => expect(settingsApi.fetch).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
    fireEvent.click(screen.getByText('dark'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    await waitForDebounce();
    await waitFor(() => expect(screen.getByTestId('save-error')).toHaveTextContent('save failed'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('resets preferences and preserves dismissed tips unless included', async () => {
    settingsApi.fetch.mockResolvedValue(toUiSettingsJson({
      ...DEFAULT_SETTINGS, theme: 'dark', tips: { sidebarTimeZone: 'dismissed' },
    }));
    settingsApi.save.mockResolvedValue(undefined);
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('dark'));
    expect(screen.getByTestId('tip')).toHaveTextContent('dismissed');
    await act(async () => { fireEvent.click(screen.getByText('reset keep tips')); });
    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('system'));
    expect(screen.getByTestId('tip')).toHaveTextContent('dismissed');
    expect(settingsApi.save).toHaveBeenCalledWith('ui_setting', 'settings', {
      ...DEFAULT_SETTINGS, tips: { sidebarTimeZone: 'dismissed' },
    });
    await act(async () => { fireEvent.click(screen.getByText('reset tips')); });
    await waitFor(() => expect(screen.getByTestId('tip')).toHaveTextContent('visible'));
  });

  it('does not re-show the time zone tip after persisted dismissal and avoids duplicate rerender calls', async () => {
    settingsApi.fetch.mockResolvedValueOnce(toUiSettingsJson(DEFAULT_SETTINGS));
    settingsApi.save.mockResolvedValue(undefined);
    const { rerender } = render(<UiSettingsProvider><Probe /></UiSettingsProvider>);
    await waitFor(() => expect(settingsApi.fetch).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
    fireEvent.click(screen.getByText('dismiss tip'));
    await waitForDebounce();
    await waitFor(() => expect(screen.getByTestId('tip')).toHaveTextContent('dismissed'));
    rerender(<UiSettingsProvider><Probe /></UiSettingsProvider>);
    await waitForDebounce();
    expect(screen.getByTestId('tip')).toHaveTextContent('dismissed');
    expect(settingsApi.save).toHaveBeenCalledOnce();
  });

  it('does not call the settings API for authenticated public pages', async () => {
    render(<UiSettingsProvider serverSyncEnabled={false}><Probe /></UiSettingsProvider>);
    await waitForDebounce();
    expect(settingsApi.fetch).not.toHaveBeenCalled();
    expect(settingsApi.save).not.toHaveBeenCalled();
  });
});


it('aborts expired-session reads and ignores late account preferences with stale auth context', async () => {
  localStorage.setItem('vpsadmin.uiSettings.v1', JSON.stringify({ theme: 'light', language: 'en' }));
  let complete!: (value: unknown) => void;
  settingsApi.fetch.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  renderProvider();
  await waitFor(() => expect(settingsApi.fetch).toHaveBeenCalledOnce());
  const options = settingsApi.fetch.mock.calls[0]![2] as { signal: AbortSignal };
  act(() => { window.dispatchEvent(new Event('webui-next:session-expired')); });
  await act(async () => { complete(toUiSettingsJson({ ...DEFAULT_SETTINGS, theme: 'dark', language: 'cs' })); });
  expect(screen.getByTestId('theme')).toHaveTextContent('light');
  expect(options?.signal.aborted).toBe(true);
  expect(screen.getByTestId('status')).toHaveTextContent('idle');
  expect(screen.getByTestId('load-error')).toHaveTextContent('');
  fireEvent.click(screen.getByRole('button', { name: 'retry' }));
  await act(async () => {});
  expect(settingsApi.fetch).toHaveBeenCalledOnce();
});


it('does not migrate unchanged device preferences when the account record is missing', async () => {
  settingsApi.fetch.mockResolvedValue(undefined);
  settingsApi.save.mockResolvedValue(undefined);
  renderProvider();
  await waitFor(() => expect(settingsApi.fetch).toHaveBeenCalledOnce());
  await waitForDebounce();
  expect(settingsApi.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('dark'));
  await waitForDebounce();
  expect(settingsApi.save).toHaveBeenCalledOnce();
});

it('cancels queued saves and blocks later effects after session expiry with stale auth', async () => {
  settingsApi.fetch.mockResolvedValue(toUiSettingsJson(DEFAULT_SETTINGS));
  settingsApi.save.mockResolvedValue(undefined);
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
  await waitForDebounce();
  fireEvent.click(screen.getByText('dark'));
  act(() => { window.dispatchEvent(new Event('webui-next:session-expired')); });
  fireEvent.click(screen.getByText('dismiss tip'));
  await waitForDebounce();
  expect(settingsApi.save).not.toHaveBeenCalled();
});

it('merges a login theme once without overwriting other account preferences', async () => {
  document.cookie = 'vpsadmin_oauth_theme=dark.light; Path=/';
  const saved = { ...DEFAULT_SETTINGS, theme: 'light' as const, language: 'cs' as const, tips: { sidebarTimeZone: 'dismissed' as const } };
  settingsApi.fetch.mockResolvedValue(toUiSettingsJson(saved));
  settingsApi.save.mockResolvedValue(undefined);
  renderProvider();
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
  await waitForDebounce();
  expect(settingsApi.save).toHaveBeenCalledExactlyOnceWith('ui_setting', 'settings', { ...saved, theme: 'dark' });
  expect(screen.getByTestId('tip')).toHaveTextContent('dismissed');
  expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
  await waitForDebounce();
  expect(settingsApi.save).toHaveBeenCalledOnce();
});

it.each(['light.light', 'dark.dark', 'auto.auto', 'malformed'])('does not create a missing record for unchanged login %s', async (payload) => {
  document.cookie = `vpsadmin_oauth_theme=${payload}; Path=/`;
  settingsApi.fetch.mockResolvedValue(undefined);
  const denied = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
  try {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
    await waitForDebounce();
    expect(settingsApi.save).not.toHaveBeenCalled();
  } finally { denied.mockRestore(); }
});

it('creates a missing record for an actual OAuth change even with denied localStorage', async () => {
  document.cookie = 'vpsadmin_oauth_theme=dark.light; Path=/';
  settingsApi.fetch.mockResolvedValue(undefined);
  settingsApi.save.mockResolvedValue(undefined);
  const denied = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
  try {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
    await waitForDebounce();
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(settingsApi.save).toHaveBeenCalledExactlyOnceWith('ui_setting', 'settings', { ...DEFAULT_SETTINGS, theme: 'dark' });
  } finally { denied.mockRestore(); }
});

it('retains a pending automatic preference through a failed settings load and retry', async () => {
  document.cookie = 'vpsadmin_oauth_theme=auto.dark; Path=/';
  settingsApi.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(toUiSettingsJson({ ...DEFAULT_SETTINGS, theme: 'dark', language: 'cs' }));
  settingsApi.save.mockResolvedValue(undefined);
  renderProvider();
  await waitFor(() => expect(screen.getByTestId('load-error')).toHaveTextContent('offline'));
  expect(screen.getByTestId('theme')).toHaveTextContent('system');
  fireEvent.click(screen.getByText('retry'));
  await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
  await waitForDebounce();
  expect(settingsApi.save).toHaveBeenCalledExactlyOnceWith('ui_setting', 'settings', { ...DEFAULT_SETTINGS, theme: 'system', language: 'cs' });
});

it('keeps a handoff in memory under StrictMode with local persistence only', () => {
  document.cookie = 'vpsadmin_oauth_theme=dark.auto; Path=/';
  render(<React.StrictMode><UiSettingsProvider serverSyncEnabled={false}><Probe /></UiSettingsProvider></React.StrictMode>);
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  expect(settingsApi.fetch).not.toHaveBeenCalled();
  expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
});


const LEGACY_STATE_KEY = 'vpsadmin_ui_next.oauth2.login_state';

function ThemeProbe() {
  const theme = useTheme();
  return <><Probe /><span data-testid="effective-theme">{theme.effective}</span></>;
}

function LegacyExchangeProbe() {
  const [phase, setPhase] = useState('pending');
  useEffect(() => {
    completeOAuth2Login(getRuntimeConfig(), window.location.href)
      .then(() => setPhase('complete'), () => setPhase('failed'));
  }, []);
  return <span data-testid="legacy-exchange">{phase}</span>;
}

function denyStorageAndSetSystemTheme(system: 'light' | 'dark') {
  vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
  let matches = system === 'dark';
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return matches; },
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  })));
  return (next: 'light' | 'dark') => { matches = next === 'dark'; listeners.forEach((listener) => listener()); };
}

function saveLegacyState(theme: string) {
  window.sessionStorage.setItem(LEGACY_STATE_KEY, JSON.stringify({
    createdAt: Date.now(), state: 'pending-state', codeVerifier: 'verifier',
    nextPath: '/app', flow: 'pkce', theme, themeReturn: true,
  }));
}

it.each(['light', 'dark'] as const)('keeps initiating %s through React mount and deferred legacy exchange with denied storage', async (theme) => {
  const opposite = theme === 'dark' ? 'light' : 'dark';
  denyStorageAndSetSystemTheme(opposite);
  window.history.replaceState({}, '', `/oauth/callback?code=code&state=pending-state&theme=${opposite}`);
  saveLegacyState(theme);
  document.documentElement.setAttribute('data-theme', theme); // Head bootstrap's initial paint.
  let failExchange!: (error: Error) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((_resolve, reject) => { failExchange = reject; })));
  render(<UiSettingsProvider serverSyncEnabled={false}><ThemeProvider><ThemeProbe /><LegacyExchangeProbe /></ThemeProvider></UiSettingsProvider>);
  expect(screen.getByTestId('legacy-exchange')).toHaveTextContent('pending');
  expect(screen.getByTestId('theme')).toHaveTextContent(theme);
  expect(screen.getByTestId('effective-theme')).toHaveTextContent(theme);
  expect(document.documentElement).toHaveAttribute('data-theme', theme);
  await act(async () => { failExchange(new Error('token exchange failed')); });
  expect(screen.getByTestId('legacy-exchange')).toHaveTextContent('failed');
  expect(document.documentElement).toHaveAttribute('data-theme', theme);
  expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
});

it.each(['light', 'dark', 'auto'] as const)('keeps direct basename login %s through the real theme provider', (theme) => {
  const opposite = theme === 'dark' ? 'light' : 'dark';
  const changeSystem = denyStorageAndSetSystemTheme(opposite);
  window.vpsAdmin!.webuiNext!.basePath = '/ui-next';
  window.history.replaceState({}, '', `/ui-next/oauth/login?theme=${theme}`);
  render(<UiSettingsProvider serverSyncEnabled={false}><ThemeProvider><ThemeProbe /></ThemeProvider></UiSettingsProvider>);
  expect(screen.getByTestId('theme')).toHaveTextContent(theme === 'auto' ? 'system' : theme);
  expect(screen.getByTestId('effective-theme')).toHaveTextContent(theme === 'auto' ? opposite : theme);
  if (theme === 'auto') {
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    act(() => changeSystem('light'));
    expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');
  } else expect(document.documentElement).toHaveAttribute('data-theme', theme);
});

it.each([
  ['/oauth/callback?theme=dark', undefined],
  ['/oauth/callback?theme=dark', 'invalid'],
  ['/other?theme=dark', 'dark'],
  ['/oauth/login?theme=dark&theme=light', undefined],
])('ignores unvalidated or unrelated preference at %s with pending %s', (path, pending) => {
  denyStorageAndSetSystemTheme('light');
  window.history.replaceState({}, '', path!);
  if (pending) saveLegacyState(pending);
  render(<UiSettingsProvider serverSyncEnabled={false}><ThemeProvider><ThemeProbe /></ThemeProvider></UiSettingsProvider>);
  expect(screen.getByTestId('theme')).toHaveTextContent('system');
  expect(document.documentElement).not.toHaveAttribute('data-theme');
});
