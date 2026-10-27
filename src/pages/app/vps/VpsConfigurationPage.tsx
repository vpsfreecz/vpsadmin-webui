import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../../app/auth';
import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import { useChrome } from '../../../components/layout/ChromeContext';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Checkbox } from '../../../components/ui/Checkbox';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Input } from '../../../components/ui/Input';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { fetchDnsResolvers } from '../../../lib/api/dnsResolvers';
import { getMetaActionStateId, isMissingActionStateError } from '../../../lib/api/haveapi';
import { explicitUserNamespaceOwnerId, fetchUserNamespaceMaps } from '../../../lib/api/userNamespaces';
import { updateVps } from '../../../lib/api/vps';
import { gateVpsMutation } from '../../../lib/gates/vps';
import { objectRef } from '../../../lib/objectRef';
import { preflightVpsNotBusy } from './vpsPreflight';
import { VpsAdditionalConfiguration } from './VpsAdditionalConfiguration';
import { useVps } from './VpsContext';
import { VpsResourceDiskCard } from './VpsResourceDiskCard';
import { datasetId } from './VpsStorageModel';
import { freezeVpsMutationSnapshot, type VpsMutationSnapshot } from './VpsMutationSnapshot';
import {
  ADMIN_LOCK_TYPES,
  CONFIG_FIELD_META,
  buildPayload,
  createBuildErrorResult,
  currentResourceLabel,
  dnsResolverLabel,
  ensureCurrentOption,
  normalizeDraft,
  resourceId,
  userNamespaceMapLabel,
  type VpsConfigDraft,
  type VpsConfigReviewKey,
} from './VpsConfigurationModel';
import { parseVpsConfigFieldErrors, type VpsConfigFieldError } from './VpsConfigurationErrors';
import { VpsConfirmTarget } from './VpsPowerConfirmation';
import { buildChangeSummaries, getReviewRequestOptionKeys } from './VpsConfigurationReviewModel';
import {
  Field,
  VpsConfigChangesList,
  VpsConfigFieldErrorsAlert,
  VpsConfigMobileActionBar,
  VpsConfigReviewPanel,
  VpsConfigSectionCard,
} from './VpsConfigurationPrimitives';

function optionLabel(options: readonly SelectOption[], value: string, fallback: string): string {
  if (!value) return fallback;
  return options.find((option) => option.value === value)?.label ?? `#${value}`;
}

function compactIdLabel(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed ? `#${trimmed}` : fallback;
}

function mergeFieldErrorMessages(args: {
  key: VpsConfigReviewKey;
  apiErrors: readonly VpsConfigFieldError[];
  validationFieldKey?: VpsConfigReviewKey;
  validationError: string | null;
}): string[] {
  const messages = args.apiErrors.filter((error) => error.key === args.key).flatMap((error) => error.messages);
  if (args.validationFieldKey === args.key && args.validationError) messages.push(args.validationError);
  return [...new Set(messages)];
}

export function VpsConfigurationPage() {
  const auth = useAuth();
  const { mode } = useAppMode();
  const [searchParams] = useSearchParams();
  const focusedResources = searchParams.get('section') === 'resources';
  const [diskPending, setDiskPending] = useState(false);
  const isAdminMode = mode === 'admin';
  const canEditAdminConfig = isAdminMode && auth.role === 'admin';
  const canMutateVps = !isAdminMode || canEditAdminConfig;
  const chrome = useChrome();
  const qc = useQueryClient();
  const { t } = useI18n();
  const { vps, busyTransaction, busyLocalLock } = useVps();
  const vpsId = Number(vps.id);
  const objectLabel = String(vps.hostname ?? '') || `#${vpsId}`;

  const baseline = useMemo(() => normalizeDraft(vps), [vps]);
  const [draft, setDraft] = useState<VpsConfigDraft | null>(null);
  const effective = draft ?? baseline;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dnsResolversQ = useQuery({
    queryKey: ['dns_resolver', 'list', { limit: 250 }],
    queryFn: async () => (await fetchDnsResolvers({ limit: 250 })).data,
    refetchOnWindowFocus: false,
  });

  const explicitOwnerId = explicitUserNamespaceOwnerId({ viewerRole: auth.role, fixedOwnerId: resourceId(vps.user) ?? undefined });
  const userNamespaceMapsQ = useQuery({
    queryKey: ['user_namespace_map', 'list', { limit: 250, userId: explicitOwnerId ?? null }],
    queryFn: async () => (await fetchUserNamespaceMaps({ limit: 250, userId: explicitOwnerId })).data,
    refetchOnWindowFocus: false,
  });

  const result = useMemo(() => {
    try {
      return buildPayload({ baseline, draft: effective, isAdminMode: canEditAdminConfig, t });
    } catch (error) {
      return createBuildErrorResult(error);
    }
  }, [baseline, canEditAdminConfig, effective, t]);

  const saveM = useMutation({
    mutationFn: async (variables: VpsMutationSnapshot & { payload: Record<string, unknown> }) => {
      if (!variables.canMutate) throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: variables.vpsId, t, knownBusy: variables.knownBusy });
      return updateVps(variables.vpsId, variables.payload);
    },
    onMutate: async (variables) => { const lockRef = objectRef('Vps', variables.vpsId); return { lockRef, mutationGeneration: await chrome.acquireLocalLock(lockRef, { durable: true }) }; },
    onSuccess: (res, variables, context) => {
      setDraft(null);
      setConfirmOpen(false);
      void qc.invalidateQueries({ queryKey: ['vps', 'show', { id: variables.vpsId }] });
      void qc.invalidateQueries({ queryKey: ['transaction_chain', 'list', { className: 'Vps', rowId: variables.vpsId }] });
      const asId = getMetaActionStateId(res.meta);
      if (asId !== undefined) {
        chrome.trackActionState(asId, {
          actionLabelKey: 'action.vps.config.save.label',
          objectLabel: variables.objectLabel,
          object: context?.lockRef,
          mutationGeneration: context?.mutationGeneration,
        });
      }
    },
    onError: (e: unknown) => {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'BUSY') chrome.openTasks();
    },
    onSettled: (_data, error, _variables, context) => context && chrome.settleLocalLock(context.lockRef, error, context.mutationGeneration),
  });

  const patchDraft = (patch: Partial<VpsConfigDraft>) => {
    if (saveM.error) saveM.reset();
    setDraft((prev) => ({ ...(prev ?? baseline), ...patch }));
  };

  const busyLocal = busyLocalLock || saveM.isPending || diskPending;
  const gate = gateVpsMutation({ vps, busyLocal, busyTransaction });
  const dirty = result.changedKeys.length > 0;
  const saveDisabled = !canMutateVps || !dirty || Boolean(result.validationError) || !gate.allowed || saveM.isPending;

  const dnsOptions = useMemo<SelectOption[]>(() => {
    const options: SelectOption[] = [
      { value: '', label: t('vps.config.option.dns_unmanaged') },
      ...(dnsResolversQ.data ?? []).map((resolver) => ({ value: String(resolver.id), label: dnsResolverLabel(resolver) })),
    ];
    return ensureCurrentOption(
      options,
      baseline.dnsResolver,
      currentResourceLabel(vps.dns_resolver, t('vps.config.option.current_dns_resolver'))
    );
  }, [baseline.dnsResolver, dnsResolversQ.data, t, vps.dns_resolver]);

  const userNamespaceMapOptions = useMemo<SelectOption[]>(() => {
    const listed = (userNamespaceMapsQ.data ?? []).map((map) => ({ value: String(map.id), label: userNamespaceMapLabel(map) }));
    const withCurrent = ensureCurrentOption(
      listed,
      baseline.userNamespaceMap,
      currentResourceLabel(vps.user_namespace_map, t('vps.config.option.current_user_namespace_map'))
    );
    return withCurrent.length > 0 ? withCurrent : [{ value: '', label: t('vps.config.option.no_user_namespace_maps_available') }];
  }, [baseline.userNamespaceMap, t, userNamespaceMapsQ.data, vps.user_namespace_map]);

  const labelForKey = (key: VpsConfigReviewKey) => t(CONFIG_FIELD_META[key].labelKey);

  const valueForKey = (key: VpsConfigReviewKey, item: VpsConfigDraft, rawValue: unknown): string => {
    switch (key) {
      case 'manage_hostname':
        return t(item.hostnameMode === 'managed' ? 'vps.config.option.hostname_managed' : 'vps.config.option.hostname_manual');
      case 'user':
        return item.user === baseline.user
          ? currentResourceLabel(vps.user, compactIdLabel(item.user, t('common.none')))
          : compactIdLabel(item.user, t('common.none'));
      case 'dns_resolver':
        return optionLabel(dnsOptions, item.dnsResolver, t('vps.config.option.dns_unmanaged'));
      case 'user_namespace_map':
        return optionLabel(userNamespaceMapOptions, item.userNamespaceMap, t('vps.config.option.no_user_namespace_maps_available'));
      case 'map_mode':
        return t(`vps.config.option.map_mode.${item.mapMode}`);
      case 'cgroup_version':
        return item.cgroupVersion === 'cgroup_any' ? t('vps.config.option.cgroup_any') : item.cgroupVersion.replace('_', ' ');
      case 'allow_admin_modifications':
      case 'admin_override':
        return rawValue === true ? t('common.yes') : t('common.no');
      case 'admin_lock_type':
        return item.adminLockType ? t(`vps.config.option.admin_lock_type.${item.adminLockType}`) : t('vps.config.option.admin_lock_type_none');
      case 'change_reason':
        return item.changeReason.trim();
      default:
        return String(rawValue ?? '').trim();
    }
  };

  const changes = useMemo(
    () =>
      buildChangeSummaries({
        changedKeys: result.changedKeys,
        requestOptionKeys: getReviewRequestOptionKeys(result.payload),
        baseline,
        draft: effective,
        labelForKey,
        valueForKey,
        emptyValueLabel: t('common.none'),
      }),
    [baseline, dnsOptions, effective, result.changedKeys, result.payload, t, userNamespaceMapOptions, vps.user]
  );

  const fieldErrors = useMemo(() => parseVpsConfigFieldErrors(saveM.error), [saveM.error]);
  const fieldMessages = (key: VpsConfigReviewKey) =>
    mergeFieldErrorMessages({
      key,
      apiErrors: fieldErrors,
      validationFieldKey: result.validationFieldKey,
      validationError: result.validationError,
    });

  const applySave = () => {
    if (saveDisabled) return;
    saveM.reset();
    setConfirmOpen(true);
  };

  const resetDraft = () => {
    setDraft(null);
    saveM.reset();
    void dnsResolversQ.refetch();
    void userNamespaceMapsQ.refetch();
  };

  return (
    <div className="space-y-4">
      {!canMutateVps ? (
        <Alert variant="neutral" title={t('gate.blocked.permission.title')}>
          {t('gate.blocked.permission.body')}
        </Alert>
      ) : null}

      <fieldset disabled={!canMutateVps} className="m-0 min-w-0 border-0 p-0">
      <div className="space-y-4">
      <Card>
        <CardHeader
          title={t(focusedResources ? 'vps.resources.title' : 'vps.config.title')}
          subtitle={t(canEditAdminConfig ? 'vps.resources.subtitle_admin' : 'vps.resources.subtitle_user')}
        />
      </Card>

      <VpsConfigMobileActionBar
        changeCount={result.changedKeys.length}
        pending={saveM.isPending}
        saveDisabled={saveDisabled}
        disabledReason={!gate.allowed ? gate.reason : undefined}
        onReset={resetDraft}
        onSave={applySave}
      />

      {!gate.allowed ? (
        <Alert variant="warn" title={t(gate.reason.titleKey)}>
          {gate.reason.descriptionKey ? <p>{t(gate.reason.descriptionKey)}</p> : null}
          <Button variant="secondary" onClick={() => chrome.openTasks()}>
            {t('common.open_tasks')}
          </Button>
        </Alert>
      ) : null}

      {result.validationError && !result.validationFieldKey ? <Alert variant="danger">{result.validationError}</Alert> : null}
      <VpsConfigFieldErrorsAlert errors={fieldErrors} labelForKey={labelForKey} />
      {saveM.error && fieldErrors.length === 0 ? <Alert variant="danger">{isMissingActionStateError(saveM.error) ? t('vps.mutation.error.missing_action_state') : String((saveM.error as Error)?.message ?? saveM.error)}</Alert> : null}

      <div className={canEditAdminConfig ? "grid items-start gap-4 xl:grid-cols-2" : "grid gap-4"} data-testid="vps.resources.workspace">
        <VpsConfigSectionCard
          title={t('vps.resources.performance')}
          subtitle={t(canEditAdminConfig ? 'vps.config.section.resources_help_admin' : 'vps.config.section.resources_help')}
          risks={['live']}
          bodyClassName="grid gap-4 sm:grid-cols-2"
        >
          <Field label={t('vps.config.field.cpu')} errors={fieldMessages('cpu')}>
            <Input value={effective.cpu} type="number" min={1} step={1} onChange={(e) => patchDraft({ cpu: e.target.value })} disabled={saveM.isPending} />
          </Field>
          <Field label={t('vps.config.field.memory')} help={t('vps.config.help.mib')} errors={fieldMessages('memory')}>
            <Input value={effective.memory} type="number" min={1} step={1} onChange={(e) => patchDraft({ memory: e.target.value })} disabled={saveM.isPending} />
          </Field>
          <Field label={t('vps.config.field.swap')} help={t('vps.config.help.mib')} errors={fieldMessages('swap')}>
            <Input value={effective.swap} type="number" min={0} step={1} onChange={(e) => patchDraft({ swap: e.target.value })} disabled={saveM.isPending} />
          </Field>
          {canEditAdminConfig ? (
            <Field label={t('vps.config.field.cpu_limit')} help={t('vps.config.help.cpu_limit_nullable')} errors={fieldMessages('cpu_limit')}>
              <Input value={effective.cpuLimit} type="number" min={0} step={1} onChange={(e) => patchDraft({ cpuLimit: e.target.value })} disabled={saveM.isPending} />
            </Field>
          ) : null}
          {canEditAdminConfig ? (
            <div className="sm:col-span-2 grid gap-4 rounded-md border border-border bg-surface-2 p-3 sm:grid-cols-1">
              <Field label={t('vps.config.field.admin_lock_type')} help={t('vps.config.help.admin_lock_type')} errors={fieldMessages('admin_lock_type')}>
                <Select
                  value={effective.adminLockType}
                  onChange={(e) => patchDraft({ adminLockType: e.target.value })}
                  disabled={saveM.isPending}
                  options={[
                    { value: '', label: t('vps.config.option.admin_lock_type_none') },
                    ...ADMIN_LOCK_TYPES.map((lockType) => ({ value: lockType, label: t(`vps.config.option.admin_lock_type.${lockType}`) })),
                  ]}
                />
              </Field>
              <div className="flex items-end">
                <Checkbox
                  checked={effective.adminOverride}
                  onChange={(checked) => patchDraft({ adminOverride: checked })}
                  label={t('vps.config.field.admin_override')}
                  description={t('vps.config.help.admin_override')}
                  disabled={saveM.isPending}
                  testId="vps.config.admin_override"
                />
              </div>
            </div>
          ) : null}

          <div className="sm:col-span-2 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              onClick={resetDraft}
              disabled={saveM.isPending}
              testId="vps.config.header.reset"
            >
              {t('common.reset')}
            </Button>
            <ActionButton
              onClick={applySave}
              loading={saveM.isPending}
              disabled={saveDisabled}
              disabledReason={!gate.allowed ? gate.reason : undefined}
              testId="vps.config.header.save"
            >
              {dirty ? t('vps.config.save_changes', { n: result.changedKeys.length }) : t('vps.config.save_changes_empty')}
            </ActionButton>
          </div>
        </VpsConfigSectionCard>
        {canEditAdminConfig ? <VpsResourceDiskCard key={`${vpsId}:${datasetId(vps.dataset)}`} vpsPending={saveM.isPending} onPendingChange={setDiskPending} /> : null}
      </div>

      {dirty ? (
        <VpsConfigReviewPanel
          changes={changes}
          dirty={dirty}
          sensitive={result.sensitive}
          validationFieldKey={result.validationFieldKey}
        />
      ) : null}

      <VpsAdditionalConfiguration
        focusedResources={focusedResources}
        canEditAdminConfig={canEditAdminConfig}
        effective={effective}
        pending={saveM.isPending}
        vps={vps}
        dnsResolversQ={dnsResolversQ}
        dnsOptions={dnsOptions}
        userNamespaceMapsQ={userNamespaceMapsQ}
        userNamespaceMapOptions={userNamespaceMapOptions}
        patchDraft={patchDraft}
        fieldMessages={fieldMessages}
        onSave={applySave}
        onReset={resetDraft}
        saveDisabled={saveDisabled}
        disabledReason={!gate.allowed ? gate.reason : undefined}
        changeCount={result.changedKeys.length}
      />

      {dirty ? <Alert variant="info">{t('vps.config.unsaved', { n: result.changedKeys.length })}</Alert> : null}

      <ConfirmDialog
        open={confirmOpen}
        title={t('vps.config.confirm.title')}
        description={t('vps.config.confirm.description', { n: changes.length })}
        confirmLabel={t('common.save')}
        confirmLoading={saveM.isPending}
        confirmDisabled={saveDisabled}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => saveM.mutate(freezeVpsMutationSnapshot({
          vpsId, payload: Object.freeze({ ...result.payload }), canMutate: canMutateVps,
          knownBusy: busyTransaction || busyLocalLock, objectLabel,
        }))}
        testId="vps.config.confirm"
      >
        <div className="space-y-3">
          {saveM.error ? (
            <div data-testid="vps.config.confirm.error">
              {fieldErrors.length > 0 ? (
                <VpsConfigFieldErrorsAlert errors={fieldErrors} labelForKey={labelForKey} />
              ) : (
                <Alert variant="danger">
                  {isMissingActionStateError(saveM.error)
                    ? t('vps.mutation.error.missing_action_state')
                    : String((saveM.error as Error)?.message ?? saveM.error)}
                </Alert>
              )}
            </div>
          ) : null}
          <VpsConfirmTarget vpsId={vpsId} objectLabel={objectLabel} testId="vps.config.confirm.target" />
          {canEditAdminConfig && result.changedKeys.some((key) => ['cpu', 'memory', 'swap'].includes(key)) ? (
            <Checkbox
              checked={effective.adminOverride}
              onChange={(checked) => patchDraft({ adminOverride: checked })}
              label={t('vps.config.field.admin_override')}
              description={t('vps.config.help.admin_override')}
              disabled={saveM.isPending}
              testId="vps.config.confirm.admin_override"
            />
          ) : null}
          <VpsConfigChangesList changes={changes} compact />
        </div>
      </ConfirmDialog>
      </div>
      </fieldset>
    </div>
  );
}
