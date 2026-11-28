import { useI18n } from '../../../app/i18n';
import { Input } from '../../../components/ui/Input';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { pressureFilterKeys, type PressureFilterKey } from '../../../lib/api/vpsPressureModels';

const labels: Record<PressureFilterKey, string> = {
  user: 'vps.list.filter.user.placeholder',
  vps: 'incidentAdmin.filter.vps',
  node: 'common.node',
  location: 'vps.list.filter.location.label',
  environment: 'common.environment',
};

/** Only server-supported filters are presented; My view never exposes an owner override. */
export function PressureFiltersForm({
  search,
  supported,
  admin,
  pending,
  choices,
  onApply,
  onRefresh,
}: {
  search: URLSearchParams;
  supported: readonly PressureFilterKey[];
  admin: boolean;
  pending: boolean;
  choices: Partial<Record<PressureFilterKey, SelectOption[]>>;
  onApply: (values: Record<string, string>) => void;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(
          Object.fromEntries(
            [...new FormData(event.currentTarget).entries()].map(([key, value]) => [key, String(value)])
          )
        );
      }}
    >
      {pressureFilterKeys
        .filter((key) => supported.includes(key) && (key !== 'user' || admin))
        .map((key) => {
          const value = search.get(key) ?? '';
          if (key === 'user' || key === 'vps' || choices[key] === undefined)
            return (
              <div key={`${key}:${value}`} className="w-full sm:w-40">
                <label htmlFor={`pressure-filter-${key}`} className="mb-1 block text-xs font-semibold text-muted">
                  {t(labels[key])}
                </label>
                <Input
                  inputId={`pressure-filter-${key}`}
                  name={key}
                  defaultValue={value}
                  inputMode="numeric"
                  disabled={pending}
                />
              </div>
            );
          const options = choices[key] ?? [];
          const selected =
            value && !options.some((option) => option.value === value) ? [{ value, label: `#${value}` }] : [];
          return (
            <div key={`${key}:${value}`} className="w-full sm:w-44">
              <Select
                name={key}
                defaultValue={value}
                label={t(labels[key])}
                disabled={pending}
                options={[{ value: '', label: t('common.all') }, ...selected, ...options]}
              />
            </div>
          );
        })}
      <Button type="submit" disabled={pending}>
        {t('incidentAdmin.apply')}
      </Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => onApply({})}>
        {t('common.clear_filters')}
      </Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={onRefresh}>
        {t('common.refresh')}
      </Button>
    </form>
  );
}
