import React, { useEffect, useId, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { useChrome } from '../../../../components/layout/ChromeContext';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Modal } from '../../../../components/ui/Modal';
import { Select } from '../../../../components/ui/Select';
import { VpsLookupInput } from '../../../../components/ui/VpsLookupInput';
import {
  assignIpAddressRoute,
  assignIpAddressRouteWithHostAddress,
  fetchIpAddress,
  type IpAddress,
} from '../../../../lib/api/ipAddresses';
import { fetchNetworkInterfaces } from '../../../../lib/api/networkInterfaces';
import { fetchVps } from '../../../../lib/api/vps';
import { getMetaActionStateId } from '../../../../lib/api/haveapi';
import { formatErrorMessage } from '../../../../lib/errors';
import { normalizeObjectId, objectRef } from '../../../../lib/objectRef';

type RouteTarget = { ip: number; vps: number; iface: number; owner: number; via: number | null; withHost: boolean };

export function IpAddressRouteDialog(props: {
  ip: IpAddress;
  open: boolean;
  onClose: () => void;
  onAssigned: () => Promise<void>;
}) {
  const { t } = useI18n();
  const { pushToast } = useToasts();
  const chrome = useChrome();
  const withHostId = useId();
  const [vps, setVps] = useState<number | null>(null);
  const [iface, setIface] = useState('');
  const [via, setVia] = useState('');
  const [withHost, setWithHost] = useState(false);
  const ref = useMemo(() => objectRef('IpAddress', props.ip.id), [props.ip.id]);
  const blocked = chrome.isLocallyLocked(ref);
  const target = useQuery({
    queryKey: ['vps', 'ip-route-target', vps],
    queryFn: async ({ signal }) =>
      (await fetchVps(vps as number, { includes: 'user,node__location__environment', signal })).data,
    enabled: props.open && Boolean(vps),
  });
  const interfaces = useQuery({
    queryKey: ['network_interface', 'ip-route-target', vps],
    queryFn: async () => (await fetchNetworkInterfaces(vps as number, { limit: 100 })).data,
    enabled: props.open && Boolean(vps),
  });
  useEffect(() => {
    if (props.open) return;
    setVps(null);
    setIface('');
    setVia('');
    setWithHost(false);
  }, [props.open]);
  useEffect(() => {
    if (props.open && vps && interfaces.isSuccess && interfaces.data.length === 1 && !iface) {
      setIface(String(interfaces.data[0]?.id));
    }
  }, [props.open, vps, interfaces.isSuccess, interfaces.data, iface]);

  const save = useMutation({
    mutationFn: async (snapshot: RouteTarget) => {
      const [freshIp, freshVps, freshInterfaces] = await Promise.all([
        fetchIpAddress(snapshot.ip, { includes: 'user,network,network_interface' }),
        fetchVps(snapshot.vps, { includes: 'user' }),
        fetchNetworkInterfaces(snapshot.vps, { limit: 100 }),
      ]).catch((error: unknown) => {
        // No mutation has been submitted: a failed preflight read is retryable.
        throw new Error(formatErrorMessage(error, t));
      });
      if (
        freshIp.data?.id !== snapshot.ip ||
        freshIp.data.network_interface ||
        freshIp.data.network?.enabled === false ||
        (freshIp.data.user && freshIp.data.user.id !== snapshot.owner) ||
        freshVps.data?.id !== snapshot.vps ||
        freshVps.data.user?.id !== snapshot.owner ||
        !freshInterfaces.data.some((item) => item.id === snapshot.iface && (!item.vps || item.vps.id === snapshot.vps))
      ) {
        throw new Error(t('admin.ip.route.target_changed'));
      }
      return snapshot.withHost
        ? assignIpAddressRouteWithHostAddress(snapshot.ip, { network_interface: snapshot.iface })
        : assignIpAddressRoute(snapshot.ip, { network_interface: snapshot.iface, route_via: snapshot.via });
    },
    onMutate: async (snapshot) => {
      const lockRef = objectRef('IpAddress', snapshot.ip);
      const generation = await chrome.acquireLocalLock(lockRef, { durable: true });
      return { lockRef, generation };
    },
    onSuccess: async (result, snapshot, context) => {
      const state = getMetaActionStateId(result.meta);
      if (state !== undefined && context)
        chrome.trackActionState(state, {
          actionLabel: t('admin.ip.route.assign'),
          objectLabel: `#${snapshot.ip}`,
          object: context.lockRef,
          mutationGeneration: context.generation,
        });
      props.onClose();
      await props.onAssigned();
      pushToast({ variant: 'ok', title: t('admin.ip.route.toast.assigned') });
    },
    onSettled: (_result, error, _variables, context) => {
      if (context) chrome.settleLocalLock(context.lockRef, error, context.generation);
    },
  });

  const owner = normalizeObjectId(target.data?.user?.id);
  const wrongOwner = props.ip.user && owner && props.ip.user.id !== owner;
  const ready = Boolean(
    vps &&
    target.data?.id === vps &&
    owner &&
    !target.isFetching &&
    !target.isError &&
    !interfaces.isFetching &&
    !interfaces.isError &&
    interfaces.data?.some((item) => item.id === normalizeObjectId(iface)) &&
    !wrongOwner
  );
  const close = () => {
    if (!save.isPending) {
      save.reset();
      props.onClose();
    }
  };
  const submit = () => {
    const interfaceId = normalizeObjectId(iface);
    const routeVia = via.trim() ? normalizeObjectId(via) : null;
    if (!ready || !vps || !owner || !interfaceId || (via.trim() && !routeVia) || blocked) return;
    save.mutate({ ip: props.ip.id, vps, iface: interfaceId, owner, via: routeVia, withHost });
  };
  const env = target.data?.node?.location?.['environment'];
  const environmentLabel =
    env && typeof env === 'object' && 'label' in env && typeof env.label === 'string' ? env.label : t('common.na');

  return (
    <Modal
      open={props.open}
      title={t('admin.ip.route.assign_title')}
      onClose={close}
      testId="admin.ip.route.dialog"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={save.isPending}>
            {t('common.cancel')}
          </Button>
          <ActionButton
            testId="admin.ip.route.submit"
            loading={save.isPending}
            disabled={!ready || blocked || (Boolean(via.trim()) && !normalizeObjectId(via))}
            onClick={submit}
          >
            {t('admin.ip.route.assign')}
          </ActionButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="font-mono text-sm">
          {props.ip.addr}/{props.ip.prefix}
        </div>
        <div className="text-sm text-muted">{t('admin.ip.route.intro')}</div>
        <label className="block">
          <div className="mb-1 text-sm font-medium">{t('admin.ip.route.vps')}</div>
          <VpsLookupInput
            value={vps}
            testId="admin.ip.route.vps"
            ariaLabel={t('admin.ip.route.vps')}
            disabled={save.isPending || blocked}
            placeholder={t('admin.ip.route.vps.placeholder')}
            onChange={(id) => {
              setVps(id);
              setIface('');
              setVia('');
            }}
          />
        </label>
        {target.data?.id === vps ? (
          <div className="rounded-md border border-border bg-surface-2 p-3 text-sm" data-testid="admin.ip.route.target">
            <div className="font-medium">
              {t('object_kind.vps')} #{target.data.id} · {target.data.hostname}
            </div>
            <div>
              {t('admin.ip.owner.user')}: {target.data.user?.login ?? t('common.na')} {owner ? `(#${owner})` : ''}
            </div>
            <div>
              {t('admin.ip.owner.environment')}: {environmentLabel}
            </div>
          </div>
        ) : null}
        {target.error || interfaces.error ? (
          <Alert variant="danger" title={t('admin.ip.route.target_error')}>
            {formatErrorMessage(target.error ?? interfaces.error, t)}
          </Alert>
        ) : null}
        {wrongOwner ? <Alert variant="danger" title={t('admin.ip.route.owner_mismatch')} /> : null}
        <label className="block">
          <div className="mb-1 text-sm font-medium">{t('admin.ip.route.interface')}</div>
          <Select
            value={iface}
            testId="admin.ip.route.interface"
            onChange={(event) => setIface(event.target.value)}
            disabled={!vps || interfaces.isFetching || save.isPending || blocked}
            options={[
              { value: '', label: t('admin.ip.route.interface.placeholder') },
              ...(interfaces.data ?? []).map((item) => ({
                value: String(item.id),
                label: `${item.name} (#${item.id})`,
              })),
            ]}
          />
        </label>
        {!withHost ? (
          <label className="block">
            <div className="mb-1 text-sm font-medium">{t('admin.ip.route.route_via')}</div>
            <Input
              value={via}
              onChange={(event) => setVia(event.target.value)}
              disabled={save.isPending || blocked}
              placeholder={t('admin.ip.route.route_via.placeholder')}
              testId="admin.ip.route.via"
            />
          </label>
        ) : null}
        <label htmlFor={withHostId} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            id={withHostId}
            checked={withHost}
            disabled={save.isPending || blocked}
            className="mt-1 h-4 w-4"
            onChange={(event) => {
              setWithHost(event.target.checked);
              if (event.target.checked) setVia('');
            }}
          />
          <span className="font-medium">
            {t('admin.ip.route.with_host')}
            <span className="block text-xs font-normal text-muted">{t('admin.ip.route.with_host_help')}</span>
          </span>
        </label>
        {save.error ? (
          <Alert variant="danger" title={t('admin.ip.action_error')} testId="admin.ip.route.error">
            {formatErrorMessage(save.error, t)}
          </Alert>
        ) : null}
      </div>
    </Modal>
  );
}
