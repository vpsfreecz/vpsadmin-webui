import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  fetchTransactionChain,
  fetchTransactions,
  type Transaction,
  type TransactionChain,
} from '../../lib/api/transactions';
import { useAppMode } from '../../app/appMode';
import { useI18n } from '../../app/i18n';

import { useChrome } from '../../components/layout/ChromeContext';
import { DetailShell } from '../../components/layout/DetailShell';

import { chainBadgeFromState, isFinishedChainState, transactionBadge } from '../../lib/taskStatus';
import { useTierAIntervalMs } from '../../lib/refreshTiers';
import { formatErrorMessage } from '../../lib/errors';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/ErrorState';
import { LinkButton } from '../../components/ui/LinkButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { ObjectHeader } from '../../components/ui/ObjectHeader';
import { TransactionChainSummary } from './transactions/TransactionChainSummary';
import { TransactionChainSteps } from './transactions/TransactionChainSteps';
import { transactionChainRefetchInterval } from './transactions/transactionChainPolling';

import { Pin, PinOff } from 'lucide-react';

function chainProgressLabel(chain: TransactionChain): { label: string; pct: number | null } {
  const size = typeof (chain as any).size === 'number' ? ((chain as any).size as number) : undefined;
  const progress = typeof (chain as any).progress === 'number' ? ((chain as any).progress as number) : undefined;

  if (!size || size <= 0) return { label: '—', pct: null };
  const p = typeof progress === 'number' ? Math.max(0, Math.min(size, progress)) : 0;
  const pct = Math.round((p / size) * 100);
  return { label: `${p}/${size}`, pct };
}

function firstCurrentTransactionId(transactions: Transaction[] | undefined): number | null {
  for (const tx of transactions ?? []) {
    const txId = typeof (tx as any).id === 'number' ? ((tx as any).id as number) : null;
    if (!txId) continue;
    if (String((tx as any).done ?? '') !== 'done') return txId;
  }
  return null;
}

function firstFailedTransactionId(transactions: Transaction[] | undefined): number | null {
  for (const tx of transactions ?? []) {
    const txId = typeof (tx as any).id === 'number' ? ((tx as any).id as number) : null;
    if (!txId) continue;
    const b = transactionBadge(tx);
    if (b.variant === 'danger') return txId;
  }
  return null;
}

export function TransactionChainDetailPage() {
  const { basePath } = useAppMode();
  const chrome = useChrome();
  const i18n = useI18n();
  const t = i18n.t;

  const tierARefetchMs = useTierAIntervalMs();
  const { chainId } = useParams();
  const chainIdNum = chainId ? Number(chainId) : NaN;
  const chainIdValid = Number.isFinite(chainIdNum) && chainIdNum > 0;

  const chainQ = useQuery({
    queryKey: ['transaction_chain', chainIdNum],
    enabled: chainIdValid,
    queryFn: async () => (await fetchTransactionChain(chainIdNum)).data,
    refetchInterval: (query) => transactionChainRefetchInterval(query, tierARefetchMs),
  });

  const chainFinished = chainQ.data ? isFinishedChainState(chainQ.data.state) : false;

  const txQ = useQuery({
    queryKey: ['transactions_for_chain', chainIdNum],
    enabled: chainIdValid && chainQ.isSuccess,
    queryFn: async () => (await fetchTransactions({ transactionChainId: chainIdNum, limit: 500 })).data,
    refetchInterval: chainFinished ? false : tierARefetchMs,
  });

  const transactions = useMemo(() => [...(txQ.data ?? [])].sort((a, b) => a.id - b.id), [txQ.data]);

  const isPinned = chainIdValid && chrome.pinnedTransactionChains.includes(chainIdNum);

  const [expandedTx, setExpandedTx] = useState<Set<number>>(() => new Set());

  const togglePinned = () => {
    if (!chainIdValid) return;
    chrome.togglePinnedTransactionChain(chainIdNum);
  };

  const title = useMemo(() => {
    if (!chainIdValid) return t('transactions.chain.detail.invalid_title');
    const label = (chainQ.data as any)?.label ? String((chainQ.data as any).label) : '';
    return label || t('transactions.chain.detail.fallback_title', { id: chainIdNum });
  }, [chainIdNum, chainIdValid, chainQ.data, t]);

  const stateBadge = useMemo(() => {
    const state = chainQ.data ? String((chainQ.data as any).state ?? '') : '';
    if (!state) return null;
    const b = chainBadgeFromState(state, t);
    return <Badge variant={b.variant}>{b.label}</Badge>;
  }, [chainQ.data, t]);

  const progress = useMemo(
    () => (chainQ.data ? chainProgressLabel(chainQ.data) : { label: '—', pct: null }),
    [chainQ.data]
  );
  const transactionIds = useMemo(
    () => transactions.map((tx) => Number((tx as any).id)).filter((txId) => Number.isFinite(txId) && txId > 0),
    [transactions]
  );
  const currentTxId = useMemo(
    () => (chainFinished ? null : firstCurrentTransactionId(transactions)),
    [transactions, chainFinished]
  );
  const failedTxId = useMemo(() => firstFailedTransactionId(transactions), [transactions]);

  const toggleExpanded = (txId: number) => {
    setExpandedTx((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const expandAllTransactions = () => setExpandedTx(new Set(transactionIds));
  const collapseAllTransactions = () => setExpandedTx(new Set());

  return (
    <DetailShell testId="transactions.chain.detail" variant="wide">
      <ObjectHeader
        boxed
        testId="transactions.chain.detail.header"
        title={title}
        kicker={
          <Link className="text-accent hover:underline" to={`${basePath}/transactions`}>
            {t('transactions.chains.title')}
          </Link>
        }
        titleAfter={<span className="inline-flex max-w-full flex-wrap items-center gap-2">{stateBadge}</span>}
        meta={chainIdValid ? `#${chainIdNum}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={togglePinned}
              testId="transactions.chain.detail.pin"
              aria-label={isPinned ? t('transactions.chains.unpin.aria') : t('transactions.chains.pin.aria')}
              title={isPinned ? t('transactions.chains.unpin.title') : t('transactions.chains.pin.title')}
            >
              {isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
              {isPinned ? t('tasks.action.unpin') : t('tasks.action.pin')}
            </Button>

            {chainIdValid ? (
              <LinkButton
                to={`${basePath}/transactions/items?transaction_chain=${chainIdNum}`}
                variant="secondary"
                size="sm"
                testId="transactions.chain.detail.open_items"
              >
                {t('transactions.items.short')}
              </LinkButton>
            ) : null}

            <Button
              size="sm"
              variant="secondary"
              onClick={chrome.openTasks}
              testId="transactions.chain.detail.open_tasks"
            >
              {t('common.open_tasks')}
            </Button>
          </div>
        }
      />

      {!chainIdValid ? (
        <ErrorState
          testId="transactions.chain.detail.invalid_id"
          kindOverride="not_found"
          title={t('transactions.chain.detail.invalid_title')}
          body={t('transactions.chain.detail.invalid_body')}
          backTo={`${basePath}/transactions`}
          showStatusLink={false}
          showDetails={false}
          detailsExtra={{ page: 'transactions.chain.detail', chainId }}
        />
      ) : chainQ.isLoading ? (
        <LoadingState testId="transactions.chain.detail.loading" />
      ) : chainQ.isError ? (
        <ErrorState
          testId="transactions.chain.detail.error"
          title={t('transactions.chain.detail.load_error.title')}
          error={chainQ.error}
          onRetry={() => void chainQ.refetch()}
          backTo={`${basePath}/transactions`}
          detailsExtra={{ page: 'transactions.chain.detail', chainId: chainIdNum }}
        />
      ) : chainQ.data ? (
        <>
          <TransactionChainSummary
            chain={chainQ.data}
            basePath={basePath}
            t={t}
            progress={progress.pct !== null ? `${progress.label} · ${progress.pct}%` : t('common.na')}
            currentId={currentTxId}
            failedId={failedTxId}
          />

          <Card
            testId="transactions.chain.detail.transactions"
            className="relative min-w-0 max-w-full overflow-x-hidden"
          >
            <CardHeader
              title={t('transactions.chain.detail.section.transactions')}
              subtitle={
                chainFinished
                  ? t('transactions.chain.detail.section.transactions_subtitle_done')
                  : t('transactions.chain.detail.section.transactions_subtitle_live')
              }
              actions={
                transactionIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={expandAllTransactions}>
                      {t('transactions.chain.detail.expand_all')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={collapseAllTransactions}>
                      {t('transactions.chain.detail.collapse_all')}
                    </Button>
                  </div>
                ) : null
              }
            />
            <div>
              {txQ.isLoading ? (
                <LoadingState testId="transactions.chain.detail.transactions.loading" />
              ) : txQ.isError ? (
                <div className="p-4 text-sm text-danger">{formatErrorMessage(txQ.error)}</div>
              ) : (txQ.data ?? []).length === 0 ? (
                <div className="p-4">
                  <div className="text-sm font-medium">{t('transactions.chain.detail.empty.title')}</div>
                  <div className="mt-1 text-sm text-muted">{t('transactions.chain.detail.empty.body')}</div>
                </div>
              ) : (
                <>
                  {typeof chainQ.data.size === 'number' && chainQ.data.size > transactions.length ? (
                    <div
                      className="border-b border-border px-3 py-2 text-xs text-muted"
                      data-testid="transactions.chain.detail.partial"
                    >
                      {t('transactions.chain.detail.loaded', { count: transactions.length, total: chainQ.data.size })}
                    </div>
                  ) : null}
                  <TransactionChainSteps
                    key={chainIdNum}
                    transactions={transactions}
                    basePath={basePath}
                    t={t}
                    currentId={currentTxId}
                    failedId={failedTxId}
                    expanded={expandedTx}
                    onToggle={toggleExpanded}
                  />
                </>
              )}
            </div>
          </Card>
        </>
      ) : null}
    </DetailShell>
  );
}
