import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TableCard } from '../../../components/ui/TableCard';
import { formatDateTime } from '../../../lib/format';
import { AdminIncidentCounts, DateFact, Fact, ChainLink, OutcomeSummary } from './AdminIncidentFacts';
export { AdminIncidentCounts } from './AdminIncidentFacts';
import type {
  AdminIncidentEvaluation,
  AdminIncidentExposure,
  AdminIncidentPageMeta,
} from '../../../lib/api/adminIncidentModels';

function ExposureRestrictions({ row }: { row: AdminIncidentExposure }) {
  const { t } = useI18n();
  const boolean = (value: boolean | null) =>
    value == null ? t('common.na') : t(value ? 'incidentAdmin.yes' : 'incidentAdmin.no');
  return (
    <div className="space-y-1">
      <div>
        {t('incidentAdmin.mode')}: <Fact value={row.effective_mode} prefix="incidentAdmin.mode" />
      </div>
      <div className="text-xs">
        {t('incidentAdmin.globalMode')}: <Fact value={row.global_mode} prefix="incidentAdmin.mode" />
      </div>
      <div className="text-xs">
        {t('incidentAdmin.warningPermitted')}: {boolean(row.warning_permitted)}
      </div>
      <div className="text-xs">
        {t('incidentAdmin.stopEnforced')}: {boolean(row.stop_enforced)}
      </div>
      {!row.owner_active ? <Badge variant="warn">{t('incidentAdmin.ownerInactive')}</Badge> : null}
      {row.transfer_pending ? <Badge variant="warn">{t('incidentAdmin.transferPending')}</Badge> : null}
      {row.outstanding_stop_state !== 'none' ? (
        <div>
          <Badge variant={['failed', 'uncertain'].includes(row.outstanding_stop_state) ? 'danger' : 'warn'}>
            {t('incidentAdmin.sharedStop')}: <Fact value={row.outstanding_stop_state} prefix="incidentAdmin.action" />
          </Badge>
          <ChainLink id={row.outstanding_stop_chain_id} />
        </div>
      ) : null}
      <DateFact label={t('incidentAdmin.lastWarning')} value={row.last_warning_at} />
      <DateFact label={t('incidentAdmin.lastStop')} value={row.last_stop_at} />
      <DateFact label={t('incidentAdmin.warningBoundary')} value={row.next_warning_allowed_at} />
      <DateFact label={t('incidentAdmin.stopBoundary')} value={row.next_stop_allowed_at} />
      <DateFact label={t('incidentAdmin.accountingSince')} value={row.accounting_since} />
    </div>
  );
}

function ExposureOutcome({ row }: { row: AdminIncidentExposure }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      {row.latest_action_id != null ? (
        <div>
          <Fact value={row.latest_action_kind} prefix="incidentAdmin.kind" />:{' '}
          <Fact value={row.latest_action_state} prefix="incidentAdmin.action" />
          <div>
            <ChainLink id={row.latest_action_chain_id} />
          </div>
        </div>
      ) : (
        <span className="text-muted">{t('incidentAdmin.noAction')}</span>
      )}
      {row.latest_mail_state != null ? (
        <div>
          {t('incidentAdmin.mail')}: <Fact value={row.latest_mail_state} prefix="incidentAdmin.mail_state" />
        </div>
      ) : null}
      <DateFact label={t('incidentAdmin.confirmedStop')} value={row.latest_stop_completed_at} />
      {row.latest_notice_report_id != null ? (
        <Link className="text-accent hover:underline" to={`/admin/incidents/${row.latest_notice_report_id}`}>
          {t('incidentAdmin.notice', { id: row.latest_notice_report_id })}
        </Link>
      ) : null}
    </div>
  );
}

function ExposureIdentity({ row }: { row: AdminIncidentExposure }) {
  return (
    <div className="space-y-1">
      <Link className="font-semibold text-accent hover:underline" to={`/admin/vps/${row.vps.id}`}>
        #{row.vps.id} {row.vps.hostname}
      </Link>
      <div>
        <Link className="text-accent hover:underline" to={`/admin/users/${row.user.id}`}>
          {row.user.login} (#{row.user.id})
        </Link>
      </div>
    </div>
  );
}

function PolicyLink({ row }: { row: AdminIncidentExposure }) {
  return (
    <Link
      className="text-accent hover:underline"
      to={`/admin/vps/${row.vps.id}/incidents#incident-policy-${encodeURIComponent(row.policy_key)}`}
    >
      {row.label}
    </Link>
  );
}

function ExposureStatus({ row }: { row: AdminIncidentExposure }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <Fact value={row.configuration_valid ? row.status : 'invalid'} prefix="incidentAdmin.status" />
      {row.effective_mode === 'observe' || row.effective_mode === 'notify' ? (
        <div>
          <Fact value={row.effective_mode} prefix="incidentAdmin.mode" />
        </div>
      ) : null}
      {row.stop_enforced === false ? <div>{t('incidentAdmin.shutdownDisabled')}</div> : null}
      {row.outstanding_stop_state !== 'none' ? (
        <div>
          <Badge variant={['failed', 'uncertain'].includes(row.outstanding_stop_state) ? 'danger' : 'warn'}>
            {t('incidentAdmin.sharedStop')}: <Fact value={row.outstanding_stop_state} prefix="incidentAdmin.action" />
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

function ExposureCounts({ row }: { row: AdminIncidentExposure }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <div>
        {t('incidentAdmin.warningShort')}{' '}
        <AdminIncidentCounts
          count={row.count_7d}
          limit={row.warning_limit}
          remaining={row.warning_remaining}
          days={row.warning_period_days}
        />
      </div>
      <div>
        {t('incidentAdmin.shutdownShort')}{' '}
        <AdminIncidentCounts
          count={row.count_30d}
          limit={row.stop_limit}
          remaining={row.stop_remaining}
          days={row.stop_period_days}
        />
      </div>
    </div>
  );
}

function ExposureDetails({ row }: { row: AdminIncidentExposure }) {
  const { t } = useI18n();
  return (
    <details className="mt-2" data-testid="incidents.admin.rowDetails">
      <summary
        className="cursor-pointer text-accent"
        aria-label={t('incidentAdmin.detailsFor', { policy: row.label, vps: row.vps.id })}
      >
        {t('incidentAdmin.details')}
      </summary>
      <div className="mt-3 space-y-3 break-words">
        <div>
          {row.policy_key} · {row.node.domain_name} (#{row.node.id})
        </div>
        <DateFact label={t('incidentAdmin.lastIncident')} value={row.last_incident_at} />
        <ExposureRestrictions row={row} />
        <ExposureOutcome row={row} />
      </div>
    </details>
  );
}

export function AdminIncidentOverviewRows({ rows }: { rows: AdminIncidentExposure[] }) {
  const { t } = useI18n();
  const outcome = (row: AdminIncidentExposure) => (
    <>
      <OutcomeSummary
        actionId={row.latest_action_id}
        kind={row.latest_action_kind}
        state={row.latest_action_state}
        mail={row.latest_mail_state}
        confirmed={row.latest_stop_completed_at}
      />
      <ExposureDetails row={row} />
    </>
  );
  return (
    <>
      <div className="hidden md:block">
        <TableCard
          minWidth="full"
          tableClassName="table-fixed [&_th]:whitespace-normal [&_th]:break-words [&_td]:break-words [&_th]:px-2 [&_td]:px-2 [&_th]:py-3 [&_td]:py-3 [&_th]:align-top [&_td]:align-top"
          tableTestId="incidents.admin.overview.rows"
        >
          <colgroup>
            {[29, 24, 23, 24].map((width, i) => (
              <col key={i} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {['vpsPolicy', 'counts', 'status', 'outcome'].map((key) => (
                <th key={key}>{t(`incidentAdmin.${key}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <ExposureIdentity row={row} />
                  <PolicyLink row={row} />
                </td>
                <td>
                  <ExposureCounts row={row} />
                </td>
                <td>
                  <ExposureStatus row={row} />
                </td>
                <td>{outcome(row)}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
      <div className="grid gap-3 md:hidden" data-testid="incidents.admin.overview.mobile">
        {rows.map((row) => (
          <TableCard
            key={row.id}
            title={<ExposureIdentity row={row} />}
            subtitle={<PolicyLink row={row} />}
            rows={[
              { label: t('incidentAdmin.counts'), value: <ExposureCounts row={row} /> },
              { label: t('incidentAdmin.status'), value: <ExposureStatus row={row} /> },
              { label: t('incidentAdmin.outcome'), value: outcome(row) },
            ]}
          />
        ))}
      </div>
    </>
  );
}

function HistoryIdentity({ row }: { row: AdminIncidentEvaluation }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <div>
        <time dateTime={row.evaluated_at}>{formatDateTime(row.evaluated_at)}</time>
      </div>
      <Link className="text-accent hover:underline" to={`/admin/incidents/${row.incident_report_id}`}>
        {t('incidentAdmin.report', { id: row.incident_report_id })}
      </Link>
      <div>
        {row.vps_id == null ? t('common.na') : `VPS #${row.vps_id}`} {row.hostname}
      </div>
      <div className="font-semibold">{row.label}</div>
    </div>
  );
}

function HistoryOutcome({ row }: { row: AdminIncidentEvaluation }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <div>
        {t('incidentAdmin.decision')}: <Fact value={row.decision} prefix="incidentAdmin.decision" />
      </div>
      {row.action_id != null ? (
        <>
          <div>
            <Fact value={row.action_kind} prefix="incidentAdmin.kind" />:{' '}
            <Fact value={row.action_state} prefix="incidentAdmin.action" />
          </div>
          <ChainLink id={row.transaction_chain_id} />
          {row.physical_stop_action_id != null ? (
            <div className="text-xs">{t('incidentAdmin.physicalStop', { id: row.physical_stop_action_id })}</div>
          ) : null}
          <DateFact label={t('incidentAdmin.actionCreated')} value={row.action_created_at} />
          <DateFact label={t('incidentAdmin.actionUpdated')} value={row.action_updated_at} />
        </>
      ) : null}
      <DateFact label={t('incidentAdmin.confirmedStop')} value={row.stop_completed_at} />
      {row.mail_state != null ? (
        <div>
          {t('incidentAdmin.mail')}: <Fact value={row.mail_state} prefix="incidentAdmin.mail_state" />
        </div>
      ) : null}
      <DateFact label={t('incidentAdmin.mailQueued')} value={row.mail_queued_at} />
      <DateFact label={t('incidentAdmin.mailFinished')} value={row.mail_finished_at} />
      {row.notice_report_id != null ? (
        <Link className="text-accent hover:underline" to={`/admin/incidents/${row.notice_report_id}`}>
          {t('incidentAdmin.notice', { id: row.notice_report_id })}
        </Link>
      ) : null}
    </div>
  );
}

function HistorySaved({ row }: { row: AdminIncidentEvaluation }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <div>
        {t('incidentAdmin.decision')}: <Fact value={row.decision} prefix="incidentAdmin.decision" />
      </div>
      {row.state !== 'recorded' || row.matched !== true ? (
        <div>
          <Fact value={row.state} prefix="incidentAdmin.evaluation" /> ·{' '}
          {row.matched == null
            ? t('incidentAdmin.matchUnknown')
            : t(row.matched ? 'incidentAdmin.matched' : 'incidentAdmin.notMatched')}
        </div>
      ) : null}
      <div>
        {t('incidentAdmin.warningShort')}{' '}
        <AdminIncidentCounts count={row.count_7d} limit={row.warning_limit} days={row.warning_period_days} />
      </div>
      <div>
        {t('incidentAdmin.shutdownShort')}{' '}
        <AdminIncidentCounts count={row.count_30d} limit={row.stop_limit} days={row.stop_period_days} />
      </div>
      <Fact value={row.threshold_status} prefix="incidentAdmin.status" />
    </div>
  );
}

function HistoryDetails({ row }: { row: AdminIncidentEvaluation }) {
  const { t } = useI18n();
  return (
    <details className="mt-2" data-testid="incidents.admin.rowDetails">
      <summary
        className="cursor-pointer text-accent"
        aria-label={t('incidentAdmin.historyDetailsFor', { report: row.incident_report_id, policy: row.label })}
      >
        {t('incidentAdmin.details')}
      </summary>
      <div className="mt-3 space-y-3 break-words">
        <div>
          {row.policy_key} · {row.user_id == null ? t('common.na') : `#${row.user_id}`} {row.user_login}
        </div>
        <DateFact label={t('incidents.field.detected_at')} value={row.detected_at} />
        <div>
          <Fact value={row.state} prefix="incidentAdmin.evaluation" /> ·{' '}
          {row.matched == null
            ? t('incidentAdmin.matchUnknown')
            : t(row.matched ? 'incidentAdmin.matched' : 'incidentAdmin.notMatched')}
        </div>
        <div>
          {t('incidentAdmin.mode')}: <Fact value={row.effective_mode} prefix="incidentAdmin.mode" />
        </div>
        <div>
          {t('incidentAdmin.savedStopEnforced')}:{' '}
          {row.stop_enforced == null ? t('common.na') : t(row.stop_enforced ? 'incidentAdmin.yes' : 'incidentAdmin.no')}
        </div>
        <HistoryOutcome row={row} />
      </div>
    </details>
  );
}

export function AdminIncidentHistoryRows({ rows }: { rows: AdminIncidentEvaluation[] }) {
  const { t } = useI18n();
  const outcome = (row: AdminIncidentEvaluation) => (
    <>
      <OutcomeSummary
        actionId={row.action_id}
        kind={row.action_kind}
        state={row.action_state}
        mail={row.mail_state}
        confirmed={row.stop_completed_at}
      />
      <HistoryDetails row={row} />
    </>
  );
  return (
    <>
      <div className="hidden md:block">
        <TableCard
          minWidth="full"
          tableClassName="table-fixed [&_th]:whitespace-normal [&_th]:break-words [&_td]:break-words [&_th]:px-2 [&_td]:px-2 [&_th]:py-3 [&_td]:py-3 [&_th]:align-top [&_td]:align-top"
          tableTestId="incidents.admin.history.rows"
        >
          <colgroup>
            {[32, 34, 34].map((width, i) => (
              <col key={i} style={{ width: `${width}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {['source', 'savedContext', 'currentOutcome'].map((key) => (
                <th key={key}>{t(`incidentAdmin.${key}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <HistoryIdentity row={row} />
                </td>
                <td>
                  <HistorySaved row={row} />
                </td>
                <td>{outcome(row)}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      </div>
      <div className="grid gap-3 md:hidden" data-testid="incidents.admin.history.mobile">
        {rows.map((row) => (
          <TableCard
            key={row.id}
            title={<HistoryIdentity row={row} />}
            rows={[
              { label: t('incidentAdmin.savedContext'), value: <HistorySaved row={row} /> },
              { label: t('incidentAdmin.currentOutcome'), value: outcome(row) },
            ]}
          />
        ))}
      </div>
    </>
  );
}

/** Navigation follows the endpoint metadata, never shared keyset cursor logic. */
export function AdminIncidentPaging({
  meta,
  rowCount,
  pending,
  onOffset,
  onLimit,
}: {
  meta: AdminIncidentPageMeta;
  rowCount: number;
  pending: boolean;
  onOffset: (offset: number) => void;
  onLimit: (limit: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="incidents.admin.paging">
      <span className="text-sm text-muted">
        {t('incidentAdmin.page', {
          first: rowCount ? meta.offset + 1 : 0,
          last: rowCount ? meta.offset + rowCount : 0,
          total: meta.total_count,
        })}
      </span>
      <Button
        variant="secondary"
        disabled={pending || meta.offset === 0}
        onClick={() => onOffset(Math.max(0, meta.offset - meta.limit))}
      >
        {t('pagination.prev')}
      </Button>
      <Button
        variant="secondary"
        disabled={pending || meta.next_offset == null}
        onClick={() => {
          if (meta.next_offset != null) onOffset(meta.next_offset);
        }}
      >
        {t('pagination.next')}
      </Button>
      <label className="text-sm">
        {t('incidentAdmin.pageSize')}{' '}
        <select
          className="rounded border border-border bg-surface px-2 py-2"
          value={meta.limit}
          disabled={pending}
          onChange={(e) => onLimit(Number(e.target.value))}
        >
          {[...new Set([meta.limit, 25, 50, 100])]
            .sort((a, b) => a - b)
            .map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}
