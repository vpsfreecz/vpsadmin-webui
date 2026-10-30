import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../../app/i18n';
import { useChrome } from '../../../components/layout/ChromeContext';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import type { Vps } from '../../../lib/api/vps';
import { objectRef } from '../../../lib/objectRef';
import { gateVpsMutation } from '../../../lib/gates/vps';
import { isMissingActionStateError } from '../../../lib/api/apiErrors';
import { useVps } from './VpsContext';
import { preflightVpsNotBusy } from './vpsPreflight';
import { parseIncidentLimit } from './vpsIncidentEscalation';
import { VpsIncidentLimitFields, type IncidentLimitDraft } from './VpsIncidentLimitFields';

/** A form submission, not a generated API response or transport model. */
export type IncidentSettingsChange =
  | { kind: 'limits'; policyKey: string; policyLabel: string; warning: number | null; shutdown: number | null }
  | { kind: 'permission'; allowed: boolean };

interface Submission {
  vpsId: number;
  hostname: string;
  canMutate: boolean;
  knownBusy: boolean;
  change: IncidentSettingsChange;
}

/** The supplied save operation must verify its exact authoritative readback. */
export function VpsIncidentSettingsEditor(props: {
  vps: Vps;
  settings: IncidentSettingsChange;
  saveSettings: (vpsId: number, change: IncidentSettingsChange) => Promise<void>;
  effectiveWarning?: number;
  effectiveShutdown?: number;
  warningPeriod?: number;
  shutdownPeriod?: number;
}) {
  const { t } = useI18n();
  const chrome = useChrome();
  const context = useVps();
  const qc = useQueryClient();
  const [limits, setLimits] = useState<IncidentLimitDraft | null>(null);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<Submission | null>(null);
  const baseline = props.settings;
  const draft = limits ?? {
    warning: {
      value: baseline.kind === 'limits' ? String(baseline.warning ?? props.effectiveWarning ?? '') : '',
      inherited: baseline.kind === 'limits' && baseline.warning === null,
    },
    shutdown: {
      value: baseline.kind === 'limits' ? String(baseline.shutdown ?? props.effectiveShutdown ?? '') : '',
      inherited: baseline.kind === 'limits' && baseline.shutdown === null,
    },
  };
  const warning = draft.warning.inherited ? null : (parseIncidentLimit(draft.warning.value) ?? undefined);
  const shutdown = draft.shutdown.inherited ? null : (parseIncidentLimit(draft.shutdown.value) ?? undefined);
  const effectiveWarning =
    warning === null
      ? baseline.kind === 'limits' && baseline.warning === null
        ? props.effectiveWarning
        : undefined
      : warning;
  const effectiveShutdown =
    shutdown === null
      ? baseline.kind === 'limits' && baseline.shutdown === null
        ? props.effectiveShutdown
        : undefined
      : shutdown;
  const invalid =
    baseline.kind === 'limits' &&
    (warning === undefined ||
      shutdown === undefined ||
      (effectiveWarning != null && effectiveShutdown != null && effectiveShutdown < effectiveWarning));
  const change: IncidentSettingsChange =
    baseline.kind === 'limits'
      ? { ...baseline, warning: warning ?? null, shutdown: shutdown ?? null }
      : { kind: 'permission', allowed: permission ?? baseline.allowed };
  const dirty =
    baseline.kind === 'limits' && change.kind === 'limits'
      ? baseline.warning !== change.warning || baseline.shutdown !== change.shutdown
      : baseline.kind === 'permission' && change.kind === 'permission' && baseline.allowed !== change.allowed;
  const gate = gateVpsMutation({
    vps: props.vps,
    busyTransaction: context.busyTransaction,
    busyLocal: context.busyLocalLock,
  });
  const save = useMutation({
    mutationFn: async (submission: Submission) => {
      if (!submission.canMutate || submission.vpsId !== props.vps.id)
        throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: submission.vpsId, t, knownBusy: submission.knownBusy });
      try {
        await props.saveSettings(submission.vpsId, submission.change);
      } catch (error) {
        if (isMissingActionStateError(error)) error.message = t('incidentEscalation.verifyError');
        throw error;
      }
    },
    onMutate: async (submission) => {
      const lockRef = objectRef('Vps', submission.vpsId);
      return { lockRef, generation: await chrome.acquireLocalLock(lockRef, { durable: true }) };
    },
    onSuccess: (_result, submission) => {
      setLimits(null);
      setPermission(null);
      setConfirm(null);
      void qc.invalidateQueries({ queryKey: ['vps', 'show', { id: submission.vpsId }] });
      void qc.invalidateQueries({ queryKey: ['vps', 'incident_policy', { vpsId: submission.vpsId }] });
      context.refetch();
    },
    onSettled: (_result, error, _submission, lock) => {
      if (lock) chrome.settleLocalLock(lock.lockRef, error, lock.generation);
    },
  });
  const disabled = !context.canMutateVps || !gate.allowed || invalid || !dirty || save.isPending;
  const error = save.error ? <Alert variant="danger">{save.error.message}</Alert> : null;
  return (
    <div
      className="space-y-3"
      data-testid={baseline.kind === 'limits' ? 'vps.incidents.limits' : 'vps.incidents.permission'}
    >
      {baseline.kind === 'limits' ? (
        <VpsIncidentLimitFields
          value={draft}
          disabled={save.isPending}
          inheritedWarning={baseline.warning === null ? props.effectiveWarning : undefined}
          inheritedShutdown={baseline.shutdown === null ? props.effectiveShutdown : undefined}
          warningPeriod={props.warningPeriod}
          shutdownPeriod={props.shutdownPeriod}
          warningPending={baseline.warning !== null}
          shutdownPending={baseline.shutdown !== null}
          onChange={(value) => {
            setLimits(value);
            save.reset();
          }}
        />
      ) : (
        <Checkbox
          checked={change.kind === 'permission' && change.allowed}
          disabled={save.isPending}
          label={t('incidentEscalation.allowShutdown')}
          onChange={(allowed) => {
            setPermission(allowed);
            save.reset();
          }}
        />
      )}
      {invalid ? <Alert variant="warn">{t('incidentEscalation.invalidLimits')}</Alert> : null}
      {error}
      {!gate.allowed ? <Alert variant="warn">{t(gate.reason.descriptionKey ?? gate.reason.titleKey)}</Alert> : null}
      <Button
        disabled={disabled}
        onClick={() =>
          setConfirm(
            Object.freeze({
              vpsId: props.vps.id,
              hostname: props.vps.hostname ?? '',
              canMutate: context.canMutateVps,
              knownBusy: context.busyTransaction || context.busyLocalLock,
              change: Object.freeze({ ...change }),
            })
          )
        }
      >
        {t('common.save')}
      </Button>
      <ConfirmDialog
        testId="vps.incidents.confirm"
        open={confirm !== null}
        title={t(
          baseline.kind === 'limits' ? 'incidentEscalation.policySettings' : 'incidentEscalation.automaticShutdown'
        )}
        description={
          confirm
            ? t(
                confirm.change.kind === 'limits'
                  ? 'incidentEscalation.confirmPolicy'
                  : 'incidentEscalation.confirmPermission',
                {
                  id: confirm.vpsId,
                  hostname: confirm.hostname,
                  policy: confirm.change.kind === 'limits' ? confirm.change.policyLabel : '',
                }
              )
            : ''
        }
        confirmLabel={t('common.save')}
        confirmLoading={save.isPending}
        confirmDisabled={disabled}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) save.mutate(confirm);
        }}
      >
        {confirm?.change.kind === 'limits' ? (
          <dl className="space-y-2 text-sm">
            <div>
              <dt>{t('incidentEscalation.warningLimit')}</dt>
              <dd>{confirm.change.warning ?? t('incidentEscalation.inherited')}</dd>
            </div>
            <div>
              <dt>{t('incidentEscalation.shutdownLimit')}</dt>
              <dd>{confirm.change.shutdown ?? t('incidentEscalation.inherited')}</dd>
            </div>
          </dl>
        ) : confirm ? (
          <p>
            {t(
              confirm.change.kind === 'permission' && confirm.change.allowed
                ? 'incidentEscalation.permissionAllowed'
                : 'incidentEscalation.permissionBlocked'
            )}
          </p>
        ) : null}
        {error}
      </ConfirmDialog>
    </div>
  );
}
