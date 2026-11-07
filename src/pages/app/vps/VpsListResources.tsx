import { Fragment } from 'react';

import { UsageBar } from '../../../components/ui/UsageBar';
import { formatMiB, formatMiBPair } from '../../../lib/format';
import type { VpsListRecord, VpsListTranslator } from './vpsListSemantics';

export function VpsListResources({ row, t }: { row: VpsListRecord; t: VpsListTranslator }) {
  const allocations = [
    { key: 'ram', label: t('vps.list.usage.ram'), used: row.memUsed, max: row.memMax },
    { key: 'disk', label: t('vps.list.usage.disk'), used: row.diskUsed, max: row.diskMax },
  ];

  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-xs tabular-nums">
      <dt className="text-muted">{t('vps.overview.config.cpu')}</dt>
      <dd className="text-right">{row.vps.cpu ?? t('common.na')}</dd>
      {row.loadLabel !== undefined ? (
        <>
          <dt className="text-muted">{t('vps.list.resources.load')}</dt>
          <dd className="text-right">{row.loadLabel}</dd>
        </>
      ) : null}
      {allocations.map(({ key, label, used, max }) => (
        <Fragment key={key}>
          <dt className="text-muted">{label}</dt>
          <dd className="min-w-0 text-right">
            {used !== undefined && max !== undefined && max > 0 ? (
              <UsageBar
                layout="row"
                rowLabelClassName="hidden"
                rowValueClassName="w-auto whitespace-nowrap"
                ariaLabel={label}
                used={used}
                max={max}
                formatValue={formatMiB}
                formatPair={formatMiBPair}
              />
            ) : (
              formatMiB(max)
            )}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
