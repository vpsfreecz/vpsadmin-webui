import React from 'react';
import { CircleHelp, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../../app/i18n';
import { FilterBar } from '../layout/FilterBar';
import { Button } from '../ui/Button';
import { CopyButton } from '../ui/CopyButton';
import { SmartFilterInput, type SmartFilterSuggestion } from '../ui/SmartFilterInput';

type IncidentFiltersProps = {
  inputRef: React.Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  suggestions: SmartFilterSuggestion[];
  onSubmit: () => void;
  onHelp: () => void;
  onAdvanced: () => void;
  shareUrl: string;
  hasFilterState: boolean;
  onClear: () => void;
};

export function IncidentFilters(props: IncidentFiltersProps) {
  const { t } = useI18n();
  return (
    <FilterBar testId="incidents.list.filters">
      <SmartFilterInput
        ref={props.inputRef}
        value={props.value}
        onChange={props.onChange}
        placeholder={t('incidents.search.placeholder')}
        ariaLabel={t('incidents.search.aria')}
        testId="incidents.smart_filter.input"
        suggestions={props.suggestions}
        onSubmit={props.onSubmit}
        className="min-w-0 flex-1 basis-full sm:basis-80"
      />

      <Button
        className="h-11 min-w-11"
        type="button"
        variant="secondary"
        size="md"
        onClick={props.onHelp}
        ariaLabel={t('filters.help.open')}
        testId="incidents.smart_filter.help_btn"
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
        <span>{t('filters.help.open')}</span>
      </Button>

      <Button
        className="h-11 min-w-11"
        type="button"
        variant="secondary"
        size="md"
        onClick={props.onAdvanced}
        ariaLabel={t('filters.advanced.open')}
        testId="incidents.filters.advanced"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        <span>{t('filters.advanced.label')}</span>
      </Button>

      <CopyButton
        className="h-11 min-w-11"
        text={props.shareUrl}
        label={t('common.copy_link')}
        size="md"
        variant="secondary"
        testId="incidents.filters.copy_link"
      />

      {props.hasFilterState ? (
        <Button
          className="h-11 min-w-11"
          variant="secondary"
          size="md"
          onClick={props.onClear}
          testId="incidents.filters.clear"
        >
          {t('common.clear_filters')}
        </Button>
      ) : null}
    </FilterBar>
  );
}
