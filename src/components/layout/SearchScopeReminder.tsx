import type { useI18n } from '../../app/i18n';
import { Button } from '../ui/Button';

/** Explain search scope without treating a typed ID as an administrative action. */
export function SearchScopeReminder({
  t,
  onSwitchMode,
}: Pick<ReturnType<typeof useI18n>, 't'> & { onSwitchMode: () => void }) {
  return (
    <div className="text-xs text-muted" data-testid="search.scope-reminder">
      <p>{t('palette.my_view.title')}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-1"
        onClick={onSwitchMode}
        testId="search.scope-reminder.switch"
      >
        <span className="text-accent">{t('scope.mismatch.open_admin')}</span>
      </Button>
    </div>
  );
}
