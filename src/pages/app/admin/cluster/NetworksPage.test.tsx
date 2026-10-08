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
  enabled: true, split_access: 'no_access', split_prefix: 32, assigned: 3, owned: 5, used: 9, size: 256, taken: 7,
  available_to_users: 0, owned_unassigned: 2,
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
afterEach(() => { state.language = 'en'; vi.restoreAllMocks(); });

describe('network availability editor', () => {
  it.each(['en', 'cs'] as const)('renders %s identity/counts and retains a rejected disable draft', async (language) => {
    state.language = language;
    vi.mocked(updateNetwork).mockRejectedValueOnce(new Error('Allocation policy rejected'));
    renderPage();
    fireEvent.click(await screen.findByTestId('admin.cluster.networks.row.101.edit'));
    const availability = await screen.findByTestId('admin.cluster.networks.editor.enabled');
    expect(screen.getByRole('dialog')).toHaveTextContent('192.0.2.0/24 (#101)');
    expect(within(screen.getByRole('dialog')).getByTestId('admin.cluster.networks.editor.assigned')).toHaveTextContent(/^3$/);
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

  it.each(['en', 'cs'] as const)('shows authoritative %s counts with keyboard descriptions and a distinct editor total', async (language) => {
    state.language = language;
    // JSDOM has no layout; browser scenarios verify actual clipping and bounds.
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    let triggerTop = 20;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.hasAttribute('aria-describedby')) return new DOMRect(20, triggerTop, 120, 20);
      if (this.getAttribute('role') === 'tooltip') return new DOMRect(20, 48, 288, 100);
      return originalRect.call(this);
    });
    renderPage();
    const row = await screen.findByTestId('admin.cluster.networks.row.101');
    expect(within(row).getByTestId('admin.cluster.networks.row.101.available_to_users')).toHaveTextContent(/^0$/);
    expect(within(row).getByTestId('admin.cluster.networks.row.101.owned_unassigned')).toHaveTextContent(/^2$/);
    expect(within(row).getByTestId('admin.cluster.networks.row.101.assigned')).toHaveTextContent(/^3$/);
    expect(within(row).getByTestId('admin.cluster.networks.row.101.used')).toHaveTextContent(/^9$/);
    const descriptions = {
      available: {"en": "Registered addresses or prefixes with no owner or interface assignment, and not reserved by an operation. Disabled networks contribute zero. Use on a particular VPS also depends on location, network purpose and user limits.", "cs": "Evidované adresy nebo prefixy bez vlastníka a bez přiřazení k rozhraní, které nejsou rezervované probíhající operací. V zakázané síti je tento počet nulový. Použití na konkrétním VPS závisí také na lokaci, účelu sítě a limitech uživatele."},
      owned_unassigned: {"en": "Addresses or prefixes held by users but not assigned to any interface. Other users cannot take them. Includes reserved entries and disabled networks; assignment still requires an enabled network and no conflicting reservation.", "cs": "Adresy nebo prefixy vlastněné uživateli, které nejsou přiřazené k žádnému rozhraní. Jiný uživatel je nemůže převzít. Počet zahrnuje i rezervované adresy a zakázané sítě; přiřazení vyžaduje povolenou síť a nesmí mu bránit rezervace."},
      assigned: {"en": "Addresses or prefixes attached to network interfaces, including VPS and export interfaces. These entries can also have an owner.", "cs": "Adresy nebo prefixy přiřazené k síťovým rozhraním, včetně rozhraní VPS a exportů. Tyto adresy mohou zároveň mít vlastníka."},
      used: {"en": "Addresses or prefixes registered in vpsAdmin, including owned and assigned entries.", "cs": "Adresy nebo prefixy evidované ve vpsAdmin, včetně vlastněných a přiřazených."},
    };
    for (const [name, translations] of Object.entries(descriptions)) {
      const description = translations[language];
      const label = screen.getByTitle(description);
      act(() => label.focus());
      expect(label).toHaveFocus();
      expect(label).toHaveAccessibleDescription(description);
      const tooltip = document.getElementById(`network-count-${name}`);
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip?.parentElement).toBe(document.body);
      expect(tooltip).toBeVisible();
      fireEvent.mouseEnter(label);
      fireEvent.mouseLeave(label);
      expect(tooltip).toBeVisible();
      act(() => label.blur());
      expect(tooltip).not.toBeVisible();
      fireEvent.mouseEnter(label);
      expect(tooltip).toBeVisible();
      act(() => label.focus());
      act(() => label.blur());
      expect(tooltip).toBeVisible();
      fireEvent.mouseLeave(label);
      expect(tooltip).not.toBeVisible();
      act(() => label.focus());
      triggerTop = window.innerHeight + 20;
      fireEvent.scroll(window);
      expect(tooltip).not.toBeVisible();
      triggerTop = 20;
      fireEvent.scroll(window);
      expect(tooltip).toBeVisible();
      act(() => label.blur());
    }
    fireEvent.click(within(row).getByTestId('admin.cluster.networks.row.101.edit'));
    const editor = await screen.findByRole('dialog');
    expect(within(editor).getByTestId('admin.cluster.networks.editor.owned_total')).toHaveTextContent(/^5$/);
    const totalLabel = editor.querySelector<HTMLElement>('[aria-describedby="network-editor-owned"]');
    expect(totalLabel).toHaveTextContent(language === 'en' ? 'Owned total' : 'Vlastněné celkem');
    act(() => totalLabel?.focus());
    const totalTooltip = document.getElementById('network-editor-owned');
    expect(totalTooltip?.parentElement).toBe(document.body);
    expect(totalTooltip).toBeVisible();
    expect(totalLabel).toHaveAccessibleDescription(language === 'en'
      ? 'All addresses or prefixes owned by users, including those assigned to an interface.'
      : 'Všechny adresy nebo prefixy vlastněné uživateli, včetně těch přiřazených k rozhraní.');
  });

  it('renders unknown new statistics even when old fields could produce plausible free counts', async () => {
    const { available_to_users: _available, owned_unassigned: _unassigned, ...oldNetwork } = network;
    vi.mocked(fetchNetworks).mockResolvedValue({ data: [oldNetwork] } as never);
    renderPage();
    expect(await screen.findByTestId('admin.cluster.networks.row.101.available_to_users')).toHaveTextContent(/^—$/);
    expect(screen.getByTestId('admin.cluster.networks.row.101.owned_unassigned')).toHaveTextContent(/^—$/);
    expect(screen.getByTestId('admin.cluster.networks.row.101.used')).toHaveTextContent(/^9$/);
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
    const { enabled: _enabled, available_to_users: _available, owned_unassigned: _unassigned, ...oldNetwork } = network;
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
