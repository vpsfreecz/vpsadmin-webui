import React from 'react';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import type { DnsServerZone } from '../../../lib/api/dns';
import { formatDateTime } from '../../../lib/format';
import { DnsZoneServerAddresses, dnsZoneServerName, dnsZoneServerRoleLabel } from './DnsZoneServersList';
import { dnsReportedSerialText } from './dnsSerialPresentation';
import { dnsTransferReason } from './dnsTransferPresentation';

function LastTransferReport({ row, testIdPrefix }: { row: DnsServerZone; testIdPrefix: string }) {
  const { t } = useI18n();
  const status = row.last_transfer_status;
  const reason = dnsTransferReason(t, row.last_transfer_reason_code, row.last_transfer_reason);
  return (
    <div className="min-w-0 space-y-2" data-testid={`${testIdPrefix}.transfer`}>
      <div className="text-xs font-medium text-muted">{t('dns.zone.transfers.report.latest')}</div>
      {status === 'failed' ? (
        <Alert variant="danger" title={t('dns.zone.transfers.log.status.failed')}>
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere]">
            {reason || t('dns.zone.transfers.log.reason.unknown')}
          </div>
        </Alert>
      ) : status === 'success' ? (
        <Badge variant="ok">{t('dns.zone.transfers.log.status.success')}</Badge>
      ) : (
        <div className="break-words text-sm text-muted">
          {t('dns.zone.transfers.report.unknown')}
          {typeof status === 'string' && status.trim() ? ` (${status})` : ''}
        </div>
      )}
      <div className="break-words text-xs text-muted">
        {t('dns.zone.transfers.report.at')}: {formatDateTime(row.last_transfer_at)}
      </div>
      <p className="text-xs text-muted">{t('dns.zone.transfers.report.event_help')}</p>
    </div>
  );
}

/** Existing reports only; no readiness inference, new reads or mutation controls. */
export function DnsZoneStatusReports({ rows }: { rows: readonly DnsServerZone[] }) {
  const { t } = useI18n();
  return (
    <>
      <div className="space-y-3 p-4 md:hidden" data-testid="dns.transfers.status.cards">
        {rows.map((row) => (
          <section
            key={row.id}
            className="min-w-0 space-y-3 rounded-lg border border-border p-3"
            data-testid={`dns.transfers.status.card.${row.id}`}
          >
            <div className="flex min-w-0 flex-col items-start gap-2">
              <div className="min-w-0 break-all font-semibold text-fg">{dnsZoneServerName(row)}</div>
              <Badge variant="neutral" className="max-w-full whitespace-normal break-words">
                {dnsZoneServerRoleLabel(row.type, t)}
              </Badge>
            </div>
            <LastTransferReport row={row} testIdPrefix={`dns.transfers.status.card.${row.id}`} />
            <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">{t('dns.zone.servers.table.reported_serial')}</dt>
                <dd className="mt-1 break-all text-fg">{dnsReportedSerialText(row.serial, t)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('dns.zone.servers.table.last_check')}</dt>
                <dd className="mt-1 break-words text-fg">{formatDateTime(row.last_check_at)}</dd>
              </div>
            </dl>
            <details className="min-w-0 text-sm">
              <summary className="min-h-11 cursor-pointer rounded-md py-3 text-link underline-offset-2 hover:underline">
                {t('dns.zone.transfers.report.details')}
              </summary>
              <div className="min-w-0 space-y-3 pt-2">
                <DnsZoneServerAddresses row={row} testIdPrefix={`dns.transfers.status.card.${row.id}`} />
                <dl className="grid min-w-0 grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">{t('dns.zone.servers.table.loaded')}</dt>
                    <dd className="mt-1 break-words">{formatDateTime(row.loaded_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{t('dns.zone.servers.table.refresh')}</dt>
                    <dd className="mt-1 break-words">{formatDateTime(row.refresh_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{t('dns.zone.servers.table.expires')}</dt>
                    <dd className="mt-1 break-words">{formatDateTime(row.expires_at)}</dd>
                  </div>
                </dl>
              </div>
            </details>
          </section>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-table-md text-sm table-list" data-testid="dns.transfers.status.table">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pl-4 pr-3">{t('dns.zone.servers.table.server')}</th>
              <th className="py-2 pr-3">{t('dns.zone.servers.table.reported_serial')}</th>
              <th className="py-2 pr-3">{t('dns.zone.servers.table.last_check')}</th>
              <th className="py-2 pr-4">{t('dns.zone.transfers.report.latest')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-border align-top"
                data-testid={`dns.transfers.status.row.${row.id}`}
              >
                <td className="max-w-sm py-3 pl-4 pr-3">
                  <div className="break-all font-medium text-fg">{dnsZoneServerName(row)}</div>
                  <div className="mt-1">
                    <Badge variant="neutral">{dnsZoneServerRoleLabel(row.type, t)}</Badge>
                  </div>
                  <details className="mt-2 min-w-0">
                    <summary className="cursor-pointer text-xs text-link hover:underline [@media(any-pointer:coarse)]:min-h-11 [@media(any-pointer:coarse)]:py-3">
                      {t('dns.zone.transfers.report.details')}
                    </summary>
                    <DnsZoneServerAddresses row={row} testIdPrefix={`dns.transfers.status.row.${row.id}`} />
                    <dl className="mt-2 space-y-2 text-xs">
                      <div>
                        <dt className="text-muted">{t('dns.zone.servers.table.loaded')}</dt>
                        <dd>{formatDateTime(row.loaded_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t('dns.zone.servers.table.refresh')}</dt>
                        <dd>{formatDateTime(row.refresh_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">{t('dns.zone.servers.table.expires')}</dt>
                        <dd>{formatDateTime(row.expires_at)}</dd>
                      </div>
                    </dl>
                  </details>
                </td>
                <td className="py-3 pr-3">{dnsReportedSerialText(row.serial, t)}</td>
                <td className="py-3 pr-3">{formatDateTime(row.last_check_at)}</td>
                <td className="max-w-md py-3 pr-4">
                  <LastTransferReport row={row} testIdPrefix={`dns.transfers.status.row.${row.id}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length >= 100 ? (
        <p className="px-4 pb-4 text-sm text-muted">{t('dns.zone.transfers.report.limit')}</p>
      ) : null}
    </>
  );
}
