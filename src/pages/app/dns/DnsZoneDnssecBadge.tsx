import React from 'react';
import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import type { DnsZone } from '../../../lib/api/dns';
import { isSecondaryDnsZone } from './DnsZoneModel';

export function DnsZoneDnssecBadge(props: { zone: DnsZone; testId?: string }) {
  const { t } = useI18n();
  if (isSecondaryDnsZone(props.zone)) {
    return (
      <Badge variant="neutral" title={t('dns.zone.dnssec.external_help')} testId={props.testId}>
        {t('dns.zones.badge.dnssec_primary_server')}
      </Badge>
    );
  }
  if (props.zone.dnssec_enabled === true)
    return (
      <Badge variant="ok" testId={props.testId}>
        {t('dns.zones.badge.dnssec')}
      </Badge>
    );
  if (props.zone.dnssec_enabled === false)
    return (
      <Badge variant="neutral" testId={props.testId}>
        {t('dns.zones.badge.no_dnssec')}
      </Badge>
    );
  return (
    <Badge variant="neutral" testId={props.testId}>
      {t('common.na')}
    </Badge>
  );
}
