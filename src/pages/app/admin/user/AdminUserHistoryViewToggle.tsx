import React from 'react';
import { useI18n } from '../../../../app/i18n';
import { Button } from '../../../../components/ui/Button';

/** Keep the existing view controls together with their non-color state. */
export function AdminUserHistoryViewToggle({
  view,
  onChange,
}: {
  view: 'changes' | 'actions';
  onChange: (view: 'changes' | 'actions') => void;
}) {
  const { t } = useI18n();
  return (
    <div className="w-full sm:w-auto">
      <div className="text-xs font-medium text-muted">{t('admin.user.history.view')}</div>
      <div className="mt-1 flex items-center gap-2">
        <Button
          variant="secondary"
          size="md"
          className={['h-11 min-w-11', view === 'changes' ? 'border-accent/60 bg-surface-2' : undefined]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChange('changes')}
          aria-pressed={view === 'changes'}
          testId="admin.user.history.view.changes"
        >
          {t('admin.user.history.view.changes')}
        </Button>
        <Button
          variant="secondary"
          size="md"
          className={['h-11 min-w-11', view === 'actions' ? 'border-accent/60 bg-surface-2' : undefined]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onChange('actions')}
          aria-pressed={view === 'actions'}
          testId="admin.user.history.view.actions"
        >
          {t('admin.user.history.view.actions')}
        </Button>
      </div>
    </div>
  );
}
