import { Link } from 'react-router-dom';

import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import type { Snapshot } from '../../../lib/api/datasets';
import { resourceLabel } from './ExportModel';

export function ExportSnapshotPicker(props: {
  value: string;
  onChange: (value: string) => void;
  snapshots: Snapshot[];
  disabled: boolean;
  loading: boolean;
  failed: boolean;
  incomplete: boolean;
  onRetry: () => void;
  allSnapshotsHref: string | undefined;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2" data-testid="exports.create.snapshot_picker">
      <div className="text-sm font-medium text-fg">{t('common.snapshot')}</div>
      <Select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        disabled={props.disabled || (props.loading && props.snapshots.length === 0)}
        ariaLabel={t('common.snapshot')}
      >
        <option value="">{t('exports.form.snapshot.placeholder')}</option>
        {props.snapshots.map((snapshot) => (
          <option key={snapshot.id} value={String(snapshot.id)}>
            {resourceLabel(snapshot)}
          </option>
        ))}
      </Select>
      {props.loading ? (
        <p role="status" className="text-xs text-muted">
          {t('common.loading')}
        </p>
      ) : null}
      {props.failed ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-danger" role="alert">
          <span>{t('exports.form.snapshot.list_error')}</span>
          <Button variant="secondary" onClick={props.onRetry} testId="exports.create.snapshot_picker.retry">
            {t('common.retry')}
          </Button>
        </div>
      ) : !props.loading && !props.disabled && !props.incomplete && props.snapshots.length === 0 ? (
        <p className="text-xs text-muted" data-testid="exports.create.snapshot_picker.empty">
          {t('exports.form.snapshot.empty')}
        </p>
      ) : null}
      {props.incomplete && !props.failed ? (
        <p className="text-xs text-muted" data-testid="exports.create.snapshot_picker.limited">
          {t('exports.form.snapshot.limited')}
        </p>
      ) : null}
      {(props.incomplete || props.failed) && props.allSnapshotsHref ? (
        <Link
          className="text-sm text-accent hover:underline"
          to={props.allSnapshotsHref}
          data-testid="exports.create.snapshot_picker.all"
        >
          {t('exports.form.snapshot.all')}
        </Link>
      ) : null}
    </div>
  );
}
