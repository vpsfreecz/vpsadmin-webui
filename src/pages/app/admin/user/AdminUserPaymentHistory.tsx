import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import { useAccountTimeZone } from '../../../../app/accountTimeZone';
import { useAppMode } from '../../../../app/appMode';
import { useI18n } from '../../../../app/i18n';
import { Alert } from '../../../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { KeysetPagination } from '../../../../components/ui/KeysetPagination';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { fetchUserPayments } from '../../../../lib/api/payments';
import { formatDateInTimeZone, formatDateTimeInTimeZone } from '../../../../lib/format';
import { cursorFromDescendingPage } from '../../../../lib/lockIndex';
import { formatMoneyLike, safeInt } from '../../../../lib/paymentsFormat';
import { useKeysetPagination } from '../../../../lib/hooks/useKeysetPagination';
import { resourceRefLabel } from '../../payments/PaymentsModel';

export function AdminUserPaymentHistory({ userId }: { userId: number }) {
  const accountTimeZone = useAccountTimeZone();
  const { basePath } = useAppMode();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const pagination = useKeysetPagination({
    id: 'admin.user.payments.history',
    filterKey: JSON.stringify({ userId }),
    searchParams,
    setSearchParams,
    defaultLimit: 50,
    allowedLimits: [25, 50, 100, 200],
  });

  const historyQ = useQuery({
    queryKey: ['user_payments', 'account_history', { userId, limit: pagination.limit + 1, fromId: pagination.fromId }],
    queryFn: async () => {
      return (await fetchUserPayments({
        userId,
        limit: pagination.limit + 1,
        fromId: pagination.fromId ?? undefined,
      })).data;
    },
    staleTime: 15_000,
  });

  const historyPage = historyQ.data ?? [];
  const historyInitialError = historyQ.isError && historyQ.data === undefined;
  const historyDataStale = historyQ.isError && historyQ.data !== undefined;
  const visibleHistory = useMemo(
    () => historyPage.slice(0, pagination.limit),
    [historyPage, pagination.limit]
  );
  const cursor = useMemo(() => cursorFromDescendingPage(visibleHistory), [visibleHistory]);
  const canNext = pagination.hasForward || (historyPage.length > pagination.limit && cursor !== null);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader title={t('admin.user.payments.history.title')} subtitle={t('admin.user.payments.history.description')} />
        <CardBody>
          {historyQ.isLoading ? <LoadingState /> : null}
          {historyInitialError ? (
            <ErrorState
              testId="admin.user.payments.history.error"
              title={t('payments.my.history.load_error.title')}
              error={historyQ.error}
            />
          ) : null}
          {historyDataStale ? (
            <Alert
              variant="warn"
              title={t('admin.user.payments.history.stale.title')}
              description={t('admin.user.payments.history.stale.body')}
              testId="admin.user.payments.history.stale"
            />
          ) : null}

          {!historyQ.isLoading && historyQ.data !== undefined ? (
            visibleHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-list" data-testid="admin.user.payments.history.table">
                  <thead className="bg-surface-2">
                    <tr className="text-left text-xs text-muted">
                      <th className="px-3 py-2">{t('payments.my.history.col.created')}</th>
                      <th className="px-3 py-2 text-right">{t('payments.my.history.col.amount')}</th>
                      <th className="px-3 py-2">{t('payments.my.history.col.period')}</th>
                      <th className="px-3 py-2">{t('admin.user.payments.history.col.source')}</th>
                      <th className="px-3 py-2">{t('admin.user.payments.history.col.accounted_by')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {visibleHistory.map((p) => (
                      <tr key={p.id} data-testid={`admin.user.payments.history.row.${p.id}`}>
                        <td
                          className="px-3 py-2 font-medium tabular-nums"
                          data-testid={`admin.user.payments.history.row.${p.id}.accepted_at`}
                        >
                          {formatDateTimeInTimeZone(p.created_at, accountTimeZone)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoneyLike(safeInt(p.amount))}</td>
                        <td className="px-3 py-2">
                          <span className="text-sm font-medium tabular-nums text-fg">
                            {formatDateInTimeZone(p.from_date, accountTimeZone)}
                          </span>
                          <span className="mx-2 text-muted">→</span>
                          <span className="text-sm font-medium tabular-nums text-fg">
                            {formatDateInTimeZone(p.to_date, accountTimeZone)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">
                          {p.incoming_payment?.id ? (
                            <Link
                              className="text-accent hover:underline"
                              to={`${basePath}/payments/incoming/${p.incoming_payment.id}`}
                              data-testid={`admin.user.payments.history.row.${p.id}.source`}
                            >
                              #{p.incoming_payment.id}
                            </Link>
                          ) : (
                            <span className="text-faint" data-testid={`admin.user.payments.history.row.${p.id}.source`}>
                              {t('admin.user.payments.history.source.manual')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted">
                          <span className="tabular-nums">{resourceRefLabel(p.accounted_by)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3">
                  <KeysetPagination
                    testId="admin.user.payments.history.pagination"
                    page={pagination.page}
                    pageCount={pagination.pageCount}
                    canPrev={pagination.canPrev}
                    canNext={canNext}
                    onPrev={pagination.goPrev}
                    onNext={() => pagination.goNext(cursor)}
                    onGoToPage={pagination.goToPage}
                    limit={pagination.limit}
                    allowedLimits={pagination.allowedLimits}
                    onLimitChange={pagination.setLimit}
                  />
                </div>
              </div>
            ) : (
              <EmptyState title={t('payments.my.history.empty')} />
            )
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
