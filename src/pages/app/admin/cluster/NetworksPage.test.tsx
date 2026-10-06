// i18n-ignore-file
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../../app/i18n';
import { fetchLocations } from '../../../../lib/api/infra';
import { fetchNetworks, fetchNetworkWriteCapability, updateNetwork } from '../../../../lib/api/networks';
import { NetworksPage } from './NetworksPage';

const state = vi.hoisted(() => ({ language: 'en' as 'en' | 'cs' }));
vi.mock('../../../../app/uiSettings', () => ({ useUiSettings: () => ({ settings: { language: state.language } }) }));
vi.mock('../../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../../components/layout/ChromeContext', () => ({ useChrome: () => ({ trackActionState: vi.fn() }) }));
vi.mock('../../../../lib/api/infra', () => ({ fetchLocations: vi.fn() }));
vi.mock('../../../../lib/api/networks', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../../lib/api/networks')>(),
  fetchNetworks: vi.fn(), fetchNetworkWriteCapability: vi.fn(), updateNetwork: vi.fn(), createNetwork: vi.fn(),
}));

const network = {
  id: 101, label: 'Retained service', address: '192.0.2.0', prefix: 24,
  ip_version: 4, role: 'public_access', purpose: 'vps', managed: true,
  enabled: true, split_access: 'no_access', split_prefix: 32, assigned: 3, owned: 5,
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter([{ path: '/admin/cluster/networks', element: <NetworksPage /> }], {
    initialEntries: ['/admin/cluster/networks'],
  });
  render(<QueryClientProvider client={client}><I18nProvider><RouterProvider router={router} /></I18nProvider></QueryClientProvider>);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchLocations).mockResolvedValue({ data: [] } as never);
  vi.mocked(fetchNetworks).mockResolvedValue({ data: [network] } as never);
  const capability = { input: { parameters: { enabled: {} } } };
  vi.mocked(fetchNetworkWriteCapability).mockResolvedValue({ data: capability, envelope: { status: true, response: capability } });
  vi.mocked(updateNetwork).mockResolvedValue({ data: network } as never);
});
afterEach(() => { state.language = 'en'; });

describe('network availability editor', () => {
  it.each(['en', 'cs'] as const)('renders %s identity/counts and retains a rejected disable draft', async (language) => {
    state.language = language;
    vi.mocked(updateNetwork).mockRejectedValueOnce(new Error('Allocation policy rejected'));
    renderPage();
    fireEvent.click(await screen.findByTestId('admin.cluster.networks.row.101.edit'));
    const availability = await screen.findByTestId('admin.cluster.networks.editor.enabled');
    expect(screen.getByRole('dialog')).toHaveTextContent('192.0.2.0/24 (#101)');
    expect(screen.getByRole('dialog')).toHaveTextContent(language === 'en' ? 'Assigned: 3' : 'Přiřazeno: 3');
    expect(availability).toHaveTextContent(language === 'en' ? 'Existing service continues' : 'Stávající provoz pokračuje');
    fireEvent.click(within(availability).getByRole('checkbox'));
    fireEvent.click(screen.getByTestId('admin.cluster.networks.editor.save'));
    await waitFor(() => expect(updateNetwork).toHaveBeenCalledWith(expect.objectContaining({ id: 101, enabled: false })));
    expect(await screen.findByText('Allocation policy rejected')).toBeInTheDocument();
    expect(within(availability).getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByTestId('admin.cluster.networks.editor.save'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('re-enables a disabled network explicitly', async () => {
    vi.mocked(fetchNetworks).mockResolvedValue({ data: [{ ...network, enabled: false }] } as never);
    renderPage();
    expect(await screen.findByTestId('admin.cluster.networks.row.101.enabled')).toHaveTextContent('Disabled');
    fireEvent.click(screen.getByTestId('admin.cluster.networks.row.101.edit'));
    fireEvent.click(within(await screen.findByTestId('admin.cluster.networks.editor.enabled')).getByRole('checkbox'));
    fireEvent.click(screen.getByTestId('admin.cluster.networks.editor.save'));
    await waitFor(() => expect(updateNetwork).toHaveBeenCalledWith(expect.objectContaining({ enabled: true })));
  });

  it('omits unavailable controls and payload fields for an older API', async () => {
    const capability = { input: { parameters: { managed: {} } } };
    vi.mocked(fetchNetworkWriteCapability).mockResolvedValue({ data: capability, envelope: { status: true, response: capability } });
    const { enabled: _enabled, ...oldNetwork } = network;
    vi.mocked(fetchNetworks).mockResolvedValue({ data: [oldNetwork] } as never);
    renderPage();
    const status = await screen.findByTestId('admin.cluster.networks.row.101.enabled');
    expect(status).not.toHaveTextContent('Disabled');
    fireEvent.click(screen.getByTestId('admin.cluster.networks.row.101.edit'));
    await waitFor(() => expect(fetchNetworkWriteCapability).toHaveBeenCalledWith(101));
    expect(screen.queryByTestId('admin.cluster.networks.editor.enabled')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('admin.cluster.networks.editor.save'));
    await waitFor(() => expect(updateNetwork).toHaveBeenCalled());
    expect(vi.mocked(updateNetwork).mock.calls[0]?.[0]).not.toHaveProperty('enabled');
    expect(screen.queryByTestId('admin.cluster.networks.editor.capability_error')).not.toBeInTheDocument();
  });

  it.each(['en', 'cs'] as const)('shows an initial %s capability failure and retries without losing the editor draft', async (language) => {
    state.language = language;
    vi.mocked(fetchNetworkWriteCapability).mockRejectedValueOnce(new Error('Capability unavailable'));
    renderPage();
    fireEvent.click(await screen.findByTestId('admin.cluster.networks.row.101.edit'));
    fireEvent.change(screen.getByTestId('admin.cluster.networks.editor.label'), { target: { value: 'Draft label' } });
    const error = await screen.findByTestId('admin.cluster.networks.editor.capability_error');
    expect(error).toHaveTextContent('Capability unavailable');
    expect(screen.queryByTestId('admin.cluster.networks.editor.enabled')).not.toBeInTheDocument();
    fireEvent.click(within(error).getByRole('button', { name: language === 'en' ? 'Retry' : 'Zkusit znovu' }));
    const availability = await screen.findByTestId('admin.cluster.networks.editor.enabled');
    expect(within(availability).getByRole('checkbox')).toBeEnabled();
    expect(screen.queryByTestId('admin.cluster.networks.editor.capability_error')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin.cluster.networks.editor.label')).toHaveValue('Draft label');
  });

  it('omits availability writes while the initial capability lookup is pending', async () => {
    vi.mocked(fetchNetworkWriteCapability).mockImplementation(() => new Promise(() => {}));
    renderPage();
    fireEvent.click(await screen.findByTestId('admin.cluster.networks.row.101.edit'));
    fireEvent.change(screen.getByTestId('admin.cluster.networks.editor.label'), { target: { value: 'Draft label' } });
    fireEvent.click(screen.getByTestId('admin.cluster.networks.editor.save'));
    await waitFor(() => expect(updateNetwork).toHaveBeenCalled());
    expect(vi.mocked(updateNetwork).mock.calls[0]?.[0]).toMatchObject({ label: 'Draft label' });
    expect(vi.mocked(updateNetwork).mock.calls[0]?.[0]).not.toHaveProperty('enabled');
  });

  it('disables a cached availability control while refetching and after failure, then restores its draft on retry', async () => {
    const client = renderPage();
    fireEvent.click(await screen.findByTestId('admin.cluster.networks.row.101.edit'));
    const availability = await screen.findByTestId('admin.cluster.networks.editor.enabled');
    const checkbox = within(availability).getByRole('checkbox');
    fireEvent.click(checkbox);
    let rejectLookup!: (error: Error) => void;
    vi.mocked(fetchNetworkWriteCapability).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectLookup = reject; }));
    act(() => { void client.refetchQueries({ queryKey: ['network-write-capability', 'edit', 101] }); });
    await waitFor(() => expect(checkbox).toBeDisabled());
    await act(async () => { rejectLookup(new Error('Refetch unavailable')); });
    const error = await screen.findByTestId('admin.cluster.networks.editor.capability_error');
    expect(error).toHaveTextContent('Refetch unavailable');
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
    fireEvent.click(within(error).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(checkbox).not.toBeChecked();
    fireEvent.click(screen.getByTestId('admin.cluster.networks.editor.save'));
    await waitFor(() => expect(updateNetwork).toHaveBeenCalledWith(expect.objectContaining({ enabled: false })));
  });

  it('keeps unrelated editing usable without sending availability from an errored cached capability', async () => {
    const client = renderPage();
    fireEvent.click(await screen.findByTestId('admin.cluster.networks.row.101.edit'));
    const availability = await screen.findByTestId('admin.cluster.networks.editor.enabled');
    fireEvent.click(within(availability).getByRole('checkbox'));
    vi.mocked(fetchNetworkWriteCapability).mockRejectedValueOnce(new Error('Refetch unavailable'));
    await act(async () => { await client.refetchQueries({ queryKey: ['network-write-capability', 'edit', 101] }); });
    await screen.findByTestId('admin.cluster.networks.editor.capability_error');
    expect(within(availability).getByRole('checkbox')).toBeDisabled();
    fireEvent.change(screen.getByTestId('admin.cluster.networks.editor.label'), { target: { value: 'Draft label' } });
    fireEvent.click(screen.getByTestId('admin.cluster.networks.editor.save'));
    await waitFor(() => expect(updateNetwork).toHaveBeenCalled());
    expect(vi.mocked(updateNetwork).mock.calls[0]?.[0]).toMatchObject({ label: 'Draft label' });
    expect(vi.mocked(updateNetwork).mock.calls[0]?.[0]).not.toHaveProperty('enabled');
  });
});
