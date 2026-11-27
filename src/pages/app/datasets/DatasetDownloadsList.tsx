import React, { useMemo } from 'react';
import { getRuntimeConfig } from '../../../app/config';
import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Card } from '../../../components/ui/Card';
import { KeysetPagination } from '../../../components/ui/KeysetPagination';
import type { SnapshotDownload } from '../../../lib/api/datasets';
import type { GateDecision } from '../../../lib/gates/types';
import { DatasetDownloadListView } from './DatasetDownloadListView';
import { shouldOfferDownloadRetry } from './DatasetDownloadStatusView';

type DatasetDownloadsPaginationProps = {
  page: number;
  pageCount: number;
  canPrev: boolean;
  canNext: boolean;
  limit: number;
  allowedLimits: readonly number[];
  onPrev: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export function DatasetDownloadsList(props: {
  rows: SnapshotDownload[];
  createGate: GateDecision;
  deleteGate: GateDecision;
  onDelete: (download: SnapshotDownload) => void;
  onRetry: (download: SnapshotDownload) => void;
  pagination: DatasetDownloadsPaginationProps;
}) {
  const { t } = useI18n();
  const cfg = useMemo(() => getRuntimeConfig(), []);
  const downloadHrefOptions = useMemo(
    () => ({
      webuiUrl: cfg.webuiUrl,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
    }),
    [cfg.webuiUrl]
  );
  return (
    <>
      <DatasetDownloadListView
        rows={props.rows}
        testId="dataset.downloads"
        hrefOptions={downloadHrefOptions}
        mutationActions={({ download, status, testId }) => (
          <>
            {shouldOfferDownloadRetry(status) ? (
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() => props.onRetry(download)}
                disabled={!props.createGate.allowed}
                disabledReason={!props.createGate.allowed ? props.createGate.reason : undefined}
                testId={`${testId}.retry`}
              >
                {t('common.retry')}
              </ActionButton>
            ) : null}

            <ActionButton
              size="sm"
              variant="danger"
              onClick={() => props.onDelete(download)}
              disabled={!props.deleteGate.allowed}
              disabledReason={!props.deleteGate.allowed ? props.deleteGate.reason : undefined}
              testId={`${testId}.delete`}
            >
              {t('common.delete')}
            </ActionButton>
          </>
        )}
        desktopFooter={<KeysetPagination {...props.pagination} testId="dataset.downloads.pagination.desktop" />}
      />
      <div className="xl:hidden">
        <Card>
          <KeysetPagination {...props.pagination} testId="dataset.downloads.pagination.mobile" className="border-t-0" />
        </Card>
      </div>
    </>
  );
}
