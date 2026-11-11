import React from 'react';
import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import type { Dataset, SnapshotDownload } from '../../../lib/api/datasets';
import { DatasetDownloadListView } from '../datasets/DatasetDownloadListView';
import { resourceLabel, resolveSnapshotDownloadDataset, snapshotDownloadDatasetPath } from './BackupCenterModel';

export function BackupCenterDownloadsList(props: {
  downloads: SnapshotDownload[];
  datasets: Dataset[];
  compact?: boolean;
  hrefOptions: { webuiUrl?: string; origin?: string };
}) {
  const { t } = useI18n();
  const rows = props.compact ? props.downloads.slice(0, 5) : props.downloads;
  return (
    <DatasetDownloadListView
      rows={rows}
      testId="backups.downloads"
      hrefOptions={props.hrefOptions}
      downloadAriaLabel={(download) =>
        t('backups.downloads.download_snapshot', {
          snapshot: resourceLabel(download.snapshot, `#${download.snapshot?.id ?? '—'}`),
        })
      }
      datasetContext={(download) => {
        const dataset = resolveSnapshotDownloadDataset(download, props.datasets);
        return (
          <div className="min-w-0 space-y-1">
            <div className="font-semibold text-fg">{resourceLabel(dataset, t('backups.dataset.unknown'))}</div>
            <div className="text-xs text-faint">#{dataset?.id ?? '—'}</div>
          </div>
        );
      }}
      detailAction={({ download, testId }) => {
        const dataset = resolveSnapshotDownloadDataset(download, props.datasets);
        const detailPath = snapshotDownloadDatasetPath(download, dataset);
        return detailPath ? (
          <Button
            to={detailPath}
            size="sm"
            variant="ghost"
            ariaLabel={t('backups.downloads.open_dataset', {
              dataset: resourceLabel(dataset, t('backups.dataset.unknown')),
            })}
            testId={`${testId}.detail`}
          >
            {t('backups.open')}
          </Button>
        ) : null;
      }}
    />
  );
}
