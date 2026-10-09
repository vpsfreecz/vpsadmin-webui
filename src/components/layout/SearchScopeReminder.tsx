import type { useI18n } from '../../app/i18n';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

/** Explain search scope without treating a typed ID as an administrative action. */
export function SearchScopeReminder({
  t,
  onSwitchMode,
}: Pick<ReturnType<typeof useI18n>, 't'> & { onSwitchMode: () => void }) {
  return (
    <Alert variant="warn" title={t('palette.my_view.title')} testId="search.scope-reminder">
      <p>{t('palette.my_view.body')}</p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-2"
        onClick={onSwitchMode}
        testId="search.scope-reminder.switch"
      >
        {t('scope.mismatch.open_admin')}
      </Button>
    </Alert>
  );
}
