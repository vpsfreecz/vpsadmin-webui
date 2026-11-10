import { useI18n } from '../../../app/i18n';
import { StackedBar } from '../../../components/ui/StackedBar';
import { formatMiB } from '../../../lib/format';
import { usageSeverityFromRatio } from '../../../lib/usage';
import { datasetUsageBreakdown, type DatasetUsageValues } from './DatasetUsageModel';

export function DatasetUsage(props: DatasetUsageValues & { showUnlimitedUsage?: boolean }) {
  const { t } = useI18n();
  const limits = datasetUsageBreakdown(props);
  const used = typeof props.used === 'number' && Number.isFinite(props.used) ? Math.max(0, props.used) : null;
  const entries = [
    { kind: 'reference', raw: props.refquota, label: t('dataset.field.reference_quota') },
    { kind: 'quota', raw: props.quota, label: t('dataset.field.quota') },
  ] as const;

  return (
    <div className="space-y-3">
      {limits.length === 0 && props.showUnlimitedUsage !== false ? (
        <div className="text-xs text-muted">
          {t('dataset.field.used')}: {used !== null ? formatMiB(used) : t('common.na')}
        </div>
      ) : null}
      {entries.map(({ kind, raw, label }) => {
        const usage = limits.find((value) => value.kind === kind);
        if (!usage) {
          return (
            <div key={kind} data-testid={`dataset.usage.${kind}`} className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted">
              <span>{label}</span>
              <span>{raw === 0 ? '∞' : t('common.na')}</span>
            </div>
          );
        }
        const measurement = t(kind === 'reference' ? 'dataset.field.referenced' : 'dataset.field.used');
        const value = usage.used !== null ? formatMiB(usage.used) : t('common.na');
        const limit = formatMiB(usage.limit);
        const percent = usage.ratio !== null ? `${Math.round(usage.ratio * 100)}%` : t('common.na');
        const description = `${label}: ${value} / ${limit} (${percent})`;
        return (
          <div key={kind} data-testid={`dataset.usage.${kind}`}>
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
