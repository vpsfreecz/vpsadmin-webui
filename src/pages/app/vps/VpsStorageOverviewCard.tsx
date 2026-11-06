import React from 'react';

import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { GateDecision } from '../../../lib/gates/types';
import { formatMiB } from '../../../lib/format';
import type { RootDatasetSummary, StorageOverviewSummary } from './VpsStorageModel';

export function VpsStorageOverviewCard(props: {
  canMutate: boolean;
  gate: GateDecision;
  root: RootDatasetSummary;
  summary: StorageOverviewSummary;
  mountsStatus: 'pending' | 'success' | 'error';
  onAddMount: () => void;
  onOpenTasks: () => void;
}) {
  const { t } = useI18n();
  const gate = props.gate;
  const rootLimit = props.root.referenceQuota ?? props.root.quota;
  const { summary } = props;

  return (
    <>
      {!props.canMutate ? (
        <Alert title={t('gate.blocked.permission.title')} variant="warn">
          <div data-testid="vps.storage.read_only">{t('gate.blocked.permission.body')}</div>
        </Alert>
      ) : null}

      <Card testId="vps.storage.summary">
        <CardHeader
          title={t('vps.storage.title')}
          subtitle={t('vps.storage.subtitle')}
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
        <CardBody className="space-y-4">
          {props.canMutate && !gate.allowed ? (
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
          ) : null}

          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3" data-testid="vps.storage.summary.grid">
            <div data-testid="vps.storage.summary.capacity" className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">
                {props.root.used === null
                  ? t('vps.storage.overview.capacity.unavailable')
                  : t('vps.storage.overview.capacity.subtitle', {
                      used: formatMiB(props.root.used),
                      limit: rootLimit !== null ? formatMiB(rootLimit) : t('vps.storage.capacity.unlimited'),
                    })}
              </span>
              {props.root.capacityPercent !== null ? (
                <span className="text-sm text-muted">({props.root.capacityPercent}%)</span>
              ) : null}
            </div>
            <div data-testid="vps.storage.summary.mounts" className="space-y-1">
              {props.mountsStatus === 'error' ? (
                <span className="text-sm text-warn">{t('vps.storage.mounts.load_error')}</span>
              ) : props.mountsStatus === 'pending' ? (
                <span className="text-sm text-muted">{t('common.loading')}</span>
              ) : summary.mountCount === 0 ? (
                <span className="text-sm text-muted">{t('vps.storage.mounts.empty')}</span>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <a className="font-semibold text-link hover:underline" href="#vps-storage-mounts">
                      {t('vps.storage.overview.mounts.count', { count: summary.mountCount })}
                    </a>
                    <span className="text-sm text-muted">
                      {t('vps.storage.overview.mounts.subtitle', {
                        enabled: summary.enabledMountCount,
                        disabled: summary.disabledMountCount,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-xs text-muted" data-testid="vps.storage.summary.access">
                    <span>{t('vps.storage.overview.access.value', { rw: summary.writableMountCount, ro: summary.readOnlyMountCount })}</span>
                    {summary.unknownModeMountCount > 0 ? (
                      <span>{t('vps.storage.overview.access.unknown', { count: summary.unknownModeMountCount })}</span>
                    ) : null}
                    {summary.mountAttentionCount > 0 ? (
                      <span className="font-medium text-warn">
                        {t('vps.storage.overview.access.failed', { n: summary.mountAttentionCount })}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
