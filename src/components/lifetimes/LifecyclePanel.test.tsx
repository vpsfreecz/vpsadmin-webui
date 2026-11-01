import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fetchUserStateLogs, fetchVpsStateLogs } from '../../lib/api/lifetimes';
import { LifecyclePanel } from './LifecyclePanel';

const scope = vi.hoisted(() => ({ userId: 1, role: 'admin', mode: 'admin' }));
vi.mock('../../app/auth', () => ({ useAuth: () => ({ role: scope.role, user: { id: scope.userId } }) }));
vi.mock('../../app/appMode', () => ({ useAppMode: () => ({ mode: scope.mode }) }));
vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string, vars?: Record<string, unknown>) => `${key}${vars?.['limit'] ?? ''}` }) }));
vi.mock('../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../layout/ChromeContext', () => ({ useChrome: () => ({}) }));
vi.mock('../../lib/api/lifetimes', () => ({ fetchVpsStateLogs: vi.fn(), fetchUserStateLogs: vi.fn() }));

function panel(kind: 'vps' | 'user', id: number) {
  return <LifecyclePanel kind={kind} id={id} objectLabel={`#${id}`} objectState="active" />;
}

describe('bounded initial lifetime history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scope.userId = 1; scope.role = 'admin'; scope.mode = 'admin';
    const result = { data: Array.from({ length: 51 }, (_, i) => ({ id: i + 1, reason: `reason-${i + 1}`, changed_at: '2026-01-01T00:00:00Z' })), meta: {}, httpStatus: 200, envelope: { status: true } };
    vi.mocked(fetchVpsStateLogs).mockResolvedValue(result);
    vi.mocked(fetchUserStateLogs).mockResolvedValue(result);
  });

  test.each(['vps', 'user'] as const)('shows only the initial %s prefix with no continuation request', async kind => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}>{panel(kind, 42)}</QueryClientProvider>);
    fireEvent.click(screen.getByTestId('lifetimes.admin.log'));
    expect(await screen.findByText('reason-50')).toBeInTheDocument();
    expect(screen.queryByText('reason-51')).not.toBeInTheDocument();
    expect(screen.getByText('lifetimes.state_log.hint50')).toBeInTheDocument();
    const helper = kind === 'vps' ? fetchVpsStateLogs : fetchUserStateLogs;
    expect(helper).toHaveBeenCalledExactlyOnceWith(42, { limit: 50 });
    expect(screen.queryByText('common.next')).not.toBeInTheDocument();
    expect(screen.queryByText('common.previous')).not.toBeInTheDocument();
    client.clear();
  });

  test.each(['object', 'scope'] as const)('clears visible rows on %s switch without showing prior history', async change => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}>{panel('vps', 42)}</QueryClientProvider>);
    fireEvent.click(screen.getByTestId('lifetimes.admin.log'));
    await screen.findByText('reason-1');
    if (change === 'scope') scope.userId = 2;
    vi.mocked(fetchVpsStateLogs).mockResolvedValue({ data: [], meta: {}, httpStatus: 200, envelope: { status: true } });
    view.rerender(<QueryClientProvider client={client}>{panel(change === 'object' ? 'user' : 'vps', change === 'object' ? 99 : 42)}</QueryClientProvider>);
    await waitFor(() => expect(screen.queryByTestId('lifetimes.state_log.drawer')).not.toBeInTheDocument());
    expect(screen.queryByText('reason-1')).not.toBeInTheDocument();
    client.clear();
  });
});
