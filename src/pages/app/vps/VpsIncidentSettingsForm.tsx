import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../../app/i18n';
import { useChrome } from '../../../components/layout/ChromeContext';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { fetchVps, updateVps, type Vps, type VpsIncidentSettings } from '../../../lib/api/vps';
import { getMetaActionStateId } from '../../../lib/api/haveapi';
import { objectRef } from '../../../lib/objectRef';
import { gateVpsMutation } from '../../../lib/gates/vps';
import { useVps } from './VpsContext';
import { preflightVpsNotBusy } from './vpsPreflight';
import { incidentSettings, parseIncidentLimit, sameIncidentSettings } from './vpsIncidentEscalation';

type IncidentSave = { vpsId: number; objectLabel: string; canMutate: boolean; knownBusy: boolean; settings: VpsIncidentSettings };

export function VpsIncidentSettingsForm({ vps }: { vps: Vps }) {
  const { t } = useI18n();
  const chrome = useChrome();
  const qc = useQueryClient();
  const context = useVps();
  const [enforcement, setEnforcement] = useState<boolean | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [stop, setStop] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const baseline = incidentSettings(vps);
  const enabled = enforcement ?? baseline.incident_enforcement_enabled;
  const warningText = warning ?? String(baseline.incident_warning_limit_override ?? '');
  const stopText = stop ?? String(baseline.incident_stop_limit_override ?? '');
  const warningValue = parseIncidentLimit(warningText);
  const stopValue = parseIncidentLimit(stopText);
  // Inherited defaults are resolved and validated atomically by the server.
  const invalid = warningValue === undefined || stopValue === undefined
    || (warningValue !== null && stopValue !== null && stopValue < warningValue);
  const payload: VpsIncidentSettings = {
    incident_policy: baseline.incident_policy,
    incident_warning_limit_override: warningValue ?? null,
    incident_stop_limit_override: stopValue ?? null,
    incident_enforcement_enabled: enabled,
  };
  const dirty = !sameIncidentSettings(vps, payload);
  const gate = gateVpsMutation({ vps, busyTransaction: context.busyTransaction, busyLocal: context.busyLocalLock });
  const save = useMutation({
    mutationFn: async (variables: IncidentSave) => {
      const submitted = variables.settings;
      if (!variables.canMutate) throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: variables.vpsId, t, knownBusy: variables.knownBusy });
      const result = await updateVps(variables.vpsId, { ...submitted });
      if (getMetaActionStateId(result.meta) === undefined) {
        const fresh = (await fetchVps(variables.vpsId, { incidentPolicy: submitted.incident_policy })).data;
        if (!fresh || !sameIncidentSettings(fresh, submitted)) throw new Error(t('incidentEscalation.verifyError'));
      }
      return result;
    },
    onMutate: async (variables) => {
      const lockRef = objectRef('Vps', variables.vpsId);
      return { lockRef, generation: await chrome.acquireLocalLock(lockRef, { durable: true }) };
    },
    onSuccess: (result, variables, lock) => {
      const id = getMetaActionStateId(result.meta);
      if (id !== undefined) chrome.trackActionState(id, {
        actionLabelKey: 'incidentEscalation.settings', objectLabel: variables.objectLabel,
        object: lock?.lockRef, mutationGeneration: lock?.generation,
      });
      setEnforcement(null); setWarning(null); setStop(null); setConfirm(false);
      void qc.invalidateQueries({ queryKey: ['vps'] });
      context.refetch();
    },
    onSettled: (_data, error, _submitted, lock) => {
      if (lock) chrome.settleLocalLock(lock.lockRef, error, lock.generation);
    },
  });
  const disabled = !context.canMutateVps || !gate.allowed || invalid || !dirty || save.isPending;
  return (
    <div className="space-y-3 border-t border-border pt-4" data-testid="vps.incident.settings">
      <p className="text-sm text-muted">{t('incidentEscalation.sharedScope')}</p>
      <h3 className="font-semibold">{t('incidentEscalation.settings')}</h3>
      <p className="text-sm text-muted">{t('incidentEscalation.inheritHelp')}</p>
      <fieldset disabled={save.isPending} className="grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
        <label className="block text-sm"><span>{t('incidentEscalation.warningOverride')}</span><Input ariaLabel={t('incidentEscalation.warningOverride')} value={warningText} inputMode="numeric"
          onChange={e => { setWarning(e.target.value); save.reset(); }} /></label>
        <label className="block text-sm"><span>{t('incidentEscalation.stopOverride')}</span><Input ariaLabel={t('incidentEscalation.stopOverride')} value={stopText} inputMode="numeric"
          onChange={e => { setStop(e.target.value); save.reset(); }} /></label>
        <Checkbox checked={!enabled} label={t('incidentEscalation.exempt')}
          onChange={exempt => { setEnforcement(!exempt); save.reset(); }} />
      </fieldset>
      {invalid ? <Alert variant="warn">{t('incidentEscalation.invalidLimits')}</Alert> : null}
      {save.error ? <Alert variant="danger">{String(save.error.message)}</Alert> : null}
      {!gate.allowed ? <Alert variant="warn">{t(gate.reason.descriptionKey ?? gate.reason.titleKey)}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={() => setConfirm(true)}>{t('incidentEscalation.save')}</Button>
        <Button variant="secondary" disabled={save.isPending}
          onClick={() => { setWarning(''); setStop(''); save.reset(); }}>{t('incidentEscalation.resetDefaults')}</Button>
      </div>
      <ConfirmDialog testId="vps.incident.confirm" open={confirm} title={t('incidentEscalation.settings')}
        description={t('incidentEscalation.confirm', { id: vps.id, hostname: vps.hostname })}
        confirmLabel={t('incidentEscalation.save')} confirmLoading={save.isPending} confirmDisabled={disabled}
        onCancel={() => setConfirm(false)} onConfirm={() => save.mutate(Object.freeze({
          vpsId: vps.id, objectLabel: vps.hostname, canMutate: context.canMutateVps,
          knownBusy: context.busyTransaction || context.busyLocalLock, settings: Object.freeze({ ...payload }),
        }))}>
        <dl className="space-y-2 text-sm">
          <div><dt>{t('incidentEscalation.warningOverride')}</dt><dd>{payload.incident_warning_limit_override ?? t('incidentEscalation.inherited')}</dd></div>
          <div><dt>{t('incidentEscalation.stopOverride')}</dt><dd>{payload.incident_stop_limit_override ?? t('incidentEscalation.inherited')}</dd></div>
          <div><dt>{t('incidentEscalation.exempt')}</dt><dd>{t(enabled ? 'common.no' : 'common.yes')}</dd></div>
        </dl>
        {save.error ? <Alert variant="danger">{String(save.error.message)}</Alert> : null}
      </ConfirmDialog>
    </div>
  );
}
