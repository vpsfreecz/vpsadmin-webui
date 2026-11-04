import React from 'react';

import { useI18n } from '../../../app/i18n';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import type { GateDecision } from '../../../lib/gates/types';
import { formatBytes } from './VpsNetworkModel';

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
  networkStatus: boolean | null;
  gate: GateDecision;
  accountingLoading: boolean;
  accountingError: boolean;
  bytesIn: number;
  bytesOut: number;
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
        title={t('vps.network.overview.title')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" testId="vps.network.accounting.refresh" onClick={props.onRefresh}>
              {t('common.refresh')}
            </Button>
            <Badge variant={props.networkStatus === null ? 'neutral' : props.networkStatus ? 'ok' : 'warn'}>
              {props.networkStatus === null ? t('state.unknown') : props.networkStatus ? t('vps.network.status.enabled') : t('vps.network.status.disabled')}
            </Badge>
          </div>
        }
      />

      <CardBody className="space-y-4">
        {props.networkStatus === false ? (
          <Alert variant="warn" title={t('vps.network.state.disabled')} testId="vps.network.disabled_notice">
            {t('vps.network.overview.state.disabled_help')}
          </Alert>
        ) : null}

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

        <div className="grid gap-3 md:grid-cols-2">
          <OverviewStatusItem
            testId="vps.network.accounting.in"
            tone={props.accountingError ? 'warn' : 'neutral'}
            label={t('vps.network.accounting.ingress')}
            value={props.accountingLoading ? t('common.loading') : props.accountingError ? t('vps.network.accounting.error') : formatBytes(props.bytesIn)}
            description={t('vps.network.accounting.period', {
              year: props.year,
              month: String(props.month).padStart(2, '0'),
            })}
          />
          <OverviewStatusItem
            testId="vps.network.accounting.out"
            tone={props.accountingError ? 'warn' : 'neutral'}
            label={t('vps.network.accounting.egress')}
            value={props.accountingLoading ? t('common.loading') : props.accountingError ? t('vps.network.accounting.error') : formatBytes(props.bytesOut)}
            description={t('vps.network.accounting.period', {
              year: props.year,
              month: String(props.month).padStart(2, '0'),
            })}
          />
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
        <div className="grid gap-3 md:grid-cols-2">
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
