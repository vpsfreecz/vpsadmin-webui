import { useI18n } from '../../../../app/i18n';
import { Select, type SelectOption } from '../../../../components/ui/Select';

// Exact legacy privilege levels; the coarse UI roles are not interchangeable.
const USER_LEVELS = [
  { value: '2', key: 'admin.user.edit.role.user' },
  { value: '3', key: 'admin.user.edit.role.power_user' },
  { value: '21', key: 'admin.user.edit.role.admin' },
  { value: '90', key: 'admin.user.edit.role.super_admin' },
  { value: '99', key: 'admin.user.edit.role.master_admin' },
] as const;

export function UserLevelSelect(props: { value: string; currentLevel: unknown; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const options: SelectOption[] = USER_LEVELS.map(({ value, key }) => ({ value, label: t(key) }));
  // Preserve nonstandard existing levels when unrelated account fields are saved.
  if (
    typeof props.currentLevel === 'number' &&
    Number.isFinite(props.currentLevel) &&
    props.currentLevel >= 0 &&
    !options.some((option) => option.value === String(props.currentLevel))
  ) {
    options.unshift({
      value: String(props.currentLevel),
      label: t('admin.user.edit.role.current', { level: props.currentLevel }),
    });
  }
  options.unshift({ value: '', label: t('admin.user.edit.role.select'), disabled: true });

  return (
    <label className="block">
      <span className="text-sm font-medium">{t('admin.user.edit.role.label')}</span>
      <Select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        options={options}
        testId="admin.user.edit.level"
      />
    </label>
  );
}
