import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { useI18n } from '../../../../app/i18n';
import { useAuth } from '../../../../app/auth';
import { useToasts } from '../../../../app/toasts';
import {
  assignHostIpAddress,
  deleteHostIpAddress,
  fetchHostIpAddress,
  fetchHostIpAddresses,
  freeHostIpAddress,
  updateHostIpAddress,
  type HostIpAddress,
} from '../../../../lib/api/networking';
import { fetchNetworkInterfaces } from '../../../../lib/api/networkInterfaces';
import { ASCENDING_ID_PAGE_SIZE, loadAscendingIdCollection } from '../../../../lib/api/ascendingIdCollection';
import { parseBoolParam, parsePositiveInt } from '../../../../lib/parse';
import { formatErrorMessage } from '../../../../lib/errors';
import { ListShell } from '../../../../components/layout/ListShell';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { FilterBar } from '../../../../components/layout/FilterBar';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { ErrorState } from '../../../../components/ui/ErrorState';
import { Input } from '../../../../components/ui/Input';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { Modal } from '../../../../components/ui/Modal';
import { Select } from '../../../../components/ui/Select';
import { UserLookupInput } from '../../../../components/ui/UserLookupInput';
import { VpsLookupInput } from '../../../../components/ui/VpsLookupInput';
import { captureNetworkListScope } from './networkListScope';
import { HostIpAddressesTable, hostAddr, isDefaultHiddenLegacyHostIp } from './HostIpAddressesTable';

export function HostIpAddressesPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const { pushToast } = useToasts();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const [ptrEditor, setPtrEditor] = useState<HostIpAddress | null>(null);
  const [ptrValue, setPtrValue] = useState('');
  const [deleteHost, setDeleteHost] = useState<HostIpAddress | null>(null);
  const [assignHost, setAssignHost] = useState<HostIpAddress | null>(null);
  const [assignVps, setAssignVps] = useState<number | null>(null);
  const [assignInterface, setAssignInterface] = useState('');
  const [ptrLoadingId, setPtrLoadingId] = useState<number | null>(null);
  const ptrScopeRef = useRef<{ generation: number; isCurrent: () => boolean } | null>(null);

  const addr = String(sp.get('addr') ?? '').trim();
  const userId = parsePositiveInt(sp.get('user'));
  const vpsId = parsePositiveInt(sp.get('vps'));
  const assigned = parseBoolParam(sp.get('assigned'));
  const requestedLimit = parsePositiveInt(sp.get('limit'));
  const limit = requestedLimit === 25 || requestedLimit === 100 ? requestedLimit : 50;
  const [page, setPage] = useState(1);
  const [legacyReset, setLegacyReset] = useState(false);
  const legacyParams = sp.has('q') || sp.has('from_id') || sp.has('page');
  const filterKey = JSON.stringify({ addr, userId, vpsId, assigned });
  const filterGenerationRef = useRef(0);
  const previousFilterRef = useRef(filterKey);
  useEffect(() => {
    if (previousFilterRef.current === filterKey) return;
    previousFilterRef.current = filterKey;
    filterGenerationRef.current += 1;
    setPtrEditor(null);
  }, [filterKey]);
  useEffect(() => () => { filterGenerationRef.current += 1; }, []);
  useEffect(() => setPage(1), [filterKey, limit]);
  useEffect(() => {
    if (!legacyParams) return;
    const next = new URLSearchParams(sp);
    ['q', 'from_id', 'page'].forEach((key) => next.delete(key));
    setLegacyReset(true);
    setSp(next, { replace: true });
  }, [legacyParams, sp, setSp]);
  const unsupportedUserFilter = userId !== undefined && auth.role !== 'admin';
  const scope = captureNetworkListScope(auth, 'host_ip_addresses', filterKey);
  const scopeSignature = JSON.stringify(scope.key);
  useEffect(() => {
    setPtrEditor(null);
    setDeleteHost(null);
    setAssignHost(null);
    ptrScopeRef.current = null;
  }, [scopeSignature]);

  const listQ = useQuery({
    queryKey: ['host_ip_addresses', 'ascending_list', scope.key],
    queryFn: ({ signal }) => loadAscendingIdCollection<HostIpAddress>({
      signal,
      isCurrent: scope.isCurrent,
      fetchPage: (fromId, requestSignal) => fetchHostIpAddresses({
        addr: addr || undefined,
        user: userId,
        vps: vpsId,
        assigned,
        order: 'asc',
        limit: ASCENDING_ID_PAGE_SIZE,
        fromId,
        count: true,
        signal: requestSignal,
      }),
    }),
    enabled: auth.status === 'authenticated' && !unsupportedUserFilter && !legacyParams,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const netifsQ = useQuery({
    queryKey: ['network_interface', 'host-ip-assign', { vpsId: assignVps, limit: 100 }],
    queryFn: async () => (await fetchNetworkInterfaces(assignVps as number, { limit: 100 })).data,
    enabled: Boolean(assignHost && assignVps),
  });

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['host_ip_addresses'] }),
      qc.invalidateQueries({ queryKey: ['ip_addresses'] }),
      qc.invalidateQueries({ queryKey: ['ip_address_assignments'] }),
      listQ.refetch(),
    ]);
  };

  const updatePtrM = useMutation({
    mutationFn: async () => {
      if (!ptrEditor) throw new Error(t('admin.host_ip_addresses.action.error_missing'));
      if (!ptrScopeRef.current?.isCurrent() || ptrScopeRef.current.generation !== filterGenerationRef.current) {
        throw new Error(t('admin.host_ip_addresses.action.error'));
      }
      return updateHostIpAddress(ptrEditor.id, { reverse_record_value: ptrValue.trim() });
    },
    onSuccess: async () => {
      setPtrEditor(null);
      setPtrValue('');
      await refresh();
      pushToast({ variant: 'ok', title: t('admin.host_ip_addresses.toast.ptr_saved') });
    },
  });

  const assignM = useMutation({
    mutationFn: async () => {
      if (!assignHost) throw new Error(t('admin.host_ip_addresses.action.error_missing'));
      if (!scope.isCurrent()) throw new Error(t('admin.host_ip_addresses.action.error'));
      const networkInterface = Number(assignInterface.trim());
      if (!Number.isInteger(networkInterface) || networkInterface <= 0) throw new Error(t('admin.host_ip_addresses.assign.interface_required'));
      return assignHostIpAddress(assignHost.id, { network_interface: networkInterface });
    },
    onSuccess: async () => {
      setAssignHost(null);
      setAssignVps(null);
      setAssignInterface('');
      await refresh();
      pushToast({ variant: 'ok', title: t('admin.host_ip_addresses.toast.assigned') });
    },
  });

  const freeM = useMutation({
    mutationFn: async (hostId: number) => {
      if (!scope.isCurrent()) throw new Error(t('admin.host_ip_addresses.action.error'));
      return freeHostIpAddress(hostId);
    },
    onSuccess: async () => {
      await refresh();
      pushToast({ variant: 'ok', title: t('admin.host_ip_addresses.toast.freed') });
    },
  });

  const deleteM = useMutation({
    mutationFn: async () => {
      if (!deleteHost) throw new Error(t('admin.host_ip_addresses.action.error_missing'));
      if (!scope.isCurrent()) throw new Error(t('admin.host_ip_addresses.action.error'));
      return deleteHostIpAddress(deleteHost.id);
    },
    onSuccess: async () => {
      setDeleteHost(null);
      await refresh();
      pushToast({ variant: 'ok', title: t('admin.host_ip_addresses.toast.deleted') });
    },
  });

  const filtersActive = Boolean(addr || userId || vpsId || assigned !== undefined);
  const rawRows = listQ.data?.rows ?? [];
  const rows = useMemo(
    () => (filtersActive ? rawRows : rawRows.filter((row) => !isDefaultHiddenLegacyHostIp(row))),
    [filtersActive, rawRows]
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / limit));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * limit, currentPage * limit);
  const partial = listQ.data?.completeness === 'partial';

  const setParam = (key: string, value?: string) => {
    filterGenerationRef.current += 1;
    const next = new URLSearchParams(sp);
    if (value && value.trim()) next.set(key, value.trim());
    else next.delete(key);
    ['from_id', 'page'].forEach((k) => next.delete(k));
    setPage(1);
    setLegacyReset(false);
    setSp(next);
  };

  const clearFilters = () => {
    filterGenerationRef.current += 1;
    const next = new URLSearchParams();
    next.set('limit', String(limit));
    setPage(1);
    setLegacyReset(false);
    setSp(next);
  };

  const editPtr = async (id: number) => {
    const generation = filterGenerationRef.current;
    const search = sp.toString();
    setPtrLoadingId(id);
    try {
      const detail = (await fetchHostIpAddress(id)).data;
      if (!scope.isCurrent() || filterGenerationRef.current !== generation ||
          new URLSearchParams(window.location.search).toString() !== search) return;
      if (!detail || detail.id !== id) throw new Error('Invalid host IP address');
      ptrScopeRef.current = { generation, isCurrent: scope.isCurrent };
      setPtrEditor(detail);
      setPtrValue(String(detail.reverse_record_value ?? ''));
    } catch {
      if (scope.isCurrent()) pushToast({ variant: 'danger', title: t('admin.host_ip_addresses.load_error') });
    } finally {
      setPtrLoadingId(null);
    }
  };

  return (
    <ListShell
      testId="admin.host_ip_addresses.page"
      header={<PageHeader title={t('admin.host_ip_addresses.title')} description={t('admin.host_ip_addresses.subtitle')} />}
      filters={
        <FilterBar
          left={
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-full max-w-sm">
                <Input testId="admin.host_ip_addresses.filter.addr" value={addr} onChange={(e) => setParam('addr', e.target.value)} placeholder={t('admin.network_list.exact_addr')} />
              </div>
              <div className="w-64">
                <UserLookupInput testId="admin.host_ip_addresses.filter.user" value={userId ? String(userId) : ''} onChange={(v) => setParam('user', v)} placeholder={t('admin.host_ip_addresses.filter.user.placeholder')} />
              </div>
              <div className="w-64">
                <VpsLookupInput testId="admin.host_ip_addresses.filter.vps" value={vpsId ?? null} onChange={(v) => setParam('vps', v == null ? '' : String(v))} placeholder={t('admin.host_ip_addresses.filter.vps.placeholder')} />
              </div>
            </div>
          }
          right={
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-40">
                <Select
                  testId="admin.host_ip_addresses.filter.assigned"
                  value={assigned === undefined ? 'all' : assigned ? 'true' : 'false'}
                  onChange={(e) => setParam('assigned', e.target.value === 'all' ? '' : e.target.value)}
                  options={[
                    { value: 'all', label: t('admin.host_ip_addresses.filter.assigned.all') },
                    { value: 'true', label: t('admin.host_ip_addresses.filter.assigned.true') },
                    { value: 'false', label: t('admin.host_ip_addresses.filter.assigned.false') },
                  ]}
                />
              </div>
              {filtersActive ? <Button variant="secondary" testId="admin.host_ip_addresses.filter.clear" onClick={clearFilters}>{t('common.clear_filters')}</Button> : null}
            </div>
          }
        />
      }
    >
      {legacyReset ? <Alert variant="info" className="mb-3" testId="admin.host_ip_addresses.legacy_reset">{t('admin.network_list.legacy_reset')}</Alert> : null}
      {partial ? (
        <Alert variant="warn" className="mb-3" testId="admin.host_ip_addresses.partial">
          {t(listQ.data?.reason === 'budget' ? 'admin.network_list.partial_budget' : 'admin.network_list.partial_failure', { count: rows.length })}
          <div className="mt-2"><Button variant="secondary" size="sm" onClick={() => void listQ.refetch()}>{t('common.retry')}</Button></div>
        </Alert>
      ) : null}
      {unsupportedUserFilter ? (
        <Alert variant="danger" testId="admin.host_ip_addresses.unsupported_filter">
          {t('admin.network_list.user_filter_admin_only')}
          <div className="mt-2"><Button variant="secondary" size="sm" onClick={() => setParam('user')}>{t('common.clear_filters')}</Button></div>
        </Alert>
      ) : legacyParams || listQ.isLoading ? <LoadingState /> : listQ.isError ? <ErrorState title={t('admin.host_ip_addresses.load_error')} /> : partial && rows.length === 0 ? (
        <Alert variant="warn" testId="admin.host_ip_addresses.partial_empty">{t('admin.network_list.partial_empty')}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title={t('admin.host_ip_addresses.empty')} />
      ) : (
        <HostIpAddressesTable
          rows={visibleRows}
          partial={partial}
          page={currentPage}
          pageCount={pageCount}
          limit={limit}
          ptrLoadingId={ptrLoadingId}
          assignPending={assignM.isPending}
          freePending={freeM.isPending}
          onPageChange={setPage}
          onLimitChange={(value) => setParam('limit', String(value))}
          onEditPtr={(id) => void editPtr(id)}
          onAssign={(row) => {
            setAssignHost(row);
            setAssignVps(null);
            setAssignInterface('');
          }}
          onFree={(id) => freeM.mutate(id)}
          onDelete={(row) => {
            deleteM.reset();
            setDeleteHost(row);
          }}
        />
      )}

      {(updatePtrM.error || assignM.error || freeM.error) ? (
        <ErrorState
          title={t('admin.host_ip_addresses.action.error')}
          error={updatePtrM.error || assignM.error || freeM.error}
          testId="admin.host_ip_addresses.action.error"
        />
      ) : null}

      <Modal
        open={Boolean(ptrEditor)}
        title={t('admin.host_ip_addresses.ptr.title')}
        onClose={() => setPtrEditor(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPtrEditor(null)} disabled={updatePtrM.isPending}>
              {t('common.cancel')}
            </Button>
            <ActionButton loading={updatePtrM.isPending} onClick={() => updatePtrM.mutate()}>
              {t('common.save')}
            </ActionButton>
          </div>
        }
      >
        <label className="block">
          <div className="mb-1 text-sm font-medium">{ptrEditor ? hostAddr(ptrEditor) : ''}</div>
          <Input value={ptrValue} onChange={(e) => setPtrValue(e.target.value)} placeholder="host.example.org." />
        </label>
        <div className="mt-1 text-xs text-muted">{t('admin.host_ip_addresses.ptr.help')}</div>
      </Modal>

      <Modal
        open={Boolean(assignHost)}
        title={t('admin.host_ip_addresses.assign.title')}
        onClose={() => setAssignHost(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignHost(null)} disabled={assignM.isPending}>
              {t('common.cancel')}
            </Button>
            <ActionButton loading={assignM.isPending} disabled={!assignInterface.trim()} onClick={() => assignM.mutate()}>
              {t('admin.host_ip_addresses.action.assign')}
            </ActionButton>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block">
            <div className="mb-1 text-sm font-medium">{t('admin.host_ip_addresses.assign.vps')}</div>
            <VpsLookupInput value={assignVps} onChange={setAssignVps} placeholder={t('admin.host_ip_addresses.assign.vps.placeholder')} />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium">{t('admin.host_ip_addresses.assign.interface')}</div>
            <Select
              value={assignInterface}
              onChange={(e) => setAssignInterface(e.target.value)}
              disabled={!assignVps || netifsQ.isLoading}
              options={[
                { value: '', label: t('admin.host_ip_addresses.assign.interface.placeholder') },
                ...(netifsQ.data ?? []).map((ni: any) => ({
                  value: String(ni.id),
                  label: `${ni.name ?? `#${ni.id}`} (#${ni.id})`,
                })),
              ]}
            />
          </label>
          <div className="text-xs text-muted">{t('admin.host_ip_addresses.assign.help')}</div>
        </div>
      </Modal>

      <ConfirmDialog
        testId="admin.host_ip_addresses.delete_confirm"
        open={Boolean(deleteHost)}
        title={t('admin.host_ip_addresses.delete.title')}
        description={deleteHost ? t('admin.host_ip_addresses.delete.desc', { host: hostAddr(deleteHost) }) : undefined}
        danger
        confirmLabel={t('common.delete')}
        confirmLoading={deleteM.isPending}
        onCancel={() => {
          deleteM.reset();
          setDeleteHost(null);
        }}
        onConfirm={() => deleteM.mutate()}
      >
        {deleteM.isError ? (
          <Alert variant="danger" title={t('common.error')} testId="admin.host_ip_addresses.delete_confirm.error">
            {formatErrorMessage(deleteM.error)}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </ListShell>
  );
}
