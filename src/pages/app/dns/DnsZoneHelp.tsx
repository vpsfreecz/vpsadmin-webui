import React from 'react';
import { useI18n } from '../../../app/i18n';

export function DnsZoneHelp() {
  const { t } = useI18n();
  return (
    <details className="rounded-lg border border-border bg-surface p-3 text-sm" data-testid="dns.zones.help">
      <summary className="cursor-pointer font-medium">{t('dns.zones.help.title')}</summary>
      <div className="mt-3 space-y-2 text-muted">
        <p>{t('dns.zones.help.kind')}</p>
        <p>{t('dns.zones.help.direction')}</p>
        <p>{t('dns.zones.help.dnssec')}</p>
      </div>
    </details>
  );
}
