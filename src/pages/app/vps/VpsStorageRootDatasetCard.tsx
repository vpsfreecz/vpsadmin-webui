import React from 'react';
import { Link } from 'react-router-dom';

import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { formatMiB } from '../../../lib/format';
import type { RootDatasetSummary } from './VpsStorageModel';

function MetadataItem(props: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-faint">{props.label}</div>
      <div className="font-medium text-fg">{props.value}</div>
    </div>
  );
}
function countLabel(value: number | null): string | number {
  return value ?? '—';
}

export function VpsStorageRootDatasetCard(props: {
  basePath: string;
  canAdmin: boolean;
  canCreateSubdataset: boolean;
  root: RootDatasetSummary;
  loading: boolean;
  error: string | null;
  canResize: boolean;
  resizeDisabledReason?: Parameters<typeof ActionButton>[0]['disabledReason'];
  resizeLoading: boolean;
  onResize: () => void;
}) {
  const { t } = useI18n();
  const root = props.root;

  if (!root.id) {
    return (
      <Card testId="vps.storage.root_dataset.empty">
        <CardHeader title={t('vps.storage.root_dataset.title')} subtitle={t('vps.storage.root_dataset.empty.subtitle')} />
        <CardBody>
          <div className="text-sm text-muted">{t('vps.storage.root_dataset.empty.body')}</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card testId="vps.storage.root_dataset">
      <CardHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-2">
            {t('vps.storage.root_dataset.title')}
            <Link
              className="text-link underline"
              to={`${props.basePath}/datasets/${root.id}`}
              aria-label={`${t('vps.storage.root_dataset.open')} #${root.id}`}
              data-testid="vps.storage.root_dataset.open"
            >
              #{root.id}
            </Link>
          </span>
        }
        subtitle={<span className="break-all">{root.label}</span>}
        actions={
          <div className="flex flex-wrap gap-2">
            {props.canAdmin ? (
              <ActionButton
                onClick={props.onResize}
                loading={props.resizeLoading}
                disabled={!props.canResize}
                disabledReason={props.resizeDisabledReason}
                size="sm"
                testId="vps.storage.root_dataset.resize"
              >
                {t('vps.storage.resize.open')}
              </ActionButton>
            ) : null}
            {props.canCreateSubdataset ? (
              <Button size="sm" variant="primary" to={`${props.basePath}/datasets/${root.id}?create=subdataset`} testId="vps.storage.root_dataset.create_subdataset">
                {t('vps.storage.root_dataset.create_subdataset')}
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" to={`${props.basePath}/datasets/${root.id}/snapshots`} testId="vps.storage.root_dataset.snapshots">
              {t('vps.storage.root_dataset.snapshots')}
            </Button>
            <Button size="sm" variant="secondary" to={`${props.basePath}/datasets/${root.id}/downloads`} testId="vps.storage.root_dataset.downloads">
              {t('vps.storage.root_dataset.downloads')}
            </Button>
          </div>
        }
      />
      <CardBody>
        {props.loading ? (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted" data-testid="vps.storage.root_dataset.loading">
            <Spinner /> {t('common.loading')}
          </div>
        ) : null}
        {props.error ? (
          <div className="mb-3">
            <Alert title={t('vps.storage.root_dataset.load_error')} variant="danger">
              {props.error}
            </Alert>
          </div>
        ) : null}

        <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4" data-testid="vps.storage.root_dataset.metadata">
          <MetadataItem label={t('dataset.field.used')} value={formatMiB(root.used)} />
          <MetadataItem label={t('dataset.field.available')} value={formatMiB(root.available)} />
          <MetadataItem
            label={t('vps.storage.root_dataset.effective_limit')}
            value={root.referenceQuota !== null ? formatMiB(root.referenceQuota) : formatMiB(root.quota)}
          />
          <MetadataItem
            label={t('vps.storage.root_dataset.capacity')}
            value={root.capacityPercent !== null ? t('vps.storage.root_dataset.capacity_percent', { percent: root.capacityPercent }) : t('common.na')}
          />
        </div>

        {!props.loading && !props.canCreateSubdataset ? (
          <div className="mt-1 text-xs text-muted">{t('vps.storage.root_dataset.create_subdataset_user_note')}</div>
        ) : null}

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4" data-testid="vps.storage.root_dataset.details">
          <MetadataItem label={t('dataset.field.referenced')} value={formatMiB(root.referenced)} />
          <MetadataItem label={t('dataset.field.reference_quota')} value={root.referenceQuota !== null ? formatMiB(root.referenceQuota) : '∞'} />
          <MetadataItem label={t('dataset.field.quota')} value={formatMiB(root.quota)} />
          <MetadataItem label={t('common.state')} value={root.state ?? t('common.na')} />
        </div>
        {props.canAdmin ? (
          <details className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-xs text-muted">
            <summary className="cursor-pointer font-medium text-fg">{t('vps.storage.root_dataset.details.title_admin')}</summary>
            <div className="mt-3" data-testid="vps.storage.root_dataset.system_context">
              <div>
                {t('vps.storage.root_dataset.related_counts', {
                  snapshots: countLabel(root.snapshotCount),
                  mounts: countLabel(root.mountCount),
                  exports: countLabel(root.exportCount),
                })}
              </div>
              <div className="mt-1">{t('vps.storage.root_dataset.system_context.body')}</div>
            </div>
          </details>
        ) : null}
      </CardBody>
    </Card>
  );
}
