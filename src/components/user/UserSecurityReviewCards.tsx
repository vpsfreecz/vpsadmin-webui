import React from 'react';

import { useI18n } from '../../app/i18n';

import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';

import type { SecuritySettingValue, SecuritySettingsChange, SecuritySettingsReview } from './UserSecurityModel';

function enabledLabel(t: (key: string, vars?: Record<string, unknown>) => string, enabled: boolean): string {
  return enabled ? t('common.enabled') : t('common.disabled');
}

function sessionMinutesLabel(t: (key: string, vars?: Record<string, unknown>) => string, minutes: number | null): string {
  if (minutes === null) return t('common.na');
  if (minutes === 0) return t('security.settings.session_length.preset.never');
  return t('security.settings.session_length.value.minutes', { m: minutes });
}

function settingValueLabel(t: (key: string, vars?: Record<string, unknown>) => string, value: SecuritySettingValue): string {
  if (value.kind === 'boolean') return enabledLabel(t, value.enabled);
  return sessionMinutesLabel(t, value.minutes);
}

function ChangeRow(props: { change: SecuritySettingsChange; testId: string }) {
  const { t } = useI18n();

  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2" data-testid={props.testId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-fg">{t(props.change.labelKey)}</div>
        <Badge variant={props.change.tone}>{t('security.settings.review.badge.pending_change')}</Badge>
      </div>
      <div className="mt-1 text-sm text-muted">
        <span className="tabular-nums">{settingValueLabel(t, props.change.current)}</span>
        <span className="mx-2 text-faint">→</span>
        <span className="tabular-nums text-fg">{settingValueLabel(t, props.change.next)}</span>
      </div>
      <div className="mt-1 text-xs text-muted">{t(props.change.impactKey)}</div>
    </div>
  );
}

export function UserSecuritySettingsReviewCard(props: { prefix: string; review: SecuritySettingsReview }) {
  const { t } = useI18n();
  if (!props.review.hasChanges && props.review.warningKeys.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-2 p-3" data-testid={`${props.prefix}.settings.review`}>
      {props.review.hasChanges ? (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="text-sm font-semibold">{t('security.settings.review.title')}</div>
          <Badge variant={props.review.canSubmit ? 'warn' : 'neutral'}>
            {t('security.settings.review.badge.pending_change')}
          </Badge>
        </div>
      ) : null}

      {props.review.warningKeys.map((key) => (
        <Alert key={key} variant="warn" title={t('security.settings.review.warning.title')} testId={`${props.prefix}.settings.review.warning.${key}`}>
          {t(key)}
        </Alert>
      ))}

      {props.review.changes.length > 0 ? (
        <div className="space-y-2">
          {props.review.changes.map((change) => (
            <ChangeRow key={change.key} change={change} testId={`${props.prefix}.settings.review.change.${change.key}`} />
          ))}
        </div>
      ) : null}

      {props.review.hasChanges ? (
        <div className="border-t border-border pt-2 text-xs text-muted">{t('security.settings.review.queue_note')}</div>
      ) : null}
    </div>
  );
}
