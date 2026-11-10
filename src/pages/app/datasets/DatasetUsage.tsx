import { useI18n } from '../../../app/i18n';
import { StackedBar } from '../../../components/ui/StackedBar';
import { formatMiB } from '../../../lib/format';
import { usageSeverityFromRatio } from '../../../lib/usage';
import { datasetUsageBreakdown, type DatasetUsageValues } from './DatasetUsageModel';

export function DatasetUsage(props: DatasetUsageValues & { showUnlimitedUsage?: boolean }) {
  const { t } = useI18n();
  const limits = datasetUsageBreakdown(props);
  const used = typeof props.used === 'number' && Number.isFinite(props.used) ? Math.max(0, props.used) : null;

  if (limits.length === 0) {
    return (
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
        {props.showUnlimitedUsage !== false ? (<span>{t('dataset.field.used')}: {used !== null ? formatMiB(used) : t('common.na')}</span>) : null}
        <span>{t('dataset.field.quota')}: {props.quota === 0 && props.refquota === 0 ? '∞' : t('common.na')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {limits.map((usage) => {
        const label = t(usage.kind === 'reference' ? 'dataset.field.reference_quota' : 'dataset.field.quota');
        const measurement = t(usage.kind === 'reference' ? 'dataset.field.referenced' : 'dataset.field.used');
        const value = usage.used !== null ? formatMiB(usage.used) : t('common.na');
        const limit = formatMiB(usage.limit);
        const percent = usage.ratio !== null ? `${Math.round(usage.ratio * 100)}%` : t('common.na');
        const description = `${label}: ${value} / ${limit} (${percent})`;
        return (
          <div key={usage.kind} data-testid={`dataset.usage.${usage.kind}`}>
            <div className="mb-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
              <span>{label}</span>
              <span className="font-medium text-fg">{value} / {limit} · {percent}</span>
            </div>
            {usage.ratio !== null && usage.used !== null && usage.free !== null ? (
              <StackedBar
                ariaLabel={description}
                segments={[
                  { value: usage.used, variant: usageSeverityFromRatio(usage.ratio), title: `${measurement}: ${value}` },
                  { value: usage.free, variant: 'neutral', title: `${label}: ${limit}` },
                ]}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
