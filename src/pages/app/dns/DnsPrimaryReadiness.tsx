import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { KeysetPagination } from '../../../components/ui/KeysetPagination';
import { LoadingState } from '../../../components/ui/LoadingState';
import { fetchDnsZoneTransfers, type DnsZoneTransfer } from '../../../lib/api/dnsTransfers';
import {
  fetchDnsPrimaryTransferStates,
  type DnsPrimaryTransferState,
  type DnsReadinessCapabilities,
} from '../../../lib/api/dnsReadiness';
import { isRecord } from '../../../lib/api/networkingViews';
import { formatDateTime } from '../../../lib/format';
import { cursorFromAscendingPage } from '../../../lib/lockIndex';
import { dnsPrimaryIsOwnedDetached, dnsPrimaryPathStatus } from './dnsReadinessModel';
import { DnsReadinessBadge } from './DnsReadinessBadge';

export function DnsPrimarySummary(props: { transfer: DnsZoneTransfer; ownerId?: number; readiness: boolean }) {
  const { t } = useI18n();
  const row = props.transfer;
  if (row.peer_type !== 'primary_type' && row.peer_type !== 'primary') return null;
  return (
    <div className="mt-2 space-y-1 text-xs" data-testid={`dns.primary.summary.${row.id}`}>
      {dnsPrimaryIsOwnedDetached(row, props.ownerId) ? (
        <div className="text-warn" data-testid={`dns.primary.detached.${row.id}`}>
          {t('dns.readiness.detached')}
        </div>
      ) : null}
      {props.readiness ? (
        <>
          <DnsReadinessBadge status={row['transfer_check_status']} />
          <div className="text-muted">
            {t('dns.readiness.counts', {
              success: row['transfer_check_success_count'] ?? '—',
              failed: row['transfer_check_failed_count'] ?? '—',
              pending: row['transfer_check_pending_count'] ?? '—',
              total: row['transfer_check_server_count'] ?? '—',
            })}
          </div>
          <div className="text-muted">
            {t('dns.readiness.last_check')}:{' '}
            {typeof row['last_transfer_check_at'] === 'string'
              ? formatDateTime(row['last_transfer_check_at'])
              : t('common.na')}
          </div>
        </>
      ) : null}
    </div>
  );
}

function pathServer(path: DnsPrimaryTransferState): string {
  const zone = path.dns_server_zone;
  const server = zone?.['dns_server'];
  return isRecord(server) ? String(server['name'] ?? server['id'] ?? '—') : '—';
}

function pathPrimary(path: DnsPrimaryTransferState): string {
  const transfer = path.dns_zone_transfer;
  const host = transfer?.['host_ip_address'];
  return isRecord(host) ? String(host['addr'] ?? host['id'] ?? '—') : `#${String(transfer?.id ?? '—')}`;
}

export function DnsPrimaryReadiness(props: {
  zoneId: number;
  capabilities?: DnsReadinessCapabilities;
  capabilityError?: unknown;
}) {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [cursors, setCursors] = useState<Array<number | undefined>>([undefined]);
  useEffect(() => {
    setPage(0);
    setCursors([undefined]);
  }, [props.zoneId]);
  const primaryQ = useQuery({
    queryKey: ['dns_primary_exists', props.zoneId],
    refetchInterval: 60_000,
    queryFn: async () =>
      (await fetchDnsZoneTransfers({ dns_zone: props.zoneId, peer_type: 'primary_type', limit: 1 })).data,
  });
  const pathsQ = useQuery({
    queryKey: ['dns_primary_paths', props.zoneId, page, cursors[page]],
    queryFn: async () =>
      (await fetchDnsPrimaryTransferStates({ dnsZone: props.zoneId, limit: 25, fromId: cursors[page] })).data,
    enabled: props.capabilities?.paths === true,
    refetchInterval: 60_000,
  });
  const paths = pathsQ.data ?? [];
  const cursor = cursorFromAscendingPage(paths, (row) => row.id);
  const date = (value: string | null | undefined) => (value ? formatDateTime(value) : t('common.na'));
  return (
    <div className="space-y-4">
      {primaryQ.isError ? (
        <ErrorState
          title={t('dns.readiness.configuration_failed')}
          error={primaryQ.error}
          onRetry={() => void primaryQ.refetch()}
          showBack={false}
        />
      ) : primaryQ.isSuccess && primaryQ.data.length === 0 ? (
        <Alert variant="danger" title={t('dns.readiness.missing.title')} testId="dns.primary.missing">
          {t('dns.readiness.missing.body')}
        </Alert>
      ) : null}
      <Card testId="dns.readiness.paths">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold text-fg">{t('dns.readiness.title')}</h3>
          <p className="mt-1 text-sm text-muted">{t('dns.readiness.description')}</p>
        </div>
        {props.capabilityError ? (
          <ErrorState title={t('dns.readiness.capability_failed')} error={props.capabilityError} showBack={false} />
        ) : !props.capabilities ? (
          <LoadingState />
        ) : !props.capabilities.paths ? (
          <div className="px-4 py-5 text-sm text-muted" data-testid="dns.readiness.unavailable">
            {t('dns.readiness.unavailable')}
          </div>
        ) : pathsQ.isLoading ? (
          <LoadingState />
        ) : pathsQ.isError ? (
          <ErrorState
            title={t('dns.readiness.load_failed')}
            error={pathsQ.error}
            onRetry={() => void pathsQ.refetch()}
            showBack={false}
          />
        ) : paths.length === 0 ? (
          <div className="px-4 py-5 text-sm text-muted">{t('dns.readiness.empty')}</div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {paths.map((path) => {
                const state = dnsPrimaryPathStatus(path);
                return (
                  <div className="space-y-2 p-4" key={path.id} data-testid={`dns.readiness.path.${path.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="break-all font-medium">
                        {pathPrimary(path)} → {pathServer(path)}
                      </span>
                      <DnsReadinessBadge status={state} />
                    </div>
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-muted">{t('dns.readiness.last_check')}</dt>
                        <dd>{date(path.last_attempt_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t('dns.readiness.source')}</dt>
                        <dd>{attemptKindLabel(t, path.last_attempt_kind)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t('dns.readiness.last_success')}</dt>
                        <dd>{date(path.last_success_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t('dns.readiness.source_address')}</dt>
                        <dd className="break-all font-mono text-xs">{path.secondary_source_addr ?? t('common.na')}</dd>
                      </div>
                    </dl>
                    {path.evidence_current === false ? <Badge variant="warn">{t('dns.readiness.stale')}</Badge> : null}
                    {state !== 'success' && path.reason ? (
                      <p className="break-words text-sm text-muted">{path.reason}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <KeysetPagination
              page={page + 1}
              pageCount={cursors.length}
              canPrev={page > 0}
              canNext={paths.length === 25 && cursor !== null}
              onPrev={() => setPage((value) => Math.max(0, value - 1))}
              onNext={() => {
                if (cursor !== null) {
                  setCursors((value) => [...value.slice(0, page + 1), cursor]);
                  setPage((value) => value + 1);
                }
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}

const attemptKinds = new Set(['transfer', 'refresh', 'notify', 'load', 'ixfr_probe', 'axfr_probe', 'legacy']);
export function attemptKindLabel(t: (key: string) => string, value: unknown): string {
  return typeof value === 'string' && attemptKinds.has(value) ? t(`dns.readiness.kind.${value}`) : t('common.na');
}
