import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { useI18n } from '../../../../app/i18n';
import { fetchNetworkTrafficUserTop } from '../../../../lib/api/networking';
import { formatBytesIec } from '../../../../lib/bytes';
import { useKeysetPagination } from '../../../../lib/hooks/useKeysetPagination';
import { cursorFromDescendingNumber } from '../../../../lib/lockIndex';
import { parsePositiveInt } from '../../../../lib/parse';
import { ListShell } from '../../../../components/layout/ListShell';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { FilterBar } from '../../../../components/layout/FilterBar';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Alert } from '../../../../components/ui/Alert';
import { Input } from '../../../../components/ui/Input';
import { KeysetPagination } from '../../../../components/ui/KeysetPagination';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { Select } from '../../../../components/ui/Select';
import { TableCard } from '../../../../components/ui/TableCard';
import { Button } from '../../../../components/ui/Button';

function currentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function NetworkTrafficUsersPage() {
  const { t } = useI18n();
  const [sp, setSp] = useSearchParams();
  const now = currentYearMonth();

  const unsupportedSearch = sp.has('q');
  const [searchRemoved, setSearchRemoved] = useState(false);
  useEffect(() => {
    if (!unsupportedSearch) return;
    const next = new URLSearchParams(sp);
    ['q', 'from_bytes', 'page'].forEach(key => next.delete(key));
    setSearchRemoved(true);
    setSp(next, { replace: true });
  }, [unsupportedSearch, sp, setSp]);
  const year = parsePositiveInt(sp.get('year')) ?? now.year;
  const month = parsePositiveInt(sp.get('month')) ?? now.month;
  const limit = parsePositiveInt(sp.get('limit')) ?? 50;

  const paginationParams = useMemo(() => {
    if (!unsupportedSearch) return sp;
    const clean = new URLSearchParams(sp);
    ['q', 'from_bytes', 'page'].forEach(key => clean.delete(key));
    return clean;
  }, [unsupportedSearch, sp]);

  const paging = useKeysetPagination({
    id: 'admin.network_traffic_users.list',
    filterKey: JSON.stringify({ year, month }),
    searchParams: paginationParams,
    setSearchParams: setSp,
    defaultLimit: limit,
    allowedLimits: [25, 50, 100],
    cursorParam: 'from_bytes',
    cursorMin: 0,
  });

  const listQ = useQuery({
    queryKey: ['network_interface_accountings', 'user_top', { year, month, limit: paging.limit, fromBytes: paging.cursor ?? null }],
    queryFn: async () => (await fetchNetworkTrafficUserTop({ year, month, limit: paging.limit, fromBytes: paging.cursor ?? undefined })).data,
    placeholderData: (prev) => prev,
    enabled: !unsupportedSearch,
  });

  const rows = listQ.data ?? [];
  const nextCursor = cursorFromDescendingNumber(rows, (r: any) => Number(r.bytes ?? ((Number(r.bytes_in ?? 0) + Number(r.bytes_out ?? 0)) || 0)));
  const canNext = Boolean(nextCursor);

  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(sp);
    if (value && value.trim()) next.set(key, value.trim());
    else next.delete(key);
    ['from_bytes', 'page'].forEach((k) => next.delete(k));
    setSp(next);
  };

  const filtersActive = Boolean(year !== now.year || month !== now.month);
  const clearFilters = () => {
    const next = new URLSearchParams();
    next.set('limit', String(limit));
    setSp(next);
  };

  return (
    <ListShell
      testId="admin.network_traffic_users.page"
      header={<PageHeader title={t('admin.network_traffic_users.title')} description={t('admin.network_traffic_users.subtitle')} />}
      filters={<FilterBar
        right={<div className="flex flex-wrap items-center gap-3">
          <div className="w-28"><Input testId="admin.network_traffic_users.filter.year" value={String(year)} onChange={(e)=>setParam('year', e.target.value)} ariaLabel={t('admin.network_traffic_users.filter.year')} /></div>
          <div className="w-28"><Select testId="admin.network_traffic_users.filter.month" value={String(month)} onChange={(e)=>setParam('month', e.target.value)} options={Array.from({length:12},(_,i)=>({value:String(i+1),label:String(i+1)}))} /></div>
          {filtersActive ? <Button variant="secondary" testId="admin.network_traffic_users.filter.clear" onClick={clearFilters}>{t('common.clear_filters')}</Button> : null}
        </div>}
      />}
    >
      {searchRemoved ? <Alert variant="info" testId="admin.network_traffic_users.search_removed">{t('filters.unsupported_text_search_removed')}</Alert> : null}
      {listQ.isLoading ? <LoadingState /> : listQ.isError ? <ErrorState title={t('admin.network_traffic_users.load_error')} /> : rows.length === 0 ? <EmptyState title={t('admin.network_traffic_users.empty')} /> : (
        <TableCard testId="admin.network_traffic_users.table" footer={<KeysetPagination testId="admin.network_traffic_users.pagination" page={paging.page} pageCount={paging.pageCount} canPrev={paging.canPrev} canNext={canNext} onPrev={paging.goPrev} onNext={() => paging.goNext(nextCursor ?? null)} onGoToPage={paging.goToPage} limit={paging.limit} onLimitChange={paging.setLimit} />}>
          <thead>
            <tr>
              <th>{t('admin.network_traffic_users.field.user')}</th>
              <th>{t('admin.network_traffic_users.field.total')}</th>
              <th>{t('admin.network_traffic_users.field.in')}</th>
              <th>{t('admin.network_traffic_users.field.out')}</th>
              <th>{t('admin.network_traffic_users.field.packets')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx) => {
              const user = row.user;
              const id = typeof user?.id === 'number' && Number.isSafeInteger(user.id) && user.id > 0 ? user.id : undefined;
              const login = user && typeof user === 'object' ? String(user.login ?? '') : '';
              return (
                <tr key={id ?? `unknown-${idx}`} data-testid={`admin.network_traffic_users.row.${id ?? `unknown-${idx}`}`}>
                  <td>{login || (id === undefined ? t('common.unknown') : `#${id}`)}</td>
                  <td className="tabular-nums">{formatBytesIec(row.bytes ?? (Number(row.bytes_in ?? 0) + Number(row.bytes_out ?? 0)))}</td>
                  <td className="tabular-nums">{formatBytesIec(row.bytes_in)}</td>
                  <td className="tabular-nums">{formatBytesIec(row.bytes_out)}</td>
                  <td className="tabular-nums">{Number(row.packets ?? (Number(row.packets_in ?? 0) + Number(row.packets_out ?? 0))).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </ListShell>
  );
}
