import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import {
  exposureSorts,
  historyScopes,
  incidentActionStates,
  incidentMailStates,
  type AdminIncidentView,
} from './adminIncidentState';

/** This form edits query parameters only; backend validation remains authoritative. */
export function AdminIncidentFilters({
  view,
  search,
  onChange,
  onApply,
  onRefresh,
  pending,
}: {
  view: AdminIncidentView;
  search: URLSearchParams;
  onChange: (key: string, value: string) => void;
  onApply: (values: Record<string, string>) => void;
  onRefresh: () => void;
  pending: boolean;
}) {
  const { t } = useI18n();
  const history = view === 'history';
  const outstanding = history && search.get('scope') === 'outstanding';
  const select = (key: string, values: readonly string[], initial = '') => (
    <Select
      key={key}
      label={t(`incidentAdmin.filter.${key}`)}
      value={search.get(key) || initial}
      onChange={(e) => onChange(key, e.target.value)}
      disabled={pending}
      options={[
        ...(!initial ? [{ value: '', label: t('incidentAdmin.all') }] : []),
        ...values.map((value) => ({ value, label: t(`incidentAdmin.${key}.${value}`) })),
      ]}
    />
  );
  const advancedKeys = history
    ? ['vps_id', 'user_id', 'decision', 'action_kind', 'action_state', 'mail_state']
    : ['vps', 'user', 'node', 'effective_mode', 'stop_enforced'];
  const defaultDirection = !history && search.get('sort') && search.get('sort') !== 'severity' ? 'asc' : 'desc';
  const activeAdvanced =
    advancedKeys.some((key) => Boolean(search.get(key))) ||
    Boolean(search.get('direction') && search.get('direction') !== defaultDirection);
  const field = (key: string, numeric = false, disabled = false) => (
    <Input
      key={`${key}-${search.get(key) ?? ''}`}
      name={key}
      label={t(`incidentAdmin.filter.${key}`)}
      inputMode={numeric ? 'numeric' : undefined}
      defaultValue={search.get(key) ?? ''}
      placeholder={['from', 'to'].includes(key) ? 'YYYY-MM-DDTHH:mm:ssZ' : undefined}
      disabled={pending || disabled}
    />
  );
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onApply(Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)])));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field('policy_key')}
        {history ? (
          <>
            {select('scope', historyScopes, 'violations')}
            {field('from', false, outstanding)}
            {field('to', false, outstanding)}
          </>
        ) : (
          <>
            {select('status', ['clear', 'near_limit', 'warning', 'stop_threshold', 'invalid'])}
            {select('sort', exposureSorts, 'severity')}
          </>
        )}
      </div>
      <details open={activeAdvanced} data-testid="incidents.admin.moreFilters">
        <summary className="cursor-pointer text-accent">
          {t(activeAdvanced ? 'incidentAdmin.moreFiltersActive' : 'incidentAdmin.moreFilters')}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {field(history ? 'vps_id' : 'vps', true)}
          {field(history ? 'user_id' : 'user', true)}
          {history ? (
            <>
              {select('decision', ['none', 'warning', 'stop'])}
              {select('action_kind', ['warning', 'stop'])}
              {select('action_state', incidentActionStates)}
              {select('mail_state', incidentMailStates)}
            </>
          ) : (
            <>
              {field('node', true)}
              {select('effective_mode', ['observe', 'notify', 'enforce'])}
              {select('stop_enforced', ['true', 'false'])}
            </>
          )}
          {select('direction', ['desc', 'asc'], defaultDirection)}
        </div>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          {t('incidentAdmin.apply')}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onRefresh}>
          {t('incidentAdmin.refresh')}
        </Button>
      </div>
    </form>
  );
}
