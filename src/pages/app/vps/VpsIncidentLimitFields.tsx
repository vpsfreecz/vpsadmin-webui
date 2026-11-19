import { useId } from 'react';
import { useI18n } from '../../../app/i18n';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { parseIncidentLimit } from './vpsIncidentEscalation';

export interface IncidentLimitFieldDraft {
  value: string;
  inherited: boolean;
}
export interface IncidentLimitDraft {
  warning: IncidentLimitFieldDraft;
  shutdown: IncidentLimitFieldDraft;
}

/** Displayed effective values never determine the intended nullable override. */
export function VpsIncidentLimitFields(props: {
  value: IncidentLimitDraft;
  onChange: (draft: IncidentLimitDraft) => void;
  disabled?: boolean;
  inheritedWarning?: number;
  inheritedShutdown?: number;
  warningPeriod?: number;
  shutdownPeriod?: number;
  warningPending?: boolean;
  shutdownPending?: boolean;
}) {
  const { t, tc } = useI18n();
  const id = useId();
  const fields = [
    {
      key: 'warning',
      label: 'incidentEscalation.warningLimit',
      inheritedValue: props.inheritedWarning,
      days: props.warningPeriod,
      pending: props.warningPending,
    },
    {
      key: 'shutdown',
      label: 'incidentEscalation.shutdownLimit',
      inheritedValue: props.inheritedShutdown,
      days: props.shutdownPeriod,
      pending: props.shutdownPending,
    },
  ] as const;
  return (
    <div className="space-y-2">
      <fieldset disabled={props.disabled} className="grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
        {fields.map((field) => {
          const draft = props.value[field.key];
          const value = draft.value;
          const count = draft.inherited ? field.inheritedValue : parseIncidentLimit(value);
          const pending = draft.inherited && field.pending;
          const hint = pending
            ? t('incidentEscalation.inheritPending')
            : count != null && field.days != null
              ? tc('incidentEscalation.threshold', count, { period: tc('incidentEscalation.period', field.days) })
              : t('common.na');
          const change = (next: IncidentLimitFieldDraft) => props.onChange({ ...props.value, [field.key]: next });
          return (
            <div key={field.key} className="min-w-0 space-y-2">
              <Input
                label={t(field.label)}
                ariaDescribedBy={`${id}-${field.key}`}
                value={value}
                inputMode="numeric"
                onChange={(event) => change({ value: event.target.value, inherited: !event.target.value.trim() })}
              />
              <Select
                ariaLabel={`${t(field.label)} (${t('incidentEscalation.intent.inherited')} / ${t('incidentEscalation.intent.custom')})`}
                value={draft.inherited ? 'inherited' : 'custom'}
                onChange={(event) =>
                  change(
                    event.target.value === 'inherited'
                      ? {
                          value: field.inheritedValue === undefined ? '' : String(field.inheritedValue),
                          inherited: true,
                        }
                      : { ...draft, inherited: false }
                  )
                }
                options={[
                  { value: 'inherited', label: t('incidentEscalation.intent.inherited') },
                  { value: 'custom', label: t('incidentEscalation.intent.custom') },
                ]}
              />
              <p id={`${id}-${field.key}`} className="text-xs text-muted">
                {hint}
              </p>
            </div>
          );
        })}
      </fieldset>
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          disabled={props.disabled}
          onClick={() =>
            props.onChange({
              warning: {
                value: props.inheritedWarning === undefined ? '' : String(props.inheritedWarning),
                inherited: true,
              },
              shutdown: {
                value: props.inheritedShutdown === undefined ? '' : String(props.inheritedShutdown),
                inherited: true,
              },
            })
          }
        >
          {t('incidentEscalation.useInherited')}
        </Button>
      </div>
    </div>
  );
}
