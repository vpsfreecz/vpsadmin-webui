import React from 'react';
import { useI18n } from '../../../app/i18n';
import { LinkButton } from '../../../components/ui/LinkButton';

export function VpsDiagnosticLinks(props: { basePath: string; vpsId: number }) {
  const { t } = useI18n();
  const actions = [
    { key: 'oom_reports', href: `${props.basePath}/oom-reports?vps=${props.vpsId}` },
    { key: 'oom_rules', href: `${props.basePath}/oom-reports/rules/${props.vpsId}` },
    { key: 'incidents', href: `${props.basePath}/incidents?vps=${props.vpsId}` },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="vps.diagnostics.actions">
      {actions.map((action) => (
        <LinkButton
          key={action.key}
          to={action.href}
          variant="secondary"
          size="sm"
          title={t(`vps.overview.diagnostics.${action.key}_title`)}
          testId={`vps.diagnostics.${action.key}`}
        >
          {t(`vps.overview.diagnostics.${action.key}`)}
        </LinkButton>
      ))}
    </div>
  );
}
