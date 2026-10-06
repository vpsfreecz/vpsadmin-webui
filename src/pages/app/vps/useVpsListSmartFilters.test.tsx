import React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVpsListSmartFilters } from './useVpsListSmartFilters';

vi.mock('../../../lib/api/nodes', () => ({ fetchNodes: async () => ({ data: [] }) }));
vi.mock('../../../lib/api/users', () => ({ searchUsers: async () => ({ data: [] }) }));
afterEach(cleanup);

test('lookup drafts survive pagination URL writes but hydrate on external filter navigation', () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const scope = { scope: 'all' as const, canSwitchScope: true };
  const toasts = { toasts: [], pushToast: () => 1, push: () => 1, dismissToast: () => {}, clearToasts: () => {} };
  const { result } = renderHook(
    () => ({
      filters: useVpsListSmartFilters({ basePath: '/admin', mode: 'admin', scope, toasts, t: (key) => key }),
      navigate: useNavigate(),
    }),
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/admin/vps?user=7']}>{children}</MemoryRouter>
        </QueryClientProvider>
      ),
    }
  );
  act(() => result.current.filters.filterProps.setUserId('ali'));
  expect(result.current.filters.filterProps.userId).toBe('ali');
  expect(result.current.filters.searchParams.has('user')).toBe(false);
  act(() => result.current.filters.setSearchParams(new URLSearchParams('page=1&limit=25'), { replace: true }));
  expect(result.current.filters.filterProps.userId).toBe('ali');
  act(() => result.current.navigate('/admin/vps?user=12'));
  expect(result.current.filters.filterProps.userId).toBe('12');
  act(() => result.current.navigate(-1));
  expect(result.current.filters.filterProps.userId).toBe('');
});
