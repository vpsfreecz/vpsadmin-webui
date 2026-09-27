import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { fetchHostIpAddresses } from '../../lib/api/exports';
import { I18nProvider } from '../../app/i18n';
// Warm the real lazy catalog before the rendered assertions start their wait.
import '../../i18n/cs';
import { HostIpLookupInput } from './HostIpLookupInput';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'cs' }));
vi.mock('../../app/uiSettings', () => ({
  useUiSettings: () => ({ settings: { language: language.value } }),
}));

vi.mock('../../lib/api/exports', () => ({
  fetchHostIpAddresses: vi.fn(),
}));

function renderLookup(props: Partial<React.ComponentProps<typeof HostIpLookupInput>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onChange = vi.fn();

  const renderControl = (nextProps: Partial<React.ComponentProps<typeof HostIpLookupInput>>) => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <HostIpLookupInput
          value={null}
          onChange={onChange}
          ariaLabel="Host IP"
          testId="host-ip"
          {...nextProps}
        />
      </I18nProvider>
    </QueryClientProvider>
  );
  const view = render(renderControl(props));

  return { onChange, rerenderLookup: (nextProps: Partial<React.ComponentProps<typeof HostIpLookupInput>>) => view.rerender(renderControl(nextProps)) };
}

describe('HostIpLookupInput', () => {
  afterEach(() => {
    vi.clearAllMocks();
    language.value = 'en';
  });

  test('exposes a keyboard-operable combobox and selects an eligible result', async () => {
    vi.mocked(fetchHostIpAddresses).mockResolvedValue({
      data: [{ id: 12, addr: '192.0.2.12' }],
      envelope: { status: true, response: {} },
    });
    const { onChange } = renderLookup({ filters: { usableFor: 'vps', routed: true } });
    const input = screen.getByRole('combobox', { name: 'Host IP' });

    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(fetchHostIpAddresses).toHaveBeenCalledWith(expect.objectContaining({ usableFor: 'vps', routed: true }));
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: /192\.0\.2\.12/ })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(12);
    expect(onChange).not.toHaveBeenCalledWith(null);
    expect(input).toHaveValue('#12');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  test('checks an outside-sample eligible ID with the same filters before selecting it', async () => {
    vi.mocked(fetchHostIpAddresses).mockImplementation(async (opts) => ({
      data: opts?.fromId === 10 ? [{ id: 11, addr: '192.0.2.11' }] : [{ id: 12, addr: '192.0.2.12' }],
      envelope: { status: true, response: {} },
    }));
    const { onChange } = renderLookup({ filters: { usableFor: 'vps', routed: true } });
    const input = screen.getByRole('combobox', { name: 'Host IP' });
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByRole('option')).toBeInTheDocument());
    fireEvent.change(input, { target: { value: '#11' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(11));
    expect(fetchHostIpAddresses).toHaveBeenCalledWith(expect.objectContaining({
      fromId: 10, limit: 1, order: 'asc', usableFor: 'vps', routed: true,
    }));
    expect(input).toHaveValue('#11');
  });

  test('rejects an ID filtered out by the server without treating the sample as exhaustive', async () => {
    vi.mocked(fetchHostIpAddresses).mockImplementation(async (opts) => ({
      data: opts?.fromId === 10 ? [{ id: 13, addr: '192.0.2.13' }] : [{ id: 12, addr: '192.0.2.12' }],
      envelope: { status: true, response: {} },
    }));
    const { onChange } = renderLookup({
      filters: { usableFor: 'vps', routed: true },
      invalidSelectionMessage: 'Choose an eligible address.',
    });
    const input = screen.getByRole('combobox', { name: 'Host IP' });

    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByRole('option')).toBeInTheDocument());
    fireEvent.change(input, { target: { value: '#11' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Choose an eligible address.'));
    expect(onChange).not.toHaveBeenCalledWith(11);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  test.each([
    ['en', 'Could not verify this address. Try again.'],
    ['cs', 'Nepodařilo se ověřit tuto adresu. Zkus to znovu.'],
  ] as const)('reports a %s direct-ID verification failure without accepting the ID', async (lang, copy) => {
    language.value = lang;
    vi.mocked(fetchHostIpAddresses).mockImplementation(async (opts) => {
      if (opts?.fromId === 10) throw new Error('private backend response');
      return { data: [], envelope: { status: true, response: {} } };
    });
    const { onChange } = renderLookup({ filters: { usableFor: 'vps', routed: true } });
    const input = screen.getByRole('combobox', { name: 'Host IP' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '#11' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText(copy)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalledWith(11);
    expect(screen.queryByText('private backend response')).not.toBeInTheDocument();
  });

  test('clears pending ID validation on an owner/filter change and discards the late result', async () => {
    let resolveExact!: (value: Awaited<ReturnType<typeof fetchHostIpAddresses>>) => void;
    vi.mocked(fetchHostIpAddresses).mockImplementation(async (opts) => {
      if (opts?.fromId === 10) return new Promise((resolve) => { resolveExact = resolve; });
      return { data: [{ id: 12, addr: '192.0.2.12' }], envelope: { status: true, response: {} } };
    });
    const { onChange, rerenderLookup } = renderLookup({ userId: 1, filters: { usableFor: 'vps', routed: true } });
    const input = screen.getByRole('combobox', { name: 'Host IP' });
    fireEvent.focus(input);
    await waitFor(() => expect(screen.getByRole('option')).toBeInTheDocument());
    fireEvent.change(input, { target: { value: '#11' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(input).toBeDisabled());
    rerenderLookup({ userId: 2, filters: { usableFor: 'vps', routed: true } });
    await waitFor(() => expect(input).not.toBeDisabled());
    resolveExact({ data: [{ id: 11, addr: '192.0.2.11' }], envelope: { status: true, response: {} } });
    await waitFor(() => expect(onChange).not.toHaveBeenCalledWith(11));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  test('uses exact addr with eligibility filters and no unsupported q', async () => {
    vi.mocked(fetchHostIpAddresses).mockResolvedValue({
      data: [{ id: 99, addr: '192.0.2.99' }], envelope: { status: true, response: {} },
    });
    renderLookup({ filters: { usableFor: 'vps', routed: true } });
    const input = screen.getByRole('combobox', { name: 'Host IP' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '192.0.2.99' } });
    await waitFor(() => expect(fetchHostIpAddresses).toHaveBeenCalledWith(expect.objectContaining({
      addr: '192.0.2.99', usableFor: 'vps', routed: true,
    })));
    expect(vi.mocked(fetchHostIpAddresses).mock.calls.flatMap(([opts]) => Object.keys(opts ?? {}))).not.toContain('q');
  });

  test.each([
    ['en', 'Showing loaded suggestions only. Enter an exact IP address to search.'],
    ['cs', 'Zobrazují se jen návrhy z načtených adres. Pro vyhledání zadej přesnou IP adresu.'],
  ] as const)('renders the %s sample notice from the real catalog', async (lang, copy) => {
    language.value = lang;
    vi.mocked(fetchHostIpAddresses).mockResolvedValue({ data: [], envelope: { status: true, response: {} } });
    renderLookup({ filters: { usableFor: 'vps', routed: true } });
    fireEvent.focus(screen.getByRole('combobox', { name: 'Host IP' }));
    expect(await screen.findByText(copy)).toBeInTheDocument();
  });

  test('keeps raw id entry for unfiltered lookup call sites', () => {
    const { onChange } = renderLookup();
    const input = screen.getByRole('combobox', { name: 'Host IP' });

    fireEvent.change(input, { target: { value: '#11' } });

    expect(onChange).toHaveBeenCalledWith(11);
  });
});
