import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HaveApiError } from '../lib/api/apiErrors';
import { AuthProvider, useAuth } from './auth';

const state = vi.hoisted(() => ({ error: undefined as unknown }));
const client = vi.hoisted(() => ({ clear: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ error: state.error, isError: Boolean(state.error), isLoading: false, data: undefined }),
  useQueryClient: () => client,
}));
vi.mock('./config', () => ({
  getRuntimeConfig: () => ({
    auth: { kind: 'oauth2', accessToken: 'fixture-token' },
    oauth2: { storage: 'session' },
    routerBasename: '',
    loginUrl: '/oauth/login',
    logoutUrl: '/oauth/logout',
  }),
}));
vi.mock('./runtimeMode', () => ({ selectedRuntimeMode: () => 'bff' }));
vi.mock('../lib/auth/useIdleSession', () => ({ useIdleSession: () => undefined }));
vi.mock('../lib/browserNavigation', () => ({ hardReplace: vi.fn() }));
function Probe() {
  return (
    <a data-testid="login" href={useAuth().loginUrl}>
      Sign in
    </a>
  );
}
function loginUrl() {
  render(
    <AuthProvider nextPath="/admin/users" redirectExpiredSessions={false}>
      <Probe />
    </AuthProvider>
  );
  return new URL(screen.getByTestId('login').getAttribute('href')!);
}
beforeEach(() => {
  state.error = undefined;
  window.vpsAdmin = undefined;
});
describe('BFF login links', () => {
  it('allows the BFF to reuse an existing session for ordinary sign-in', () => {
    const url = loginUrl();
    expect(url.searchParams.get('next')).toBe('/admin/users');
    expect(url.searchParams.has('reauth')).toBe(false);
  });
  it('requests fresh authentication after the API rejects the current credential', () => {
    state.error = new HaveApiError({ status: false, message: 'Unauthorized' }, 'Rejected', 401);
    const url = loginUrl();
    expect(url.pathname).toBe('/oauth/login');
    expect(url.searchParams.get('reauth')).toBe('1');
    expect(url.searchParams.get('next')).toBe('/admin/users');
  });
  it('retains fresh authentication after the rejected query is cleared', () => {
    state.error = new HaveApiError({ status: false, message: 'Unauthorized' }, 'Rejected', 401);
    const view = render(
      <AuthProvider nextPath="/admin/users" redirectExpiredSessions={false}>
        <Probe />
      </AuthProvider>
    );
    state.error = undefined;
    view.rerender(
      <AuthProvider nextPath="/admin/users" redirectExpiredSessions={false}>
        <Probe />
      </AuthProvider>
    );
    expect(new URL(screen.getByTestId('login').getAttribute('href')!).searchParams.get('reauth')).toBe('1');
  });

  it('does not turn an ordinary server failure into forced authentication', () => {
    state.error = new HaveApiError({ status: false, message: 'Unavailable' }, 'Unavailable', 503);
    expect(loginUrl().searchParams.has('reauth')).toBe(false);
  });
});
