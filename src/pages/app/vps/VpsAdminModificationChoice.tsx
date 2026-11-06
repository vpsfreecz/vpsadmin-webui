import React, { useId } from 'react';
import { useI18n } from '../../../app/i18n';
import { Alert } from '../../../components/ui/Alert';

export function VpsAdminModificationChoice({
  selected,
  disabled,
  onChange,
}: {
  selected: boolean | null;
  disabled: boolean;
  onChange: (allow: boolean) => void;
}) {
  const { t } = useI18n();
  const id = useId();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted" id={id}>
        {t('vps.admin_modifications.description')}
      </p>
      {selected === null ? <Alert variant="warn" title={t('vps.admin_modifications.unknown')} /> : null}
      <fieldset disabled={disabled || selected === null} className="space-y-2" aria-describedby={id}>
        <legend className="sr-only">{t('vps.admin_modifications.title')}</legend>
        {[true, false].map((allow) => (
          <label
            key={String(allow)}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <input
              type="radio"
              name={id}
              className="mt-1 h-4 w-4 shrink-0 accent-accent"
              data-testid={`vps.admin_modifications.${allow ? 'allow' : 'deny'}`}
              checked={selected === allow}
              onChange={() => onChange(allow)}
            />
            <span>{t(allow ? 'vps.admin_modifications.allow' : 'vps.admin_modifications.deny')}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
