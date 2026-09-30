import type { ActionState } from '../../../lib/api/actionStates';
import { useI18n } from '../../../app/i18n';
import { useChrome } from '../../../components/layout/ChromeContext';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { vpsCreationStatus } from './VpsDetailVisibility';

export function VpsCreationProgress(props: { id?: number; state?: ActionState; failedToLoad: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  const chrome = useChrome();
  const status = vpsCreationStatus(props.id, props.state, props.failedToLoad);
  if (!status) return null;
  const current = props.state?.current;
  const total = props.state?.total;
  const showProgress = status === 'pending' && typeof current === 'number' && Number.isFinite(current)
    && typeof total === 'number' && Number.isFinite(total) && total > 0 && current >= 0 && current <= total;
  return (
    <div role="status" aria-live="polite" data-testid="vps.creation.status">
      <Alert variant={status === 'failed' ? 'danger' : status === 'unknown' ? 'warn' : status === 'complete' ? 'ok' : 'info'}
        title={t(`vps.create.progress.${status}.title`)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>{t(`vps.create.progress.${status}.body`)}</p>
          <div className="flex flex-wrap gap-2">
            {props.failedToLoad ? <Button size="sm" onClick={props.onRetry}>{t('common.retry')}</Button> : null}
            <Button size="sm" onClick={() => chrome.openTasks()}>{t('common.open_tasks')} #{props.id}</Button>
          </div>
        </div>
        {showProgress ? <div className="mt-2 h-2 overflow-hidden rounded bg-surface-2" role="progressbar"
          aria-label={t('common.progress')} aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}>
          <div className="h-full rounded bg-accent" style={{ width: `${current / total * 100}%` }} />
        </div> : null}
      </Alert>
    </div>
  );
}
