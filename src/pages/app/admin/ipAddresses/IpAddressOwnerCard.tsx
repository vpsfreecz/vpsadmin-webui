import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { useChrome } from '../../../../components/layout/ChromeContext';
import { MutationUncertaintyPanel } from '../../../../components/layout/MutationUncertaintyPanel';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Alert } from '../../../../components/ui/Alert';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Select } from '../../../../components/ui/Select';
import { UserLookupInput } from '../../../../components/ui/UserLookupInput';
import { fetchEnvironments } from '../../../../lib/api/infra';
import { fetchIpAddress, updateIpAddress, type IpAddress } from '../../../../lib/api/ipAddresses';
import { getMetaActionStateId } from '../../../../lib/api/haveapi';
import { formatErrorMessage } from '../../../../lib/errors';
import { objectRef, normalizeObjectId } from '../../../../lib/objectRef';

export function IpAddressOwnerCard(props: { ip: IpAddress; onUpdated: () => Promise<void> }) {
  const { t } = useI18n();
  const { pushToast } = useToasts();
  const chrome = useChrome();
  const [user, setUser] = useState('');
  const [environment, setEnvironment] = useState('');
  const [manualReview, setManualReview] = useState<string | null>(null);
  const ref = useMemo(() => objectRef('IpAddress', props.ip.id), [props.ip.id]);
  const lock = chrome.localLocks.find((item) => item.kind === ref.kind && item.id === ref.id && item.uncertain);
  const blocked = chrome.isLocallyLocked(ref);
  const currentOwner = props.ip.user && normalizeObjectId(props.ip.user.id);
  const environments = useQuery({
    queryKey: ['environments', 'ip-owner'],
    queryFn: async () => (await fetchEnvironments({ limit: 250 })).data,
    staleTime: 60_000,
  });
  const save = useMutation({
    mutationFn: ({ id, params }: { id: number; params: Record<string, unknown> }) => updateIpAddress(id, params),
    onMutate: async ({ id }) => {
      const lockRef = objectRef('IpAddress', id);
      const generation = await chrome.acquireLocalLock(lockRef, { durable: true });
      return { lockRef, generation };
    },
    onSuccess: async (result, _variables, context) => {
      const state = getMetaActionStateId(result.meta);
      if (state !== undefined && context)
        chrome.trackActionState(state, {
          actionLabel: t('admin.ip.owner.save'),
          objectLabel: props.ip.addr ?? `#${props.ip.id}`,
          object: context.lockRef,
          mutationGeneration: context.generation,
        });
      await props.onUpdated();
      setUser('');
      setEnvironment('');
      pushToast({ variant: 'ok', title: t('admin.ip.owner.toast.saved') });
    },
    onSettled: (_result, error, _variables, context) => {
      if (context) chrome.settleLocalLock(context.lockRef, error, context.generation);
    },
  });
  const submit = () => {
    const owner = user.trim() ? normalizeObjectId(user.trim()) : null;
    if (user.trim() && !owner) return;
    const env = normalizeObjectId(environment);
    if (owner && !env) return;
    save.mutate({ id: props.ip.id, params: owner ? { user: owner, environment: env } : { user: null } });
  };

  return (
    <Card testId="admin.ip_address.owner.card" className="scroll-mt-24" id="owner">
      <CardHeader title={t('admin.ip.owner.title')} subtitle={t('admin.ip.owner.subtitle')} />
      <CardBody className="space-y-3">
        <MutationUncertaintyPanel
          object={ref}
          lock={lock}
          testIdPrefix="admin.ip.owner.uncertain"
          reconcile={async () => {
            try {
              const loaded = (
                await fetchIpAddress(props.ip.id, { includes: 'user,charged_environment,network_interface' })
              ).data;
              if (loaded?.id !== props.ip.id) return 'error';
              await props.onUpdated();
              return 'manual';
            } catch {
              return 'error';
            }
          }}
          onManualConfirm={() => setManualReview(lock?.uncertaintyId ?? null)}
        />
        <div className="text-sm text-muted" data-testid="admin.ip.owner.current">
          {t('admin.ip.owner.current', {
            owner: currentOwner
              ? `${props.ip.user?.login ?? ''} (#${currentOwner})`.trim()
              : t('admin.ip.owner.unassigned'),
            environment:
              props.ip.charged_environment?.label ??
              props.ip.charged_environment?.name ??
              (props.ip.charged_environment ? `#${props.ip.charged_environment.id}` : t('common.na')),
          })}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <div className="mb-1 text-sm font-medium">{t('admin.ip.owner.user')}</div>
            <UserLookupInput
              value={user}
              onChange={setUser}
              disabled={blocked || save.isPending}
              testId="admin.ip.owner.user"
              placeholder={currentOwner ? `#${currentOwner}` : t('admin.ip.owner.unassigned')}
              allowRawId
            />
          </label>
          <label className="block">
            <div className="mb-1 text-sm font-medium">{t('admin.ip.owner.environment')}</div>
            <Select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              testId="admin.ip.owner.environment"
              disabled={blocked || save.isPending || environments.isLoading}
              options={[
                { value: '', label: t('admin.ip.owner.environment.placeholder') },
                ...(environments.data ?? []).map((env) => ({
                  value: String(env.id),
                  label: env.label ?? `#${env.id}`,
                })),
              ]}
            />
          </label>
          <ActionButton
            loading={save.isPending}
            testId="admin.ip.owner.save"
            onClick={submit}
            disabled={
              blocked ||
              (!user.trim() && !currentOwner) ||
              (Boolean(user.trim()) && (!normalizeObjectId(user) || !normalizeObjectId(environment)))
            }
          >
            {user.trim() ? t('admin.ip.owner.save') : t('admin.ip.owner.clear')}
          </ActionButton>
        </div>
        {save.error ? (
          <Alert variant="danger" title={t('admin.ip.action_error')} testId="admin.ip.owner.error">
            {formatErrorMessage(save.error, t)}
          </Alert>
        ) : null}
        <ConfirmDialog
          open={Boolean(manualReview)}
          title={t('admin.ip.owner.review.title')}
          description={t('admin.ip.owner.review.body')}
          confirmLabel={t('vps.mutation.uncertain.acknowledge')}
          onCancel={() => setManualReview(null)}
          onConfirm={() => {
            if (manualReview && manualReview === lock?.uncertaintyId)
              chrome.acknowledgeUncertainLocalLock(ref, manualReview);
            setManualReview(null);
          }}
        />
      </CardBody>
    </Card>
  );
}
