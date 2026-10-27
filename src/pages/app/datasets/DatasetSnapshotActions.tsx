import React from 'react';

import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import type { Snapshot } from '../../../lib/api/datasets';
import type { GateDecision } from '../../../lib/gates/types';
import { snapshotHasReferences } from './DatasetSnapshotDeletion';
import { DatasetSnapshotExportAction } from './DatasetSnapshotExportAction';

/** The same compact actions in desktop rows and mobile cards. */
export function DatasetSnapshotActions(props: {
  datasetId: number;
  snapshot: Snapshot;
  gates: { downloadGate: GateDecision; exportGate: GateDecision; rollbackGate: GateDecision; deleteGate: GateDecision };
  deleteAvailable: boolean;
  downloadPending: boolean;
  downloadLoading: boolean;
  onDownload: () => void;
  onConfirm: (kind: 'rollback' | 'delete') => void;
  onExportCreated: () => void;
  testId: string;
}) {
  const { t } = useI18n();
  const { downloadGate, exportGate, rollbackGate, deleteGate } = props.gates;
  return (
    <>
      <ActionButton
        size="sm"
        variant="secondary"
        onClick={props.onDownload}
        loading={props.downloadLoading}
        disabled={props.downloadPending || !downloadGate.allowed}
        disabledReason={!downloadGate.allowed ? downloadGate.reason : undefined}
        testId={`${props.testId}.download`}
      >
        {t('common.download')}
      </ActionButton>
      <DatasetSnapshotExportAction
        datasetId={props.datasetId}
        snapshot={props.snapshot}
        gate={exportGate}
        testId={`${props.testId}.export`}
        onCreated={props.onExportCreated}
      />
      <ActionButton
        size="sm"
        variant="secondary"
        onClick={() => props.onConfirm('rollback')}
        disabled={!rollbackGate.allowed}
        disabledReason={!rollbackGate.allowed ? rollbackGate.reason : undefined}
        testId={`${props.testId}.rollback`}
      >
        {t('common.rollback')}
      </ActionButton>
      {props.deleteAvailable && !snapshotHasReferences(props.snapshot) ? (
        <ActionButton
          size="sm"
          variant="danger"
          onClick={() => props.onConfirm('delete')}
          disabled={!deleteGate.allowed}
          disabledReason={!deleteGate.allowed ? deleteGate.reason : undefined}
          testId={`${props.testId}.delete`}
        >
          {t('common.delete')}
        </ActionButton>
      ) : props.deleteAvailable ? (
        <span className="text-xs text-muted">{t('dataset.snapshots.deletion.references')}</span>
      ) : null}
    </>
  );
}
