// i18n-ignore-file

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  status: 'authenticated' as string,
}));

const haveApiCallMock = vi.hoisted(() => vi.fn());

vi.mock('./auth', () => ({
  useAuth: () => ({
    status: authState.status,
  }),
}));

vi.mock('../lib/api/haveapi', () => {
  class HaveApiError extends Error {}

  return {
    HaveApiError,
    haveApiCall: haveApiCallMock,
  };
});

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
  haveApiCallMock.mockReset();
  window.localStorage.clear();
  serverWindowConfig();
});

afterEach(() => {
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
    haveApiCallMock.mockResolvedValue({ data: { value: toUiSettingsJson(DEFAULT_SETTINGS) } });
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
    expect(haveApiCallMock.mock.calls.every(([opts]) => opts.method === 'GET')).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByText('reset keep tips'));
    });
    expect(screen.getByTestId('help-placement')).toHaveTextContent('top');
    const writes = haveApiCallMock.mock.calls.filter(([opts]) => opts.method === 'PUT');
    expect(writes).toHaveLength(1);
    expect(JSON.parse(writes[0]?.[0].params.value)).not.toHaveProperty('helpPlacement');
  });

  it('defaults to top for unknown stored help positions', async () => {
    window.localStorage.setItem(HELP_PLACEMENT_STORAGE_KEY, 'hidden');
    haveApiCallMock.mockResolvedValue({ data: { value: toUiSettingsJson(DEFAULT_SETTINGS) } });
    renderProvider();
    await waitForDebounce();
    expect(screen.getByTestId('help-placement')).toHaveTextContent('top');
  });

  it('keeps local settings available when server load fails', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      toUiSettingsJson({
        ...DEFAULT_SETTINGS,
        theme: 'dark',
      })
    );
    haveApiCallMock.mockRejectedValueOnce(new Error('load failed'));

    renderProvider();

    expect(await screen.findByTestId('theme')).toHaveTextContent('dark');
    await waitFor(() => expect(screen.getByTestId('load-error')).toHaveTextContent('load failed'));
    expect(haveApiCallMock).toHaveBeenCalledWith({
      method: 'GET',
      path: '/webui_user_settings',
      namespace: 'webui_user_setting',
      params: {
        namespace: 'ui_setting',
        key: 'settings',
      },
    });
  });

  it('keeps changed settings visible when a debounced server save fails', async () => {
    haveApiCallMock
      .mockResolvedValueOnce({
        data: {
          namespace: 'ui_setting',
          key: 'settings',
          value: toUiSettingsJson(DEFAULT_SETTINGS),
        },
      })
      .mockRejectedValueOnce(new Error('save failed'));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('idle'));
    fireEvent.click(screen.getByText('dark'));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');

    await waitForDebounce();

    await waitFor(() => expect(screen.getByTestId('save-error')).toHaveTextContent('save failed'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('resets preferences and preserves dismissed tips unless included', async () => {
    haveApiCallMock.mockResolvedValue({
      data: {
        namespace: 'ui_setting',
        key: 'settings',
        value: toUiSettingsJson({
          ...DEFAULT_SETTINGS,
          theme: 'dark',
          tips: {
            sidebarTimeZone: 'dismissed',
          },
        }),
      },
    });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('dark'));
    expect(screen.getByTestId('tip')).toHaveTextContent('dismissed');

    await act(async () => {
      fireEvent.click(screen.getByText('reset keep tips'));
    });

    await waitFor(() => expect(screen.getByTestId('theme')).toHaveTextContent('system'));
    expect(screen.getByTestId('tip')).toHaveTextContent('dismissed');

    expect(haveApiCallMock).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/webui_user_settings/ui_setting/settings',
      namespace: 'webui_user_setting',
      params: {
        value: toUiSettingsJson({
          ...DEFAULT_SETTINGS,
          tips: {
            sidebarTimeZone: 'dismissed',
          },
        }),
      },
    });

    await act(async () => {
      fireEvent.click(screen.getByText('reset tips'));
    });

    await waitFor(() => expect(screen.getByTestId('tip')).toHaveTextContent('visible'));
  });

  it('does not re-show the time zone tip after persisted dismissal and avoids duplicate rerender calls', async () => {
    haveApiCallMock
      .mockResolvedValueOnce({
        data: {
          namespace: 'ui_setting',
          key: 'settings',
          value: toUiSettingsJson(DEFAULT_SETTINGS),
        },
      })
      .mockResolvedValue(undefined);

    const { rerender } = render(
      <UiSettingsProvider>
        <Probe />
      </UiSettingsProvider>
    );

    await waitFor(() => expect(screen.getByTestId('tip')).toHaveTextContent('visible'));
    fireEvent.click(screen.getByText('dismiss tip'));

    await waitForDebounce();

    await waitFor(() => expect(screen.getByTestId('tip')).toHaveTextContent('dismissed'));

    rerender(
      <UiSettingsProvider>
        <Probe />
      </UiSettingsProvider>
    );

    await waitForDebounce();

    expect(screen.getByTestId('tip')).toHaveTextContent('dismissed');
    const putCalls = haveApiCallMock.mock.calls.filter(([opts]) => opts.method === 'PUT');
    expect(putCalls).toHaveLength(1);
  });

  it('does not call the settings API for authenticated public pages', async () => {
    authState.status = 'authenticated';
    serverWindowConfig();

    render(
      <UiSettingsProvider serverSyncEnabled={false}>
        <Probe />
      </UiSettingsProvider>
    );

    await waitForDebounce();

    expect(haveApiCallMock).not.toHaveBeenCalled();
  });
});
