import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enStorage } from '../../../i18n/locales/en/storage';
import { csStorage } from '../../../i18n/locales/cs/storage';
import { ApiOutputError } from '../../../lib/api/apiOutput';
import { HaveApiError } from '../../../lib/api/apiErrors';
import { DatasetContextProvider } from './DatasetContext';
import { DatasetBackupCleanup } from './DatasetBackupCleanup';

const state = vi.hoisted(() => ({ cs: false, role: 'admin' }));
const api = vi.hoisted(() => ({
  capability: vi.fn(),
  dataset: vi.fn(),
  plans: vi.fn(),
  snapshots: vi.fn(),
  active: vi.fn(),
  submit: vi.fn(),
}));
const chrome = vi.hoisted(() => ({
  localLocks: [],
  acquireLocalLock: vi.fn(),
  settleLocalLock: vi.fn(),
  trackActionState: vi.fn(),
  openTasks: vi.fn(),
}));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ role: state.role }) }));
vi.mock('../../../app/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      const catalog: Record<string, string> = state.cs ? csStorage : enStorage;
      return Object.entries(vars ?? {}).reduce(
        (text, [name, value]) => text.replace(`{${name}}`, String(value)),
        catalog[key] ?? key
      );
    },
  }),
}));
vi.mock('../../../components/layout/ChromeContext', () => ({ useChrome: () => chrome }));
vi.mock('../../../lib/api/datasets', () => ({
  fetchDataset: api.dataset,
  fetchDatasetBackupCleanupAvailable: api.capability,
  fetchDatasetPlans: api.plans,
  fetchDatasetSnapshots: api.snapshots,
}));
vi.mock('../../../lib/api/transactions', () => ({ fetchActiveTransactionChains: api.active }));
function ScopeControl() {
  const [search, setSearch] = useSearchParams();
  return (
    <>
      <output data-testid="test.search">{search.toString()}</output>
      {['omitted', 'false', 'true'].map((hint) => (
        <button
          key={hint}
          data-testid={`test.scope_${hint}`}
          onClick={() => setSearch(hint === 'omitted' ? {} : { recursive: hint })}
        >
          {hint}
        </button>
      ))}
    </>
  );
}
function mount(path = '/admin/datasets/10/plans') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const contents = (datasetId: number) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <ScopeControl />
        <DatasetContextProvider
          value={{
            dataset: { id: datasetId, name: 'root', full_name: 'mail/root' },
            datasetRef: { kind: 'Dataset', id: datasetId },
            refetch: vi.fn(async () => undefined),
            refetchChains: vi.fn(async () => undefined),
            section: 'datasets',
            listPath: '',
            returnPath: '',
            detailPath: '',
            busyLocalLock: false,
            chains: [],
            chainsLoading: false,
            chainsError: null,
            busyTransaction: false,
            chainsStale: false,
            activeChainIds: [],
          }}
        >
          <DatasetBackupCleanup busy={false} submit={api.submit} />
        </DatasetContextProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(contents(10));
  return { ...view, setDataset: (datasetId: number) => view.rerender(contents(datasetId)) };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.cs = false;
  state.role = 'admin';
  api.capability.mockResolvedValue({ data: true });
  api.dataset.mockResolvedValue({ data: { id: 10 } });
  api.plans.mockResolvedValue({ data: [] });
  api.snapshots.mockResolvedValue({ data: [] });
  api.active.mockResolvedValue([]);
  api.submit
    .mockReset()
    .mockResolvedValue({ data: undefined, meta: { action_state_id: 51 }, envelope: { status: true } });
  chrome.acquireLocalLock.mockResolvedValue({});
});
async function open(acknowledge = false) {
  const user = userEvent.setup();
  await screen.findByTestId('dataset.backup_cleanup.form');
  if (acknowledge) await user.click(screen.getByTestId('dataset.backup_cleanup.acknowledgement'));
  return user;
}
async function start() {
  const user = await open(true);
  await user.click(screen.getByTestId('dataset.backup_cleanup.submit'));
}
describe('ordinary dataset backup cleanup mutation', () => {
  it.each(['user', 'support', 'unknown'])('hides cleanup from actual role %s', async (role) => {
    state.role = role;
    mount();
    expect(screen.queryByTestId('dataset.backup_cleanup.form')).not.toBeInTheDocument();
    expect(api.capability).not.toHaveBeenCalled();
  });
  it('hides cleanup when the authenticated action is absent', async () => {
    api.capability.mockResolvedValue({ data: false });
    mount();
    await waitFor(() => expect(api.capability).toHaveBeenCalled());
    expect(screen.queryByTestId('dataset.backup_cleanup.form')).not.toBeInTheDocument();
  });
  it.each([false, true])('renders the exact concise inline form in both languages (cs=%s)', async (cs) => {
    state.cs = cs;
    mount('/admin/datasets/10/plans?recursive=true');
    await open();
    expect(screen.getByTestId('dataset.backup_cleanup.backup_first')).toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.recursive')).not.toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
    const form = screen.getByTestId('dataset.backup_cleanup.form');
    const explanation = cs
      ? 'Tato akce odebere vybrané datasety ze všech zálohovacích plánů a odstraní jejich lokální snapshoty. Zálohy zůstanou zachované. Opětovné zapnutí zálohování bude vyžadovat úplný přenos.'
      : 'This removes the selected datasets from all backup plans and deletes their local snapshots. Backups are preserved. Re-enabling backups will require a full transfer.';
    expect(form.querySelectorAll('p')).toHaveLength(1);
    expect(form.querySelector('p')).toHaveTextContent(explanation);
    expect(screen.getByTestId('dataset.backup_cleanup.acknowledgement')).toHaveAccessibleName(cs ? 'Potvrdit' : 'Confirm');
    expect(form).not.toHaveTextContent('mail/root');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dataset.backup_cleanup.open')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dataset.backup_cleanup.loss_warning')).not.toBeInTheDocument();
  });
  it('requires acknowledgement independently of the preservation choice', async () => {
    mount();
    const user = await open();
    const confirm = screen.getByTestId('dataset.backup_cleanup.submit');
    const acknowledgement = screen.getByTestId('dataset.backup_cleanup.acknowledgement');
    expect(confirm).toBeDisabled();
    await user.click(screen.getByTestId('dataset.backup_cleanup.backup_first'));
    expect(screen.getByTestId('dataset.backup_cleanup.backup_first')).not.toBeChecked();
    expect(acknowledgement).not.toBeChecked();
    await user.click(confirm);
    expect(api.submit).not.toHaveBeenCalled();
    await user.click(acknowledgement);
    expect(confirm).toBeEnabled();
    await user.click(acknowledgement);
    expect(confirm).toBeDisabled();
    expect(api.submit).not.toHaveBeenCalled();
  });
  it.each(['', '?recursive=false', '?recursive=true'])('defaults only preservation on regardless of the URL hint (%s)', async (query) => {
    mount('/admin/datasets/10/plans' + query);
    await open();
    expect(screen.getByTestId('dataset.backup_cleanup.recursive')).not.toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.backup_first')).toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
  });
  it('keeps explicit recursive choice local and invalidates acknowledgement', async () => {
    mount('/admin/datasets/10/plans?recursive=true');
    const user = await open(true);
    const recursive = screen.getByTestId('dataset.backup_cleanup.recursive');
    await user.click(recursive);
    expect(recursive).toBeChecked();
    expect(screen.getByTestId('test.search')).toHaveTextContent('recursive=true');
    expect(screen.getByTestId('dataset.backup_cleanup.backup_first')).toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
    await user.click(screen.getByTestId('dataset.backup_cleanup.acknowledgement'));
    await user.click(recursive);
    expect(recursive).not.toBeChecked();
    expect(screen.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked();
    expect(api.submit).not.toHaveBeenCalled();
  });
  it('resets all three defaults for dataset and omitted/false/true URL-context changes', async () => {
    const view = mount('/admin/datasets/10/plans?recursive=true');
    const user = await open();
    const recursive = screen.getByTestId('dataset.backup_cleanup.recursive');
    const preservation = screen.getByTestId('dataset.backup_cleanup.backup_first');
    const acknowledgement = screen.getByTestId('dataset.backup_cleanup.acknowledgement');
    const assertDefaults = () => {
      expect(recursive).not.toBeChecked();
      expect(preservation).toBeChecked();
      expect(acknowledgement).not.toBeChecked();
      expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
      fireEvent.submit(screen.getByTestId('dataset.backup_cleanup.form'));
      expect(api.submit).not.toHaveBeenCalled();
    };
    const chooseOptions = async () => {
      await user.click(recursive);
      await user.click(preservation);
      await user.click(acknowledgement);
      expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeEnabled();
    };
    await chooseOptions();
    view.setDataset(11);
    assertDefaults();
    for (const hint of ['false', 'omitted', 'true']) {
      await chooseOptions();
      await user.click(screen.getByTestId('test.scope_' + hint));
      assertDefaults();
    }
    expect(screen.getByTestId('test.search')).toHaveTextContent('recursive=true');
  });
  it('refuses a form submission without acknowledgement even when the button is bypassed', async () => {
    mount();
    await open();
    fireEvent.submit(screen.getByTestId('dataset.backup_cleanup.form'));
    expect(api.active).not.toHaveBeenCalled();
    expect(api.submit).not.toHaveBeenCalled();
  });
  it('submits only the selected booleans once and delegates the receipt to the ordinary task controller', async () => {
    mount('/admin/datasets/10/plans?recursive=true');
    await start();
    await waitFor(() => expect(screen.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked());
    expect(api.submit.mock.calls).toEqual([[10, { recursive: false, backup_first: true }]]);
    expect(chrome.trackActionState).toHaveBeenCalledWith(
      51,
      expect.objectContaining({
        object: { kind: 'Dataset', id: 10 },
        mutationGeneration: expect.anything(),
        blockUi: true,
      })
    );
    expect(chrome.settleLocalLock).toHaveBeenCalledWith({ kind: 'Dataset', id: 10 }, null, expect.anything());
    expect(screen.getByTestId('dataset.backup_cleanup.form')).toBeVisible();
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
    fireEvent.submit(screen.getByTestId('dataset.backup_cleanup.form'));
    expect(api.submit).toHaveBeenCalledTimes(1);
  });
  it('submits deliberate recursive selection only after fresh acknowledgement', async () => {
    mount('/admin/datasets/10/plans?recursive=false');
    const user = await open(true);
    await user.click(screen.getByTestId('dataset.backup_cleanup.recursive'));
    fireEvent.submit(screen.getByTestId('dataset.backup_cleanup.form'));
    expect(api.submit).not.toHaveBeenCalled();
    await user.click(screen.getByTestId('dataset.backup_cleanup.acknowledgement'));
    await user.click(screen.getByTestId('dataset.backup_cleanup.submit'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith(10, { recursive: true, backup_first: true }));
    expect(screen.getByTestId('test.search')).toHaveTextContent('recursive=false');
  });
  it('sends an explicit preservation opt-out', async () => {
    mount();
    const user = await open(true);
    await user.click(screen.getByTestId('dataset.backup_cleanup.recursive'));
    await user.click(screen.getByTestId('dataset.backup_cleanup.backup_first'));
    await user.click(screen.getByTestId('dataset.backup_cleanup.acknowledgement'));
    await user.click(screen.getByTestId('dataset.backup_cleanup.submit'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledWith(10, { recursive: true, backup_first: false }));
    expect(screen.getByTestId('test.search')).toBeEmptyDOMElement();
  });
  it('does not submit duplicates while waiting for the ordinary action receipt', async () => {
    api.submit.mockImplementation(() => new Promise(() => {}));
    mount();
    const user = await open(true);
    await user.dblClick(screen.getByTestId('dataset.backup_cleanup.submit'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
  });
  it('retains a known preflight rejection for deliberate retry', async () => {
    api.submit.mockRejectedValueOnce(
      new HaveApiError({ status: false, message: 'A selected snapshot is not preserved' })
    );
    mount();
    const user = await open(true);
    await user.click(screen.getByTestId('dataset.backup_cleanup.submit'));
    expect(await screen.findByTestId('dataset.backup_cleanup.error')).toHaveTextContent(
      'A selected snapshot is not preserved'
    );
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeEnabled();
    await user.click(screen.getByTestId('dataset.backup_cleanup.submit'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(2));
  });
  it.each([
    new TypeError('Preflight connection lost'),
    new HaveApiError({ status: false, message: 'Preflight unavailable' }, undefined, 503),
    new ApiOutputError('preflight read', {
      data: null,
      meta: { action_state_id: 99 },
      envelope: { status: true },
      httpStatus: 200,
    }),
  ])('keeps a failed preflight read recoverable without inventing submission uncertainty: %s', async (cause) => {
    api.active.mockRejectedValueOnce(cause);
    mount();
    const user = await open(true);
    await user.click(screen.getByTestId('dataset.backup_cleanup.submit'));
    expect(await screen.findByTestId('dataset.backup_cleanup.error')).not.toHaveTextContent(
      enStorage['dataset.backup_cleanup.unknown']
    );
    expect(api.submit).not.toHaveBeenCalled();
    expect(chrome.acquireLocalLock).not.toHaveBeenCalled();
    expect(chrome.trackActionState).not.toHaveBeenCalled();
    expect(chrome.settleLocalLock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dataset.backup_cleanup.uncertain')).not.toBeInTheDocument();
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeEnabled();
    await user.click(screen.getByTestId('dataset.backup_cleanup.submit'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('dataset.backup_cleanup.acknowledgement')).not.toBeChecked());
  });
  it.each([true, false])('guards unknown/missing action receipt without resubmitting (missing=%s)', async (missing) => {
    if (missing) api.submit.mockResolvedValueOnce({ data: undefined, meta: {}, envelope: { status: true } });
    else api.submit.mockRejectedValueOnce(new TypeError('Connection lost'));
    mount();
    await start();
    expect(await screen.findByTestId('dataset.backup_cleanup.error')).toHaveTextContent(
      enStorage['dataset.backup_cleanup.unknown']
    );
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('dataset.backup_cleanup.submit')).toBeDisabled();
    expect(chrome.settleLocalLock).toHaveBeenCalledWith(
      { kind: 'Dataset', id: 10 },
      expect.any(Error),
      expect.anything()
    );
  });
  it('does not cancel accepted work when the page exits during submission', async () => {
    let finish!: (value: unknown) => void;
    api.submit.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const view = mount();
    await start();
    await waitFor(() => expect(api.submit).toHaveBeenCalled());
    view.unmount();
    finish({ data: undefined, meta: { action_state_id: 51 }, envelope: { status: true } });
    await waitFor(() => expect(chrome.trackActionState).toHaveBeenCalledWith(51, expect.anything()));
    expect(api.submit).toHaveBeenCalledTimes(1);
  });
});
