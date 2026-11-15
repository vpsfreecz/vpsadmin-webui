import React from 'react';
import { CircleHelp, SlidersHorizontal } from 'lucide-react';

import { useI18n } from '../../app/i18n';
import { FilterBar } from '../layout/FilterBar';
import { Button } from '../ui/Button';
import { CopyButton } from '../ui/CopyButton';
import { SmartFilterInput, type SmartFilterSuggestion } from '../ui/SmartFilterInput';

/** Shared presentation only: each list retains its filters, scope and callbacks. */
export function UserNamespaceFilters(props: {
  testIdPrefix: string;
  inputRef: React.Ref<HTMLInputElement>;
  ariaLabel: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  suggestions: SmartFilterSuggestion[];
  onHelp: () => void;
  onAdvanced: () => void;
  shareUrl: string;
  filtersActive: boolean;
  onClear: () => void;
}) {
  const { t } = useI18n();

  return (
    <FilterBar testId={`${props.testIdPrefix}.filters`}>
      <div className="min-w-0 basis-full lg:basis-0 lg:flex-1">
        <SmartFilterInput
          ref={props.inputRef}
          testId={`${props.testIdPrefix}.search.input`}
          ariaLabel={props.ariaLabel}
          placeholder={props.placeholder}
          value={props.value}
          onChange={props.onChange}
          onSubmit={props.onSubmit}
          suggestions={props.suggestions}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-11 shrink-0"
          onClick={props.onHelp}
          testId={`${props.testIdPrefix}.smart.help_button`}
        >
          <CircleHelp className="h-4 w-4" />
          {t('filters.help.open')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-11"
          onClick={props.onAdvanced}
          testId={`${props.testIdPrefix}.filters.advanced`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('filters.advanced.label')}
        </Button>
        <CopyButton
          className="h-11"
          text={props.shareUrl}
          label={t('common.copy_link')}
          testId={`${props.testIdPrefix}.filters.copy_link`}
        />
        {props.filtersActive ? (
          <Button
            variant="secondary"
            size="sm"
            className="h-11"
            onClick={props.onClear}
            testId={`${props.testIdPrefix}.filters.clear`}
          >
            {t('common.clear_filters')}
          </Button>
        ) : null}
      </div>
    </FilterBar>
  );
}
