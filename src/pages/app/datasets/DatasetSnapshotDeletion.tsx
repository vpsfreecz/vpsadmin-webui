import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { fetchDatasets, type Dataset, type Snapshot } from '../../../lib/api/datasets';
import { resourceId } from '../../../lib/resources';

export type SnapshotDeletionState = 'available' | 'only_nas' | 'backups' | 'checking' | 'unknown';

/** Dataset output lacks pool roles. Index supports exact subtree depth and role. */
export async function readSnapshotDeletionState(datasetId: number): Promise<SnapshotDeletionState> {
  const [primary, backup] = await Promise.all([
    fetchDatasets({ subtree: datasetId, toDepth: 0, role: 'primary', limit: 1 }),
    fetchDatasets({ subtree: datasetId, toDepth: 0, role: 'backup', limit: 1 }),
  ]);
  // Never accept an unscoped response as evidence of the selected dataset.
  if ([...primary.data, ...backup.data].some((row) => row.id !== datasetId)) return 'unknown';
  if (backup.data.length > 0) return 'backups';
  return primary.data.length > 0 ? 'available' : 'only_nas';
}

export function snapshotHasReferences(snapshot: Snapshot): boolean {
  return resourceId(snapshot.mount) !== undefined || resourceId(snapshot.export) !== undefined;
}

export function useSnapshotDeletion(dataset: Dataset) {
  const [rejected, setRejected] = useState<Set<string>>(() => new Set());
  const isVps = resourceId(dataset.vps) !== undefined;
  const query = useQuery({
    queryKey: ['datasets', dataset.id, 'snapshot-deletion'],
    queryFn: () => readSnapshotDeletionState(dataset.id),
    enabled: !isVps,
    retry: false,
  });
  const state: SnapshotDeletionState = isVps
    ? 'only_nas'
    : query.isFetching || query.isPending
      ? 'checking'
      : query.isError
        ? 'unknown'
        : (query.data ?? 'unknown');
  return {
    state,
    refetch: query.refetch,
    rejected: (snapshotId: number) => rejected.has(`${dataset.id}:${snapshotId}`),
    reject: (snapshotId: number) => setRejected((previous) => new Set(previous).add(`${dataset.id}:${snapshotId}`)),
  };
}

export function SnapshotDeletionNotice({ state, onRetry }: { state: SnapshotDeletionState; onRetry: () => void }) {
  const { t } = useI18n();
  if (state === 'available') return null;
  return (
    <Alert variant="info" testId="dataset.snapshots.deletion.notice">
      {t(`dataset.snapshots.deletion.${state}`)}
      {state === 'unknown' ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          testId="dataset.snapshots.deletion.retry"
          className="ml-2"
        >
          {t('common.retry')}
        </Button>
      ) : null}
    </Alert>
  );
}
