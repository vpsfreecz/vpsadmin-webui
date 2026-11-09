import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDataset, fetchDatasets, type Dataset } from '../../../lib/api/datasets';
import { NasDatasetCreatePage } from './NasDatasetCreatePage';

vi.mock('../../../app/appMode', () => ({ useAppMode: () => ({ basePath: '/app' }) }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: 'user', user: { id: 42 } }) }));
vi.mock('../../../app/objectScope', () => ({
  useObjectScope: () => ({ scope: 'mine', mineUserId: 42, canSwitchScope: false }),
}));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../../../app/toasts', () => ({ useToasts: () => ({ pushToast: vi.fn() }) }));
vi.mock('../../../lib/api/datasets', () => ({ fetchDatasets: vi.fn(), createDataset: vi.fn() }));

const queryKey = ['datasets', 'nas', 'create-parents', { user: 42 }];
function parent(id: number, owner = 42): Dataset {
  return { id, name: `parent-${id}`, user: { id: owner } };
}
function renderPage(parents: Dataset[]) {
  const response = { data: parents, meta: {}, httpStatus: 200, envelope: { status: true, response: { datasets: parents } } };
  vi.mocked(fetchDatasets).mockResolvedValue(response);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><NasDatasetCreatePage /></MemoryRouter></QueryClientProvider>);
  return client;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createDataset).mockRejectedValue(new Error('Synthetic submission stop'));
});

describe('NAS parent selection', () => {
  it('selects the only offered owned parent and submits that visible ID', async () => {
    const user = userEvent.setup();
    renderPage([parent(600), parent(999, 99)]);
    const select = await screen.findByTestId('nas.create.parent');
    expect(select).toHaveValue('600');
    expect(screen.queryByRole('option', { name: 'parent-999' })).not.toBeInTheDocument();
    await user.type(screen.getByTestId('nas.create.name'), 'child');
    expect(createDataset).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('nas.create.submit'));
    await waitFor(() => expect(createDataset).toHaveBeenCalledWith(expect.objectContaining({ dataset: 600, name: 'child', automount: true })));
    expect(fetchDatasets).toHaveBeenCalledWith({ role: 'primary', limit: 100, user: 42, includes: 'user,parent' });
  });

  it('requires an explicit choice when several parents are offered', async () => {
    const user = userEvent.setup();
    renderPage([parent(600), parent(601)]);
    const select = await screen.findByTestId('nas.create.parent');
    await user.type(screen.getByTestId('nas.create.name'), 'child');
    expect(select).toHaveValue('');
    expect(screen.getByTestId('nas.create.submit')).toBeDisabled();
    await user.selectOptions(select, '601');
    await user.click(screen.getByTestId('nas.create.submit'));
    await waitFor(() => expect(createDataset).toHaveBeenCalledWith(expect.objectContaining({ dataset: 601 })));
  });

  it('offers no submission when no owned parent is available', async () => {
    renderPage([parent(999, 99)]);
    await screen.findByText('nas.create.empty.title');
    expect(screen.queryByTestId('nas.create.parent')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nas.create.submit')).not.toBeInTheDocument();
    expect(createDataset).not.toHaveBeenCalled();
  });

  it('retains a valid choice and clears an unavailable choice before submission', async () => {
    const user = userEvent.setup();
    const client = renderPage([parent(600), parent(601)]);
    const select = await screen.findByTestId('nas.create.parent');
    await user.selectOptions(select, '601');
    await user.type(screen.getByTestId('nas.create.name'), 'retained-draft');
    act(() => client.setQueryData(queryKey, [parent(600), parent(601), parent(602)]));
    await screen.findByRole('option', { name: 'parent-602' });
    expect(select).toHaveValue('601');
    act(() => client.setQueryData(queryKey, [parent(600), parent(602)]));
    await waitFor(() => expect(select).toHaveValue(''));
    expect(screen.getByTestId('nas.create.submit')).toBeDisabled();
    expect(createDataset).not.toHaveBeenCalled();
    act(() => client.setQueryData(queryKey, [parent(602)]));
    await waitFor(() => expect(select).toHaveValue('602'));
    expect(screen.getByTestId('nas.create.name')).toHaveValue('retained-draft');
    await user.click(screen.getByTestId('nas.create.submit'));
    await waitFor(() => expect(createDataset).toHaveBeenCalledWith(expect.objectContaining({ dataset: 602, name: 'retained-draft' })));
  });
});
