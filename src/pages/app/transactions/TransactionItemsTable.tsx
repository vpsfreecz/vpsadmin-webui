import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { formatDateTime } from '../../../lib/format';
import { durationSec } from '../../../lib/txFormat';
import type { KeysetPaginationState } from '../../../lib/hooks/useKeysetPagination';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ChipLink, MiniLink } from '../../../components/ui/ChipLink';
import { KeysetPagination } from '../../../components/ui/KeysetPagination';
import { StatusDot } from '../../../components/ui/StatusDot';
import { TableCard } from '../../../components/ui/TableCard';
import { TableRowLink } from '../../../components/ui/TableRowLink';
import { TransactionStepDetails } from './TransactionStepDetails';
import { useTransactionTableColumns } from './useTransactionTableColumns';
import {
  buildTransactionItemsFilterHref,
  type TransactionItemRow,
  type TransactionItemsFilterHrefArgs,
  type TransactionItemsTranslator,
} from './transactionItemSemantics';

interface TransactionItemsTableProps {
  rows: TransactionItemRow[];
  basePath: string;
  t: TransactionItemsTranslator;
  mode: 'app' | 'admin';
  pagination: KeysetPaginationState;
  canNext: boolean;
  pageCursor: number | null;
  filterHrefArgs: Omit<TransactionItemsFilterHrefArgs, 'overrides'>;
}

export function TransactionItemsTable({ rows, basePath, t, mode, pagination, canNext, pageCursor, filterHrefArgs }: TransactionItemsTableProps) {
  const buildFilterHref = (overrides: TransactionItemsFilterHrefArgs['overrides']) => buildTransactionItemsFilterHref({ ...filterHrefArgs, overrides });
  const columnCount = useTransactionTableColumns(mode === 'admin' ? 1 : 0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const toggle = (id: number) => setExpandedIds((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  return (
    <TableCard
      testId="transactions.items.table"
      minWidth="full"
      tableClassName="table-fixed transactions-table-status"
      footer={
        <KeysetPagination
          page={pagination.page}
          pageCount={pagination.stack.length}
          canPrev={pagination.canPrev}
          canNext={canNext}
          onPrev={pagination.goPrev}
          onNext={() => pagination.goNext(pageCursor)}
          onGoToPage={pagination.goToPage}
          limit={pagination.limit}
          allowedLimits={pagination.allowedLimits}
          onLimitChange={pagination.setLimit}
          testId="transactions.items.pagination"
        />
      }
    >
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted">
          <th className="hidden w-24 px-3 py-2 md:table-cell">{t('common.id')}</th>
          <th className="px-3 py-2">{t('transactions.chain.detail.step')}</th>
          {mode === 'admin' ? <th className="hidden w-24 px-3 py-2 xl:table-cell">{t('common.user')}</th> : null}
          <th className="hidden w-28 px-3 py-2 lg:table-cell">{t('common.node')}</th>
          <th className="hidden w-24 px-3 py-2 xl:table-cell">{t('common.vps')}</th>
          <th className="w-28 px-2 py-2 sm:w-36 sm:px-3">{t('common.state')}</th>
          <th className="hidden w-20 px-3 py-2 xl:table-cell">{t('transactions.tx.duration_label')}</th>
          <th className="w-14 px-1 py-2">
            <span className="sr-only">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const expanded = row.id !== undefined && expandedIds.has(row.id);
          const detailsId = `transaction-item-details-${row.id}`;
          const duration = durationSec(row.startedAt, row.finishedAt);
          const itemHref = row.id ? `${basePath}/transactions/items/${row.id}` : undefined;
          return (
            <React.Fragment key={row.id ?? row.name}>
              <TableRowLink
                testId={row.id ? `transactions.items.row.${row.id}` : undefined}
                to={itemHref}
                variant={row.rowVariant === 'ok' ? undefined : row.rowVariant}
                className="border-b border-border/60 align-top last:border-b-0"
              >
                <td className="hidden px-3 py-3 text-xs md:table-cell">
                  {itemHref ? <Link className="text-link hover:underline" to={itemHref}>#{row.id}</Link> : t('common.na')}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    <StatusDot variant={row.dotVariant} title={row.badgeLabel} className="mt-1 shrink-0" testId={row.id ? `transactions.items.row.${row.id}.dot` : undefined} />
                    <div className="min-w-0">
                      {itemHref ? <Link className="break-words text-sm font-medium text-fg hover:text-link hover:underline [overflow-wrap:anywhere]" to={itemHref}>{row.displayName}</Link> : row.displayName}
                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
                        {itemHref ? <Link className="text-link md:hidden" to={itemHref}>#{row.id}</Link> : null}
                        <span>{formatDateTime(row.createdAt)}</span>
                        {row.chainId ? <Link className="text-link hover:underline" to={`${basePath}/transactions/${row.chainId}`} title={t('common.open_chain_detail')}>{t('transactions.items.row.chain_chip', { id: row.chainId })}</Link> : null}
                        {row.nodeId ? <span className="break-words lg:hidden">{row.nodeLabel ?? `#${row.nodeId}`}</span> : null}
                        {row.vpsId ? <Link className="text-link xl:hidden" to={`${basePath}/vps/${row.vpsId}`}>{t('common.vps')} #{row.vpsId}</Link> : null}
                        {duration !== null ? <span className="xl:hidden">{t('transactions.tx.duration', { sec: duration })}</span> : null}
                      </div>
                    </div>
                  </div>
                </td>
                {mode === 'admin' ? (
                  <td className="hidden break-words px-3 py-3 text-xs xl:table-cell">
                    {row.userId ? <Link className="text-link hover:underline" to={`${basePath}/transactions?user=${row.userId}`}>{row.userLabel ?? `#${row.userId}`}</Link> : t('common.na')}
                  </td>
                ) : null}
                <td className="hidden break-words px-3 py-3 text-xs lg:table-cell">
                  {row.nodeId ? <Link className="text-link hover:underline" to={buildFilterHref({ node: row.nodeId })} title={t('transactions.filter.title', { text: row.nodeLabel ?? `#${row.nodeId}` })}>{row.nodeLabel ?? `#${row.nodeId}`}</Link> : t('common.na')}
                </td>
                <td className="hidden px-3 py-3 text-xs xl:table-cell">
                  {row.vpsId ? <Link className="text-link hover:underline" to={`${basePath}/vps/${row.vpsId}`}>#{row.vpsId}</Link> : t('common.na')}
                </td>
                <td className="px-2 py-3 sm:px-3"><Badge variant={row.badgeVariant}>{row.badgeLabel}</Badge></td>
                <td className="hidden px-3 py-3 text-xs text-muted xl:table-cell">{duration !== null ? t('transactions.tx.duration', { sec: duration }) : t('common.na')}</td>
                <td className="px-1 py-2">
                  {row.id !== undefined ? (
                    <Button
                      size="sm" variant="ghost" className="w-10 shrink-0"
                      ariaLabel={expanded ? t('common.collapse') : t('common.expand')}
                      aria-expanded={expanded} aria-controls={detailsId}
                      title={t('transactions.tx.details')}
                      testId={`transactions.items.row.${row.id}.toggle`}
                      onClick={() => { if (row.id !== undefined) toggle(row.id); }}
                    >
                      {expanded ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    </Button>
                  ) : null}
                </td>
              </TableRowLink>
              {expanded ? (
                <tr className="border-b border-border bg-surface-2" data-testid={`transactions.items.row.${row.id}.expanded`}>
                  <td colSpan={columnCount} className="px-3">
                    <div id={detailsId}>
                      <div className="flex flex-wrap items-center gap-2 pt-3" data-testid={`transactions.items.row.${row.id}.filters`}>
                        {row.userId && mode === 'admin' ? <ChipLink to={`${basePath}/transactions?user=${row.userId}`}>{t('common.user')}: {row.userLabel ?? `#${row.userId}`}</ChipLink> : null}
                        {row.type !== undefined ? <ChipLink to={buildFilterHref({ type: row.type })}>{t('transactions.items.row.type_chip', { type: row.type })}</ChipLink> : null}
                        {row.nodeId ? <ChipLink to={buildFilterHref({ node: row.nodeId })}>{t('common.node')}: {row.nodeLabel ?? `#${row.nodeId}`}</ChipLink> : null}
                        {row.nodeId && mode === 'admin' ? <MiniLink to={`${basePath}/nodes/${row.nodeId}`}>{t('common.open_node')}</MiniLink> : null}
                        {row.vpsId ? <ChipLink to={`${basePath}/transactions?class_name=Vps&row_id=${row.vpsId}`}>{t('common.vps')} #{row.vpsId}</ChipLink> : null}
                        {row.chainId ? <ChipLink to={buildFilterHref({ transaction_chain: row.chainId })}>{t('transactions.items.row.chain_chip', { id: row.chainId })}</ChipLink> : null}
                      </div>
                      <TransactionStepDetails tx={row.tx} t={t} />
                    </div>
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          );
        })}
      </tbody>
    </TableCard>
  );
}
