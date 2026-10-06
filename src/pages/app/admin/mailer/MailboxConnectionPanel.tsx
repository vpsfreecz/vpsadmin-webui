import React from 'react';

import { useI18n } from '../../../../app/i18n';
import { Badge } from '../../../../components/ui/Badge';
import type { Mailbox } from '../../../../lib/api/mailer';
import { formatDateTime } from '../../../../lib/format';

export function MailboxConnectionPanel({ mailbox }: { mailbox: Mailbox | null }) {
  const { t } = useI18n();
  const user = String(mailbox?.user ?? '');
  const ssl = Boolean(mailbox?.enable_ssl);
  const createdAt = mailbox?.created_at;
  const updatedAt = mailbox?.updated_at;

  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface p-4" data-testid="admin.mailer.mailboxes.detail.connection">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{t('mailer.mailboxes.detail.connection.title')}</div>
          <div className="mt-1 text-xs text-muted">{t('mailer.mailboxes.detail.connection.description')}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-semibold text-muted">{t('mailer.mailboxes.fields.user')}</div>
          <div className="mt-1 font-mono text-xs text-muted">{user || t('common.na')}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted">{t('mailer.mailboxes.fields.password')}</div>
          <div className="mt-1 text-xs text-muted">••••••</div>
          <div className="mt-1 text-xs text-faint">{t('mailer.mailboxes.password.hidden')}</div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted">{t('mailer.mailboxes.fields.enable_ssl')}</div>
          <div className="mt-1">
            <Badge variant={ssl ? 'ok' : 'warn'}>{ssl ? t('mailer.mailboxes.ssl.on') : t('mailer.mailboxes.ssl.off')}</Badge>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted">{t('common.updated')}</div>
          <div className="mt-1 text-xs text-muted">{updatedAt ? formatDateTime(String(updatedAt)) : t('common.na')}</div>
          <div className="mt-1 text-xs text-faint">
            {createdAt ? `${t('common.created')}: ${formatDateTime(String(createdAt))}` : t('common.na')}
          </div>
        </div>
      </div>
    </div>
  );
}
