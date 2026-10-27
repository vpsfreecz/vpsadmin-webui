import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchActionState, type ActionState } from '../../lib/api/actionStates';
import { fetchTransactionChain, fetchTransactions, type Transaction } from '../../lib/api/transactions';
import { useAppMode } from '../../app/appMode';
import { useI18n } from '../../app/i18n';
import { formatDateTime } from '../../lib/format';
import { formatErrorMessage } from '../../lib/errors';
import { useActionStatePollIntervalMs, useTierAIntervalMs } from '../../lib/refreshTiers';
import { extractRelatedTransactionChainIdFromActionState } from '../../lib/taskLinks';
import { durationSec, safeJson } from '../../lib/txFormat';
import { actionStateBadge, actionStateProgressLabel, actionStateProgressPercent, isFailingActionState, isFinishedActionState, transactionBadge } from '../../lib/taskStatus';
import { resourceId, refLabel } from '../../lib/resources';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { StatusDot } from '../ui/StatusDot';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { TransactionInlineDetails } from '../ui/TransactionInlineDetails';
import { useChrome, type TrackedActionState } from './ChromeContext';
import { TrackedTaskTargetLink } from './TrackedTaskTargetLink';
import { compactFailureSummary, trackedActionLabel, trackedTargetLabel } from './taskPresentation';

function backendDetailPayload(s: ActionState): string {
  const keys = ['error', 'errors', 'exception', 'message', 'output', 'result', 'response', 'stderr', 'stdout', 'backtrace'];
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(s, key)) picked[key] = s[key];
  }
  return Object.keys(picked).length > 0 ? safeJson(picked) : safeJson(s);
}

export function ActionStateInspect(props: {
  actionStateId: number;
  fallback?: ActionState;
  trackedMeta?: TrackedActionState;
  pinned: boolean;
  onBack: () => void;
  onTogglePin?: (actionStateId: number) => void;
}) {
  const { basePath } = useAppMode();
  const chrome = useChrome();
  const i18n = useI18n();
  const actionPollMs = useActionStatePollIntervalMs();
  const tierARefetchMs = useTierAIntervalMs();
  const [expandedTx, setExpandedTx] = useState<Set<number>>(() => new Set());

  const actionQ = useQuery({
    queryKey: ['action_state', 'show', { id: props.actionStateId }],
    queryFn: async () => (await fetchActionState(props.actionStateId)).data,
    initialData: props.fallback,
    refetchInterval: (query) => (query.state.data && isFinishedActionState(query.state.data) ? false : actionPollMs),
  });

  const s = actionQ.data;
  const relatedChainId = s ? extractRelatedTransactionChainIdFromActionState(s) : null;

  const chainQ = useQuery({
    queryKey: ['transaction_chains', 'show', { id: relatedChainId ?? -1 }],
    queryFn: async () => (await fetchTransactionChain(relatedChainId!)).data,
    enabled: Boolean(relatedChainId && relatedChainId > 0),
    refetchInterval: relatedChainId ? tierARefetchMs : false,
  });

  const txQ = useQuery({
    queryKey: ['transactions', 'list', { transactionChainId: relatedChainId ?? -1, limit: 100 }],
    queryFn: async () => (await fetchTransactions({ transactionChainId: relatedChainId!, limit: 100 })).data,
    enabled: Boolean(relatedChainId && relatedChainId > 0),
    refetchInterval: relatedChainId ? tierARefetchMs : false,
  });

  const transactionRows = txQ.data ?? [];
  const transactionIds = transactionRows
    .map((tx) => Number(tx.id))
    .filter((txId) => Number.isFinite(txId) && txId > 0);

  const toggleTx = (txId: number) => {
    setExpandedTx((prev) => {
      const next = new Set(prev);
      if (next.has(txId)) next.delete(txId);
      else next.add(txId);
      return next;
    });
  };

  const expandAllTx = () => setExpandedTx(new Set(transactionIds));
  const collapseAllTx = () => setExpandedTx(new Set());

  if (actionQ.isLoading && !s) {
    return (
      <div>
        <Button size="sm" variant="secondary" onClick={props.onBack}>{i18n.t('common.back')}</Button>
        <div className="flex items-center justify-center py-8"><Spinner /></div>
      </div>
    );
  }

  if (actionQ.isError || !s) {
    return (
      <div>
        <Button size="sm" variant="secondary" onClick={props.onBack}>{i18n.t('common.back')}</Button>
        <div className="mt-3">
          <Alert variant="danger" title={i18n.t('action_state.load_error.title')}>
            {actionQ.isError ? formatErrorMessage(actionQ.error) : i18n.t('action_state.not_found.body')}
          </Alert>
        </div>
      </div>
    );
  }

  const id = Number(s.id ?? props.actionStateId);
  const backendLabel = s.label ? String(s.label) : i18n.t('action_state.title_fallback', { id });
  const label = trackedActionLabel(props.trackedMeta, backendLabel, i18n.t);
  const badge = actionStateBadge(s, i18n.t);
  const pct = actionStateProgressPercent(s);
  const pLabel = actionStateProgressLabel(s);
  const createdAt = s.created_at ? formatDateTime(String(s.created_at)) : null;
  const updatedAt = s.updated_at ? formatDateTime(String(s.updated_at)) : null;
  const tracked = chrome.trackedActionStates.some((x) => x.id === id);
  const chain = chainQ.data;
  const target = trackedTargetLabel(props.trackedMeta, s);
  const failureSummary = compactFailureSummary(s);
  const actionStateIdLabelKey = isFailingActionState(s)
    ? 'tasks.inspect.action_state_id.failed'
    : isFinishedActionState(s)
      ? 'tasks.inspect.action_state_id.completed'
      : 'tasks.inspect.action_state_id.running';

  const renderTxCard = (tx: Transaction) => {
    const b = transactionBadge(tx);
    const name = tx.name ? String(tx.name) : `#${tx.id}`;
    const txId = Number(tx.id);
    const hasTxId = Number.isFinite(txId) && txId > 0;
    const expanded = hasTxId && expandedTx.has(txId);
    const nodeId = resourceId(tx.node);
    const vpsId = resourceId(tx.vps);
    const type = typeof tx.type === 'number' ? Number(tx.type) : null;
    const priority = typeof tx.priority === 'number' ? Number(tx.priority) : null;
    const started = tx.started_at as string | null | undefined;
    const finished = tx.finished_at as string | null | undefined;
    const sec = durationSec(started, finished);
    const dotVariant =
      b.variant === 'danger' || b.variant === 'warn' || b.variant === 'ok' || b.variant === 'info'
        ? b.variant
        : 'neutral';
    const meta: React.ReactNode[] = [];
    if (hasTxId) meta.push(<span key="id">#{txId}</span>);
    if (type !== null) meta.push(<span key="type">{i18n.t('transactions.items.row.type_chip', { type })}</span>);
    if (priority !== null) meta.push(<span key="priority">{i18n.t('transactions.tx.prio', { prio: priority })}</span>);
    if (nodeId) meta.push(<span key="node">{refLabel(tx.node) || `#${nodeId}`}</span>);
    if (vpsId) {
      meta.push(
        <Link key="vps" className="underline" to={`${basePath}/vps/${vpsId}`}>
          #{vpsId}
        </Link>
      );
    }
    if (started) meta.push(<span key="started">{i18n.t('common.started')}: {formatDateTime(started)}</span>);
    if (sec !== null) meta.push(<span key="duration">{i18n.t('transactions.tx.duration', { sec })}</span>);

    return (
      <div
        key={tx.id ?? name}
        className="rounded-md border border-border bg-surface p-3"
        data-testid={hasTxId ? `tasks.inspect.tx.card.${txId}` : undefined}
      >
        <div className="space-y-3">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <StatusDot variant={dotVariant} title={b.label} />
                <div className="min-w-0 break-words text-sm font-medium">{name}</div>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-faint">
                {meta.map((p, i) => (
                  <React.Fragment key={i}>{p}</React.Fragment>
                ))}
              </div>
            </div>

            <Badge variant={b.variant}>{b.label}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasTxId ? (
              <Link className="text-xs font-medium underline" to={`${basePath}/transactions/items/${txId}`}>
                {i18n.t('transactions.tx.details')}
              </Link>
            ) : null}
            {hasTxId ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toggleTx(txId)}
                testId={`tasks.inspect.tx.toggle.${txId}`}
              >
                {expanded ? i18n.t('common.collapse') : i18n.t('common.expand')}
              </Button>
            ) : null}
          </div>
        </div>

        {expanded ? (
          <div className="mt-3 border-t border-border pt-3" data-testid={`tasks.inspect.tx.expanded.${txId}`}>
            <TransactionInlineDetails
              tx={tx}
              t={i18n.t}
              basePath={basePath}
              maxHeightClass="max-h-80"
              payloadLayout="stacked"
            />
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div data-testid={`tasks.inspect.action_state.${id}`}>
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="secondary" onClick={props.onBack} testId="tasks.inspect.back">
          {i18n.t('common.back')}
        </Button>
        <Link
          className="text-xs font-medium underline"
          to={`${basePath}/action-states/${id}`}
          data-testid="tasks.inspect.open_full"
        >
          {i18n.t('tasks.inspect.open_full')}
        </Link>
      </div>

      <div className="mt-3 rounded-md border border-border bg-surface p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted">{i18n.t(actionStateIdLabelKey)}</div>
            <h3 className="mt-1 text-base font-semibold">#{id}</h3>
            <div className="mt-1 break-words text-sm">{label}</div>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><div className="text-xs text-muted">{i18n.t('common.state')}</div><div>{badge.label}</div></div>
          <div>
            <div className="text-xs text-muted">{i18n.t('tasks.inspect.success')}</div>
            <div>{isFailingActionState(s) ? i18n.t('common.no') : isFinishedActionState(s) ? i18n.t('common.yes') : i18n.t('state.running')}</div>
          </div>
          {pLabel ? <div><div className="text-xs text-muted">{i18n.t('common.progress')}</div><div>{pct !== null ? `${pLabel} · ${pct}%` : pLabel}</div></div> : null}
          {target ? (
            <div>
              <div className="text-xs text-muted">{i18n.t('tasks.meta.object')}</div>
              <TrackedTaskTargetLink tracked={props.trackedMeta} label={target} testId="tasks.inspect.target" onNavigate={chrome.closeTasks} />
            </div>
          ) : null}
          {createdAt ? <div><div className="text-xs text-muted">{i18n.t('common.created')}</div><div>{createdAt}</div></div> : null}
          {updatedAt ? <div><div className="text-xs text-muted">{i18n.t('common.updated')}</div><div>{updatedAt}</div></div> : null}
          {relatedChainId ? (
            <div>
              <div className="text-xs text-muted">{i18n.t('action_state.field.transaction_chain')}</div>
              <Link className="underline" to={`${basePath}/transactions/${relatedChainId}`}>
                {chain?.label ? String(chain.label) : `#${relatedChainId}`}
              </Link>
            </div>
          ) : null}
        </div>

        {failureSummary ? (
          <div className="mt-3 rounded-md border border-danger-border bg-danger-bg p-2 text-xs text-muted" data-testid="tasks.inspect.failure_summary">
            <span className="font-medium text-danger">{i18n.t('tasks.meta.failure_summary')}:</span> {failureSummary}
          </div>
        ) : null}

        {pct !== null ? (
          <div className="mt-3 h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full bg-fg/60" style={{ width: `${pct}%` }} />
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {props.onTogglePin ? (
            <Button size="sm" variant="secondary" onClick={() => props.onTogglePin?.(id)}>
              {props.pinned ? i18n.t('tasks.action.unpin') : i18n.t('tasks.action.pin')}
            </Button>
          ) : null}
          {tracked ? (
            <Button size="sm" variant="secondary" onClick={() => chrome.dismissActionState(id)}>
              {i18n.t('tasks.action.dismiss')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => chrome.trackActionState(id, { notifyOnInitialFinished: false })}
            >
              {i18n.t('tasks.action.track')}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-medium text-muted">{i18n.t('tasks.inspect.backend_details')}</div>
        <pre
          className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-surface p-3 text-xs text-muted"
          data-testid="tasks.inspect.backend_details"
        >
          {backendDetailPayload(s)}
        </pre>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-muted">{i18n.t('tasks.inspect.transactions')}</div>
          <div className="flex flex-wrap items-center gap-2">
            {transactionIds.length > 0 ? (
              <>
                <Button size="sm" variant="secondary" onClick={expandAllTx}>
                  {i18n.t('tasks.inspect.expand_all')}
                </Button>
                <Button size="sm" variant="secondary" onClick={collapseAllTx}>
                  {i18n.t('tasks.inspect.collapse_all')}
                </Button>
              </>
            ) : null}
            {relatedChainId ? (
              <>
                <Link className="text-xs underline" to={`${basePath}/transactions/${relatedChainId}`} data-testid="tasks.inspect.open_chain">
                  {i18n.t('tasks.inspect.open_chain')}
                </Link>
                <Link
                  className="text-xs underline"
                  to={`${basePath}/transactions/items?transaction_chain=${relatedChainId}`}
                  data-testid="tasks.inspect.view_all"
                >
                  {i18n.t('tasks.action.view_all')}
                </Link>
              </>
            ) : null}
          </div>
        </div>
        {!relatedChainId ? (
          <div className="mt-2 text-sm text-muted">{i18n.t('tasks.inspect.no_chain')}</div>
        ) : txQ.isLoading ? (
          <div className="flex items-center justify-center py-6"><Spinner /></div>
        ) : txQ.isError ? (
          <Alert variant="danger" title={i18n.t('tasks.error.load_items')}>{formatErrorMessage(txQ.error)}</Alert>
        ) : transactionRows.length > 0 ? (
          <div className="mt-2 space-y-2">{transactionRows.map(renderTxCard)}</div>
        ) : (
          <div className="mt-2 text-sm text-muted">{i18n.t('tasks.empty.no_items')}</div>
        )}
      </div>
    </div>
  );
}

