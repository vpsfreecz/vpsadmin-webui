import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { fetchVpsUserDataList } from '../../lib/api/vpsUserData';
import { UserDataTemplatesPanel } from './UserDataTemplatesPanel';

vi.mock('../../app/auth', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../layout/ChromeContext', () => ({ useChrome: () => ({}) }));
vi.mock('../../lib/api/vpsUserData', async original => ({ ...await original<typeof import('../../lib/api/vpsUserData')>(), fetchVpsUserDataList: vi.fn() }));
vi.mock('./UserDataTemplatesDrawers', () => ({ UserDataTemplateDeployDrawer: () => null, UserDataTemplateEditorDrawer: () => null }));
function Location() { return <output data-testid="url">{useLocation().search}</output>; }

describe('server-supported user data filters', () => {
  test('removes stale q and its cursor, explains it, and retains owner/format filters', async () => {
    vi.mocked(fetchVpsUserDataList).mockResolvedValue({ data: [], meta: {}, httpStatus: 200, envelope: { status: true } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/profile?q=obsolete&from=91&format=script']}>
      <UserDataTemplatesPanel userIdForAdmin={7} testIdPrefix="data" /><Location />
    </MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('?format=script'));
    expect(screen.getByText('filters.unsupported_text_search_removed')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('data.filters.advanced')).not.toBeInTheDocument();
    expect(fetchVpsUserDataList).toHaveBeenLastCalledWith(expect.objectContaining({ user: 7, format: 'script', fromId: undefined }));
    expect(vi.mocked(fetchVpsUserDataList).mock.calls.every(([opts]) => !('q' in (opts ?? {})))).toBe(true);
    client.clear();
  });
});
