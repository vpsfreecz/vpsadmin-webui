import { useI18n } from '../../../app/i18n';
import { ListShell } from '../../../components/layout/ListShell';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import type { SelectOption } from '../../../components/ui/Select';
import type { PressureFilterKey, VpsPressureRow } from '../../../lib/api/vpsPressureModels';
import { PressureFiltersForm } from './PressureFilters';
import { PressureRows } from './PressureRows';

export function PressurePageView({
  rows,
  search,
  supportedFilters,
  choices,
  basePath,
  admin,
  timeZone,
  pending,
  unavailable,
  dataUnavailable = false,
  error,
  invalidFilters = false,
  meta,
  onApply,
  onRefresh,
  onRetry,
  onOffset,
}: {
  rows: VpsPressureRow[];
  search: URLSearchParams;
  supportedFilters: readonly PressureFilterKey[];
  choices: Partial<Record<PressureFilterKey, SelectOption[]>>;
  basePath: string;
  admin: boolean;
  timeZone?: string;
  pending: boolean;
  unavailable: boolean;
  dataUnavailable?: boolean;
  error?: unknown;
  invalidFilters?: boolean;
  meta?: { offset: number; limit: number; next_offset: number | null; total_count: number };
  onApply: (values: Record<string, string>) => void;
  onRefresh: () => void;
  onRetry: () => void;
  onOffset: (offset: number) => void;
}) {
  const { t } = useI18n();
  return (
    <ListShell
      header={<PageHeader title={t('pressure.title')} />}
      filters={
        !unavailable ? (
          <PressureFiltersForm
            search={search}
            supported={supportedFilters}
            choices={choices}
            admin={admin}
            pending={pending}
            onApply={onApply}
            onRefresh={onRefresh}
          />
        ) : undefined
      }
      testId="pressure.overview"
    >
      {invalidFilters ? (
        <Alert variant="danger">{t('incidentAdmin.invalidFilters')}</Alert>
      ) : error ? (
        <ErrorState title={t('pressure.loadError')} error={error} onRetry={onRetry} />
      ) : unavailable || dataUnavailable ? (
        <Alert variant="info">{t('pressure.unavailable')}</Alert>
      ) : pending ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState title={t('pressure.empty')} />
      ) : (
        <PressureRows rows={rows} basePath={basePath} admin={admin} timeZone={timeZone} />
      )}
      {meta && !pending && !error && !unavailable && !dataUnavailable && !invalidFilters ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="text-sm text-muted">{meta.total_count.toLocaleString()}</span>
          <Button
            variant="secondary"
            disabled={meta.offset === 0}
            onClick={() => onOffset(Math.max(0, meta.offset - meta.limit))}
          >
            {t('pagination.prev')}
          </Button>
          <Button
            variant="secondary"
            disabled={meta.next_offset === null}
            onClick={() => {
              if (meta.next_offset !== null) onOffset(meta.next_offset);
            }}
          >
            {t('pagination.next')}
          </Button>
        </div>
      ) : null}
    </ListShell>
  );
}
