import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  Dataset,
  DatasetInPoolPlan,
  EnvironmentDatasetPlan,
} from '../../../lib/api/datasets';
import { DatasetContextProvider } from './DatasetContext';
import { DatasetPlansPage } from './DatasetPlansPage';

const testState = vi.hoisted(() => ({
  mode: 'user' as 'user' | 'admin',
}));

const api = vi.hoisted(() => ({
  fetchDatasetPlans: vi.fn(),
  fetchEnvironmentDatasetPlans: vi.fn(),
  assignDatasetPlan: vi.fn(),
  deleteDatasetPlan: vi.fn(),
  fetchTransactionChains: vi.fn(),
}));

const chrome = vi.hoisted(() => ({
  acquireLocalLock: vi.fn(),
  releaseLocalLock: vi.fn(),
}));

vi.mock('../../../app/appMode', () => ({
  useAppMode: () => ({
    mode: testState.mode,
    basePath: testState.mode === 'admin' ? '/admin' : '/app',
  }),
}));

vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'common.na': 'N/A',
        'dataset.plans.column.source': 'Source plan',
        'dataset.plans.description.fallback': 'No description is available for this plan.',
        'dataset.plans.remove.not_allowed': 'Removal restricted',
      };
      let value = messages[key] ?? key;
      for (const [name, replacement] of Object.entries(vars ?? {})) {
        value = value.replace(`{${name}}`, String(replacement));
      }
      return value;
    },
  }),
}));

vi.mock('../../../app/toasts', () => ({
  useToasts: () => ({ pushToast: vi.fn() }),
}));

vi.mock('../../../components/layout/ChromeContext', () => ({
  useChrome: () => chrome,
}));

vi.mock('../../../lib/api/datasets', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/api/datasets')>();
  return {
    ...original,
    fetchDatasetPlans: api.fetchDatasetPlans,
    fetchEnvironmentDatasetPlans: api.fetchEnvironmentDatasetPlans,
    assignDatasetPlan: api.assignDatasetPlan,
    deleteDatasetPlan: api.deleteDatasetPlan,
  };
});

vi.mock('../../../lib/api/transactions', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/api/transactions')>();
  return {
    ...original,
    fetchTransactionChains: api.fetchTransactionChains,
  };
});

const assignedPlans: DatasetInPoolPlan[] = [
  {
    id: 21,
    environment_dataset_plan: {
      id: 11,
      label: 'Daily backup',
      dataset_plan: {
        id: 101,
        label: 'daily_backup',
        description: 'Takes a snapshot every night and keeps seven restore points.',
      },
      user_add: true,
      user_remove: false,
    },
  },
  {
    id: 22,
    environment_dataset_plan: {
      id: 12,
      label: 'Weekly archive',
      user_add: true,
      user_remove: true,
    },
  },
  {
    id: 23,
    environment_dataset_plan: {
      id: 15,
      label: 'Whitespace description',
      dataset_plan: { id: 105, label: 'whitespace_description', description: '  \n  ' },
      user_add: true,
      user_remove: true,
    },
  },
  {
    id: 24,
    environment_dataset_plan: {
      id: 16,
      label: 'Null description',
      dataset_plan: { id: 106, label: 'null_description', description: null },
      user_add: true,
      user_remove: true,
    },
  },
  {
    id: 25,
  },
];

const availablePlans: EnvironmentDatasetPlan[] = [
  {
    id: 13,
    label: 'Remote copy',
    dataset_plan: {
      id: 103,
      label: 'remote_copy',
      description: 'Copies the dataset to backup storage every six hours.',
    },
    user_add: true,
    user_remove: true,
  },
  {
    id: 14,
    label: 'Operator archive',
    dataset_plan: {
      id: 104,
      label: 'operator_archive',
      description: 'Archives the dataset according to the operator policy.',
    },
    user_add: false,
    user_remove: false,
  },
];

function renderPage(datasetOverrides: Partial<Dataset> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const dataset = {
    id: 10,
    name: 'root',
    full_name: 'mail.example/root',
    object_state: 'active',
    environment: { id: 7, label: 'Production' },
    user: { id: 1, login: 'backup-user' },
    ...datasetOverrides,
  } satisfies Dataset;

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DatasetContextProvider
          value={{
            dataset,
            refetch: vi.fn(async () => undefined),
            section: 'datasets',
            listPath: '/datasets',
            returnPath: '/datasets',
            detailPath: '/datasets/10',
            datasetRef: { kind: 'Dataset', id: 10 },
            busyLocalLock: false,
            chains: [],
            chainsLoading: false,
            chainsError: null,
            busyTransaction: false,
            chainsStale: false,
            activeChainIds: [],
            refetchChains: vi.fn(async () => undefined),
          }}
        >
          <DatasetPlansPage />
        </DatasetContextProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { ...rendered, queryClient };
}

function availableCount() {
  const label = within(screen.getByTestId('dataset.plans.summary'))
    .getByText('dataset.plans.available_count');
  return within(label.parentElement as HTMLElement);
}

beforeEach(() => {
  vi.clearAllMocks();
  testState.mode = 'user';
  api.fetchDatasetPlans.mockResolvedValue({ data: assignedPlans, meta: { total_count: 5 } });
  api.fetchEnvironmentDatasetPlans.mockResolvedValue({
    data: availablePlans,
    meta: { total_count: 2 },
  });
  api.fetchTransactionChains.mockResolvedValue({ data: [], meta: { total_count: 0 } });
  api.assignDatasetPlan.mockResolvedValue({ data: { id: 23 }, meta: {} });
  api.deleteDatasetPlan.mockResolvedValue({ data: undefined, meta: {} });
});

describe('DatasetPlansPage', () => {
  it('keeps successful empty reads as zero with the factual empty explanation', async () => {
    api.fetchDatasetPlans.mockResolvedValue({ data: [], meta: {} });
    api.fetchEnvironmentDatasetPlans.mockResolvedValue({ data: [], meta: {} });
    renderPage();

    const empty = await screen.findByTestId('dataset.plans.empty');
    expect(availableCount().getByText('0', { exact: true })).toBeVisible();
    expect(empty).toHaveTextContent('dataset.plans.empty.title');
    expect(empty).toHaveTextContent('dataset.plans.empty.no_available');
    expect(screen.queryByTestId('dataset.plans.assign.open')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dataset.plans.empty.assign')).not.toBeInTheDocument();
  });

  it('keeps unavailable reads unknown without claiming there are no assignable plans', async () => {
    api.fetchDatasetPlans.mockResolvedValue({ data: [], meta: {} });
    api.fetchEnvironmentDatasetPlans.mockRejectedValue(new Error('Available plans unavailable'));
    renderPage();

    expect(await screen.findByTestId('dataset.plans.available_load_error')).toBeVisible();
    expect(availableCount().getByText('N/A', { exact: true })).toBeVisible();
    const empty = screen.getByTestId('dataset.plans.empty');
    expect(empty).toHaveTextContent('dataset.plans.empty.title');
    expect(empty).not.toHaveTextContent('dataset.plans.empty.no_available');
    expect(screen.queryByTestId('dataset.plans.assign.open')).not.toBeInTheDocument();
  });

  it('keeps a disabled missing-environment read unknown and does not request it', async () => {
    api.fetchDatasetPlans.mockResolvedValue({ data: [], meta: {} });
    renderPage({ environment: null });

    expect(await screen.findByTestId('dataset.plans.environment_missing')).toBeVisible();
    expect(availableCount().getByText('N/A', { exact: true })).toBeVisible();
    expect(screen.getByTestId('dataset.plans.empty')).not.toHaveTextContent('dataset.plans.empty.no_available');
    expect(screen.queryByTestId('dataset.plans.assign.open')).not.toBeInTheDocument();
    expect(api.fetchEnvironmentDatasetPlans).not.toHaveBeenCalled();
  });

  it('counts only eligible unassigned plans while retaining user and administrator permissions', async () => {
    api.fetchEnvironmentDatasetPlans.mockResolvedValue({ data: [
      assignedPlans[0]?.environment_dataset_plan,
      availablePlans[1],
      { label: 'No numeric ID', user_add: true },
    ], meta: {} });
    renderPage();

    await screen.findByTestId('dataset.plans.row.21');
    expect(availableCount().getByText('0', { exact: true })).toBeVisible();
    expect(screen.queryByTestId('dataset.plans.assign.open')).not.toBeInTheDocument();
    expect(screen.getByTestId('dataset.plans.row.22.remove')).toBeEnabled();
  });

  it('keeps a successful cached count during refresh and marks a settled failed refresh unavailable', async () => {
    const { queryClient } = renderPage();
    await screen.findByTestId('dataset.plans.row.21');
    expect(availableCount().getByText('1', { exact: true })).toBeVisible();
    let rejectRead!: (error: Error) => void;
    api.fetchEnvironmentDatasetPlans.mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectRead = reject;
    }));
    let refresh!: Promise<void>;
    await act(async () => {
      refresh = queryClient.refetchQueries({ queryKey: ['environments', 7, 'dataset_plans'] });
    });
    expect(queryClient.isFetching({ queryKey: ['environments', 7, 'dataset_plans'] })).toBe(1);
    expect(availableCount().getByText('1', { exact: true })).toBeVisible();
    expect(screen.getByTestId('dataset.plans.assign.open')).toBeEnabled();

    await act(async () => {
      rejectRead(new Error('Refresh failed'));
      await refresh;
    });
    expect(await screen.findByTestId('dataset.plans.available_load_error')).toBeVisible();
    expect(availableCount().getByText('N/A', { exact: true })).toBeVisible();
    expect(queryClient.getQueryData(['environments', 7, 'dataset_plans'])).toEqual(availablePlans);
    expect(screen.getByTestId('dataset.plans.row.21')).toBeVisible();
    expect(screen.queryByTestId('dataset.plans.assign.open')).not.toBeInTheDocument();
  });

  it('keeps an assigned-plan read error on the existing whole-page error path', async () => {
    api.fetchDatasetPlans.mockRejectedValue(new Error('Assigned plans unavailable'));
    renderPage();

    expect(await screen.findByTestId('dataset.plans.error')).toBeVisible();
    expect(screen.queryByTestId('dataset.plans.summary')).not.toBeInTheDocument();
  });

  it('requests nested plan details and renders descriptions with a safe fallback', async () => {
    renderPage();

    expect(await screen.findByTestId('dataset.plans.row.21.description')).toHaveTextContent(
      'Takes a snapshot every night and keeps seven restore points.'
    );
    expect(screen.getByTestId('dataset.plans.row.22.description')).toHaveTextContent(
      'No description is available for this plan.'
    );
    expect(screen.getByTestId('dataset.plans.row.22.source')).toHaveTextContent('Source plan: N/A');
    expect(screen.getByTestId('dataset.plans.row.23.description')).toHaveTextContent(
      'No description is available for this plan.'
    );
    expect(screen.getByTestId('dataset.plans.row.24.description')).toHaveTextContent(
      'No description is available for this plan.'
    );
    expect(screen.getByTestId('dataset.plans.row.21.source')).toHaveTextContent(
      'Source plan: daily_backup'
    );
    expect(api.fetchDatasetPlans).toHaveBeenCalledWith(10, {
      limit: 200,
      includes: 'environment_dataset_plan__dataset_plan',
    });
    expect(api.fetchEnvironmentDatasetPlans).toHaveBeenCalledWith(7, {
      limit: 200,
      includes: 'dataset_plan',
    });
    expect(availableCount().getByText('1', { exact: true })).toBeVisible();
  });

  it('keeps regular-user add/remove permissions and previews the selected description', async () => {
    const user = userEvent.setup();
    renderPage();

    const lockedRow = await screen.findByTestId('dataset.plans.row.21');
    expect(within(lockedRow).queryByTestId('dataset.plans.row.21.remove')).not.toBeInTheDocument();
    expect(within(lockedRow).getByText('Removal restricted')).toBeVisible();
    expect(screen.getByTestId('dataset.plans.row.22.remove')).toBeEnabled();
    expect(screen.queryByTestId('dataset.plans.row.25.remove')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('dataset.plans.assign.open'));
    const select = screen.getByTestId('dataset.plans.assign.select');
    expect(within(select).getByRole('option', { name: 'Remote copy' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: 'Operator archive' })).not.toBeInTheDocument();

    await user.selectOptions(select, '13');
    expect(screen.getByTestId('dataset.plans.assign.preview.description')).toHaveTextContent(
      'Copies the dataset to backup storage every six hours.'
    );
    expect(screen.getByTestId('dataset.plans.assign.preview.source')).toHaveTextContent(
      'Source plan: remote_copy'
    );

    await user.click(screen.getByTestId('dataset.plans.assign.submit'));
    await waitFor(() =>
      expect(api.assignDatasetPlan).toHaveBeenCalledWith(10, {
        environment_dataset_plan: 13,
      })
    );
  });

  it('removes the assigned row id rather than an environment or base-plan id', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByTestId('dataset.plans.row.22.remove'));
    await user.click(screen.getByTestId('dataset.plans.remove.confirm.confirm'));

    await waitFor(() => expect(api.deleteDatasetPlan).toHaveBeenCalledWith(10, 22));
  });

  it('keeps a failed assignment in its modal and allows retry', async () => {
    const user = userEvent.setup();
    api.assignDatasetPlan
      .mockRejectedValueOnce(new Error('Assignment rejected'))
      .mockResolvedValueOnce({ data: { id: 23 }, meta: {} });
    renderPage();

    await user.click(await screen.findByTestId('dataset.plans.assign.open'));
    await user.selectOptions(screen.getByTestId('dataset.plans.assign.select'), '13');
    await user.click(screen.getByTestId('dataset.plans.assign.submit'));

    expect(await screen.findByTestId('dataset.plans.assign.error')).toHaveTextContent('Assignment rejected');
    expect(screen.getByTestId('dataset.plans.assign.select')).toHaveValue('13');

    await user.click(screen.getByTestId('dataset.plans.assign.submit'));
    await waitFor(() => expect(screen.queryByTestId('dataset.plans.assign.modal')).not.toBeInTheDocument());
    expect(api.assignDatasetPlan).toHaveBeenCalledTimes(2);
  });

  it('keeps a failed removal in its confirmation and allows retry', async () => {
    const user = userEvent.setup();
    api.deleteDatasetPlan
      .mockRejectedValueOnce(new Error('Removal rejected'))
      .mockResolvedValueOnce({ data: undefined, meta: {} });
    renderPage();

    await user.click(await screen.findByTestId('dataset.plans.row.22.remove'));
    await user.click(screen.getByTestId('dataset.plans.remove.confirm.confirm'));

    expect(await screen.findByTestId('dataset.plans.remove.error')).toHaveTextContent('Removal rejected');

    await user.click(screen.getByTestId('dataset.plans.remove.confirm.confirm'));
    await waitFor(() => expect(screen.queryByTestId('dataset.plans.remove.confirm')).not.toBeInTheDocument());
    expect(api.deleteDatasetPlan).toHaveBeenCalledTimes(2);
  });

  it('lets an administrator manage plans whose user permission flags are disabled', async () => {
    const user = userEvent.setup();
    testState.mode = 'admin';
    renderPage();

    expect(await screen.findByTestId('dataset.plans.row.21.remove')).toBeEnabled();
    expect(availableCount().getByText('2', { exact: true })).toBeVisible();
    await user.click(screen.getByTestId('dataset.plans.assign.open'));
    const select = screen.getByTestId('dataset.plans.assign.select');
    expect(within(select).getByRole('option', { name: 'Operator archive' })).toBeInTheDocument();

    await user.selectOptions(select, '14');
    expect(screen.getByTestId('dataset.plans.assign.preview.description')).toHaveTextContent(
      'Archives the dataset according to the operator policy.'
    );
  });
});
