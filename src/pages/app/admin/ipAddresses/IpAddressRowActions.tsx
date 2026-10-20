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

const actionClass = 'min-h-9 w-9 shrink-0 px-0';
const iconClass = 'h-5 w-5 shrink-0';

function IconAction(props: {
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
      className={clsx('flex items-center justify-end gap-1', className)}
      role="group"
      aria-label={t('common.actions')}
      data-row-no-nav
    >
      {ipAddr ? (
        <>
          <IconAction
            to={`${basePath}/incidents?ip_addr=${encodeURIComponent(ipAddr)}`}
            label={t('admin.ip_addresses.action.incidents')}
            testId={`${testIdPrefix}.action.incidents`}
          >
            <TriangleAlert className={iconClass} aria-hidden="true" />
          </IconAction>
          <IconAction
            to={`${basePath}/networking/ip-address-assignments?ip_addr=${encodeURIComponent(ipAddr)}`}
            label={t('admin.ip_addresses.action.assignments')}
            testId={`${testIdPrefix}.action.assignments`}
          >
            <History className={iconClass} aria-hidden="true" />
          </IconAction>
        </>
      ) : null}

      <IconAction
        to={detailPath}
        label={t('common.edit')}
        testId={`${testIdPrefix}.action.edit`}
      >
        <Pencil className={iconClass} aria-hidden="true" />
      </IconAction>
      <IconAction
        to={`${detailPath}#route`}
        label={routeLabel}
        testId={`${testIdPrefix}.action.route`}
      >
        <RouteIcon className={iconClass} aria-hidden="true" />
      </IconAction>
    </div>
  );
}
