import React from 'react';
import { TriangleAlert, History, Pencil, Unplug, PlugZap } from 'lucide-react';

import { useI18n } from '../../../../app/i18n';

import { Button } from '../../../../components/ui/Button';
import { clsx } from '../../../../components/ui/clsx';

interface IpAddressRowActionsProps {
  ipAddr?: string;
  detailPath: string;
  basePath: string;
  assigned: boolean;
  testIdPrefix: string;
  className?: string;
}

const actionClass = 'min-h-9 max-w-full justify-start gap-1.5 whitespace-normal px-2 text-left text-sm leading-tight';
const iconClass = 'h-5 w-5 shrink-0';

function LabeledAction(props: {
  to: string;
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      to={props.to}
      variant="ghost"
      size="sm"
      className={actionClass}
      testId={props.testId}
      title={props.label}
      ariaLabel={props.label}
    >
      {props.children}
      <span>{props.label}</span>
    </Button>
  );
}

export function IpAddressRowActions({
  ipAddr,
  detailPath,
  basePath,
  assigned,
  testIdPrefix,
  className,
}: IpAddressRowActionsProps) {
  const { t } = useI18n();
  const routeLabel = assigned
    ? t('admin.ip_addresses.action.unassign_route')
    : t('admin.ip_addresses.action.assign_route');
  const RouteIcon = assigned ? Unplug : PlugZap;

  return (
    <div
      className={clsx('grid max-w-full grid-cols-[auto_auto] items-start gap-1 text-left', className)}
      role="group"
      aria-label={t('common.actions')}
      data-row-no-nav
    >
      {ipAddr ? (
        <>
          <LabeledAction
            to={`${basePath}/incidents?ip_addr=${encodeURIComponent(ipAddr)}`}
            label={t('admin.ip_addresses.action.incidents')}
            testId={`${testIdPrefix}.action.incidents`}
          >
            <TriangleAlert className={iconClass} aria-hidden="true" />
          </LabeledAction>
          <LabeledAction
            to={`${basePath}/networking/ip-address-assignments?ip_addr=${encodeURIComponent(ipAddr)}`}
            label={t('admin.ip_addresses.action.assignments')}
            testId={`${testIdPrefix}.action.assignments`}
          >
            <History className={iconClass} aria-hidden="true" />
          </LabeledAction>
        </>
      ) : null}

      <LabeledAction
        to={detailPath}
        label={t('common.edit')}
        testId={`${testIdPrefix}.action.edit`}
      >
        <Pencil className={iconClass} aria-hidden="true" />
      </LabeledAction>
      <LabeledAction
        to={`${detailPath}#route`}
        label={routeLabel}
        testId={`${testIdPrefix}.action.route`}
      >
        <RouteIcon className={iconClass} aria-hidden="true" />
      </LabeledAction>
    </div>
  );
}
