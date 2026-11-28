import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { TableCard } from '../../../components/ui/TableCard';
import { formatDateTimeInTimeZone } from '../../../lib/format';
import type { VpsPressureRow } from '../../../lib/api/vpsPressureModels';
import { exactPressureDuration, pressureDuration } from './pressureState';
import './PressureProgress.css';

export function PressureProgress({ row }: { row: VpsPressureRow }) {
  const { t, lang } = useI18n();
  const threshold = row.threshold_seconds;
  const credit = row.credit_us;
  const noObservations = credit === 0 && row.observation_state === 'no_data';
  const valid =
    row.configuration_valid &&
    !noObservations &&
    credit !== null &&
    threshold !== null &&
    threshold > 0 &&
    row.window_seconds !== null;
  const period =
    row.window_seconds === null
      ? t('pressure.unavailableValue')
      : pressureDuration(row.window_seconds * 1_000_000, lang);
  return (
    <div className="space-y-1">
      <div title={row.credit_us === null ? undefined : exactPressureDuration(row.credit_us, lang)}>
        {row.credit_us === null || !row.configuration_valid
          ? t('pressure.unavailableValue')
          : noObservations
            ? t('pressure.noObservations')
            : pressureDuration(row.credit_us, lang)}
      </div>
      {valid ? (
        <meter
          className="pressure-progress block h-3 w-full"
          data-tone={credit / (threshold * 1_000_000) >= 0.8 ? 'danger' : 'warning'}
          min={0}
          max={100}
          value={Math.min(100, (credit / (threshold * 1_000_000)) * 100)}
          aria-label={t('pressure.threshold')}
          aria-valuetext={t('pressure.progressValue', {
            duration: exactPressureDuration(credit, lang),
            threshold: exactPressureDuration(threshold * 1_000_000, lang),
            period,
          })}
        />
      ) : null}
      {threshold !== null && threshold > 0 ? (
        <div className="text-xs text-muted">
          {t('pressure.threshold')}: {pressureDuration(threshold * 1_000_000, lang)}
        </div>
      ) : null}
    </div>
  );
}

export function PressureRows({
  rows,
  basePath,
  admin,
  detail = false,
  timeZone = 'UTC',
}: {
  rows: VpsPressureRow[];
  basePath: string;
  admin: boolean;
  detail?: boolean;
  timeZone?: string;
}) {
  const { t, lang } = useI18n();
  const identity = (row: VpsPressureRow) => (
    <div className="space-y-1">
      <Link className="text-accent hover:underline" to={`${basePath}/vps/${row.vps.id}/pressure`}>
        #{row.vps.id} {row.vps.hostname}
      </Link>
      {admin && row.user ? (
        <div>
          <Link className="text-accent hover:underline" to={`/admin/users/${row.user.id}`}>
            {row.user.login}
          </Link>
        </div>
      ) : null}
      {admin && row.node ? (
        <div>
          <Link className="text-accent hover:underline" to={`/admin/nodes/${row.node.id}`}>
            {row.node.domain_name}
          </Link>
        </div>
      ) : null}
    </div>
  );
  const issue = (row: VpsPressureRow) => (row.signal === 'rtnl_latency' ? t('pressure.memory') : row.label);
  const period = (row: VpsPressureRow) => (
    <span
      title={
        row.window_from && row.window_to
          ? `${formatDateTimeInTimeZone(row.window_from, timeZone, lang)} – ${formatDateTimeInTimeZone(row.window_to, timeZone, lang)}`
          : undefined
      }
    >
      {row.window_seconds === null
        ? t('pressure.unavailableValue')
        : pressureDuration(row.window_seconds * 1_000_000, lang)}
    </span>
  );
  const headers = [...(!detail ? ['vps.list.col.vps'] : []), 'pressure.issue', 'pressure.period', 'pressure.recorded'];
  return (
    <>
      <div className="hidden md:block">
        <TableCard
          tableTestId="pressure.rows"
          minWidth="full"
          tableClassName="table-fixed [&_th]:whitespace-normal [&_td]:break-words [&_th]:align-top [&_td]:align-top"
        >
          <thead>
            <tr>
              {headers.map((key) => (
                <th key={key}>{t(key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {!detail ? <td>{identity(row)}</td> : null}
                <td>{issue(row)}</td>
                <td>{period(row)}</td>
                <td>
                  <PressureProgress row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
      <div className="grid gap-3 md:hidden" data-testid="pressure.mobile">
        {rows.map((row) => (
          <TableCard
            key={row.id}
            title={detail ? issue(row) : identity(row)}
            rows={[
              !detail && { label: t('pressure.issue'), value: issue(row) },
              { label: t('pressure.period'), value: period(row) },
              { label: t('pressure.recorded'), value: <PressureProgress row={row} /> },
            ]}
          />
        ))}
      </div>
    </>
  );
}
