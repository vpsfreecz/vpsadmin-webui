import { formatMiB, formatUptimeSeconds } from '../../../../lib/format';
import type { NodeRow } from '../NodesModel';
import type { NodesPageTranslator } from '../NodesFilters';

function number(value?: number) {
  return value === undefined ? '—' : value.toFixed(1);
}
export function NodesMetrics({
  row,
  t,
  section,
}: {
  row: NodeRow;
  t: NodesPageTranslator;
  section: 'cpu' | 'memory' | 'system';
}) {
  const items =
    section === 'cpu'
      ? [
          [t('admin.node.field.load_average'), [row.loadavg1, row.loadavg5, row.loadavg15].map(number).join(' / ')],
          [t('admin.node.field.cpu_idle'), `${number(row.cpu_idle)}${row.cpu_idle === undefined ? '' : '%'}`],
          [t('admin.nodes.iowait'), `${number(row.cpu_iowait)}${row.cpu_iowait === undefined ? '' : '%'}`],
        ]
      : section === 'memory'
        ? [
            [
              t('admin.nodes.free_memory'),
              formatMiB(
                row.total_memory !== undefined && row.used_memory !== undefined
                  ? row.total_memory - row.used_memory
                  : undefined
              ),
            ],
            [t('admin.nodes.arc_size'), formatMiB(row.arc_size)],
            [
              t('admin.node.field.arc_hit'),
              `${number(row.arc_hitpercent)}${row.arc_hitpercent === undefined ? '' : '%'}`,
            ],
          ]
        : [
            [t('admin.node.field.uptime'), formatUptimeSeconds(row.uptime)],
            [t('admin.nodes.version'), row.version ?? '—'],
            [t('admin.node.field.kernel'), row.kernel ?? '—'],
          ];
  return (
    <dl className="space-y-1 text-xs">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-faint">{label}</dt>
          <dd className="break-words text-fg tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
