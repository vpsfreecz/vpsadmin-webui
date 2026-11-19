import type { ReactNode } from 'react';
import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';

/** Shared VPS facts are displayed once, outside the configured policy sections. */
export function VpsIncidentsContent(props: {
  children: ReactNode;
  permission?: boolean;
  permissionForm?: ReactNode;
  sharedDetails?: ReactNode;
  operationFeedback?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4" data-testid="vps.incidents.page">
      <h1 className="text-lg font-semibold">{t('vps.tabs.incidents')}</h1>
      {props.operationFeedback}
      <div className="space-y-4">{props.children}</div>
      <Card testId="vps.incidents.shared">
        <CardHeader
          compact
          title={t('incidentEscalation.automaticShutdown')}
          actions={
            typeof props.permission === 'boolean' ? (
              <Badge variant="neutral">
                {t(props.permission ? 'incidentEscalation.permissionAllowed' : 'incidentEscalation.permissionBlocked')}
              </Badge>
            ) : undefined
          }
        />
        <CardBody compact className="space-y-3">
          {props.permissionForm}
          {props.sharedDetails ? <div className="space-y-2 text-sm">{props.sharedDetails}</div> : null}
        </CardBody>
      </Card>
    </div>
  );
}
