import React, { type Dispatch, type SetStateAction } from 'react';

import { useI18n } from '../../../app/i18n';
import type { ActionState } from '../../../lib/api/actionStates';
import { isMissingActionStateError } from '../../../lib/api/haveapi';
import { actionStateProgressLabel, actionStateProgressPercent } from '../../../lib/taskStatus';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { CopyButton } from '../../../components/ui/CopyButton';
import { Modal } from '../../../components/ui/Modal';
import { VpsPowerConfirmTarget } from './VpsPowerConfirmation';

export type VpsHeaderConfirm =
  | null
  | { kind: 'stop' | 'restart'; force: boolean }
  | { kind: 'passwd'; type: 'secure' | 'simple' };

type Props = {
  vpsId: number;
  hostname?: string;
  confirm: VpsHeaderConfirm;
  onConfirmChange: Dispatch<SetStateAction<VpsHeaderConfirm>>;
  stopAllowed: boolean;
  restartAllowed: boolean;
  passwordAllowed: boolean;
  stopPending: boolean;
  restartPending: boolean;
  passwordPending: boolean;
  stopError: unknown;
  restartError: unknown;
  passwordError: unknown;
  onStop: (force: boolean) => void;
  onRestart: (force: boolean) => void;
  onPassword: (type: 'secure' | 'simple') => void;
  passwordWaitOpen: boolean;
  passwordFlowActive: boolean;
  passwordState?: ActionState;
  onPasswordWaitClose: () => void;
  revealedPassword: string | null;
  onClearRevealedPassword: () => void;
  onOpenTasks: () => void;
};

export function VpsHeaderActionDialogs(props: Props) {
  const { t } = useI18n();
  const objectLabel = props.hostname ?? t('common.vps_ref', { id: props.vpsId });
  const forceStop = props.confirm?.kind === 'stop' && props.confirm.force;

  const errorMessage = (error: unknown) => (
    isMissingActionStateError(error)
      ? t('vps.mutation.error.missing_action_state')
      : error instanceof Error
        ? error.message
        : t('common.unknown_error')
  );

  return (
    <>
      <ConfirmDialog
        open={props.confirm?.kind === 'stop'}
        testId="vps.action.stop_confirm"
        title={t(forceStop ? 'vps.power.poweroff.confirm_title' : 'vps.power.stop.confirm_title')}
        description={t(forceStop ? 'vps.power.poweroff.confirm_desc' : 'vps.power.stop.confirm_desc_basic')}
        danger
        confirmLabel={t(forceStop ? 'action.vps.poweroff.label' : 'action.vps.stop.label')}
        confirmLoading={props.stopPending}
        confirmDisabled={props.stopPending || !props.stopAllowed}
        onCancel={() => props.onConfirmChange(null)}
        onConfirm={() => props.onStop(forceStop)}
      >
        <div className="space-y-3">
          <VpsPowerConfirmTarget
            vpsId={props.vpsId}
            objectLabel={String(objectLabel)}
            testId="vps.action.stop_confirm.target"
          />
          <Checkbox
            checked={forceStop}
            onChange={(checked) => props.onConfirmChange((prev) => (
              prev?.kind === 'stop' ? { ...prev, force: checked } : prev
            ))}
            label={t('vps.power.stop.force.label')}
            description={t('vps.power.stop.force.help')}
            testId="vps.action.stop_confirm.force"
          />
          {props.stopError ? (
            <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger" data-testid="vps.action.stop_confirm.error">
              {errorMessage(props.stopError)}
            </div>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={props.confirm?.kind === 'restart'}
        testId="vps.action.restart_confirm"
        title={t('vps.power.restart.confirm_title')}
        description={t('vps.power.restart.confirm_desc_basic')}
        confirmLabel={t(props.confirm?.kind === 'restart' && props.confirm.force
          ? 'vps.power.restart.force.label' : 'action.vps.restart.label')}
        confirmLoading={props.restartPending}
        confirmDisabled={props.restartPending || !props.restartAllowed}
        onCancel={() => props.onConfirmChange(null)}
        onConfirm={() => props.onRestart(props.confirm?.kind === 'restart' && props.confirm.force)}
      >
        <div className="space-y-3">
          <VpsPowerConfirmTarget
            vpsId={props.vpsId}
            objectLabel={String(objectLabel)}
            testId="vps.action.restart_confirm.target"
          />
          <Checkbox
            checked={props.confirm?.kind === 'restart' && props.confirm.force}
            onChange={(checked) => props.onConfirmChange((prev) => (
              prev?.kind === 'restart' ? { ...prev, force: checked } : prev
            ))}
            label={t('vps.power.restart.force.label')}
            description={t('vps.power.restart.force.help')}
            testId="vps.action.restart_confirm.force"
          />
          {props.restartError ? (
            <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger" data-testid="vps.action.restart_confirm.error">
              {errorMessage(props.restartError)}
            </div>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={props.confirm?.kind === 'passwd'}
        testId="vps.action.root_password_confirm"
        title={t('action.vps.root_password.label')}
        description={t('vps.power.root_password.confirm_desc_basic')}
        confirmLabel={t('common.generate')}
        confirmLoading={props.passwordPending}
        confirmDisabled={props.passwordPending || !props.passwordAllowed}
        onCancel={() => props.onConfirmChange(null)}
        onConfirm={() => props.onPassword(props.confirm?.kind === 'passwd' ? props.confirm.type : 'secure')}
      >
        <div className="space-y-3">
          <VpsPowerConfirmTarget
            vpsId={props.vpsId}
            objectLabel={String(objectLabel)}
            testId="vps.action.root_password_confirm.target"
          />
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="passwdType"
                checked={props.confirm?.kind === 'passwd' ? props.confirm.type === 'secure' : true}
                onChange={() => props.onConfirmChange({ kind: 'passwd', type: 'secure' })}
              />
              <span>{t('vps.power.root_password.type.secure')}</span>
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="passwdType"
                checked={props.confirm?.kind === 'passwd' ? props.confirm.type === 'simple' : false}
                onChange={() => props.onConfirmChange({ kind: 'passwd', type: 'simple' })}
              />
              <span>{t('vps.power.root_password.type.simple')}</span>
            </label>
          </div>
          {props.passwordError ? (
            <div className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger" data-testid="vps.action.root_password_confirm.error">
              {errorMessage(props.passwordError)}
            </div>
          ) : null}
        </div>
      </ConfirmDialog>

      <Modal
        open={props.passwordWaitOpen && props.passwordFlowActive}
        onClose={props.onPasswordWaitClose}
        title={t('modal.vps.root_password.title')}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={props.onOpenTasks}>{t('common.open_tasks')}</Button>
            <Button variant="secondary" onClick={props.onPasswordWaitClose}>{t('common.close')}</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-muted">{t('modal.vps.root_password.body')}</div>
          {props.passwordState ? (
            (() => {
              const pct = actionStateProgressPercent(props.passwordState);
              const label = actionStateProgressLabel(props.passwordState);
              return pct !== null ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{label ?? t('common.progress')}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded bg-surface-2">
                    <div className="h-2 rounded bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : null;
            })()
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              <span>{t('common.starting')}</span>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={props.revealedPassword !== null}
        title={t('modal.root_password_reveal.title')}
        description={t('modal.root_password_reveal.body')}
        confirmLabel={t('common.close')}
        onCancel={props.onClearRevealedPassword}
        onConfirm={props.onClearRevealedPassword}
      >
        <div className="mt-3 rounded-md border border-border bg-surface-2 p-3 font-mono text-sm break-all">
          {props.revealedPassword ?? t('common.na')}
        </div>
        {props.revealedPassword ? (
          <div className="mt-3 flex items-center gap-2">
            <CopyButton text={props.revealedPassword} label={t('common.copy')} />
          </div>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
