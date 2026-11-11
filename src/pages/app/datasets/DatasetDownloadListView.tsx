import React, { useMemo } from 'react';

import { useI18n } from '../../../app/i18n';
import { Card } from '../../../components/ui/Card';
import { CopyButton } from '../../../components/ui/CopyButton';
import type { SnapshotDownload } from '../../../lib/api/datasets';
import { formatDateTime, formatMiB } from '../../../lib/format';
import {
  downloadChecksum,
  downloadExpiration,
  refLabel,
  snapshotDownloadCanOpen,
  snapshotDownloadHref,
  snapshotDownloadStatus,
  type SnapshotDownloadStatus,
} from './DatasetDownloadModel';
import {
  DatasetDownloadOpenButton,
  DatasetDownloadStateBadge,
  datasetDownloadStatusHelp,
} from './DatasetDownloadStatusView';

export type DownloadActionContext = {
  download: SnapshotDownload;
  status: SnapshotDownloadStatus;
  testId: string;
};

// Presentation and client-only actions are shared. The owning detail page keeps
// its mutation gates, confirmation, busy state and retry draft callbacks.
export function DatasetDownloadListView(props: {
  rows: SnapshotDownload[];
  testId: string;
  hrefOptions: { webuiUrl?: string; origin?: string };
  datasetContext?: (download: SnapshotDownload) => React.ReactNode;
  detailAction?: (context: DownloadActionContext) => React.ReactNode;
  mutationActions?: (context: DownloadActionContext) => React.ReactNode;
  desktopFooter?: React.ReactNode;
  downloadAriaLabel?: (download: SnapshotDownload) => string;
}) {
  const { t } = useI18n();
  const items = useMemo(() => {
    const now = new Date();
    return props.rows.map((download) => {
      const href = snapshotDownloadHref(download, props.hrefOptions);
      const status = snapshotDownloadStatus(download, { href, now });
      return {
        download,
        href,
        status,
        canOpen: snapshotDownloadCanOpen(status, href),
        help: datasetDownloadStatusHelp(status, download, t),
        checksum: downloadChecksum(download),
        expiration: downloadExpiration(download),
      };
    });
  }, [props.rows, props.hrefOptions, t]);
  type Item = (typeof items)[number];

  function identity(item: Item) {
    const { download, checksum } = item;
    const snapshot = download.snapshot;
    return (
      <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
        <div className="font-semibold text-fg" data-testid={`${props.testId}.filename.${download.id}`}>
          {download.file_name ? String(download.file_name) : t('dataset.downloads.item_title', { id: download.id })}
        </div>
        <div className="text-xs text-faint">#{download.id}</div>
        <div className="text-sm text-muted">
          {refLabel(snapshot, t('common.na'))}
          {snapshot && Number.isFinite(Number(snapshot.id)) ? (
            <div className="text-xs text-faint">{t('dataset.downloads.snapshot_ref', { id: Number(snapshot.id) })}</div>
          ) : null}
        </div>
        {download.from_snapshot ? (
          <div className="text-xs text-muted">
            {t('dataset.downloads.from_snapshot', {
              snapshot: refLabel(download.from_snapshot, t('common.na')),
            })}
          </div>
        ) : null}
        {checksum ? <div className="text-xs text-muted">sha256: {checksum}</div> : null}
      </div>
    );
  }

  function format(item: Item) {
    const value = item.download.format;
    const label =
      value === 'archive' || value === 'stream' || value === 'incremental_stream'
        ? t(`dataset.download.format.${value}`)
        : value
          ? String(value)
          : t('common.na');
    return (
      <div className="[overflow-wrap:anywhere]">
        {label}
        {item.download.size !== undefined ? (
          <div className="mt-1 text-xs text-muted">
            {t('dataset.downloads.size', { size: formatMiB(item.download.size) })}
          </div>
        ) : null}
      </div>
    );
  }

  function state(item: Item, id: string) {
    return (
      <div className="space-y-1" data-testid={`${id}.status`}>
        <DatasetDownloadStateBadge status={item.status} t={t} />
        <div className="max-w-xs text-xs text-muted [overflow-wrap:anywhere]" data-testid={`${id}.status_detail`}>
          {item.help}
        </div>
      </div>
    );
  }

  function expiration(item: Item, id: string) {
    return (
      <span data-testid={`${id}.expiration`}>{item.expiration ? formatDateTime(item.expiration) : t('common.na')}</span>
    );
  }

  function actions(item: Item, id: string) {
    const context = { download: item.download, status: item.status, testId: id };
    return (
      <div className="flex flex-wrap items-center gap-2">
        {props.detailAction?.(context)}
        <DatasetDownloadOpenButton
          href={item.href}
          canOpen={item.canOpen}
          disabledTitle={item.help}
          ariaLabel={props.downloadAriaLabel?.(item.download)}
          testId={`${id}.download`}
        />
        {item.canOpen && item.href ? (
          <CopyButton text={item.href} label={t('common.copy_link')} size="sm" testId={`${id}.copy_link`} />
        ) : null}
        {item.checksum ? (
          <CopyButton text={item.checksum} label={t('common.copy')} size="sm" testId={`${id}.copy_sha256`} />
        ) : null}
        {props.mutationActions?.(context)}
      </div>
    );
  }

  const headers = ['snapshot', 'format', 'state', 'expires'] as const;
  return (
    <>
      <div className="space-y-3 xl:hidden" data-testid={`${props.testId}.cards`}>
        {items.length === 0 ? (
          <Card>
            <div className="p-4 text-center text-sm text-muted">{t('dataset.downloads.empty')}</div>
          </Card>
        ) : (
          items.map((item) => {
            const id = `${props.testId}.card.${item.download.id}`;
            const values = [identity(item), format(item), state(item, id), expiration(item, id)];
            return (
              <Card key={item.download.id} testId={id}>
                <div className="space-y-4 p-4">
                  <dl className="space-y-3">
                    {props.datasetContext ? (
                      <div className="min-w-0 space-y-1">
                        <dt className="text-xs text-faint">{t('backups.dataset')}</dt>
                        <dd className="min-w-0 [overflow-wrap:anywhere]">{props.datasetContext(item.download)}</dd>
                      </div>
                    ) : null}
                    {headers.map((header, index) => (
                      <div key={header} className="min-w-0 space-y-1">
                        <dt className="text-xs text-faint">{t(`dataset.downloads.table.${header}`)}</dt>
                        <dd className="min-w-0 text-sm text-fg [overflow-wrap:anywhere]">{values[index]}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="space-y-2">
                    <div className="text-xs text-faint">{t('common.actions')}</div>
                    {actions(item, id)}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
      <Card className="hidden xl:block" testId={`${props.testId}.table`}>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm table-list">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-faint">
                {props.datasetContext ? <th className="px-3 py-2">{t('backups.dataset')}</th> : null}
                {headers.map((header) => (
                  <th key={header} className="px-3 py-2">
                    {t(`dataset.downloads.table.${header}`)}
                  </th>
                ))}
                <th className="px-3 py-2">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={props.datasetContext ? 6 : 5} className="py-10 text-center text-sm text-muted">
                    {t('dataset.downloads.empty')}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const id = `${props.testId}.row.${item.download.id}`;
                  return (
                    <tr key={item.download.id} className="border-t border-border" data-testid={id}>
                      {props.datasetContext ? (
                        <td className="px-3 py-2 align-top [overflow-wrap:anywhere]">
                          {props.datasetContext(item.download)}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 align-top">{identity(item)}</td>
                      <td className="px-3 py-2 align-top">{format(item)}</td>
                      <td className="px-3 py-2 align-top">{state(item, id)}</td>
                      <td className="px-3 py-2 align-top [overflow-wrap:anywhere]">{expiration(item, id)}</td>
                      <td className="px-3 py-2 align-top">{actions(item, id)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {props.desktopFooter}
      </Card>
    </>
  );
}
