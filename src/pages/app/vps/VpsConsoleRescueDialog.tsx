import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useI18n } from '../../../app/i18n';
import { useAppMode } from '../../../app/appMode';
import { useChrome } from '../../../components/layout/ChromeContext';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { fetchOsTemplates } from '../../../lib/api/osTemplates';
import { getMetaActionStateId, isMissingActionStateError } from '../../../lib/api/haveapi';
import { vpsBoot } from '../../../lib/api/vps';
import { gateVpsMutation } from '../../../lib/gates/vps';
import { useVps } from './VpsContext';
import { VpsConfirmTarget } from './VpsPowerConfirmation';
import { buildVpsBootPayload, defaultBootForm } from './VpsAdminLifecycleModel';
import {
  executeLifecycleMutation,
  prepareLifecycleMutationVariables,
  type LifecycleMutationVariables,
} from './VpsLifecycleMutationSnapshot';

export function VpsConsoleRescueDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { basePath } = useAppMode();
  const chrome = useChrome();
  const { vps, vpsRef, canMutateVps, busyLocalLock, busyTransaction, refetch, refetchChains } = useVps();
  const [form, setForm] = useState(() => defaultBootForm(vps.os_template?.id ?? null));
  const objectLabel = String(vps.hostname || `#${vps.id}`);
  const templatesQ = useQuery({
    queryKey: ['os_templates', 'console-rescue'],
    queryFn: async () => (await fetchOsTemplates({ limit: 500, enabled: true, hypervisorType: 'vpsadminos' })).data,
    staleTime: 60_000,
  });
  const templates = (templatesQ.data ?? []).filter(
    (template) =>
      template.enabled !== false &&
      (!template.hypervisor_type || template.hypervisor_type === 'vpsadminos') &&
      (!vps.node?.cgroup_version ||
        !template.cgroup_version ||
        template.cgroup_version === 'cgroup_any' ||
        template.cgroup_version === vps.node.cgroup_version)
  );
  const gate = gateVpsMutation({ vps, busyLocal: busyLocalLock, busyTransaction });
  const mountValid = !form.mountRootDataset || /^\/[a-zA-Z0-9_/.:-]*$/.test(form.mountpoint.trim());
  const ready =
    !templatesQ.isError && templates.some((template) => String(template.id) === form.osTemplate) && mountValid;
  const bootM = useMutation({
    mutationFn: (variables: LifecycleMutationVariables<ReturnType<typeof buildVpsBootPayload>>) =>
      executeLifecycleMutation(variables, vpsBoot),
    onMutate: async (variables) => ({
      lockRef: variables.lockRef,
      mutationGeneration: await chrome.acquireLocalLock(variables.lockRef, { durable: true }),
    }),
    onSettled: (_data, error, _variables, context) =>
      context && chrome.settleLocalLock(context.lockRef, error, context.mutationGeneration),
    onSuccess: (res, variables, context) => {
      const id = getMetaActionStateId(res.meta);
      if (id !== undefined)
        chrome.trackActionState(id, {
          actionLabelKey: 'action.vps.boot.label',
          objectLabel: variables.objectLabel,
          object: context?.lockRef,
          mutationGeneration: context?.mutationGeneration,
          blockUi: true,
          progressTitleKey: 'vps.console.rescue.title',
        });
      variables.refreshVps();
      variables.refreshChains();
      onClose();
    },
  });
  const submit = () => {
    if (!ready || !gate.allowed || bootM.isPending || !canMutateVps || vps.node?.hypervisor_type !== 'vpsadminos')
      return;
    bootM.mutate(
      prepareLifecycleMutationVariables(
        {
          vpsId: vps.id,
          lockRef: vpsRef,
          basePath,
          objectLabel,
          canMutateVps,
          knownBusy: busyLocalLock || busyTransaction,
          permissionError: t('gate.blocked.permission.body'),
          busyError: t('toast.action_blocked.body'),
          refreshVps: refetch,
          refreshChains: refetchChains,
        },
        () => buildVpsBootPayload(form)
      )
    );
  };

  return (
    <ConfirmDialog
      open
      title={t('vps.console.rescue.title')}
      description={t('vps.console.rescue.description')}
      testId="vps.console.rescue"
      confirmLabel={t('vps.console.rescue.submit')}
      confirmVariant="warn"
      confirmDisabled={!ready || !gate.allowed || !canMutateVps}
      confirmLoading={bootM.isPending}
      onCancel={onClose}
      onConfirm={submit}
    >
      <div className="space-y-3">
        <VpsConfirmTarget vpsId={vps.id} objectLabel={objectLabel} testId="vps.console.rescue.target" />
        <label htmlFor="console-rescue-template" className="block space-y-1 text-sm">
          <span>{t('vps.lifecycle.field.os_template')}</span>
          <Select
            selectId="console-rescue-template"
            value={form.osTemplate}
            onChange={(event) => setForm({ ...form, osTemplate: event.target.value })}
            disabled={bootM.isPending || templatesQ.isFetching}
            testId="vps.console.rescue.template"
          >
            <option value="">{t('vps.lifecycle.placeholder.os_template')}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label ?? template.name ?? `#${template.id}`}
              </option>
            ))}
          </Select>
        </label>
        {templatesQ.isError ? (
          <Alert variant="danger" title={t('vps.console.rescue.templates_error')}>
            <Button size="sm" onClick={() => void templatesQ.refetch()}>
              {t('common.retry')}
            </Button>
          </Alert>
        ) : null}
        <Checkbox
          checked={form.mountRootDataset}
          disabled={bootM.isPending}
          onChange={(mountRootDataset) => setForm({ ...form, mountRootDataset })}
          label={t('vps.lifecycle.boot.mount_root_dataset')}
          testId="vps.console.rescue.mount"
        />
        <label htmlFor="console-rescue-mountpoint" className="block space-y-1 text-sm">
          <span>{t('vps.lifecycle.boot.mountpoint')}</span>
          <Input
            inputId="console-rescue-mountpoint"
            value={form.mountpoint}
            disabled={bootM.isPending || !form.mountRootDataset}
            onChange={(event) => setForm({ ...form, mountpoint: event.target.value })}
            testId="vps.console.rescue.mountpoint"
          />
        </label>
        {!mountValid ? <Alert variant="warn">{t('vps.console.rescue.mountpoint_error')}</Alert> : null}
        {!gate.allowed ? <Alert variant="warn">{t(gate.reason.descriptionKey ?? gate.reason.titleKey)}</Alert> : null}
        {bootM.isError ? (
          <Alert variant="danger" testId="vps.console.rescue.error">
            {isMissingActionStateError(bootM.error)
              ? t('vps.mutation.error.missing_action_state')
              : bootM.error.message}
          </Alert>
        ) : null}
      </div>
    </ConfirmDialog>
  );
}
