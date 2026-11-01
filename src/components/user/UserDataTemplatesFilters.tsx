import React from 'react';
import { useI18n } from '../../app/i18n';
import { Button } from '../ui/Button';
import { CopyButton } from '../ui/CopyButton';
import { FilterBar } from '../layout/FilterBar';
import { Select, type SelectOption } from '../ui/Select';

export interface UserDataFilterValues { format: string }

export function UserDataTemplatesFilters(props: {
  prefix: string;
  formatFilter: string;
  filtersActive: boolean;
  shareUrl: string;
  formatOptions: SelectOption[];
  onSetFilters: (next: UserDataFilterValues) => void;
  onClearFilters: () => void;
  onCreate: () => void;
}) {
  const { t } = useI18n();
  return <FilterBar testId={`${props.prefix}.filters`}>
    <label className="min-w-0 flex-1">
      <span className="mb-1 block text-xs font-semibold text-muted">{t('user_data.filters.format')}</span>
      <Select value={props.formatFilter} options={props.formatOptions}
        onChange={event => props.onSetFilters({ format: event.target.value })}
        testId={`${props.prefix}.filters.format`} />
    </label>
    <div className="flex items-center gap-2">
      <CopyButton text={props.shareUrl} label={t('common.copy_link')} testId={`${props.prefix}.filters.copy_link`} />
      {props.filtersActive ? <Button type="button" size="sm" variant="ghost" onClick={props.onClearFilters} testId={`${props.prefix}.filters.clear`}>
        {t('common.clear_filters')}
      </Button> : null}
      <Button variant="primary" onClick={props.onCreate} testId={`${props.prefix}.create`}>{t('user_data.action.create')}</Button>
    </div>
  </FilterBar>;
}
