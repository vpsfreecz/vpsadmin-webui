import { AdvisoryPartialResult } from './AdvisoryPartialResult';
import React, { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Search } from 'lucide-react';

import { advisoryGuards, requireAdvisoryActions } from '../../../../lib/api/securityAdvisoryMutations';
import { advisoryCveActions, AdvisoryChildSequenceError } from './securityAdvisoryAdminApi';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { Alert } from '../../../../components/ui/Alert';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { KeysetPagination } from '../../../../components/ui/KeysetPagination';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { Select } from '../../../../components/ui/Select';
import { Spinner } from '../../../../components/ui/Spinner';
import { TableCard } from '../../../../components/ui/TableCard';
import { securityAdvisoryStateLabel } from '../../../../lib/apiValues';
import {
  advisoryCveLabels,
  createSecurityAdvisory,
  fetchAllSecurityAdvisories,
} from '../../../../lib/api/securityAdvisories';
import { fetchLanguages } from '../../../../lib/api/languages';
import { advisoryFailureMessage } from './advisoryFailureMessage';
import { formatDateTime } from '../../../../lib/format';
import { formatErrorMessage } from '../../../../lib/errors';
import { pickLocalizedField } from '../../../../lib/translations';
import {
  SecurityAdvisoryEditorModal,
  securityAdvisoryEditorPayload,
  type SecurityAdvisoryEditorValues,
} from './SecurityAdvisoryEditorModal';
import { fetchAllSecurityAdvisoryCvesForAdmin, reconcileSecurityAdvisoryCves } from './securityAdvisoryAdminApi';
import { SECURITY_ADVISORY_STATES } from './securityAdvisoryAdminModel';

function stateBadgeVariant(state: string): 'neutral' | 'ok' | 'warn' {
  if (state === 'published') return 'ok';
  if (state === 'retracted') return 'warn';
  return 'neutral';
}

function count(value: unknown): string {
  return typeof value === 'number' ? String(value) : '—';
}

const ALLOWED_LIMITS = [25, 50, 100] as const;
const ADMIN_SECURITY_ADVISORY_API_PAGE_SIZE = 100;

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function securityAdvisoryPageCount(rowCount: number, limit: number): number {
  return Math.max(1, Math.ceil(Math.max(0, rowCount) / Math.max(1, limit)));
}

export function AdminSecurityAdvisoriesPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const { pushToast } = useToasts();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const stateParam = searchParams.get('state') ?? '';
  const state = SECURITY_ADVISORY_STATES.includes(stateParam as (typeof SECURITY_ADVISORY_STATES)[number])
    ? stateParam
    : '';
  const order: 'newest' | 'oldest' = searchParams.get('order') === 'oldest' ? 'oldest' : 'newest';
  const requestedLimit = positiveInteger(searchParams.get('limit'), 25);
  const limit = ALLOWED_LIMITS.includes(requestedLimit as (typeof ALLOWED_LIMITS)[number]) ? requestedLimit : 25;
  const requestedPage = positiveInteger(searchParams.get('page'), 1);
  const exactCve = /^CVE-\d{4}-\d{4,}$/i.test(search.trim()) ? search.trim().toUpperCase() : undefined;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const setUrlFilter = (key: 'q' | 'state' | 'order', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && !(key === 'order' && value === 'newest')) next.set(key, value);
    else next.delete(key);
    next.delete('from_id');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.delete('from_id');
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    setSearchParams(next);
  };

  const setLimit = (nextLimit: number) => {
    const next = new URLSearchParams(searchParams);
    next.delete('from_id');
    next.delete('page');
    next.set('limit', String(nextLimit));
    setSearchParams(next, { replace: true });
  };

  const advisoriesQ = useQuery({
    queryKey: ['admin', 'security_advisories', { state, order, cve: exactCve }],
    queryFn: () =>
      fetchAllSecurityAdvisories({
        limit: ADMIN_SECURITY_ADVISORY_API_PAGE_SIZE,
        state: state || undefined,
        order,
        cve: exactCve,
        includes: 'created_by,published_by',
      }),
    refetchOnWindowFocus: false,
  });
  const languagesQ = useQuery({
    queryKey: ['languages', { limit: 100 }],
    queryFn: async () => (await fetchLanguages({ limit: 100 })).data,
    refetchOnWindowFocus: false,
  });

  const filteredRows = useMemo(() => {
    const advisories = advisoriesQ.data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term || exactCve) return advisories;
    return advisories.filter((advisory) => {
      const summary = pickLocalizedField(advisory, 'summary', i18n.preferredLanguageCodes) ?? '';
      return `${advisory.id} ${advisory.name ?? ''} ${summary}`.toLowerCase().includes(term);
    });
  }, [advisoriesQ.data?.data, exactCve, i18n.preferredLanguageCodes, search]);
  const pageCount = securityAdvisoryPageCount(filteredRows.length, limit);
  const page = Math.min(requestedPage, pageCount);
  const pageRows = filteredRows.slice((page - 1) * limit, page * limit);
  const cveQueries = useQueries({
    queries: pageRows.map((advisory) => ({
      queryKey: ['security_advisory_cves', advisory.id],
      queryFn: () => fetchAllSecurityAdvisoryCvesForAdmin(advisory.id),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  });
  const rows = pageRows.map((advisory, index) => ({
    ...advisory,
    cves: cveQueries[index]?.data ?? advisory.cves ?? [],
  }));
  const [partialResult, setPartialResult] = useState<AdvisoryPartialResult | null>(null);
  const createM = useMutation({
    mutationFn: async ({ values, cves }: { values: SecurityAdvisoryEditorValues; cves: string[] }) => {
      if (partialResult) throw new Error(t('admin.security_advisories.correction.reload'));
      await requireAdvisoryActions([{ resource: 'advisory', action: 'create' }, ...advisoryCveActions([], cves)]);
      const created = await createSecurityAdvisory(securityAdvisoryEditorPayload(values));
      try {
        await reconcileSecurityAdvisoryCves(created.data.id, [], cves, advisoryGuards(created.data));
        return { advisory: created.data, childError: null };
      } catch (error) {
        // The API cannot create the draft and child CVEs atomically. Keep the
        // successfully created draft and continue on its detail instead of
        // offering a blind retry that would create a duplicate advisory.
        const sequenceError =
          error instanceof AdvisoryChildSequenceError ? error : new AdvisoryChildSequenceError([], cves, error);
        setPartialResult({ advisoryId: created.data.id, desiredCves: Object.freeze([...cves]), sequenceError });
        return { advisory: created.data, childError: advisoryFailureMessage(error, t) };
      }
    },
    onSuccess: async ({ advisory, childError }) => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'security_advisories'] });
      setEditorError(childError);
      if (!childError) setEditorOpen(false);
      pushToast(
        childError
          ? {
              variant: 'warn',
              title: t('admin.security_advisories.toast.created_without_cves'),
              body: childError,
            }
          : { variant: 'ok', title: t('admin.security_advisories.toast.created') }
      );
      if (!childError) navigate(`/admin/security-advisories/${advisory.id}`);
    },
    onError: (error) => {
      const message = advisoryFailureMessage(error, t);
      setEditorError(message);
      pushToast({ variant: 'danger', title: t('admin.security_advisories.toast.create_failed'), body: message });
    },
  });

  return (
    <div className="space-y-4" data-testid="admin.security_advisories.page">
      {!editorOpen && partialResult ? <AdvisoryPartialResult result={partialResult} created /> : null}
      <PageHeader
        title={t('admin.security_advisories.title')}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => advisoriesQ.refetch()}
              loading={advisoriesQ.isFetching}
              testId="admin.security_advisories.refresh"
            >
              <RefreshCw size={16} /> {t('common.refresh')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditorError(null);
                setEditorOpen(true);
              }}
              disabled={
                partialResult !== null || languagesQ.isLoading || languagesQ.isError || !languagesQ.data?.length
              }
              disabledReason={
                languagesQ.isError || (!languagesQ.isLoading && !languagesQ.data?.length)
                  ? t('admin.security_advisories.validation.languages_unavailable')
                  : undefined
              }
              testId="admin.security_advisories.create"
            >
              <Plus size={16} /> {t('admin.security_advisories.action.new')}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 rounded-lg border border-border bg-surface-2/55 p-3 md:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <label className="block">
          <span className="sr-only">{t('admin.security_advisories.filter.search')}</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-faint" size={16} />
            <Input
              value={search}
              onChange={(event) => setUrlFilter('q', event.target.value)}
              placeholder={t('admin.security_advisories.filter.search_placeholder')}
              className="pl-9 pr-20"
              testId="admin.security_advisories.filter.search"
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-muted">
              {t('pagination.page_of', { page, total: pageCount })}
            </span>
          </div>
        </label>
        <Select
          value={state}
          onChange={(event) => setUrlFilter('state', event.target.value)}
          testId="admin.security_advisories.filter.state"
          options={[
            { value: '', label: t('admin.security_advisories.filter.all_states') },
            ...SECURITY_ADVISORY_STATES.map((value) => ({ value, label: securityAdvisoryStateLabel(t, value) })),
          ]}
        />
        <Select
          value={order}
          onChange={(event) => setUrlFilter('order', event.target.value)}
          testId="admin.security_advisories.filter.order"
          options={[
            { value: 'newest', label: t('admin.security_advisories.filter.newest') },
            { value: 'oldest', label: t('admin.security_advisories.filter.oldest') },
          ]}
        />
      </div>

      {advisoriesQ.isLoading ? (
        <LoadingState />
      ) : advisoriesQ.error ? (
        <Alert variant="danger" title={t('common.error')}>
          {advisoryFailureMessage(advisoriesQ.error, t)}
        </Alert>
      ) : rows.length === 0 ? (
        <Alert variant="neutral" title={t('admin.security_advisories.empty.title')}>
          {t('admin.security_advisories.empty.body')}
        </Alert>
      ) : (
        <TableCard testId="admin.security_advisories.table" minWidth="lg" className="overflow-hidden">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="min-w-64 px-4 py-3">{t('admin.security_advisories.table.advisory')}</th>
              <th className="px-4 py-3">{t('admin.security_advisories.table.state')}</th>
              <th className="px-4 py-3">{t('admin.security_advisories.table.published')}</th>
              <th className="px-4 py-3 text-right">{t('admin.security_advisories.table.nodes')}</th>
              <th className="px-4 py-3 text-right">{t('admin.security_advisories.table.users')}</th>
              <th className="px-4 py-3 text-right">{t('admin.security_advisories.table.vps')}</th>
              <th className="px-4 py-3 text-right">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((advisory, index) => {
              const cveQuery = cveQueries[index];
              const cves = advisoryCveLabels(advisory);
              const summary = pickLocalizedField(advisory, 'summary', i18n.preferredLanguageCodes);
              const advisoryState = String(advisory.state ?? 'draft');
              return (
                <tr
                  key={advisory.id}
                  className="table-row-tone"
                  data-testid={`admin.security_advisories.row.${advisory.id}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/security-advisories/${advisory.id}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      {advisory.name || t('admin.security_advisories.fallback_title', { id: advisory.id })}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {cves.map((cve) => (
                        <Badge key={cve} variant="info">
                          {cve}
                        </Badge>
                      ))}
                    </div>
                    {cveQuery?.isError ? (
                      <div role="alert" className="mt-2 space-y-2 text-sm">
                        <Alert variant="danger" title={t('admin.security_advisories.field.cves')}>
                          {formatErrorMessage(cveQuery.error)}
                        </Alert>
                        <Button size="sm" variant="secondary" onClick={() => void cveQuery.refetch()}>
                          {t('common.retry')}
                        </Button>
                      </div>
                    ) : cveQuery?.isPending ? (
                      <Spinner label={t('common.loading')} />
                    ) : null}
                    {summary ? <div className="mt-1 max-w-2xl text-xs text-muted">{summary}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={stateBadgeVariant(advisoryState)}>
                      {securityAdvisoryStateLabel(t, advisoryState)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-muted">
                    {advisory.published_at ? formatDateTime(advisory.published_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{count(advisory.affected_node_count)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{count(advisory.affected_user_count)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{count(advisory.affected_vps_count)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button to={`/admin/security-advisories/${advisory.id}`} size="sm" variant="secondary">
                      {t('common.open')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}

      {!advisoriesQ.isLoading && !advisoriesQ.error ? (
        <KeysetPagination
          testId="admin.security_advisories.pagination"
          page={page}
          pageCount={pageCount}
          totalPagesKnown
          canPrev={page > 1}
          canNext={page < pageCount}
          onPrev={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
          onGoToPage={setPage}
          limit={limit}
          allowedLimits={ALLOWED_LIMITS}
          onLimitChange={setLimit}
        />
      ) : null}

      <SecurityAdvisoryEditorModal
        open={editorOpen}
        mode="create"
        advisory={null}
        languages={languagesQ.data ?? []}
        cves={[]}
        error={editorError}
        saving={createM.isPending}
        blocked={partialResult !== null}
        partialResult={partialResult}
        onClose={() => !createM.isPending && setEditorOpen(false)}
        onSubmit={(values, cves) => createM.mutate({ values, cves })}
      />
    </div>
  );
}
