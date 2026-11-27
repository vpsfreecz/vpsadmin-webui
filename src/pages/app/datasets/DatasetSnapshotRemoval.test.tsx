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
import { snapshotRemovalFixture } from '../../../test/snapshotRemoval';
import { DatasetContextProvider } from './DatasetContext';
import { DatasetSnapshotRemoval } from './DatasetSnapshotRemoval';
import { SnapshotRemovalTotals } from './DatasetSnapshotRemovalReview';

const state = vi.hoisted(() => ({ cs: false, role: 'admin', userId: 1, status: 'authenticated', busy: false }));
const api = vi.hoisted(() => ({ capability: vi.fn(), active: vi.fn(), preview: vi.fn(), submit: vi.fn() }));
const chrome = vi.hoisted(() => ({ localLocks: [] as Array<{ kind: string; id: number; uncertain: boolean }>,
  acquireLocalLock: vi.fn(), settleLocalLock: vi.fn(), trackActionState: vi.fn(), acknowledgeUncertainLocalLock: vi.fn(), openTasks: vi.fn() }));
vi.mock('../../../app/auth', () => ({ useAuth: () => ({ ...state, user: { id: state.userId } }) }));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ t: (key: string) => {
  const catalog: Record<string, string> = state.cs ? csStorage : enStorage;
  return catalog[key] ?? key;
} }) }));
vi.mock('../../../components/layout/ChromeContext', () => ({ useChrome: () => chrome }));
vi.mock('../../../lib/api/datasets', async importOriginal => ({
  ...await importOriginal<typeof import('../../../lib/api/datasets')>(),
  fetchDatasetSnapshotRemovalAvailable: api.capability,
  fetchDataset: vi.fn(async () => ({ data: {} })), fetchDatasetPlans: vi.fn(async () => ({ data: [] })),
  fetchDatasetSnapshots: vi.fn(async () => ({ data: [] })),
}));
vi.mock('../../../lib/api/transactions', () => ({ fetchActiveTransactionChains: api.active }));

function ScopeControl() {
  const [search, setSearch] = useSearchParams();
  return <><output data-testid="test.search">{search.toString()}</output><button onClick={() => setSearch({ recursive: 'false' })}>Change URL</button></>;
}
function mount(path = '/admin/datasets/42/plans?recursive=true') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const contents = (datasetId: number) => <QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <ScopeControl />
    <DatasetContextProvider value={{ dataset: { id: datasetId, name: 'root', full_name: 'synthetic/root' },
      datasetRef: { kind: 'Dataset', id: datasetId }, refetch: vi.fn(async () => undefined), refetchChains: vi.fn(async () => undefined),
      section: 'datasets', listPath: '', returnPath: '', detailPath: '', busyLocalLock: false, chains: [], chainsLoading: false,
      chainsError: null, busyTransaction: false, chainsStale: false, activeChainIds: [],
    }}><DatasetSnapshotRemoval busy={state.busy} preview={api.preview} submit={api.submit} /></DatasetContextProvider>
  </MemoryRouter></QueryClientProvider>;
  const view = render(contents(42));
  return { ...view, refresh: () => view.rerender(contents(42)), setDataset: (id: number) => view.rerender(contents(id)) };
}
async function preview() {
  const user = userEvent.setup();
  await user.click(await screen.findByTestId('dataset.snapshot_removal.preview'));
  await screen.findByTestId('dataset.snapshot_removal.inventory');
  return user;
}
async function continueToFinal() {
  const user = await preview();
  await user.click(screen.getByTestId('dataset.snapshot_removal.acknowledgement'));
  await user.click(screen.getByTestId('dataset.snapshot_removal.continue'));
  return user;
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, { cs: false, role: 'admin', userId: 1, status: 'authenticated', busy: false });
  chrome.localLocks = [];
  api.capability.mockResolvedValue({ data: true });
  api.active.mockResolvedValue([]);
  api.preview.mockImplementation(async (_id, options) => ({ data: snapshotRemovalFixture(options), meta: {} }));
  api.submit.mockReset().mockResolvedValue({ data: {}, meta: { action_state_id: 71 }, envelope: { status: true } });
  chrome.acquireLocalLock.mockResolvedValue('generation');
});

describe('complete preview and two deliberate snapshot-removal confirmations', () => {
  it.each([0, 1, 2, 4, 5, 11].flatMap(count => [false, true].map(cs => ({ count, cs }))))('renders unambiguous bilingual totals at $count (cs=$cs)', ({ count, cs }) => {
    state.cs = cs;
    render(<SnapshotRemovalTotals manifest={snapshotRemovalFixture(undefined, count).manifest} />);
    expect(screen.getByTestId('dataset.snapshot_removal.totals').querySelectorAll('dd')[2]).toHaveTextContent(String(count));
    expect(screen.getByTestId('dataset.snapshot_removal.totals')).toHaveTextContent((cs ? csStorage : enStorage)['dataset.snapshot_removal.count.snapshots']);
  });
  it.each(['user', 'support', 'unknown'])('hides the action from actual role %s', async role => {
    state.role = role; mount();
    expect(screen.queryByTestId('dataset.snapshot_removal')).not.toBeInTheDocument();
    expect(api.capability).not.toHaveBeenCalled();
  });
  it.each([false, 'failure'])('fails closed for absent or failed authenticated capability (%s)', async capability => {
    if (capability === 'failure') api.capability.mockRejectedValue(new Error('Discovery failed'));
    else api.capability.mockResolvedValue({ data: false });
    mount(); await waitFor(() => expect(api.capability).toHaveBeenCalled());
    expect(screen.queryByTestId('dataset.snapshot_removal')).not.toBeInTheDocument();
  });
  it.each([false, true])('defaults safely, renders the full inventory and preserves Cancel review (cs=%s)', async cs => {
    state.cs = cs; mount(); const user = await preview();
    const copy = cs ? csStorage : enStorage;
    expect(screen.getByTestId('dataset.snapshot_removal.recursive')).not.toBeChecked();
    expect(screen.getByTestId('dataset.snapshot_removal.disable_plans')).toBeChecked();
    expect(api.preview).toHaveBeenCalledWith(42, { recursive: false, disable_plans: true });
    expect(api.submit).not.toHaveBeenCalled();
    expect(screen.getByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeChecked();
    expect(screen.getByTestId('dataset.snapshot_removal.continue')).toBeDisabled();
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toHaveTextContent('tree.1-empty');
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toHaveTextContent('branch.empty');
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toHaveTextContent('501');
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toHaveTextContent('502');
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toHaveTextContent(copy['dataset.snapshot_removal.plan.remove']);
    const inventory = screen.getByTestId('dataset.snapshot_removal.inventory');
    await user.click(screen.getByTestId('dataset.snapshot_removal.acknowledgement'));
    await user.click(screen.getByTestId('dataset.snapshot_removal.continue'));
    expect(api.submit).not.toHaveBeenCalled(); expect(api.active).not.toHaveBeenCalled();
    expect(chrome.acquireLocalLock).not.toHaveBeenCalled();
    expect(screen.getByTestId('dataset.snapshot_removal.final')).toHaveTextContent(copy['dataset.snapshot_removal.final_description']);
    expect(screen.getByTestId('dataset.snapshot_removal.final')).toHaveTextContent('synthetic/root (#42)');
    await user.click(screen.getByTestId('dataset.snapshot_removal.final.cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toBe(inventory);
    expect(api.submit).not.toHaveBeenCalled();
  });
  it('submits once only at final confirmation with the same explicit options and digest', async () => {
    mount(); const user = userEvent.setup();
    await user.click(await screen.findByTestId('dataset.snapshot_removal.recursive'));
    await user.click(screen.getByTestId('dataset.snapshot_removal.disable_plans'));
    await continueToFinal();
    await user.dblClick(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
    expect(api.submit).toHaveBeenCalledWith(42, { recursive: true, disable_plans: false, manifest_digest: `v1:${'a'.repeat(64)}` });
    expect(chrome.trackActionState).toHaveBeenCalledWith(71, expect.objectContaining({ object: { kind: 'Dataset', id: 42 }, mutationGeneration: 'generation', blockUi: true }));
    expect(chrome.settleLocalLock).toHaveBeenCalledWith({ kind: 'Dataset', id: 42 }, null, 'generation');
    expect(screen.queryByTestId('dataset.snapshot_removal.inventory')).not.toBeInTheDocument();
  });
  it.each(['recursive', 'disable_plans'])('invalidates review and both confirmations when %s changes', async key => {
    mount(); const user = await continueToFinal();
    await user.click(screen.getByTestId('dataset.snapshot_removal.final.cancel'));
    await user.click(screen.getByTestId(`dataset.snapshot_removal.${key}`));
    expect(screen.queryByTestId('dataset.snapshot_removal.inventory')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(api.submit).not.toHaveBeenCalled();
    await preview(); expect(screen.getByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeChecked();
  });
  it.each(['dataset', 'principal', 'URL', 'role', 'capability'])('invalidates the review on %s context change', async context => {
    const view = mount(); const user = await continueToFinal();
    if (context === 'dataset') view.setDataset(43);
    if (context === 'principal') { state.userId = 2; view.refresh(); }
    if (context === 'URL') { await user.click(screen.getByTestId('dataset.snapshot_removal.final.cancel')); await user.click(screen.getByText('Change URL')); }
    if (context === 'role') { state.role = 'support'; view.refresh(); }
    if (context === 'capability') { api.capability.mockResolvedValue({ data: false }); state.userId = 2; view.refresh(); }
    await waitFor(() => expect(screen.queryByTestId('dataset.snapshot_removal.inventory')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(api.submit).not.toHaveBeenCalled();
  });
  it('ignores an old preview response after options change and starts refreshed reviews unchecked', async () => {
    let resolve!: (value: unknown) => void;
    api.preview.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    mount(); const user = userEvent.setup();
    await user.click(await screen.findByTestId('dataset.snapshot_removal.preview'));
    await user.click(screen.getByTestId('dataset.snapshot_removal.recursive'));
    resolve({ data: snapshotRemovalFixture() });
    await waitFor(() => expect(screen.getByTestId('dataset.snapshot_removal.preview')).toBeEnabled());
    expect(screen.queryByTestId('dataset.snapshot_removal.inventory')).not.toBeInTheDocument();
    await preview(); await user.click(screen.getByTestId('dataset.snapshot_removal.acknowledgement'));
    await preview(); expect(screen.getByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeChecked();
  });
  it('clears stale inventory, retains options and never automatically previews or retries', async () => {
    api.submit.mockRejectedValueOnce(new HaveApiError({ status: false, message: 'localized', errors: { manifest_digest: ['stale_preview'] } }));
    mount(); const user = userEvent.setup();
    await user.click(await screen.findByTestId('dataset.snapshot_removal.disable_plans'));
    await continueToFinal(); await user.click(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    expect(await screen.findByTestId('dataset.snapshot_removal.error')).toHaveTextContent(enStorage['dataset.snapshot_removal.stale']);
    expect(screen.queryByTestId('dataset.snapshot_removal.inventory')).not.toBeInTheDocument();
    expect(screen.getByTestId('dataset.snapshot_removal.disable_plans')).not.toBeChecked();
    expect(api.preview).toHaveBeenCalledTimes(1); expect(api.submit).toHaveBeenCalledTimes(1);
    await preview(); expect(screen.getByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeChecked();
  });
  it.each([new TypeError('Lost response'), { data: {}, meta: {} }])('blocks replay after ambiguous submission or missing receipt (%s)', async failure => {
    if (failure instanceof Error) api.submit.mockRejectedValueOnce(failure); else api.submit.mockResolvedValueOnce(failure);
    mount(); const user = await continueToFinal(); await user.click(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    expect(await screen.findByTestId('dataset.snapshot_removal.error')).toHaveTextContent(enStorage['dataset.snapshot_removal.unknown']);
    expect(screen.getByTestId('dataset.snapshot_removal.preview')).toBeDisabled();
    expect(screen.getByTestId('dataset.snapshot_removal.continue')).toBeDisabled();
    expect(api.submit).toHaveBeenCalledTimes(1);
  });
  it('keeps a failed preflight retryable without uncertainty or submission', async () => {
    api.active.mockRejectedValueOnce(new TypeError('Read failed'));
    mount(); const user = await continueToFinal(); await user.click(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    expect(await screen.findByTestId('dataset.snapshot_removal.error')).toHaveTextContent('Read failed');
    expect(api.submit).not.toHaveBeenCalled(); expect(chrome.acquireLocalLock).not.toHaveBeenCalled();
    expect(screen.getByTestId('dataset.snapshot_removal.preview')).toBeEnabled();
  });
  it('retains chosen options after a known rejection and requires a new acknowledgement', async () => {
    api.submit.mockRejectedValueOnce(new HaveApiError({ status: false, message: 'Pool unavailable' }));
    mount(); const user = userEvent.setup();
    await user.click(await screen.findByTestId('dataset.snapshot_removal.recursive'));
    await user.click(screen.getByTestId('dataset.snapshot_removal.disable_plans'));
    await continueToFinal(); await user.click(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    expect(await screen.findByTestId('dataset.snapshot_removal.error')).toHaveTextContent('Pool unavailable');
    expect(screen.getByTestId('dataset.snapshot_removal.recursive')).toBeChecked();
    expect(screen.getByTestId('dataset.snapshot_removal.disable_plans')).not.toBeChecked();
    expect(screen.getByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeChecked();
    expect(screen.getByTestId('dataset.snapshot_removal.continue')).toBeDisabled();
    expect(api.submit).toHaveBeenCalledTimes(1);
  });
  it('blocks Cancel, Escape and duplicate confirmation while submission is pending', async () => {
    api.submit.mockImplementationOnce(() => new Promise(() => {}));
    mount(); const user = await continueToFinal();
    await user.dblClick(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('dataset.snapshot_removal.final.cancel')).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeVisible();
  });
  it('hands accepted work to the task controller after the form unmounts', async () => {
    let resolve!: (value: unknown) => void;
    api.submit.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const view = mount(); const user = await continueToFinal();
    await user.click(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    await waitFor(() => expect(api.submit).toHaveBeenCalledTimes(1));
    view.unmount();
    resolve({ data: {}, meta: { action_state_id: 71 } });
    await waitFor(() => expect(chrome.trackActionState).toHaveBeenCalledWith(71, expect.objectContaining({ object: { kind: 'Dataset', id: 42 }, blockUi: true })));
    expect(api.submit).toHaveBeenCalledTimes(1);
  });
  it('does not dispatch after navigation during preflight and settles the acquired local lock', async () => {
    let resolve!: (value: unknown) => void;
    api.active.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const view = mount(); const user = await continueToFinal();
    await user.click(screen.getByTestId('dataset.snapshot_removal.final.confirm'));
    await waitFor(() => expect(api.active).toHaveBeenCalledTimes(1));
    view.unmount(); resolve([]);
    await waitFor(() => expect(chrome.settleLocalLock).toHaveBeenCalled());
    expect(api.submit).not.toHaveBeenCalled(); expect(chrome.trackActionState).not.toHaveBeenCalled();
  });
  it.each([false, true])('keeps a complete inventory larger than a normal list page (cs=%s)', async cs => {
    state.cs = cs;
    api.preview.mockImplementationOnce(async () => ({ data: snapshotRemovalFixture(undefined, 125), meta: {} }));
    mount(); await preview();
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toHaveTextContent('snapshot-125');
    expect(screen.getByTestId('dataset.snapshot_removal.totals')).toHaveTextContent('127');
    expect(api.submit).not.toHaveBeenCalled();
  });
  it('cannot advance after a failed or malformed preview', async () => {
    api.preview.mockRejectedValueOnce(new ApiOutputError('preview', { data: {}, meta: {}, envelope: { status: true }, httpStatus: 200 }));
    mount(); const user = userEvent.setup(); await user.click(await screen.findByTestId('dataset.snapshot_removal.preview'));
    expect(await screen.findByText(enStorage['dataset.snapshot_removal.invalid_preview'])).toBeVisible();
    expect(screen.queryByTestId('dataset.snapshot_removal.acknowledgement')).not.toBeInTheDocument();
    expect(api.submit).not.toHaveBeenCalled();
  });
  it('Escape returns to the unchanged review and Enter on Continue never submits', async () => {
    mount(); const user = await preview(); await user.click(screen.getByTestId('dataset.snapshot_removal.acknowledgement'));
    screen.getByTestId('dataset.snapshot_removal.continue').focus(); await user.keyboard('{Enter}');
    await screen.findByRole('dialog'); expect(api.submit).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('dataset.snapshot_removal.inventory')).toBeVisible(); expect(api.submit).not.toHaveBeenCalled();
  });
});
