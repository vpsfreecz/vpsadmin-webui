import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { IncidentsPage } from './IncidentsPage';

const router = vi.hoisted(() => ({
  search: 'codename=preserved&limit=25&page=1&unrelated=keep',
  setSearchParams: vi.fn(),
}));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  // Deliberately hold router publication after local filters have applied.
  useSearchParams: () => [new URLSearchParams(router.search), router.setSearchParams],
}));
vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ basePath: '/admin', mode: 'admin' }) }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../../../app/objectScope', () => ({ useObjectScope: () => ({ mineUserId: undefined }) }));
vi.mock('../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key, lang: 'en' }) }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => ({
    data:
      queryKey[0] === 'incident_reports'
        ? Array.from({ length: 25 }, (_, index) => ({ id: 125 - index, codename: 'abuse' }))
        : [],
    isLoading: false,
    isError: false,
  }),
}));

beforeEach(() => {
  window.sessionStorage.clear();
  router.search = 'codename=preserved&limit=25&page=1&unrelated=keep';
  router.setSearchParams.mockClear();
});
afterEach(cleanup);

const filters = {
  vps: '7',
  user: '42',
  filed_by: '1',
  ip_addr: '203.0.113.10',
  ip_address_assignment: '55',
  codename: 'abuse',
  mailbox: '9',
};

test.each(['next', 'limit'] as const)(
  'incident %s retains applied filters before the router publishes',
  async (action) => {
    render(
      <MemoryRouter>
        <IncidentsPage />
      </MemoryRouter>
    );
    const input = screen.getByTestId('incidents.smart_filter.input');
    fireEvent.change(input, {
      target: { value: 'vps:7 user:42 filed_by:1 ip:203.0.113.10 assignment:55 codename:abuse mailbox:9' },
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' });
    });
    expect(screen.getByTestId('incidents.chip.codename')).toHaveTextContent('abuse');
    // This is the stale committed URL, not a wait until navigation settles.
    expect(new URLSearchParams(router.search).get('codename')).toBe('preserved');
    router.setSearchParams.mockClear();
    if (action === 'next') {
      fireEvent.click(screen.getByTestId('incidents.list.pagination.next'));
    } else {
      fireEvent.change(screen.getByTestId('incidents.list.pagination.limit'), { target: { value: '50' } });
    }
    const destination = router.setSearchParams.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(destination).toBeInstanceOf(URLSearchParams);
    for (const [key, value] of Object.entries(filters)) expect(destination.get(key), key).toBe(value);
    expect(destination.get('unrelated')).toBe('keep');
    expect(destination.get('page')).toBe(action === 'next' ? '2' : '1');
    expect(destination.get('from_id')).toBe(action === 'next' ? '101' : null);
    expect(destination.get('limit')).toBe(action === 'next' ? '25' : '50');
  }
);
