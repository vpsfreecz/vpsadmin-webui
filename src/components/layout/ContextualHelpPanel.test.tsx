// i18n-ignore-file
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageHelpProvider } from '../../app/pageHelp';
import { PageHeader } from './PageHeader';
import { ObjectHeader } from '../ui/ObjectHeader';
import { ErrorState } from '../ui/ErrorState';
import { ContextualHelpPanel } from './ContextualHelpPanel';

const state = vi.hoisted(() => ({ authenticated: true, canManage: false, fetch: vi.fn() }));
vi.mock('../../app/auth', () => ({ useAuth: () => ({ status: state.authenticated ? 'authenticated' : 'anonymous', canUseAdminUi: state.canManage }) }));
vi.mock('../../app/i18n', () => ({ useI18n: () => ({ t: (key: string, values?: { id: number }) => (({ 'help_boxes.panel.title': 'Page help', 'help_boxes.panel.manage': 'Manage help boxes', 'common.close': 'Close' } as Record<string, string>)[key] ?? `${key} ${values?.id ?? ''}`) }) }));
vi.mock('../../app/theme', () => ({ useTheme: () => ({ effective: 'light' }) }));
vi.mock('../../lib/api/helpBoxes', () => ({ fetchContextualHelpBoxes: state.fetch }));

function mount(pathname = '/app', scope: 'user' | 'admin' | 'public' = 'user', nested = false, onlyError = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = (path: string) => <QueryClientProvider client={client}><MemoryRouter><PageHelpProvider>
    {nested ? <ObjectHeader title="Object title" /> : null}
    {onlyError ? <ErrorState title="Read failed" showDetails={false} /> : <PageHeader title="Page title" />}
    <input aria-label="Unsaved draft" />
    <ContextualHelpPanel pathname={path} scope={scope} />
  </PageHelpProvider></MemoryRouter></QueryClientProvider>;
  const result = render(view(pathname));
  return { ...result, client, navigate: (path: string) => result.rerender(view(path)) };
}
beforeEach(() => {
  state.authenticated = true; state.canManage = false; state.fetch.mockReset();
  state.fetch.mockResolvedValue({ data: [{ id: 2, order: 20, content: '<p>Second help</p>' }, { id: 1, order: 10, content: '<h2>First help</h2><a href="https://kb.example.test/guide">Guide</a>' }] });
});
describe('central contextual help dialog', () => {
  it('places one accessible trigger beside the plain primary heading and preserves ordered sandboxed HTML', async () => {
    mount('/app', 'user', true);
    const trigger = await screen.findByRole('button', { name: 'Page help' });
    expect(screen.getAllByRole('button', { name: 'Page help' })).toHaveLength(1);
    expect(trigger.parentElement?.parentElement).toContainElement(screen.getByRole('heading', { name: 'Object title' }));
    expect(trigger).toHaveAttribute('title', 'Page help');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByTestId('contextual.help.panel')).toBeNull();
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog', { name: 'Page help' })).toBeVisible();
    const frames = screen.getAllByTitle(/help_boxes.panel.iframe_title/);
    expect(frames[0]).toHaveAttribute('srcdoc', expect.stringContaining('<h2>First help</h2>'));
    expect(frames[0]).toHaveAttribute('srcdoc', expect.stringContaining('https://kb.example.test/guide'));
    expect(frames[1]).toHaveAttribute('srcdoc', expect.stringContaining('Second help'));
    expect(frames.every(frame => frame.getAttribute('sandbox') === 'allow-same-origin')).toBe(true);
    expect(screen.queryByText('Manage help boxes')).toBeNull();
    expect(state.fetch).toHaveBeenCalledWith('dashboard', 'index', 'authenticated');
  });
  it('does not open from the obsolete expanded preference and restores focus on close', async () => {
    localStorage.setItem('vpsadmin.contextualHelp.expanded.v1', '1');
    mount(); const trigger = await screen.findByRole('button', { name: 'Page help' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(trigger); await screen.findByRole('dialog');
    fireEvent.click(screen.getByTestId('contextual.help.close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
    expect(localStorage.getItem('vpsadmin.contextualHelp.expanded.v1')).toBe('1');
  });
  it('retains authorized management links and closes the dialog on route changes without losing drafts', async () => {
    state.canManage = true; const view = mount();
    fireEvent.change(screen.getByLabelText('Unsaved draft'), { target: { value: 'keep me' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Page help' }));
    expect(await screen.findByText('Manage help boxes')).toHaveAttribute('href', '/admin/content/help-boxes?page=dashboard&action=index');
    view.navigate('/app/profile');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByLabelText('Unsaved draft')).toHaveValue('keep me');
    await waitFor(() => expect(state.fetch).toHaveBeenCalledWith('profile', 'overview', 'authenticated'));
  });
  it('keeps help reachable when the page can render only its load failure', async () => {
    mount('/app/vps/123', 'user', false, true);
    const trigger = await screen.findByRole('button', { name: 'Page help' });
    expect(trigger.parentElement?.parentElement).toContainElement(screen.getByText('Read failed'));
    fireEvent.click(trigger); expect(await screen.findByRole('dialog')).toBeVisible();
  });
  it.each([{ data: [] }, { data: [{ id: 1, content: null }] }, { data: [{ id: 1, content: '   ' }] }])('does not expose an empty help affordance: %j', async ({ data }) => {
    state.fetch.mockResolvedValue({ data }); const view = mount();
    await waitFor(() => expect(state.fetch).toHaveBeenCalled());
    await waitFor(() => expect(view.client.isFetching()).toBe(0));
    expect(screen.queryByRole('button', { name: 'Page help' })).toBeNull();
  });
  it('does not expose failed help or call an API for unmapped routes', async () => {
    state.fetch.mockRejectedValue(new Error('synthetic failure')); const view = mount();
    await waitFor(() => expect(state.fetch).toHaveBeenCalled());
    await waitFor(() => expect(view.client.isFetching()).toBe(0));
    expect(screen.queryByRole('button', { name: 'Page help' })).toBeNull();
    state.fetch.mockClear(); view.navigate('/app/unmapped');
    await waitFor(() => expect(state.fetch).not.toHaveBeenCalled());
  });
  it('uses the public access mode without a management link for an anonymous page', async () => {
    state.authenticated = false; mount('/news', 'public');
    fireEvent.click(await screen.findByRole('button', { name: 'Page help' }));
    await screen.findByRole('dialog');
    expect(state.fetch).toHaveBeenCalledWith('news', 'list', 'public');
    expect(screen.queryByText('Manage help boxes')).toBeNull();
  });
});
