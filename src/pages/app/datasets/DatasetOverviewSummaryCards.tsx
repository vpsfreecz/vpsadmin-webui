import { useMemo } from 'react';

import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { StackedBar } from '../../../components/ui/StackedBar';
import type { Dataset } from '../../../lib/api/datasets';
import { formatMiB } from '../../../lib/format';
import { usageSeverityFromRatio } from '../../../lib/usage';

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function positive(value: unknown): number | undefined {
  const number = asNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function objectId(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('id' in value)) return null;
  const id = value.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

export function DatasetSpaceCard(props: { dataset: Dataset }) {
  const { t } = useI18n();

  const reportedUsed = asNumber(props.dataset.used);
  const reportedAvailable = asNumber(props.dataset.avail);
  const used = reportedUsed !== undefined ? Math.max(0, reportedUsed) : undefined;
  const available = reportedAvailable !== undefined ? Math.max(0, reportedAvailable) : undefined;
  const referenceQuota = positive(props.dataset.refquota);
  const unlimitedReferenceQuota = asNumber(props.dataset.refquota) === 0;
  const quota = positive(props.dataset.quota);
  const referenced = asNumber(props.dataset.referenced);

  const total = used !== undefined && available !== undefined ? used + available : 0;
  const usageRatio = total > 0 && used !== undefined ? used / total : 0;
  const usageVariant = usageSeverityFromRatio(usageRatio);

  const quotaPercent = used !== undefined && referenceQuota !== undefined
    ? Math.round((used / referenceQuota) * 100)
    : null;
  const clampedQuotaPercent = quotaPercent !== null ? Math.max(0, Math.min(999, quotaPercent)) : null;
  const quotaVariant =
    clampedQuotaPercent !== null ? usageSeverityFromRatio(clampedQuotaPercent / 100) : undefined;

  const segments = useMemo(() => {
    if (used === undefined || available === undefined || total <= 0) {
      return [{ value: 1, variant: 'neutral' as const, title: t('datasets.usage.no_data') }];
    }

    return [
      { value: used, variant: usageVariant, title: t('datasets.usage.used_mib', { mib: used.toFixed(0) }) },
      {
        value: available,
        variant: 'neutral' as const,
        title: t('datasets.usage.free_mib', { mib: available.toFixed(0) }),
      },
    ];
  }, [available, t, total, usageVariant, used]);

  return (
    <Card testId="dataset.overview.space">
      <CardHeader
        title={t('dataset.overview.space.title')}
        actions={
          clampedQuotaPercent !== null ? (
            <Badge variant={quotaVariant} title={t('dataset.overview.space.badge.title')}>
              {clampedQuotaPercent}%
            </Badge>
          ) : unlimitedReferenceQuota ? (
            <Badge variant="neutral" title={t('dataset.overview.space.badge.infinity_title')}>
              ∞
            </Badge>
          ) : null
        }
      />

      <CardBody>
        <StackedBar ariaLabel={t('datasets.usage.aria_label')} segments={segments} />

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-faint">{t('dataset.field.used')}</div>
            <div className="font-medium text-fg">{formatMiB(used)}</div>
          </div>
          <div>
            <div className="text-xs text-faint">{t('dataset.field.available')}</div>
            <div className="font-medium text-fg">{formatMiB(available)}</div>
          </div>
          <div>
            <div className="text-xs text-faint">{t('dataset.field.reference_quota')}</div>
            <div className="font-medium text-fg">
              {referenceQuota !== undefined ? formatMiB(referenceQuota) : unlimitedReferenceQuota ? '∞' : t('common.na')}
            </div>
          </div>
          <div>
            <div className="text-xs text-faint">{t('dataset.field.quota')}</div>
            <div className="font-medium text-fg">{quota !== undefined ? formatMiB(quota) : t('common.na')}</div>
          </div>
          <div>
            <div className="text-xs text-faint">{t('dataset.field.referenced')}</div>
            <div className="font-medium text-fg">
              {referenced !== undefined ? formatMiB(referenced) : t('common.na')}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function DatasetTemporaryExpansionCard(props: { dataset: Dataset; destination: string }) {
  const { t } = useI18n();
  const expansionId = objectId(props.dataset['dataset_expansion']);

  return (
    <Card testId="dataset.overview.expansion">
      <CardHeader
        title={t('dataset.overview.expansion.title')}
        subtitle={expansionId ? undefined : t('dataset.overview.expansion.subtitle')}
        actions={
          <Button to={props.destination} size="sm" testId="dataset.overview.expansion.open">
            {expansionId ? t('dataset.overview.expansion.open') : t('dataset.overview.expansion.create')}
          </Button>
        }
      />
      <CardBody>
        <div className="space-y-3 text-sm text-muted">
          <p>{t('dataset.overview.expansion.body')}</p>
          <div className="flex flex-wrap items-center gap-2">
            {expansionId ? (
              <span className="text-xs text-faint">#{expansionId}</span>
            ) : (
              <Badge variant="neutral">{t('dataset.overview.expansion.none')}</Badge>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
