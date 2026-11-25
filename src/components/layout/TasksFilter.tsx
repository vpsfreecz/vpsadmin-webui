import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { useI18n } from '../../app/i18n';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SmartInputHelp } from '../ui/SmartInputHelp';

/** Explain the drawer's local search without changing its query or scope. */
export function TasksFilter(props: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          testId="tasks.filter-input"
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder={t('tasks.filter.placeholder')}
          ariaLabel={t('tasks.filter.placeholder')}
          className="h-11 min-h-11 min-w-0 flex-1 basis-40"
        />
        <Button
          variant="ghost"
          className="h-11 w-11 shrink-0 px-0"
          onClick={() => setHelpOpen(true)}
          aria-label={t('filters.help.open')}
          title={t('filters.help.open')}
          testId="tasks.filter.help"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
        </Button>
        {props.value ? (
          <Button size="md" variant="secondary" onClick={() => props.onChange('')}>
            {t('common.clear_search')}
          </Button>
        ) : null}
      </div>
      <SmartInputHelp
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t('tasks.filter_help.title')}
        intro={t('tasks.filter_help.intro')}
        footnote={t('tasks.filter_help.scope')}
        testId="tasks.filter.help.dialog"
      />
    </>
  );
}
