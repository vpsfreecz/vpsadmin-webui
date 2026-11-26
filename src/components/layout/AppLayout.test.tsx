// i18n-ignore-file
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModeProvider } from '../../app/appMode';
import { I18nProvider } from '../../app/i18n';
import { ThemeProvider, useTheme } from '../../app/theme';
import { ToastsProvider } from '../../app/toasts';
import { UiSettingsProvider } from '../../app/uiSettings';
import { AppLayout } from './AppLayout';
import { installSerialWebLocks } from './webLocksTestMock';

vi.mock('../../app/auth', () => ({
  useAuth: () => ({
    status: 'authenticated',
    role: 'user',
    canUseAdminUi: false,
    user: { id: 42, login: 'fixture-user', time_zone: 'Europe/Prague' },
  }),
}));
vi.mock('../../app/objectScope', () => ({
  useObjectScope: () => ({ mineUserId: 42 }),
}));
vi.mock('../../lib/api/actionStates', () => ({ fetchActionStates: async () => ({ data: [] }) }));
vi.mock('../../lib/api/transactions', () => ({
  fetchTransactionChains: async () => ({ data: [] }),
  fetchTransactionChain: vi.fn(),
}));
vi.mock('../../lib/api/helpBoxes', () => ({ fetchContextualHelpBoxes: async () => ({ data: [] }) }));

function ThemeProbe() {
  const theme = useTheme();
  return (
    <output data-testid="returned-theme">
      {theme.preference}/{theme.effective}
    </output>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.cookie = 'vpsadmin_oauth_theme=light.dark; Path=/; Max-Age=120';
  installSerialWebLocks();
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      matches: media === '(prefers-color-scheme: dark)',
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'locks');
  document.cookie = 'vpsadmin_oauth_theme=; Path=/; Max-Age=0';
  document.documentElement.removeAttribute('data-theme');
});

describe('AppLayout optional local storage', () => {
  it.each(['getter', 'removeItem'] as const)(
    'renders the authenticated shell and returned theme with a denied localStorage %s',
    (deniedAccess) => {
      if (deniedAccess === 'getter') {
        vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
          throw new DOMException('storage unavailable', 'SecurityError');
        });
      } else {
        const removeItem = Storage.prototype.removeItem;
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key) {
          if (this === window.localStorage) throw new DOMException('storage unavailable', 'SecurityError');
          removeItem.call(this, key);
        });
      }
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const view = render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/app']}>
            <AppModeProvider mode="user">
              <UiSettingsProvider serverSyncEnabled={false}>
                <ThemeProvider>
                  <I18nProvider>
                    <ToastsProvider>
                      <AppLayout>
                        <ThemeProbe />
                      </AppLayout>
                    </ToastsProvider>
                  </I18nProvider>
                </ThemeProvider>
              </UiSettingsProvider>
            </AppModeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(screen.getByTestId('shell.user-menu-button')).toBeVisible();
      expect(screen.getByTestId('returned-theme')).toHaveTextContent('light/light');
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      expect(document.cookie).not.toContain('vpsadmin_oauth_theme=');
      view.unmount();
      client.clear();
    }
  );
});
