import { useI18n } from '../../../app/i18n';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Alert } from '../../../components/ui/Alert';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { formatDateTime } from '../../../lib/format';
import { AdminIncidentsTabs } from './AdminIncidentsTabs';
import { AdminIncidentFilters } from './AdminIncidentFilters';
import { AdminIncidentHistoryRows, AdminIncidentOverviewRows, AdminIncidentPaging } from './AdminIncidentViews';
import type {
  AdminIncidentEvaluation,
  AdminIncidentExposure,
  AdminIncidentPageMeta,
} from '../../../lib/api/adminIncidentModels';
import type { AdminIncidentView } from './adminIncidentState';

type PageRows =
  { view: 'overview'; rows: AdminIncidentExposure[] } | { view: 'history'; rows: AdminIncidentEvaluation[] };
export function AdminIncidentPageView(
  props: PageRows & {
    meta?: AdminIncidentPageMeta;
    search: URLSearchParams;
    pending: boolean;
    unavailable: boolean;
    error?: unknown;
    invalidFilters?: boolean;
    onRetry: () => void;
    onChange: (key: string, value: string) => void;
    onApply: (values: Record<string, string>) => void;
    onRefresh: () => void;
    onOffset: (offset: number) => void;
  }
) {
  const { t } = useI18n();
  const view: AdminIncidentView = props.view;
  return (
    <div className="space-y-4" data-testid={`incidents.admin.${view}`}>
      <PageHeader title={t(`incidentAdmin.${view}`)} description={t(`incidentAdmin.${view}Description`)} />
      <AdminIncidentsTabs />
      <AdminIncidentFilters
        view={view}
        search={props.search}
        onChange={props.onChange}
        onApply={props.onApply}
        onRefresh={props.onRefresh}
        pending={props.pending}
      />
      {props.meta ? (
        <div className="space-y-1 text-xs text-muted" data-testid="incidents.admin.asOf">
          <div>
            {t('incidentAdmin.asOf')}: {formatDateTime(props.meta.as_of)}
          </div>
          <details>
            <summary className="cursor-pointer">{t('incidentAdmin.timeDetails')}</summary>
            <div>
              {t('incidentAdmin.readAt')}: {formatDateTime(props.meta.read_at)}
            </div>
          </details>
          {view === 'history' ? (
            <div>
              {props.search.get('scope') === 'outstanding'
                ? t('incidentAdmin.outstandingPeriod')
                : t('incidentAdmin.period', {
                    from: props.meta.from ? formatDateTime(props.meta.from) : t('common.na'),
                    to: props.meta.to ? formatDateTime(props.meta.to) : t('common.na'),
                  })}
            </div>
          ) : null}
        </div>
      ) : null}
      {props.invalidFilters ? (
        <ErrorState title={t('incidentAdmin.invalidFilters')} onRetry={props.onRefresh} />
      ) : props.error ? (
        <ErrorState title={t('incidentAdmin.loadError')} error={props.error} onRetry={props.onRetry} />
      ) : props.unavailable ? (
        <Alert variant="info">{t('incidentAdmin.unavailable')}</Alert>
      ) : props.pending ? (
        <LoadingState />
      ) : props.rows.length === 0 ? (
        <EmptyState title={t(`incidentAdmin.${view}Empty`)} />
      ) : props.view === 'overview' ? (
        <AdminIncidentOverviewRows rows={props.rows} />
      ) : (
        <AdminIncidentHistoryRows rows={props.rows} />
      )}
      {props.meta && !props.error && !props.invalidFilters && !props.unavailable ? (
        <AdminIncidentPaging
          meta={props.meta}
          rowCount={props.rows.length}
          pending={props.pending}
          onOffset={props.onOffset}
          onLimit={(limit) => props.onChange('limit', String(limit))}
        />
      ) : null}
    </div>
  );
}
