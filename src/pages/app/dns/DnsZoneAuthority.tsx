import React from 'react';
import { useI18n } from '../../../app/i18n';
import type { DnsZone } from '../../../lib/api/dns';
import { dnsZoneAuthoritativeRole } from './DnsZoneModel';

export function DnsZoneAuthority(props: { zone: DnsZone; testId?: string }) {
  const { t } = useI18n();
  const role = dnsZoneAuthoritativeRole(props.zone);
  return (
    <span data-testid={props.testId}>
      {t('dns.zones.authority.label')}: {role ? t(`dns.zones.authority.${role}`) : t('common.na')}
    </span>
  );
}
