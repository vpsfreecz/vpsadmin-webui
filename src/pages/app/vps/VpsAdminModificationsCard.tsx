import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../../app/i18n';
import { useChrome } from '../../../components/layout/ChromeContext';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { fetchActionState } from '../../../lib/api/actionStates';
import { getMetaActionStateId } from '../../../lib/api/haveapi';
import { updateVps, type Vps } from '../../../lib/api/vps';
import { formatErrorMessage } from '../../../lib/errors';
import { gateVpsMutation } from '../../../lib/gates/vps';
import { objectRef } from '../../../lib/objectRef';
import { useFastPollIntervalMs } from '../../../lib/refreshTiers';
import { actionStateFinished, isBusyError } from './VpsAccessPrimitives';
import { useVps } from './VpsContext';
import { freezeVpsMutationSnapshot, type VpsMutationSnapshot } from './VpsMutationSnapshot';
import { preflightVpsNotBusy } from './vpsPreflight';

type Choice = VpsMutationSnapshot & { allow: boolean };

/** Mounted with a VPS key: drafts and receipts never migrate to another VPS. */
export function VpsAdminModificationsCard() {
  const { t } = useI18n();
  const chrome = useChrome();
  const qc = useQueryClient();
  const { vps, canMutateVps, busyTransaction, busyLocalLock, refetch } = useVps();
  const [draft, setDraft] = useState<boolean | null>(null);
  const [pending, setPending] = useState<{ id: number; allow: boolean } | null>(null);
  const [result, setResult] = useState<'saved' | 'failed' | null>(null);
  const fastPollMs = useFastPollIntervalMs();
  const known = typeof vps.allow_admin_modifications === 'boolean';
  const selected = draft ?? (known ? vps.allow_admin_modifications : null);
  const gate = gateVpsMutation({ vps, busyLocal: busyLocalLock, busyTransaction });
  const stateQ = useQuery({
    queryKey: ['action_state', 'show', { id: pending?.id ?? -1 }],
    queryFn: async () => (await fetchActionState(pending!.id)).data,
    enabled: pending !== null,
    refetchInterval: (query) => (actionStateFinished(query.state.data) ? false : fastPollMs),
  });

  useEffect(() => {
    if (!pending || !actionStateFinished(stateQ.data)) return;
    let cancelled = false;
    const successful = stateQ.data?.status === true;
    void qc.invalidateQueries({ queryKey: ['vps', 'show', { id: vps.id }], exact: true }).then(() => {
      if (cancelled) return;
      const fresh = qc.getQueryData<Vps>(['vps', 'show', { id: vps.id }]);
      const readBack = qc.getQueryState(['vps', 'show', { id: vps.id }]);
      const confirmed =
        successful && readBack?.status === 'success' && fresh?.allow_admin_modifications === pending.allow;
      setResult(confirmed ? 'saved' : 'failed');
      if (confirmed) setDraft(null);
      setPending(null);
    });
    return () => {
      cancelled = true;
    };
  }, [pending, qc, stateQ.data, vps.id]);

  const saveM = useMutation({
    mutationFn: async (choice: Choice) => {
      if (!choice.canMutate) throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: choice.vpsId, t, knownBusy: choice.knownBusy });
      return updateVps(choice.vpsId, { allow_admin_modifications: choice.allow });
    },
    onMutate: async (choice) => {
      setResult(null);
      const ref = objectRef('Vps', choice.vpsId);
      return { ref, generation: await chrome.acquireLocalLock(ref, { durable: true }) };
    },
    onSuccess: (response, choice, context) => {
      const id = getMetaActionStateId(response.meta)!; // updateVps requires this receipt.
      setPending({ id, allow: choice.allow });
      chrome.trackActionState(id, {
        actionLabelKey: 'vps.admin_modifications.title',
        objectLabel: choice.objectLabel,
        object: context?.ref,
        mutationGeneration: context?.generation,
      });
    },
    onError: (error: unknown) => {
      if (isBusyError(error)) chrome.openTasks();
    },
    onSettled: (_response, error, _choice, context) =>
      context && chrome.settleLocalLock(context.ref, error, context.generation),
  });
  const disabled = !canMutateVps || !known || !gate.allowed || saveM.isPending || pending !== null;

  return (
    <Card testId="vps.admin_modifications">
      <CardHeader title={t('vps.admin_modifications.title')} subtitle={t('vps.admin_modifications.subtitle')} />
      <CardBody>
        <div className="space-y-4">
          <p className="text-sm text-muted">{t('vps.admin_modifications.description')}</p>
          {!known ? <Alert variant="warn" title={t('vps.admin_modifications.unknown')} /> : null}
          <fieldset disabled={disabled} className="space-y-2">
            <legend className="sr-only">{t('vps.admin_modifications.title')}</legend>
            {[true, false].map((allow) => (
              <label
                key={String(allow)}
                className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <input
                  type="radio"
                  name={`admin-modifications-${vps.id}`}
                  className="mt-1 h-4 w-4 shrink-0 accent-accent"
                  data-testid={`vps.admin_modifications.${allow ? 'allow' : 'deny'}`}
                  checked={selected === allow}
                  onChange={() => {
                    setDraft(allow);
                    setResult(null);
                    saveM.reset();
                  }}
                />
                <span>{t(allow ? 'vps.admin_modifications.allow' : 'vps.admin_modifications.deny')}</span>
              </label>
            ))}
          </fieldset>
          {saveM.isError ? (
            <Alert
              variant="danger"
              testId="vps.admin_modifications.error"
              title={t('vps.admin_modifications.save_error')}
            >
              {formatErrorMessage(saveM.error)}
            </Alert>
          ) : null}
          {pending ? (
            <Alert variant="info" testId="vps.admin_modifications.pending" title={t('vps.admin_modifications.pending')}>
              {stateQ.isError ? t('vps.admin_modifications.status_error') : t('vps.admin_modifications.pending_body')}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void stateQ.refetch();
                  chrome.openTasks();
                }}
              >
                {t('common.open_tasks')}
              </Button>
            </Alert>
          ) : null}
          {result ? (
            <Alert
              variant={result === 'saved' ? 'ok' : 'danger'}
              testId={`vps.admin_modifications.${result}`}
              title={t(result === 'saved' ? 'vps.admin_modifications.saved' : 'vps.admin_modifications.failed')}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canMutateVps ? (
              <ActionButton
                testId="vps.admin_modifications.save"
                disabled={disabled || selected === vps.allow_admin_modifications}
                disabledReason={!gate.allowed ? gate.reason : undefined}
                loading={saveM.isPending}
                onClick={() => {
                  if (typeof selected !== 'boolean' || disabled) return;
                  saveM.mutate(
                    freezeVpsMutationSnapshot({
                      vpsId: vps.id,
                      allow: selected,
                      canMutate: canMutateVps && gate.allowed,
                      knownBusy: busyTransaction || busyLocalLock,
                      objectLabel: vps.hostname || `#${vps.id}`,
                    })
                  );
                }}
              >
                {t('common.save')}
              </ActionButton>
            ) : null}
            <Button variant="secondary" disabled={saveM.isPending || pending !== null} onClick={() => refetch()}>
              {t('common.refresh')}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
