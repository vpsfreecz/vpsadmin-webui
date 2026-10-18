import React, { useState } from 'react';

import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Button } from '../../../components/ui/Button';
import type { Snapshot } from '../../../lib/api/datasets';
import type { GateDecision } from '../../../lib/gates/types';
import { ExportCreateDialog } from '../exports/ExportCreateDialog';
import { parsePositiveInt } from '../exports/ExportModel';

export function DatasetSnapshotExportAction(props: {
  datasetId: number;
  snapshot: Snapshot;
  gate: GateDecision;
  testId: string;
  onCreated: () => void;
}) {
  const { basePath } = useAppMode();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const exportId = parsePositiveInt(props.snapshot.export?.id);

  if (exportId !== null) {
    return (
      <Button size="sm" variant="secondary" to={`${basePath}/exports/${exportId}`} testId={props.testId}>
        {t('dataset.snapshots.export')}
      </Button>
    );
  }

  return (
    <>
      <ActionButton
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
        disabled={!props.gate.allowed}
        disabledReason={!props.gate.allowed ? props.gate.reason : undefined}
        testId={props.testId}
      >
        {t('dataset.snapshots.export')}
      </ActionButton>
      {open ? (
        <ExportCreateDialog
          open
          embedded
          onClose={() => setOpen(false)}
          fixedDatasetId={props.datasetId}
          initialSnapshot={props.snapshot}
          onCreated={props.onCreated}
        />
      ) : null}
    </>
  );
}
