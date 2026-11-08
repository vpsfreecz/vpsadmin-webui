import React from 'react';
import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import { dnsReadinessStatus } from './dnsReadinessModel';

export function DnsReadinessBadge(props: { status: unknown }) {
  const { t } = useI18n();
  const status = dnsReadinessStatus(props.status);
  return (
    <Badge variant={status === 'success' ? 'ok' : status === 'failed' ? 'danger' : 'warn'}>
      {t(`dns.readiness.${status}`)}
    </Badge>
  );
}

export function DnsServingBadge(props: { status: unknown }) {
  const { t } = useI18n();
  const value = props.status;
  const status = value === 'serving' || value === 'expired' || value === 'not_loaded' ? value : 'unknown';
  return (
    <Badge variant={status === 'serving' ? 'ok' : status === 'unknown' ? 'neutral' : 'danger'}>
      {t(`dns.serving.${status}`)}
    </Badge>
  );
}
