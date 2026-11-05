import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ActionStateDetailPage } from './ActionStateDetailPage';
import { TransactionDetailPage } from './TransactionDetailPage';
import { TransactionStepDetails } from './transactions/TransactionStepDetails';
import { TransactionInlineDetails } from '../../components/ui/TransactionInlineDetails';
import type { Transaction } from '../../lib/api/transactions';

const mocks = vi.hoisted(() => ({
  fetchActionState: vi.fn(),
  fetchTransactionChain: vi.fn(),
  fetchTransactions: vi.fn(),
  fetchTransaction: vi.fn(),
  cancelActionState: vi.fn(),
  chrome: {
    syncStatus: 'ok',
    syncError: null,
    retrySync: vi.fn(),
    openTasks: vi.fn(),
    closeTasks: vi.fn(),
    toggleTasks: vi.fn(),
    pinnedActionStates: [] as number[],
    pinnedTransactionChains: [] as number[],
    togglePinnedActionState: vi.fn(),
    togglePinnedTransactionChain: vi.fn(),
    trackActionState: vi.fn(),
    dismissActionState: vi.fn(),
    trackedActionStates: [] as any[],
    highlightActionStateId: null,
    localLocks: [] as any[],
    acquireLocalLock: vi.fn(),
    settleLocalLock: vi.fn(),
    releaseLocalLock: vi.fn(),
    acknowledgeUncertainLocalLock: vi.fn(),
    releaseLocalLocksByActionStateId: vi.fn(),
    isLocallyLocked: vi.fn(() => false),
  },
}));

vi.mock('../../lib/api/actionStates', () => ({
  fetchActionState: mocks.fetchActionState,
  cancelActionState: mocks.cancelActionState,
}));

vi.mock('../../lib/api/transactions', () => ({
  fetchTransactionChain: mocks.fetchTransactionChain,
  fetchTransactions: mocks.fetchTransactions,
  fetchTransaction: mocks.fetchTransaction,
}));

vi.mock('../../app/appMode', () => ({
  useAppMode: () => ({ mode: 'admin', basePath: '/admin' }),
}));

vi.mock('../../app/i18n', () => ({
  useI18n: () => ({
    lang: 'en',
    preference: 'en',
    preferredLanguageCodes: ['en', 'cs'],
    t: (key: string, vars?: Record<string, unknown>) => {
      if (key === 'operation.raw_name' && vars?.['name']) return `Backend name: ${vars['name']}`;
      let out = key;
      for (const [k, v] of Object.entries(vars ?? {})) out = out.replace(`{${k}}`, String(v));
      return out;
    },
    tc: (key: string, count: number) => `${key}:${count}`,
  }),
}));

vi.mock('../../components/layout/ChromeContext', () => ({
  useChrome: () => mocks.chrome,
}));

function renderPage(path = '/admin/action-states/900') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/action-states/:actionStateId" element={<ActionStateDetailPage />} />
          <Route path="/admin/transactions/items/:transactionId" element={<TransactionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ActionStateDetailPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: () => false,
      }))
    );
  });
  afterEach(() => vi.unstubAllGlobals());
  test('loads related transaction chain and expands a transaction debug row', async () => {
    mocks.fetchActionState.mockResolvedValue({
      data: {
        id: 900,
        label: 'Restart VPS',
        finished: false,
        status: true,
        current: 1,
        total: 2,
        transaction_chain: { id: 42, label: 'Restart chain' },
        output: { note: 'queued' },
      },
    });
    mocks.fetchTransactionChain.mockResolvedValue({ data: { id: 42, label: 'Restart chain', state: 'queued' } });
    mocks.fetchTransactions.mockResolvedValue({
      data: [
        {
          id: 501,
          transaction_chain: { id: 42 },
          name: 'Vps::Start',
          done: 'done',
          success: 0,
          node: { id: 3, name: 'node3' },
          vps: { id: 123 },
          user: { id: 7 },
          created_at: '2026-05-28T10:00:00Z',
          started_at: '2026-05-28T10:00:05Z',
          finished_at: '2026-05-28T10:00:10Z',
          input: { vps_id: 123 },
          output: { error: 'boom' },
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Restart VPS', level: 1 })).toBeInTheDocument();
    expect(mocks.fetchActionState).toHaveBeenCalledWith(900);
    expect(mocks.fetchTransactionChain).toHaveBeenCalledWith(42);
    expect(mocks.fetchTransactions).toHaveBeenCalledWith({ transactionChainId: 42, limit: 500 });
    expect(await screen.findByText(/Vps::Start/)).toBeInTheDocument();
    expect(screen.getByTestId('action_state.detail.transactions.table')).toBeInTheDocument();
    const debug = screen.getByTestId('action_state.detail.debug');
    const transactions = screen.getByTestId('action_state.detail.transactions');
    expect(debug).not.toHaveAttribute('open');
    expect(transactions.compareDocumentPosition(debug) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.click(within(debug).getByText('action_state.section.debug', { selector: 'summary' }));
    expect(debug).toHaveAttribute('open');
    expect(debug.querySelector('pre')?.textContent).toBe(JSON.stringify({ output: { note: 'queued' } }, null, 2));
    await userEvent.click(within(debug).getByText('action_state.section.debug', { selector: 'summary' }));

    await userEvent.click(screen.getByTestId('action_state.detail.tx.toggle.501'));

    await waitFor(() => expect(screen.getByTestId('action_state.detail.tx.expanded.501')).toBeInTheDocument());
    const expandedRow = screen.getByTestId('action_state.detail.tx.expanded.501');
    expect(within(expandedRow).getAllByText(/boom/).length).toBeGreaterThanOrEqual(2);
    expect(within(expandedRow).getAllByText(/vps_id/)).toHaveLength(2);
  });
});

const diagnosticTransaction: Transaction = {
  id: 702,
  name: 'Synthetic step',
  done: 'done',
  success: 0,
  node: { id: 2, name: 'node2' },
  vps: { id: 100, hostname: 'vps100' },
  transaction_chain: { id: 123 },
  priority: 20,
  type: 2,
  input: JSON.stringify({ a: 1 }),
  output: JSON.stringify({ error: 'exact failure', ok: false }),
  error: 'exact failure',
  message: 'exact failure',
  stderr: 'distinct stderr',
  result: { rollback_needed: true },
};

const diagnosticT = (key: string) => key;

describe('real transaction diagnostic consumers', () => {
  test('detail keeps exact top error Copy, suppresses only duplicate error and retains dedup/raw/payloads', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    mocks.fetchTransaction.mockResolvedValue({ data: diagnosticTransaction });
    renderPage('/admin/transactions/items/702');
    const top = await screen.findByTestId('transactions.items.detail.error');
    const helper = screen.getByTestId('transactions.items.detail.debug_sections');
    await user.click(within(top).getByTestId('transactions.items.detail.error.copy'));
    expect(writeText).toHaveBeenLastCalledWith('exact failure');
    expect(within(helper).queryByText('transactions.tx.error_label')).not.toBeInTheDocument();
    expect(within(helper).queryByText('transactions.tx.section.message')).not.toBeInTheDocument();
    expect(within(helper).getByText('distinct stderr')).toBeInTheDocument();
    for (const [label, value] of [
      ['transactions.tx.input', diagnosticTransaction.input],
      ['transactions.tx.output', diagnosticTransaction.output],
    ]) {
      const block = within(helper).getByText(label!, { exact: true }).parentElement!.parentElement!;
      await user.click(within(block).getByRole('button', { name: 'common.copy' }));
      expect(writeText).toHaveBeenLastCalledWith(value);
    }
    const metadata = screen.getByTestId('transactions.items.detail.info.disclosure');
    expect(metadata).not.toHaveAttribute('open');
    await user.click(metadata.querySelector('summary')!);
    expect(screen.getByTestId('transactions.items.detail.node_link')).toHaveAttribute('href', '/admin/nodes/2');
    const raw = screen.getByTestId('transactions.items.detail.raw');
    await user.click(raw.querySelector('summary')!);
    expect(raw.querySelector('pre')?.textContent).toBe(JSON.stringify(diagnosticTransaction, null, 2));
  });

  test.each(['inline', 'step'] as const)(
    '%s keeps default exact error/Copy, distinct extras, input/output and supplied raw',
    async (consumer) => {
      const user = userEvent.setup();
      const writeText = vi.spyOn(navigator.clipboard, 'writeText');
      const { container } = render(
        <MemoryRouter>
          {consumer === 'inline' ? (
            <TransactionInlineDetails
              tx={diagnosticTransaction}
              t={diagnosticT}
              basePath="/admin"
              raw={diagnosticTransaction}
            />
          ) : (
            <TransactionStepDetails tx={diagnosticTransaction} t={diagnosticT} />
          )}
        </MemoryRouter>
      );
      const errorBlock = screen.getByText('transactions.tx.error_label', { exact: true }).parentElement!.parentElement!;
      const error = within(errorBlock).getByText('exact failure', { selector: 'pre', exact: true });
      await user.click(within(error.parentElement!).getByRole('button', { name: 'common.copy' }));
      expect(writeText).toHaveBeenLastCalledWith('exact failure');
      expect(screen.queryByText('transactions.tx.section.message')).not.toBeInTheDocument();
      expect(screen.getByText('distinct stderr', { selector: 'pre' })).toBeInTheDocument();
      expect(container).toHaveTextContent('rollback_needed');
      for (const [label, value] of [
        ['transactions.tx.input', diagnosticTransaction.input],
        ['transactions.tx.output', diagnosticTransaction.output],
      ]) {
        const block = screen.getByText(label!, { exact: true }).parentElement!.parentElement!;
        await user.click(within(block).getByRole('button', { name: 'common.copy' }));
        expect(writeText).toHaveBeenLastCalledWith(value);
      }
      const rawSummary = screen.getByText('transactions.items.detail.section.raw', { selector: 'summary' });
      await user.click(rawSummary);
      expect(rawSummary.parentElement!.querySelector('pre')?.textContent).toBe(
        JSON.stringify(diagnosticTransaction, null, 2)
      );
    }
  );
});
