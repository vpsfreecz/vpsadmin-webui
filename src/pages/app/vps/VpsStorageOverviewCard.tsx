import React from 'react';

import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { GateDecision } from '../../../lib/gates/types';

export function VpsStorageOverviewCard(props: {
  canMutate: boolean;
  gate: GateDecision;
  onAddMount: () => void;
  onOpenTasks: () => void;
}) {
  const { t } = useI18n();
  const gate = props.gate;

  return (
    <Card testId="vps.storage.summary">
      <CardHeader
        title={t('vps.storage.title')}
        actions={props.canMutate ? (
          <ActionButton
            testId="vps.storage.mounts.add"
            variant="primary"
            size="sm"
            disabled={!gate.allowed}
            disabledReason={!gate.allowed ? gate.reason : undefined}
            onClick={props.onAddMount}
          >
            {t('vps.storage.add_mount')}
          </ActionButton>
        ) : null}
      />
      {props.canMutate && !gate.allowed ? (
        <CardBody>
          <Alert title={t(gate.reason.titleKey)} variant="warn">
            <div className="space-y-2">
              {gate.reason.descriptionKey ? <div>{t(gate.reason.descriptionKey)}</div> : null}
              <div>
                <Button variant="secondary" size="sm" onClick={props.onOpenTasks}>
                  {t('common.open_tasks')}
                </Button>
              </div>
            </div>
          </Alert>
        </CardBody>
      ) : null}
    </Card>
  );
}
