import React from 'react';
import { useI18n } from '../../../app/i18n';
import { dnsRecordTtlPresentation } from './dnsRecordTtlPresentation';

export function DnsRecordTtl(props: { ttl: unknown; zoneDefaultTtl: unknown; testId: string }) {
  const { t } = useI18n();
  const value = dnsRecordTtlPresentation(props.ttl, props.zoneDefaultTtl);
  return (
    <div data-testid={props.testId} data-ttl-source={value.kind}>
      <div className="font-medium text-fg">
        {value.seconds === null ? t('common.unknown') : t('dns.zone.records.ttl.seconds', { seconds: value.seconds })}
      </div>
      {value.kind !== 'unknown' ? (
        <div className="mt-1 text-xs text-muted">{t(`dns.zone.records.ttl.${value.kind}`)}</div>
      ) : null}
    </div>
  );
}
