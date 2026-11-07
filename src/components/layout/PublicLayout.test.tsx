import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  status: 'anonymous',
}));

const uiSettingsState = vi.hoisted(() => ({
  language: 'system' as 'system' | 'en' | 'cs',
  setLanguage: vi.fn(),
  theme: 'system' as 'system' | 'light' | 'dark',
  setTheme: vi.fn(),
}));

vi.mock('../../app/config', () => ({
  getRuntimeConfig: () => ({
    routerBasename: '',
    loginUrl: undefined,
    passwordRecoveryUrl: '/oauth2/password-reset?client_id=webui.test',
  }),
}));

vi.mock('../../app/auth', () => ({
  useAuth: () => ({
    status: authState.status,
  }),
}));

vi.mock('../../app/i18n', () => ({
  useI18n: () => ({
    lang: 'cs',
    t: (key: string) => key,
  }),
}));

vi.mock('../../app/uiSettings', () => ({
  useUiSettings: () => ({
    settings: { language: uiSettingsState.language, theme: uiSettingsState.theme },
    setTheme: uiSettingsState.setTheme,
    setLanguage: uiSettingsState.setLanguage,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>;
}

import { PublicLayout } from './PublicLayout';

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <LocationProbe />
              <PublicLayout />
            </>
          }
        >
          <Route index element={<div data-testid="public.index" />} />
          <Route path="outages" element={<div data-testid="public.outages" />} />
          <Route path="security-advisories" element={<div data-testid="public.security" />} />
          <Route path="outages/:outageId" element={<div data-testid="public.outage-detail" />} />
          <Route path="security-advisories/:advisoryId" element={<div data-testid="public.advisory-detail" />} />
          <Route path="about" element={<div data-testid="public.about" />} />
        </Route>
        <Route path="/app" element={<div data-testid="app.index" />} />
        <Route path="/app/*" element={<><LocationProbe /><div data-testid="app.status" /></>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PublicLayout', () => {
  beforeEach(() => {
    authState.status = 'anonymous';
    uiSettingsState.language = 'system';
    uiSettingsState.setLanguage.mockClear();
    uiSettingsState.theme = 'system';
    uiSettingsState.setTheme.mockClear();
  });

  it('keeps the public index visible for anonymous visitors', () => {
    renderAt('/');

    expect(screen.getByTestId('public.index')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    expect(screen.getByTestId('public.skip-link')).toHaveAttribute('href', '#main-content');
    expect(screen.getByTestId('public.main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByTestId('public.main')).toHaveAttribute('tabindex', '-1');
  });

  it('redirects authenticated visitors from the public index back to the app', async () => {
    authState.status = 'authenticated';

    renderAt('/');

    await waitFor(() => expect(screen.getByTestId('app.index')).toBeVisible());
  });

  it.each(['/outages', '/outages/42', '/security-advisories', '/security-advisories/17'])(
    'opens authenticated status URL %s inside the application and keeps query/hash', async (path) => {
      authState.status = 'authenticated';
      renderAt(`${path}?source=shared#details`);
      await waitFor(() => expect(screen.getByTestId('app.status')).toBeVisible());
      expect(screen.getByTestId('location')).toHaveTextContent(`/app${path}?source=shared#details`);
      expect(screen.queryByTestId('public.main')).not.toBeInTheDocument();
    },
  );

  it.each(['/outages', '/outages/42', '/security-advisories', '/security-advisories/17'])(
    'keeps anonymous status URL %s available without login', (path) => {
      renderAt(path);
      expect(screen.getByTestId('public.main')).toBeVisible();
      expect(screen.getByTestId('location')).toHaveTextContent(path);
    },
  );

  it('shows security advisories in the public nav instead of news', () => {
    renderAt('/');

    expect(screen.getAllByText('public.nav.security_advisories')).toHaveLength(1);
    expect(screen.queryByText('public.nav.news')).not.toBeInTheDocument();
  });

  it('allows anonymous visitors to change UI language', () => {
    renderAt('/');

    fireEvent.click(screen.getByTestId('public.language.cs'));

    expect(uiSettingsState.setLanguage).toHaveBeenCalledWith('cs');
  });

  it('offers all anonymous theme choices with an accessible selected state', () => {
    renderAt('/');
    for (const choice of ['light', 'dark', 'system']) {
      fireEvent.click(screen.getByTestId(`public.theme.desktop.${choice}`));
      expect(uiSettingsState.setTheme).toHaveBeenLastCalledWith(choice);
    }
    expect(screen.getByTestId('public.theme.desktop.system')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'public.menu.open' }));
    fireEvent.click(screen.getByTestId('public.theme.mobile.light'));
    expect(uiSettingsState.setTheme).toHaveBeenLastCalledWith('light');
  });

  it('keeps sign-in as the public entry point without a password recovery shortcut', () => {
    renderAt('/');

    expect(screen.queryByRole('link', { name: 'auth.action.reset_password' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'public.primary.log_in' })).toHaveAttribute(
      'href', `${window.location.origin}/oauth/login?next=%2Fapp`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'public.menu.open' }));
    expect(screen.queryByRole('link', { name: 'auth.action.reset_password' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'public.primary.log_in' })).toHaveLength(2);
  });

  it('hides password recovery from authenticated visitors', () => {
    authState.status = 'authenticated';

    renderAt('/about');

    expect(screen.queryByTestId('public.password-recovery.desktop')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'public.menu.open' }));
    expect(screen.queryByTestId('public.password-recovery.mobile')).not.toBeInTheDocument();
  });

  it('does not redirect the expired-session public notice URL', () => {
    authState.status = 'authenticated';

    renderAt('/?session=expired');

    expect(screen.getByTestId('public.index')).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent('/?session=expired');
  });
});
