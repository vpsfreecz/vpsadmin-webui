import React from 'react';
import { useI18n } from '../../app/i18n';
import { Badge } from '../ui/Badge';
import { CopyButton } from '../ui/CopyButton';
import type { EffectiveToSource } from './UserMailPreferencesModel';

export function MobileCellLabel(props: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-semibold text-muted md:hidden">{props.children}</div>;
}

export function SourceBadge(props: { source: EffectiveToSource }) {
  const { t } = useI18n();

  if (props.source === 'disabled') {
    return <Badge variant="danger">{t('mail.prefs.effective.source.disabled')}</Badge>;
  }

  if (props.source === 'template') {
    return <Badge variant="info">{t('mail.prefs.effective.source.template')}</Badge>;
  }

  if (props.source === 'role') {
    return <Badge variant="warn">{t('mail.prefs.effective.source.role')}</Badge>;
  }

  return <Badge variant="neutral">{t('mail.prefs.effective.source.primary')}</Badge>;
}

export function recipientIdentity(recipient: { id: string; label?: string }): string {
  const id = String(recipient.id);
  const label = recipient.label?.trim();
  return label && label !== id ? `${label} (${id})` : id;
}

export function MailRecipientCopyButton(props: {
  text: string;
  testId: string;
  ariaLabel: string;
}) {
  return <CopyButton
    text={props.text}
    size="sm"
    variant="secondary"
    testId={props.testId}
    ariaLabel={props.ariaLabel}
    className="min-h-11 md:min-h-0"
  />;
}
