import React from 'react';

import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { GateDecision } from '../../../lib/gates/types';
import { formatBytes, type NetworkRouteSummary } from './VpsNetworkModel';

function OverviewStatusItem(props: { label: string; value: string; description: string; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info'; testId: string }) {
  const tone = props.tone ?? 'neutral';
  const className =
    tone === 'ok'
      ? 'border-ok-border bg-ok-bg'
      : tone === 'warn'
        ? 'border-warn-border bg-warn-bg'
        : tone === 'danger'
          ? 'border-danger-border bg-danger-bg'
          : tone === 'info'
            ? 'border-info-border bg-info-bg'
            : 'border-border bg-surface';

  return (
    <div data-testid={props.testId} className={`rounded-lg border p-3 ${className}`}>
      <div className="text-xs text-muted">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{props.value}</div>
      <div className="mt-1 text-xs text-muted">{props.description}</div>
    </div>
  );
}

export function VpsNetworkOverviewCard(props: {
  netEnabled: boolean;
  gate: GateDecision;
  summary: NetworkRouteSummary;
  accountingLoading: boolean;
  accountingError: boolean;
  bytesIn: number | null;
  bytesOut: number | null;
  year: number;
  month: number;
  onRefresh: () => void;
  onOpenTasks: () => void;
}) {
  const { t } = useI18n();
  const gate = props.gate;

  return (
    <Card testId="vps.network.summary">
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t('vps.network.overview.title')}
            <Badge variant={props.netEnabled ? 'ok' : 'warn'}>
              {props.netEnabled ? t('vps.network.status.enabled') : t('vps.network.status.disabled')}
            </Badge>
          </span>
        }
        subtitle={t('vps.network.overview.subtitle')}
        actions={
          <Button variant="secondary" size="sm" className="ml-auto" testId="vps.network.accounting.refresh" onClick={props.onRefresh}>
            {t('common.refresh')}
          </Button>
        }
      />

      <CardBody className="space-y-4">
        {!gate.allowed ? (
          <Alert title={t(gate.reason.titleKey)} variant="warn">
            <div className="space-y-2">
              {gate.reason.descriptionKey ? <div>{t(gate.reason.descriptionKey)}</div> : null}
              <div>
                <Button variant="secondary" size="sm" onClick={props.onOpenTasks}>
                  {t('common.open_tasks')}
                </Button>
              </div>
            </div>
          </Alert>
        ) : null}

        {!props.netEnabled ? (
          <Alert variant="warn" testId="vps.network.overview.state">
            {t('vps.network.overview.state.disabled_help')}
          </Alert>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="grid gap-3">
            <OverviewStatusItem
              testId="vps.network.overview.interfaces"
              tone={props.summary.disabledInterfaceCount > 0 ? 'warn' : 'ok'}
              label={t('vps.network.interfaces.title')}
              value={t('vps.network.overview.interfaces.value', {
                enabled: props.summary.enabledInterfaceCount,
                total: props.summary.interfaceCount,
              })}
              description={t('vps.network.overview.interfaces.description', { disabled: props.summary.disabledInterfaceCount })}
            />
          </div>
          <section
            aria-labelledby="vps-monthly-traffic"
            data-testid="vps.network.accounting.monthly"
            className="rounded-lg border border-border bg-surface p-3 lg:col-span-2"
          >
            <h3 id="vps-monthly-traffic" className="text-sm font-semibold text-fg">
              {t('vps.network.accounting.monthly_traffic')}
            </h3>
            <p className="text-xs text-muted">
              {t('vps.network.accounting.period', {
                year: props.year,
                month: String(props.month).padStart(2, '0'),
              })}
            </p>
            {props.accountingError ? (
              <p role="status" className="mt-2 text-sm text-warn">{t('vps.network.accounting.error')}</p>
            ) : props.accountingLoading ? (
              <p role="status" className="mt-2 text-sm text-muted">{t('common.loading')}</p>
            ) : (
              <dl className="mt-2 grid grid-cols-2 gap-3">
                <div data-testid="vps.network.accounting.in">
                  <dt className="text-xs text-muted">{t('vps.network.accounting.ingress')}</dt>
                  <dd className="text-sm font-semibold text-fg">
                    {props.bytesIn === null ? t('vps.network.accounting.no_measurement') : formatBytes(props.bytesIn)}
                  </dd>
                </div>
                <div data-testid="vps.network.accounting.out">
                  <dt className="text-xs text-muted">{t('vps.network.accounting.egress')}</dt>
                  <dd className="text-sm font-semibold text-fg">
                    {props.bytesOut === null ? t('vps.network.accounting.no_measurement') : formatBytes(props.bytesOut)}
                  </dd>
                </div>
              </dl>
            )}
          </section>
        </div>
      </CardBody>
    </Card>
  );
}

export function VpsNetworkAdminActionsCard(props: {
  canAdmin: boolean;
  netEnabled: boolean;
  gate: GateDecision;
  netToggleError: string | null;
  onDisable: () => void;
  onEnable: () => void;
}) {
  const { t } = useI18n();
  const gate = props.gate;

  if (!props.canAdmin) return null;

  return (
    <Card testId="vps.network.admin_actions">
      <CardHeader
        title={t('vps.network.admin_actions.title')}
        subtitle={t('vps.network.admin_actions.subtitle')}
        actions={
          props.netEnabled ? (
            <ActionButton
              testId="vps.network.disable"
              variant="danger"
              size="sm"
              disabled={!gate.allowed}
              disabledReason={!gate.allowed ? gate.reason : undefined}
              onClick={props.onDisable}
            >
              {t('vps.network.disable_button')}
            </ActionButton>
          ) : (
            <ActionButton
              testId="vps.network.enable"
              variant="primary"
              size="sm"
              disabled={!gate.allowed}
              disabledReason={!gate.allowed ? gate.reason : undefined}
              onClick={props.onEnable}
            >
              {t('vps.network.enable_button')}
            </ActionButton>
          )
        }
      />
      <CardBody className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs text-muted">{t('vps.network.admin_actions.vps_network')}</div>
            <div className="mt-1 text-sm font-medium">{props.netEnabled ? t('vps.network.state.enabled') : t('vps.network.state.disabled')}</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs text-muted">{t('vps.network.admin_actions.route_owner')}</div>
            <div className="mt-1 text-sm font-medium">{t('vps.network.admin_actions.owner_help')}</div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="text-xs text-muted">{t('vps.network.admin_actions.route_cleanup')}</div>
            <div className="mt-1 text-sm font-medium">{t('vps.network.admin_actions.cleanup_help')}</div>
          </div>
        </div>

        {props.netToggleError ? (
          <Alert title={t('vps.network.toggle_error.title')} variant="danger">
            {props.netToggleError}
          </Alert>
        ) : null}
      </CardBody>
    </Card>
  );
}
