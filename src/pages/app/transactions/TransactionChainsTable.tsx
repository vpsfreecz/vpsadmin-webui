import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, List, Pin, PinOff } from 'lucide-react';

import { formatDateTime } from '../../../lib/format';
import { extractConcernRefs } from '../../../lib/concerns';
import { directConcernLink } from '../../../lib/concernLinks';
import { resourceId, refLabel } from '../../../lib/resources';
import {
  chainBadgeFromState,
  chainProgressLabel,
  chainProgressPercent,
  isFailedChainState,
  isFinishedChainState,
} from '../../../lib/taskStatus';
import { extractRelatedActionStateIdFromTransactionChain } from '../../../lib/taskLinks';
import { classifyTransactionChain, operationLabel } from '../../../lib/operationTaxonomy';
import type { KeysetPaginationState } from '../../../lib/hooks/useKeysetPagination';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { KeysetPagination } from '../../../components/ui/KeysetPagination';
import { StatusDot } from '../../../components/ui/StatusDot';
import { TableCard } from '../../../components/ui/TableCard';
import { TableRowLink } from '../../../components/ui/TableRowLink';
import { clsx } from '../../../components/ui/clsx';
import {
  type ChainState,
  type TransactionChainRow,
  type TransactionChainsTranslator,
  chainDotVariantFromState,
  getChainCreatedAt,
  getChainId,
  getChainState,
  getChainUserRef,
} from './transactionChainSemantics';

interface TransactionChainsTableProps {
  rows: TransactionChainRow[];
  basePath: string;
  t: TransactionChainsTranslator;
  queryId?: number;
  queryTrim: string;
  errorsOnly: boolean;
  state: ChainState | '';
  userId: string;
  userSessionId: string;
  pagination: KeysetPaginationState;
  canNext: boolean;
  pageCursor: number | null;
  onTogglePinned: (id: number) => void;
  showPagination?: boolean;
}

export function TransactionChainsTable(props: TransactionChainsTableProps) {
  const { rows, basePath, t, pagination, canNext, pageCursor } = props;
  const objectLinks = (chain: TransactionChainRow['c']) => {
    const concerns = extractConcernRefs(chain.concerns, { maxDepth: 3 });
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {concerns.slice(0, 2).map((ref) => {
          const short = ref.class_name.split('::').at(-1) ?? ref.class_name;
          const key = `operation.concern.${short.toLowerCase()}`;
          const translated = t(key);
          const kind = ref.class_label ?? (translated === key ? short : translated);
          const text = `${kind} #${ref.row_id}`;
          const label = ref.label ? `${text} · ${ref.label}` : text;
          const params = new URLSearchParams();
          if (!props.queryId && props.queryTrim) params.set('q', props.queryTrim);
          if (props.errorsOnly) params.set('errors', '1');
          else if (props.state) params.set('state', props.state);
          if (props.userId.trim()) params.set('user', props.userId.trim());
          if (props.userSessionId.trim()) params.set('user_session', props.userSessionId.trim());
          params.set('class_name', ref.class_name);
          params.set('row_id', String(ref.row_id));
          const direct = directConcernLink(basePath, ref.class_name, ref.row_id);
          return (
            <span key={`${ref.class_name}:${ref.row_id}`} className="inline-flex min-w-0 max-w-full items-center gap-1">
              <Link
                className="min-w-0 break-words text-link hover:underline"
                to={`${basePath}/transactions?${params}`}
                title={t('transactions.filter.title', { text: label })}
              >
                {text}
              </Link>
              {direct ? (
                <Link
                  to={direct}
                  className="inline-flex shrink-0 items-center justify-center rounded p-1 text-muted hover:bg-surface-2 hover:text-fg [@media(any-pointer:coarse)]:min-h-11 [@media(any-pointer:coarse)]:min-w-11"
                  aria-label={t('transactions.link.open_object_title', { text })}
                  title={t('transactions.link.open_object_title', { text })}
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </span>
          );
        })}
        {concerns.length > 2 ? (
          <span className="text-faint">{t('common.more_n', { count: concerns.length - 2 })}</span>
        ) : null}
        {!concerns.length ? <span className="text-faint">{t('common.na')}</span> : null}
      </div>
    );
  };
  return (
    <TableCard
      testId="transactions.table"
      minWidth="full"
      tableClassName="table-fixed"
      footer={
        props.showPagination !== false && !props.queryId ? (
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
            testId="transactions.pagination"
          />
        ) : null
      }
    >
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted">
          <th className="hidden w-24 px-3 py-2 md:table-cell">{t('common.id')}</th>
          <th className="hidden w-44 px-3 py-2 xl:table-cell">{t('common.created')}</th>
          <th className="hidden w-24 px-3 py-2 xl:table-cell">{t('common.user')}</th>
          <th className="hidden w-40 px-3 py-2 xl:table-cell">{t('common.concerns')}</th>
          <th className="px-3 py-2">{t('transactions.chains.table.operation')}</th>
          <th className="w-28 px-2 py-2 sm:w-32 sm:px-3">{t('transactions.chains.table.state_progress')}</th>
          <th className="w-14 px-1 py-2 sm:w-20">
            <span className="sr-only">{t('common.actions')}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const chain = row.c;
          const id = getChainId(chain);
          const state = getChainState(chain);
          const badge = chainBadgeFromState(state, t);
          const failed = isFailedChainState(state);
          const finished = isFinishedChainState(state);
          const percent = chainProgressPercent(chain);
          const progress = chainProgressLabel(chain);
          const user = getChainUserRef(chain);
          const userId = resourceId(user);
          const name = operationLabel(classifyTransactionChain(chain), t);
          const actionState = extractRelatedActionStateIdFromTransactionChain(chain);
          const created = formatDateTime(getChainCreatedAt(chain));
          return (
            <TableRowLink
              key={id}
              testId={`transactions.row.${id}`}
              to={`${basePath}/transactions/${id}`}
              variant={failed ? 'danger' : finished ? undefined : 'warn'}
              className="border-b border-border/60 align-middle last:border-b-0"
            >
              <td className="hidden px-3 py-2 text-xs md:table-cell">
                <Link to={`${basePath}/transactions/${id}`} className="font-medium text-link hover:underline">
                  #{id}
                </Link>
              </td>
              <td className="hidden px-3 py-2 text-xs text-muted xl:table-cell">{created}</td>
              <td className="hidden break-words px-3 py-2 text-xs xl:table-cell">
                {userId && basePath === '/admin' ? (
                  <Link
                    className="text-link hover:underline"
                    to={`${basePath}/transactions?user=${userId}`}
                    title={`#${userId}`}
                  >
                    {refLabel(user) ?? `#${userId}`}
                  </Link>
                ) : (
                  (refLabel(user) ?? t('common.na'))
                )}
              </td>
              <td className="hidden px-3 py-2 text-xs xl:table-cell">{objectLinks(chain)}</td>
              <td className="px-3 py-2">
                <div className="flex items-start gap-2">
                  <StatusDot
                    variant={chainDotVariantFromState(state)}
                    title={badge.label}
                    className="mt-1 shrink-0"
                    testId={`transactions.row.${id}.dot`}
                  />
                  <div className="min-w-0">
                    <Link
                      className="break-words text-sm font-medium text-fg hover:text-link hover:underline"
                      to={`${basePath}/transactions/${id}`}
                    >
                      {name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-faint md:hidden">
                      <Link to={`${basePath}/transactions/${id}`} className="text-link hover:underline">
                        #{id}
                      </Link>
                      <span>{created}</span>
                    </div>
                    <div className="mt-1 text-xs xl:hidden">{objectLinks(chain)}</div>
                    {actionState ? (
                      <Link
                        className="mt-1 block text-xs text-link hover:underline"
                        to={`${basePath}/action-states/${actionState}`}
                      >
                        {t('transactions.chains.row.action_state_prefix')} #{actionState}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 sm:px-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  <div className="text-xs text-muted" data-testid={`transactions.row.${id}.progress`}>
                    {finished
                      ? (progress ?? t('common.na'))
                      : progress && percent !== null
                        ? `${progress} · ${percent}%`
                        : t('common.na')}
                  </div>
                </div>
                {percent !== null && !finished ? (
                  <div
                    className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-label={t('transactions.chains.row.progress_aria', { id })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                  >
                    <div
                      className={clsx('h-full rounded-full', failed ? 'bg-danger' : 'bg-warn')}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                ) : null}
                {percent !== null && failed ? (
                  <div
                    className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"
                    role="progressbar"
                    aria-label={t('transactions.chains.row.progress_aria', { id })}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                  >
                    <div className="h-full bg-danger" style={{ width: `${percent}%` }} />
                  </div>
                ) : null}
              </td>
              <td className="px-1 py-2">
                <div className="flex flex-col items-center sm:flex-row sm:justify-end">
                  <Link
                    to={`${basePath}/transactions/items?transaction_chain=${id}`}
                    className="hidden rounded p-2 text-muted hover:bg-surface-2 hover:text-fg sm:inline-flex"
                    aria-label={t('transactions.chains.row.open_items_title', { id })}
                    title={t('transactions.chains.row.open_items_title', { id })}
                  >
                    <List className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-10 shrink-0"
                    onClick={() => props.onTogglePinned(id)}
                    title={row.pinned ? t('tasks.action.unpin') : t('tasks.action.pin')}
                    ariaLabel={row.pinned ? t('transactions.chains.unpin.aria') : t('transactions.chains.pin.aria')}
                  >
                    {row.pinned ? <PinOff className="h-4 w-4 shrink-0" /> : <Pin className="h-4 w-4 shrink-0" />}
                  </Button>
                </div>
              </td>
            </TableRowLink>
          );
        })}
      </tbody>
    </TableCard>
  );
}
