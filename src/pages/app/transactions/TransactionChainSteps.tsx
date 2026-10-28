import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ArrowUpRight, Search } from 'lucide-react';
import type { Transaction } from '../../../lib/api/transactions';
import { classifyTransaction, operationLabel } from '../../../lib/operationTaxonomy';
import { transactionBadge } from '../../../lib/taskStatus';
import { durationSec } from '../../../lib/txFormat';
import { resourceId, refLabel } from '../../../lib/resources';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Table } from '../../../components/ui/Table';
import { TableRowLink } from '../../../components/ui/TableRowLink';
import { useTransactionTableColumns } from './useTransactionTableColumns';
import { TransactionStepDetails } from './TransactionStepDetails';
import type { TransactionChainsTranslator } from './transactionChainSemantics';

export function TransactionChainSteps(props: {
  transactions: Transaction[];
  basePath: string;
  t: TransactionChainsTranslator;
  currentId: number | null;
  failedId: number | null;
  expanded: Set<number>;
  onToggle: (id: number) => void;
}) {
  const { t, basePath } = props;
  const columnCount = useTransactionTableColumns();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const rows = useMemo(
    () =>
      props.transactions.filter((tx) => {
        const badge = transactionBadge(tx, t);
        const active = String(tx.done ?? '') !== 'done';
        if (state === 'failed' && badge.variant !== 'danger') return false;
        if (state === 'active' && (!active || badge.variant === 'danger')) return false;
        const haystack = [
          tx.id,
          operationLabel(classifyTransaction(tx), t),
          refLabel(tx.node),
          resourceId(tx.node),
          refLabel(tx.vps),
          resourceId(tx.vps),
        ]
          .join(' ')
          .toLocaleLowerCase();
        return haystack.includes(search.trim().toLocaleLowerCase());
      }),
    [props.transactions, search, state, t]
  );
  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t('transactions.chain.detail.search')}</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden="true" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('transactions.chain.detail.search')}
            className="pl-9"
            testId="transactions.chain.detail.filter.search"
          />
        </label>
        <Select
          ariaLabel={t('common.state')}
          value={state}
          onChange={(event) => setState(event.target.value)}
          className="sm:w-44"
          testId="transactions.chain.detail.filter.state"
          options={[
            { value: 'all', label: t('transactions.chains.filter.state.all') },
            { value: 'failed', label: t('transactions.chains.filter.errors_only.off') },
            { value: 'active', label: t('transactions.chain.detail.filter.active') },
          ]}
        />
        <span className="shrink-0 text-xs text-muted" data-testid="transactions.chain.detail.filter.count">
          {t('transactions.chain.detail.filter.count', { count: rows.length, total: props.transactions.length })}
        </span>
      </div>
      <Table
        testId="transactions.chain.detail.transactions.table"
        minWidth="full"
        className="table-fixed transactions-table-status"
        variant="list"
      >
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="hidden w-24 px-3 py-2 md:table-cell">{t('common.id')}</th>
            <th className="px-3 py-2">{t('transactions.chain.detail.step')}</th>
            <th className="hidden w-28 px-3 py-2 lg:table-cell">{t('common.node')}</th>
            <th className="hidden w-24 px-3 py-2 xl:table-cell">{t('common.vps')}</th>
            <th className="w-28 px-2 py-2 sm:w-36 sm:px-3">{t('common.state')}</th>
            <th className="hidden w-20 px-3 py-2 xl:table-cell">{t('transactions.tx.duration_label')}</th>
            <th className="w-14 px-1 py-2 sm:w-24">
              <span className="sr-only">{t('common.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => {
            const id = tx.id;
            const badge = transactionBadge(tx, t);
            const failed = badge.variant === 'danger';
            const running = String(tx.done ?? '') !== 'done';
            const nodeId = resourceId(tx.node);
            const vpsId = resourceId(tx.vps);
            const duration = durationSec(tx.started_at, tx.finished_at);
            const name = operationLabel(classifyTransaction(tx), t);
            const expanded = props.expanded.has(id);
            const detailId = `transaction-step-${id}`;
            const variant = failed ? 'danger' : running ? 'warn' : undefined;
            return (
              <React.Fragment key={id}>
                <TableRowLink
                  testId={`transactions.chain.detail.tx.${id}`}
                  to={`${basePath}/transactions/items/${id}`}
                  variant={variant}
                  className="border-b border-border/60 align-top"
                >
                  <td className="hidden px-3 py-3 text-xs md:table-cell">
                    <Link to={`${basePath}/transactions/items/${id}`} className="text-link hover:underline">
                      #{id}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      to={`${basePath}/transactions/items/${id}`}
                      className="break-words text-sm font-medium text-fg hover:text-link hover:underline"
                    >
                      {name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
                      <Link className="text-link md:hidden" to={`${basePath}/transactions/items/${id}`}>
                        #{id}
                      </Link>
                      {nodeId ? (
                        <span className="break-words lg:hidden">{refLabel(tx.node) ?? `#${nodeId}`}</span>
                      ) : null}
                      {vpsId ? (
                        <Link className="text-link xl:hidden" to={`${basePath}/vps/${vpsId}`}>
                          {t('common.vps')} #{vpsId}
                        </Link>
                      ) : null}
                      {duration !== null ? (
                        <span className="xl:hidden">{t('transactions.tx.duration', { sec: duration })}</span>
                      ) : null}
                      {tx.urgent ? <span className="text-warn">{t('transactions.tx.urgent')}</span> : null}
                    </div>
                  </td>
                  <td className="hidden break-words px-3 py-3 text-xs lg:table-cell">
                    {nodeId && basePath === '/admin' ? (
                      <Link to={`${basePath}/nodes/${nodeId}`} className="text-link hover:underline">
                        {refLabel(tx.node) ?? `#${nodeId}`}
                      </Link>
                    ) : (
                      (refLabel(tx.node) ?? t('common.na'))
                    )}
                  </td>
                  <td className="hidden px-3 py-3 text-xs xl:table-cell">
                    {vpsId ? (
                      <Link to={`${basePath}/vps/${vpsId}`} className="text-link hover:underline">
                        #{vpsId}
                      </Link>
                    ) : (
                      t('common.na')
                    )}
                  </td>
                  <td className="px-2 py-3 sm:px-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {id === props.failedId ? (
                      <div className="mt-1 text-xs font-medium text-danger">{t('transactions.tx.failed_here')}</div>
                    ) : id === props.currentId ? (
                      <div className="mt-1 text-xs text-muted">{t('transactions.tx.current_step')}</div>
                    ) : null}
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-muted xl:table-cell">
                    {duration !== null ? t('transactions.tx.duration', { sec: duration }) : t('common.na')}
                  </td>
                  <td className="px-1 py-2">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-10 shrink-0"
                        ariaLabel={expanded ? t('common.collapse') : t('common.expand')}
                        title={t('transactions.tx.details')}
                        testId={`transactions.chain.detail.tx.toggle.${id}`}
                        aria-expanded={expanded}
                        aria-controls={detailId}
                        onClick={() => props.onToggle(id)}
                      >
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                      </Button>
                      <Link
                        className="hidden rounded p-2 text-muted hover:bg-surface-2 hover:text-fg sm:inline-flex"
                        to={`${basePath}/transactions/items/${id}`}
                        data-testid={`transactions.chain.detail.tx.open.${id}`}
                        aria-label={t('common.open')}
                        title={t('common.open')}
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </td>
                </TableRowLink>
                {expanded ? (
                  <tr
                    className="border-b border-border bg-surface-2"
                    data-testid={`transactions.chain.detail.tx.expanded.${id}`}
                  >
                    <td colSpan={columnCount} className="px-3">
                      <div id={detailId}>
                        <TransactionStepDetails tx={tx} t={t} />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </Table>
      {!rows.length ? (
        <div className="p-6 text-sm text-muted" data-testid="transactions.chain.detail.filter.empty">
          {t('transactions.chains.empty.title')}
        </div>
      ) : null}
    </div>
  );
}
