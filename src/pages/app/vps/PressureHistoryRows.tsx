import { useI18n } from '../../../app/i18n';
import { formatDateTimeInTimeZone } from '../../../lib/format';
import { TableCard } from '../../../components/ui/TableCard';
import { Select } from '../../../components/ui/Select';
import type { PressureHistoryDay } from '../../../lib/api/vpsPressureModels';
import { exactPressureDuration, pressureDuration } from './pressureState';

/** Daily UTC buckets are independent of the current rolling reporting threshold. */
export function PressureHistoryRows({
  rows,
  days,
  onDaysChange,
  pending = false,
  ownerBound = false,
  timeZone,
}: {
  rows: PressureHistoryDay[];
  days: 7 | 30;
  onDaysChange: (days: 7 | 30) => void;
  pending?: boolean;
  ownerBound?: boolean;
  timeZone: string;
}) {
  const { t, lang } = useI18n();
  return (
    <section className="space-y-3" aria-labelledby="pressure-history-heading" data-testid="pressure.history">
      <div className="flex flex-wrap items-end gap-3">
        <h2 id="pressure-history-heading" className="text-lg font-semibold">
          {t('pressure.history')}
        </h2>
        <Select
          ariaLabel={t('pressure.history')}
          value={String(days)}
          disabled={pending}
          onChange={(event) => onDaysChange(event.target.value === '30' ? 30 : 7)}
          options={[
            { value: '7', label: t('pressure.last7') },
            { value: '30', label: t('pressure.last30') },
          ]}
        />
      </div>
      {ownerBound ? <p className="text-sm text-muted">{t('pressure.currentOwner')}</p> : null}
      <p className="text-sm text-muted">{timeZone}</p>
      <TableCard minWidth="full">
        <thead>
          <tr>
            <th>{t('pressure.period')}</th>
            <th>{t('pressure.recorded')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((day) => (
            <tr key={day.from_at}>
              <td>
                <time dateTime={day.from_at}>
                  {formatDateTimeInTimeZone(day.from_at, timeZone, lang, 'shortOffset')}
                </time>
                {' → '}
                <time dateTime={day.to_at}>{formatDateTimeInTimeZone(day.to_at, timeZone, lang, 'shortOffset')}</time>
                {day.partial_day ? <div className="text-sm text-muted">{t('pressure.inProgress')}</div> : null}
              </td>
              <td title={day.recorded_us === null ? undefined : exactPressureDuration(day.recorded_us, lang)}>
                {day.recorded_us === null ? t('pressure.noRecordedData') : pressureDuration(day.recorded_us, lang)}
              </td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </section>
  );
}
