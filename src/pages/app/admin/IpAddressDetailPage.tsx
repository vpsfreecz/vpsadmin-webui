import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import { useToasts } from '../../../app/toasts';
import { DetailShell } from '../../../components/layout/DetailShell';
import {
  fetchIpAddress,
  freeIpAddressRoute,
} from '../../../lib/api/ipAddresses';
import { fetchNetworkInterfaces } from '../../../lib/api/networkInterfaces';
import {
  assignHostIpAddress,
  createHostIpAddress,
  deleteHostIpAddress,
  fetchHostIpAddresses,
  freeHostIpAddress,
  updateHostIpAddress,
  type HostIpAddress,
} from '../../../lib/api/networking';
import { formatErrorMessage } from '../../../lib/errors';
import { formatDateTime } from '../../../lib/format';

import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { LinkButton } from '../../../components/ui/LinkButton';
import { CopyButton } from '../../../components/ui/CopyButton';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/ErrorState';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Modal } from '../../../components/ui/Modal';
import { ObjectHeader } from '../../../components/ui/ObjectHeader';
import { Select } from '../../../components/ui/Select';
import { Table } from '../../../components/ui/Table';
import { Textarea } from '../../../components/ui/Textarea';
import { VpsLookupInput } from '../../../components/ui/VpsLookupInput';
import { HostIpAddressRowActions } from './ipAddresses/HostIpAddressRowActions';
import { useChrome } from '../../../components/layout/ChromeContext';
import { objectRef } from '../../../lib/objectRef';
import { IpAddressOwnerCard } from './ipAddresses/IpAddressOwnerCard';
import { IpAddressRouteDialog } from './ipAddresses/IpAddressRouteDialog';

function parseIdParam(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function idFromResourceRef(v: any): number | null {
  if (!v) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'object') {
    if (typeof v.id === 'number') return v.id;
    if (typeof v.id === 'string') {
      const n = Number(v.id);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function labelFromResourceRef(v: any, fields: string[] = ['label', 'name', 'hostname', 'login', 'addr']): string {
  if (!v) return '—';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    for (const field of fields) {
      const raw = v[field];
      if (raw !== undefined && raw !== null && String(raw).trim()) return String(raw);
    }
    const id = idFromResourceRef(v);
    if (id) return `#${id}`;
  }
  return '—';
}

function parsePositiveId(raw: string): number | null {
  const n = Number(raw.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

function hostAddr(row: HostIpAddress): string {
  return String((row as any).addr ?? (row as any).ip_addr ?? `#${row.id}`);
}

export function IpAddressDetailPage() {
  const { basePath } = useAppMode();
  const { t } = useI18n();
  const { pushToast } = useToasts();
  const qc = useQueryClient();
  const chrome = useChrome();
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const ipId = parseIdParam(params['ipAddressId']);
  const [routeOpen, setRouteOpen] = useState(false);
  const [confirmFreeRoute, setConfirmFreeRoute] = useState(false);
  const [createHostsOpen, setCreateHostsOpen] = useState(false);
  const [createHostsValue, setCreateHostsValue] = useState('');
  const [ptrEditor, setPtrEditor] = useState<HostIpAddress | null>(null);
  const [ptrValue, setPtrValue] = useState('');
  const [deleteHost, setDeleteHost] = useState<HostIpAddress | null>(null);
  const [assignHost, setAssignHost] = useState<HostIpAddress | null>(null);
  const [assignHostVps, setAssignHostVps] = useState<number | null>(null);
  const [assignHostInterface, setAssignHostInterface] = useState('');

  const q = useQuery({
    queryKey: ['ip_addresses', ipId],
    queryFn: async () => {
      if (!ipId) throw new Error(t('admin.ip.invalid_id'));
      return (await fetchIpAddress(ipId, { includes: 'network,user,charged_environment,network_interface,network_interface.vps,route_via' })).data;
    },
    enabled: Boolean(ipId),
    staleTime: 30_000,
  });

  const ip = q.data ?? null;
  const ipLocked = Boolean(ipId && chrome.isLocallyLocked(objectRef('IpAddress', ipId)));
  const hostAddrsQ = useQuery({
    queryKey: ['host_ip_addresses', 'by_ip', ipId],
    queryFn: async () => (await fetchHostIpAddresses({ ipAddress: ipId as number, limit: 250 })).data,
    enabled: Boolean(ipId && ip),
  });
  const hostAssignNetifsQ = useQuery({
    queryKey: ['network_interface', 'host-ip-assign', { vpsId: assignHostVps, limit: 100 }],
    queryFn: async () => (await fetchNetworkInterfaces(assignHostVps as number, { limit: 100 })).data,
    enabled: Boolean(assignHost && assignHostVps),
  });
  const isLoading = Boolean(ipId) && q.isLoading;
  const isError = Boolean(ipId) && (q.isError || !ip);

  useEffect(() => {
    if (!ip || !location.hash) return;

    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;

    window.setTimeout(() => {
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 0);
  }, [ip, location.hash]);

  useEffect(() => {
    if (!ip) return;
    const search = new URLSearchParams(location.search);
    if (search.get('action') !== 'assign') return;
    search.delete('action');
    if (!ip.network_interface) setRouteOpen(true);
    navigate({ pathname: location.pathname, search: search.toString(), hash: '#route' }, { replace: true });
  }, [ip, location.pathname, location.search, navigate]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['ip_addresses'] }),
      qc.invalidateQueries({ queryKey: ['host_ip_addresses'] }),
      qc.invalidateQueries({ queryKey: ['ip_address_assignments'] }),
      q.refetch(),
      hostAddrsQ.refetch(),
    ]);
  };

  const freeRouteM = useMutation({
    mutationFn: async () => {
      if (!ipId) throw new Error(t('admin.ip.invalid_id'));
      if (chrome.isLocallyLocked(objectRef('IpAddress', ipId))) throw new Error(t('admin.ip.action_locked'));
      return freeIpAddressRoute(ipId);
    },
    onSuccess: async () => {
      setConfirmFreeRoute(false);
      await invalidate();
      pushToast({ variant: 'ok', title: t('admin.ip.route.toast.freed') });
    },
  });

  const createHostsM = useMutation({
    mutationFn: async () => {
      if (!ipId) throw new Error(t('admin.ip.invalid_id'));
      const addrs = createHostsValue.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
      if (addrs.length === 0) throw new Error(t('admin.ip.hosts.validation.empty'));
      for (const addr of addrs) {
        await createHostIpAddress({ ip_address: ipId, addr });
      }
      return addrs.length;
    },
    onSuccess: async (count) => {
      setCreateHostsOpen(false);
      setCreateHostsValue('');
      await invalidate();
      pushToast({ variant: 'ok', title: t('admin.ip.hosts.toast.created', { count }) });
    },
  });

  const updatePtrM = useMutation({
    mutationFn: async () => {
      if (!ptrEditor) throw new Error(t('admin.ip.hosts.validation.missing'));
      return updateHostIpAddress(ptrEditor.id, { reverse_record_value: ptrValue.trim() });
    },
    onSuccess: async () => {
      setPtrEditor(null);
      setPtrValue('');
      await invalidate();
      pushToast({ variant: 'ok', title: t('admin.ip.hosts.toast.ptr_saved') });
    },
  });

  const hostAssignM = useMutation({
    mutationFn: async () => {
      if (!assignHost) throw new Error(t('admin.ip.hosts.validation.missing'));
      const networkInterface = parsePositiveId(assignHostInterface);
      if (!networkInterface) throw new Error(t('admin.ip.route.validation.interface'));
      return assignHostIpAddress(assignHost.id, { network_interface: networkInterface });
    },
    onSuccess: async () => {
      setAssignHost(null);
      setAssignHostVps(null);
      setAssignHostInterface('');
      await invalidate();
      pushToast({ variant: 'ok', title: t('admin.ip.hosts.toast.assigned') });
    },
  });

  const hostFreeM = useMutation({
    mutationFn: async (hostId: number) => freeHostIpAddress(hostId),
    onSuccess: async () => {
      await invalidate();
      pushToast({ variant: 'ok', title: t('admin.ip.hosts.toast.freed') });
    },
  });

  const hostDeleteM = useMutation({
    mutationFn: async () => {
      if (!deleteHost) throw new Error(t('admin.ip.hosts.validation.missing'));
      return deleteHostIpAddress(deleteHost.id);
    },
    onSuccess: async () => {
      setDeleteHost(null);
      await invalidate();
      pushToast({ variant: 'ok', title: t('admin.ip.hosts.toast.deleted') });
    },
  });

  const anyMutationError = createHostsM.error || updatePtrM.error || hostAssignM.error || hostFreeM.error;

  return (
    <DetailShell testId="admin.ip_address.page">
      {!ipId ? (
        <ErrorState
          testId="admin.ip_address.invalid_id"
          kindOverride="not_found"
          title={t('admin.ip.invalid_id')}
          body={t('error.not_found.body')}
          backTo={`${basePath}/ip-addresses`}
          showStatusLink={false}
          showDetails={false}
          detailsExtra={{ page: 'admin.ip_address.detail', ipId: null }}
        />
      ) : isLoading ? (
        <LoadingState testId="admin.ip_address.loading" />
      ) : isError ? (
        <ErrorState
          testId="admin.ip_address.error"
          title={t('admin.ip.load_error')}
          error={q.error}
          onRetry={() => void q.refetch()}
          backTo={`${basePath}/ip-addresses`}
          detailsExtra={{ page: 'admin.ip_address.detail', ipId }}
        />
      ) : ip ? (
        <>
          {(() => {
            const addr = String((ip as any).addr ?? '').trim() || `#${(ip as any).id}`;
            const prefix = typeof (ip as any).prefix === 'number' ? (ip as any).prefix : undefined;
            const network = (ip as any).network;
            const networkStr =
              network && (network.address || network.id)
                ? `${network.address ?? ''}${network.prefix ? '/' + network.prefix : ''}`.trim()
                : undefined;

            const vpsId = idFromResourceRef((ip as any).vps);
            const userId = idFromResourceRef((ip as any).user);
            const netifId = idFromResourceRef((ip as any).network_interface);
            const routed = Boolean((ip as any).routed || netifId);
            const hostRows = hostAddrsQ.data ?? [];

            const title = `${addr}${prefix ? `/${prefix}` : ''}`;

            return (
              <>
                <ObjectHeader
                  testId="admin.ip_address.header"
                  title={title}
                  titleAfter={
                    <>
                      <Badge variant="neutral">#{(ip as any).id}</Badge>
                      {routed ? <Badge variant="black">{t('admin.ip.routed_badge')}</Badge> : null}
                    </>
                  }
                  kicker={
                    <>
                      <Link className="underline" to={`${basePath}/ip-addresses`}>
                        {t('admin.ip_addresses.title')}
                      </Link>
                      <span className="text-faint"> · </span>
                      <span>#{(ip as any).id}</span>
                    </>
                  }
                  meta={networkStr ? networkStr : ' '}
                  actions={
                    <>
                      <CopyButton text={title} />
                      {vpsId ? (
                        <LinkButton
                          to={`${basePath}/vps/${vpsId}`}
                          variant="secondary"
                          testId="admin.ip.action.vps"
                          title={t('common.open_vps')}
                        >
                          {t('object_kind.vps')} #{vpsId}
                        </LinkButton>
                      ) : null}
                      {userId ? (
                        <LinkButton
                          to={`${basePath}/users/${userId}`}
                          variant="secondary"
                          testId="admin.ip.action.user"
                          title={t('admin.ip.open_user')}
                        >
                          {t('admin.ip.open_user')} #{userId}
                        </LinkButton>
                      ) : null}
                      <Button testId="admin.ip_address.refresh" variant="secondary" onClick={() => void q.refetch()}>
                        {t('common.refresh')}
                      </Button>
                    </>
                  }
                />

                <Card testId="admin.ip_address.details.card">
                  <CardHeader title={t('common.details')} />
                  <CardBody>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.network')}</div>
                        <div className="text-sm">{networkStr || t('common.na')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.routed')}</div>
                        <div className="text-sm">{routed ? t('common.yes') : t('common.no')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.user_id')}</div>
                        <div className="text-sm">{userId ?? t('common.na')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.vps_id')}</div>
                        <div className="text-sm">{vpsId ?? t('common.na')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.interface')}</div>
                        <div className="text-sm">{labelFromResourceRef((ip as any).network_interface)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.route_via')}</div>
                        <div className="text-sm">{labelFromResourceRef((ip as any).route_via, ['addr', 'ip_addr', 'label', 'name'])}</div>
                      </div>
                      {(ip as any).created_at ? (
                        <div>
                          <div className="text-xs text-muted">{t('admin.ip.field.created')}</div>
                          <div className="text-sm">{formatDateTime((ip as any).created_at)}</div>
                        </div>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>

                {anyMutationError ? (
                  <Alert variant="danger" title={t('admin.ip.action_error')}>
                    {String((anyMutationError as any)?.message ?? anyMutationError)}
                  </Alert>
                ) : null}

                <Card testId="admin.ip_address.route.card" className="scroll-mt-24" id="route">
                  <CardHeader
                    title={t('admin.ip.route.title')}
                    subtitle={t('admin.ip.route.subtitle')}
                    actions={
                      <div className="flex flex-wrap gap-2">
                        {routed ? (
                          <ActionButton
                            variant="danger"
                            testId="admin.ip.route.free"
                            disabled={ipLocked}
                            loading={freeRouteM.isPending}
                            onClick={() => {
                              freeRouteM.reset();
                              setConfirmFreeRoute(true);
                            }}
                          >
                            {t('admin.ip.route.free')}
                          </ActionButton>
                        ) : (
                          <Button
                            variant="primary"
                            testId="admin.ip.route.assign.open"
                            disabled={ipLocked}
                            onClick={() => {
                              setRouteOpen(true);
                            }}
                          >
                            {t('admin.ip.route.assign')}
                          </Button>
                        )}
                      </div>
                    }
                  />
                  <CardBody>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.interface')}</div>
                        <div className="text-sm">{labelFromResourceRef((ip as any).network_interface)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.vps_id')}</div>
                        <div className="text-sm">{vpsId ?? t('common.na')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">{t('admin.ip.field.route_via')}</div>
                        <div className="text-sm">{labelFromResourceRef((ip as any).route_via, ['addr', 'ip_addr', 'label', 'name'])}</div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <IpAddressOwnerCard key={`owner-${ip.id}`} ip={ip} onUpdated={invalidate} />

                <Card testId="admin.ip_address.hosts.card" className="relative min-w-0 max-w-full overflow-x-hidden scroll-mt-24" id="hosts">
                  <CardHeader
                    title={t('admin.ip.hosts.title')}
                    subtitle={t('admin.ip.hosts.subtitle')}
                    actions={
                      <Button variant="primary" testId="admin.ip.hosts.create.open" onClick={() => setCreateHostsOpen(true)}>
                        {t('admin.ip.hosts.create')}
                      </Button>
                    }
                  />
                  <CardBody>
                    {hostAddrsQ.isLoading ? (
                      <LoadingState testId="admin.ip.hosts.loading" />
                    ) : hostAddrsQ.isError ? (
                      <ErrorState title={t('admin.ip.hosts.load_error')} error={hostAddrsQ.error} />
                    ) : hostRows.length === 0 ? (
                      <div className="text-sm text-muted">{t('admin.ip.hosts.empty')}</div>
                    ) : (
                      <div className="max-w-full overflow-x-auto">
                        <Table testId="admin.ip.hosts.table" minWidth="md">
                        <thead>
                          <tr>
                            <th>{t('admin.ip.hosts.field.address')}</th>
                            <th>{t('admin.ip.hosts.field.ptr')}</th>
                            <th>{t('admin.ip.hosts.field.assigned')}</th>
                            <th>{t('admin.ip.hosts.field.flags')}</th>
                            <th><span className="sr-only">{t('common.actions')}</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {hostRows.map((host) => (
                            <tr key={host.id} data-testid={`admin.ip.hosts.row.${host.id}`}>
                              <td className="font-mono text-sm">{hostAddr(host)}</td>
                              <td className="max-w-80 truncate">{String((host as any).reverse_record_value ?? t('common.na'))}</td>
                              <td>{host.assigned === false ? t('common.no') : t('common.yes')}</td>
                              <td>
                                <div className="flex flex-wrap gap-1">
                                  {(host as any).user_created ? <Badge tone="neutral">{t('common.custom')}</Badge> : null}
                                  {host.assigned === false ? <Badge tone="warn">{t('common.unassigned')}</Badge> : <Badge tone="ok">{t('common.assigned')}</Badge>}
                                </div>
                              </td>
                              <td className="text-right">
                                <HostIpAddressRowActions
                                  assigned={host.assigned !== false}
                                  userCreated={Boolean((host as any).user_created)}
                                  testIdPrefix={`admin.ip.hosts.row.${host.id}`}
                                  assignLoading={hostAssignM.isPending}
                                  freeLoading={hostFreeM.isPending}
                                  onEditPtr={() => {
                                    setPtrEditor(host);
                                    setPtrValue(String((host as any).reverse_record_value ?? ''));
                                  }}
                                  onAssign={() => {
                                    setAssignHost(host);
                                    setAssignHostVps(null);
                                    setAssignHostInterface('');
                                  }}
                                  onFree={() => hostFreeM.mutate(host.id)}
                                  onDelete={() => {
                                    hostDeleteM.reset();
                                    setDeleteHost(host);
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        </Table>
                      </div>
                    )}
                  </CardBody>
                </Card>

                <IpAddressRouteDialog key={`route-${ip.id}`} ip={ip} open={routeOpen}
                  onClose={() => setRouteOpen(false)} onAssigned={invalidate} />

                <Modal
                  open={createHostsOpen}
                  title={t('admin.ip.hosts.create_title')}
                  onClose={() => setCreateHostsOpen(false)}
                  footer={
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setCreateHostsOpen(false)} disabled={createHostsM.isPending}>{t('common.cancel')}</Button>
                      <ActionButton loading={createHostsM.isPending} disabled={!createHostsValue.trim()} onClick={() => createHostsM.mutate()}>
                        {t('admin.ip.hosts.create')}
                      </ActionButton>
                    </div>
                  }
                >
                  <Textarea rows={6} value={createHostsValue} onChange={(e) => setCreateHostsValue(e.target.value)} placeholder={t('admin.ip.hosts.create_placeholder')} />
                  <div className="mt-1 text-xs text-muted">{t('admin.ip.hosts.create_help')}</div>
                </Modal>

                <Modal
                  open={Boolean(ptrEditor)}
                  title={t('admin.ip.hosts.ptr_title')}
                  onClose={() => setPtrEditor(null)}
                  footer={
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setPtrEditor(null)} disabled={updatePtrM.isPending}>{t('common.cancel')}</Button>
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
                  <div className="mt-1 text-xs text-muted">{t('admin.ip.hosts.ptr_help')}</div>
                </Modal>

                <Modal
                  open={Boolean(assignHost)}
                  title={t('admin.ip.hosts.assign_title')}
                  onClose={() => setAssignHost(null)}
                  footer={
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setAssignHost(null)} disabled={hostAssignM.isPending}>{t('common.cancel')}</Button>
                      <ActionButton loading={hostAssignM.isPending} disabled={!assignHostInterface.trim()} onClick={() => hostAssignM.mutate()}>
                        {t('admin.ip.hosts.assign')}
                      </ActionButton>
                    </div>
                  }
                >
                  <div className="space-y-4">
                    <label className="block">
                      <div className="mb-1 text-sm font-medium">{t('admin.ip.route.vps')}</div>
                      <VpsLookupInput value={assignHostVps} onChange={setAssignHostVps} placeholder={t('admin.ip.route.vps.placeholder')} />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-sm font-medium">{t('admin.ip.route.interface')}</div>
                      <Select
                        value={assignHostInterface}
                        onChange={(e) => setAssignHostInterface(e.target.value)}
                        disabled={!assignHostVps || hostAssignNetifsQ.isLoading}
                        options={[
                          { value: '', label: t('admin.ip.route.interface.placeholder') },
                          ...(hostAssignNetifsQ.data ?? []).map((ni: any) => ({
                            value: String(ni.id),
                            label: `${ni.name ?? `#${ni.id}`} (#${ni.id})`,
                          })),
                        ]}
                      />
                    </label>
                    <div className="text-xs text-muted">{t('admin.ip.hosts.assign_help')}</div>
                  </div>
                </Modal>

                <ConfirmDialog
                  testId="admin.ip.route.free_confirm"
                  open={confirmFreeRoute}
                  title={t('admin.ip.route.free_confirm.title')}
                  description={t('admin.ip.route.free_confirm.desc', { ip: title })}
                  danger
                  confirmLabel={t('admin.ip.route.free')}
                  confirmLoading={freeRouteM.isPending}
                  confirmDisabled={ipLocked}
                  onCancel={() => {
                    freeRouteM.reset();
                    setConfirmFreeRoute(false);
                  }}
                  onConfirm={() => freeRouteM.mutate()}
                >
                  {freeRouteM.isError ? (
                    <Alert variant="danger" title={t('common.error')} testId="admin.ip.route.free_confirm.error">
                      {formatErrorMessage(freeRouteM.error)}
                    </Alert>
                  ) : null}
                </ConfirmDialog>

                <ConfirmDialog
                  testId="admin.ip.hosts.delete_confirm"
                  open={Boolean(deleteHost)}
                  title={t('admin.ip.hosts.delete_confirm.title')}
                  description={deleteHost ? t('admin.ip.hosts.delete_confirm.desc', { host: hostAddr(deleteHost) }) : undefined}
                  danger
                  confirmLabel={t('common.delete')}
                  confirmLoading={hostDeleteM.isPending}
                  onCancel={() => {
                    hostDeleteM.reset();
                    setDeleteHost(null);
                  }}
                  onConfirm={() => hostDeleteM.mutate()}
                >
                  {hostDeleteM.isError ? (
                    <Alert variant="danger" title={t('common.error')} testId="admin.ip.hosts.delete_confirm.error">
                      {formatErrorMessage(hostDeleteM.error)}
                    </Alert>
                  ) : null}
                </ConfirmDialog>
              </>
            );
          })()}
        </>
      ) : null}
    </DetailShell>
  );
}
