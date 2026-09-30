import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, RotateCw, Square } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActionState } from '../../../lib/api/actionStates';
import { fetchIpAddressesForVps } from '../../../lib/api/ipAddresses';
import { fetchTransactionChains } from '../../../lib/api/transactions';
import { fetchVps, vpsPasswd, vpsRestart, vpsStart, vpsStop } from '../../../lib/api/vps';
import { getMetaActionStateId, isMissingActionStateError } from '../../../lib/api/haveapi';
import { useAppMode } from '../../../app/appMode';
import { useAuth } from '../../../app/auth';
import { useObjectScope } from '../../../app/objectScope';
import { useI18n } from '../../../app/i18n';
import { useChrome } from '../../../components/layout/ChromeContext';
import { DetailShell } from '../../../components/layout/DetailShell';
import { MutationUncertaintyPanel, type MutationReconcileResult } from '../../../components/layout/MutationUncertaintyPanel';
import { objectRef } from '../../../lib/objectRef';
import { Badge } from '../../../components/ui/Badge';
import { LockBadge } from '../../../components/ui/LockBadge';
import { ObjectHeader } from '../../../components/ui/ObjectHeader';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Button } from '../../../components/ui/Button';
import { LinkButton } from '../../../components/ui/LinkButton';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { CopyButton } from '../../../components/ui/CopyButton';
import { LockStateStaleAlert } from '../../../components/ui/LockStateStaleAlert';
import { gateVpsAction } from '../../../lib/gates/vps';
import { objectStateBadge, runtimeStateBadge } from '../../../lib/taskStatus';
import { VpsContextProvider } from './VpsContext';
import { preflightVpsNotBusy } from './vpsPreflight';
import { ScopeMismatchCard } from '../../../components/layout/ScopeMismatchCard';
import { useFastPollIntervalMs, useTierAIntervalMs, useTierBIntervalMs } from '../../../lib/refreshTiers';
import { useNetworkStatus } from '../../../lib/useNetworkStatus';
import { deriveChainLockState } from '../../../lib/lockState';
import { isRemoteConsoleAvailable, ownerLabel, primarySshIpAddress } from './VpsOverviewModel';
import { freezeVpsMutationSnapshot, type VpsMutationSnapshot } from './VpsMutationSnapshot';
import { useVpsCreationProgress } from './useVpsCreationProgress';
import { VpsCreationProgress } from './VpsCreationProgress';
import { VpsActionsMenu, VpsTabsNav } from './VpsNavigation';
import { VpsHeaderRuntime } from './VpsHeaderRuntime';
import { VpsHeaderActionDialogs, type VpsHeaderConfirm } from './VpsHeaderActionDialogs';
export function VpsLayout() {
  const { basePath, mode } = useAppMode();
  const auth = useAuth();
  const canMutateVps = mode !== 'admin' || auth.role === 'admin';
  const scope = useObjectScope();
  const chrome = useChrome();
  const qc = useQueryClient();
  const { t } = useI18n();
  const online = useNetworkStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const vpsId = Number(params['vpsId']);
  const requestedListUserId = useMemo(() => {
    if (mode !== 'admin') return undefined;
    const raw = new URLSearchParams(location.search).get('user');
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  }, [location.search, mode]);
  const listContextRef = useRef<{ vpsId: number; userId?: number }>({ vpsId, userId: requestedListUserId });
  if (listContextRef.current.vpsId !== vpsId) {
    listContextRef.current = { vpsId, userId: requestedListUserId };
  } else if (requestedListUserId !== undefined) {
    listContextRef.current.userId = requestedListUserId;
  }
  const listContextUserId = mode === 'admin' ? listContextRef.current.userId : undefined;
  const listContextSearch = listContextUserId === undefined ? '' : `?user=${encodeURIComponent(String(listContextUserId))}`;
  const vpsListHref = `${basePath}/vps${listContextSearch}`;

  useEffect(() => {
    if (listContextUserId === undefined || requestedListUserId !== undefined) return;
    navigate(
      { pathname: location.pathname, search: listContextSearch, hash: location.hash },
      { replace: true, state: location.state },
    );
  }, [listContextSearch, listContextUserId, location.hash, location.pathname, location.state, navigate, requestedListUserId]);
  const vpsRef = useMemo(() => {
    if (!Number.isFinite(vpsId) || vpsId <= 0) return null;
    return objectRef('Vps', vpsId);
  }, [vpsId]);

  const tierARefetchMs = useTierAIntervalMs();
  const tierBRefetchMs = useTierBIntervalMs();
  const fastPollMs = useFastPollIntervalMs();
  const vpsLocallyLocked = vpsRef ? chrome.isLocallyLocked(vpsRef) : false;

  const creation = useVpsCreationProgress(vpsId, location.state, chrome.trackedActionStates, fastPollMs);
  const creationStatus = <VpsCreationProgress id={creation.id} state={creation.query.data}
    failedToLoad={creation.query.isError} onRetry={() => void creation.query.refetch()} />;

  const vpsQ = useQuery({
    queryKey: ['vps', 'show', { id: vpsId }],
    queryFn: async () => (await fetchVps(vpsId, { includes: 'node__location__environment,user,dns_resolver,user_namespace_map,os_template,dataset' })).data,
    enabled: Number.isFinite(vpsId) && vpsId > 0,
    refetchInterval: (query) => {
      const data = query.state.data as { is_running?: boolean } | undefined;
      return creation.pending || (creation.id !== undefined && typeof data?.is_running !== 'boolean')
        ? fastPollMs
        : vpsLocallyLocked
          ? tierARefetchMs
          : tierBRefetchMs;
    },
  });

  const ipsQ = useQuery({
    queryKey: ['ip_address', 'list', { vpsId, limit: 250 }],
    queryFn: async () => (await fetchIpAddressesForVps(vpsId, { limit: 250 })).data,
    enabled: Number.isFinite(vpsId) && vpsId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const chainsQ = useQuery({
    queryKey: ['transaction_chain', 'list', { className: 'Vps', rowId: vpsId, limit: 10 }],
    queryFn: async () => (await fetchTransactionChains({ className: 'Vps', rowId: vpsId, limit: 10 })).data,
    enabled: Number.isFinite(vpsId) && vpsId > 0,
    refetchInterval: tierARefetchMs,
  });

  const [confirm, setConfirm] = useState<VpsHeaderConfirm>(null);
  const [lastAction, setLastAction] = useState<
    | null
    | {
        id: number;
        actionLabelKey?: string;
        actionLabel?: string;
        objectLabel?: string;
      }
  >(null);
  const acquireMutationContext = async (variables: { vpsId: number }) => {
    const lockRef = objectRef('Vps', variables.vpsId); return { lockRef, mutationGeneration: await chrome.acquireLocalLock(lockRef, { durable: true }) };
  };

  const startM = useMutation({
    mutationFn: async (variables: VpsMutationSnapshot) => {
      if (!variables.canMutate) throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: variables.vpsId, t, knownBusy: variables.knownBusy });
      return vpsStart(variables.vpsId);
    },
    onMutate: acquireMutationContext,
    onError: (err: any) => {
      if (err?.code === 'BUSY') {
        chrome.openTasks();
      }
    },
    onSettled: (_data, error, _variables, context) => context && chrome.settleLocalLock(context.lockRef, error, context.mutationGeneration),
    onSuccess: (res, variables, context) => {
      const asId = getMetaActionStateId(res.meta);
      if (asId !== undefined) {
        const objectLabel = variables.objectLabel;
        chrome.trackActionState(asId, {
          actionLabelKey: 'action.vps.start.label',
          objectLabel,
          object: context?.lockRef,
          mutationGeneration: context?.mutationGeneration,
          blockUi: true,
          progressTitleKey: 'modal.vps.start.title',
        });
        setLastAction({ actionLabelKey: 'action.vps.start.label', objectLabel, id: asId });
      }
      void Promise.all([qc.invalidateQueries({ queryKey: ['vps', 'show', { id: variables.vpsId }] }), qc.invalidateQueries({ queryKey: ['transaction_chain', 'list', { className: 'Vps', rowId: variables.vpsId }] })]);
    },
  });

  const stopM = useMutation({
    mutationFn: async (variables: VpsMutationSnapshot & { force: boolean }) => {
      if (!variables.canMutate) throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: variables.vpsId, t, knownBusy: variables.knownBusy });
      return vpsStop(variables.vpsId, { force: variables.force });
    },
    onMutate: acquireMutationContext,
    onError: (err: any) => {
      if (err?.code === 'BUSY') {
        chrome.openTasks();
      }
    },
    onSettled: (_data, error, _variables, context) => context && chrome.settleLocalLock(context.lockRef, error, context.mutationGeneration),
    onSuccess: (res, variables, context) => {
      if (variables.vpsId === vpsId) {
        setConfirm((current) => current?.kind === 'stop' ? null : current);
      }
      const asId = getMetaActionStateId(res.meta);
      if (asId !== undefined) {
        const objectLabel = variables.objectLabel;
        const actionLabelKey = variables.force ? 'action.vps.poweroff.label' : 'action.vps.stop.label';
        chrome.trackActionState(asId, {
          actionLabelKey,
          objectLabel,
          object: context?.lockRef,
          mutationGeneration: context?.mutationGeneration,
          blockUi: true,
          progressTitleKey: variables.force ? 'modal.vps.poweroff.title' : 'modal.vps.stop.title',
        });
        setLastAction({ actionLabelKey, objectLabel, id: asId });
      }
      void Promise.all([qc.invalidateQueries({ queryKey: ['vps', 'show', { id: variables.vpsId }] }), qc.invalidateQueries({ queryKey: ['transaction_chain', 'list', { className: 'Vps', rowId: variables.vpsId }] })]);
    },
  });
  const restartM = useMutation({
    mutationFn: async (variables: VpsMutationSnapshot & { force: boolean }) => {
      if (!variables.canMutate) throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: variables.vpsId, t, knownBusy: variables.knownBusy });
      return vpsRestart(variables.vpsId, { force: variables.force });
    },
    onMutate: acquireMutationContext,
    onError: (err: any) => {
      if (err?.code === 'BUSY') {
        chrome.openTasks();
      }
    },
    onSettled: (_data, error, _variables, context) => context && chrome.settleLocalLock(context.lockRef, error, context.mutationGeneration),
    onSuccess: (res, variables, context) => {
      if (variables.vpsId === vpsId) {
        setConfirm((current) => current?.kind === 'restart' ? null : current);
      }
      const asId = getMetaActionStateId(res.meta);
      if (asId !== undefined) {
        const objectLabel = variables.objectLabel;
        chrome.trackActionState(asId, {
          actionLabelKey: 'action.vps.restart.label',
          objectLabel,
          object: context?.lockRef,
          mutationGeneration: context?.mutationGeneration,
          blockUi: true,
          progressTitleKey: 'modal.vps.restart.title',
        });
        setLastAction({ actionLabelKey: 'action.vps.restart.label', objectLabel, id: asId });
      }
      void Promise.all([qc.invalidateQueries({ queryKey: ['vps', 'show', { id: variables.vpsId }] }), qc.invalidateQueries({ queryKey: ['transaction_chain', 'list', { className: 'Vps', rowId: variables.vpsId }] })]);
    },
  });

  const [passwdFlow, setPasswdFlow] = useState<{ vpsId: number; password: string; asId: number } | null>(null);
  const [passwdWaitOpen, setPasswdWaitOpen] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<{ vpsId: number; password: string } | null>(null);
  const [passwdAsyncError, setPasswdAsyncError] = useState<{ vpsId: number; asId: number } | null>(null);
  const passwdM = useMutation({
    mutationFn: async (variables: VpsMutationSnapshot & { type: 'secure' | 'simple' }) => {
      if (!variables.canMutate) throw new Error(t('gate.blocked.permission.body'));
      await preflightVpsNotBusy({ vpsId: variables.vpsId, t, knownBusy: variables.knownBusy });
      return vpsPasswd(variables.vpsId, variables.type);
    },
    onMutate: acquireMutationContext,
    onSuccess: (res, variables, context) => {
      if (variables.vpsId === vpsId) {
        setConfirm((current) => current?.kind === 'passwd' ? null : current);
      }
      const asId = getMetaActionStateId(res.meta);
      if (asId === undefined) return;
      const objectLabel = variables.objectLabel;
      chrome.trackActionState(asId, {
        actionLabelKey: 'action.vps.root_password.label',
        objectLabel,
        object: context?.lockRef,
        mutationGeneration: context?.mutationGeneration,
      });
      setLastAction({ actionLabelKey: 'action.vps.root_password.label', objectLabel, id: asId });
      const password = String((res.data as any)?.password ?? '');
      if (variables.vpsId === vpsId && password) {
        setPasswdFlow({ vpsId: variables.vpsId, password, asId });
        setPasswdWaitOpen(true);
      }
    },
    onError: (err: any) => {
      if (err?.code === 'BUSY') {
        chrome.openTasks();
      }
    },
    onSettled: (_data, error, _variables, context) => context && chrome.settleLocalLock(context.lockRef, error, context.mutationGeneration),
  });

  const currentPasswdFlow = passwdFlow?.vpsId === vpsId ? passwdFlow : null;
  const currentRevealedPassword = revealedPassword?.vpsId === vpsId ? revealedPassword.password : null;
  const currentPasswdAsyncError = passwdAsyncError?.vpsId === vpsId ? passwdAsyncError : null;
  const passwdStateQ = useQuery({
    queryKey: ['action_state', 'show', { id: currentPasswdFlow?.asId ?? -1 }],
    queryFn: async () => (await fetchActionState(currentPasswdFlow!.asId)).data,
    enabled: currentPasswdFlow !== null,
    refetchInterval: (data) => {
      if (!data) return fastPollMs;
      return (data as any)?.finished ? false : fastPollMs;
    },
  });

  useEffect(() => {
    if (!currentPasswdFlow) return;
    if (!passwdStateQ.data) return;
    if (!passwdStateQ.data.finished) return;

    if (passwdStateQ.data.status === false) {
      setPasswdAsyncError({ vpsId: currentPasswdFlow.vpsId, asId: currentPasswdFlow.asId });
    } else {
      setRevealedPassword({ vpsId: currentPasswdFlow.vpsId, password: currentPasswdFlow.password });
    }

    setPasswdFlow(null);
    setPasswdWaitOpen(false);
    void vpsQ.refetch();
    void chainsQ.refetch();
  }, [currentPasswdFlow, passwdStateQ.data]);

  if (!vpsQ.data && creation.pending) return (
    <DetailShell>
      <h1 className="text-xl font-semibold">{t('common.vps_ref', { id: vpsId })}</h1>
      {creationStatus}
      <LinkButton to={vpsListHref}>{t('common.back_to_list')}</LinkButton>
    </DetailShell>
  );
  if (vpsQ.isLoading) return <DetailShell>{creationStatus}<LoadingState testId="vps.detail.loading" /></DetailShell>;

  if (vpsQ.isError) {
    return (
      <DetailShell>{creationStatus}<ErrorState
        testId="vps.detail.error"
        title={t('vps.layout.load_error.title')}
        error={vpsQ.error}
        onRetry={() => void vpsQ.refetch()}
        backTo={vpsListHref}
        detailsExtra={{ page: 'vps.detail', vpsId, scope: scope.scope }}
      /></DetailShell>
    );
  }

  const vps = vpsQ.data;
  if (!vps) {
    return (
      <DetailShell>{creationStatus}<ErrorState
        testId="vps.detail.not_found"
        kindOverride="not_found"
        title={t('vps.layout.not_found.title')}
        body={t('vps.layout.not_found.body')}
        onRetry={() => void vpsQ.refetch()}
        backTo={vpsListHref}
        showStatusLink={false}
        showDetails={false}
        detailsExtra={{ page: 'vps.detail', vpsId, scope: scope.scope }}
      /></DetailShell>
    );
  }

  // Admin/support "My view": prevent managing someone else's objects while still allowing
  // a quick jump to the admin view when needed.
  const ownerId =
    typeof (vps as any).user === 'object' && (vps as any).user !== null && typeof (vps as any).user.id === 'number'
      ? Number((vps as any).user.id)
      : undefined;

  if (
    scope.mineUserId !== undefined &&
    ownerId !== undefined &&
    Number.isFinite(scope.mineUserId) &&
    ownerId !== scope.mineUserId
  ) {
    const adminHref = location.pathname.replace(/^\/app\b/, '/admin') + location.search + location.hash;
    return (
      <ScopeMismatchCard
        objectKind={t('object_kind.vps')}
        objectLabel={String((vps as any).hostname ?? '')}
        ownerUserId={ownerId}
        adminHref={adminHref}
        backHref={vpsListHref}
        testId="vps.scope-mismatch"
      />
    );
  }

  const locationLabel = (vps as any).node?.location?.label ?? t('common.na');
  const nodeLabel = (vps as any).node?.domain_name ?? (vps as any).node?.name ?? t('common.na');
  const ownerName = ownerLabel(vps);

  const sshIp = primarySshIpAddress(ipsQ.data);
  const sshCommand = sshIp ? `ssh root@${sshIp}` : null;

  const chainLock = deriveChainLockState({
    chains: chainsQ.data,
    updatedAt: chainsQ.dataUpdatedAt,
    unreliable: !online || chainsQ.isError,
  });

  const busyTransaction = chainLock.busy;
  const activeChainIds = chainLock.activeChainIds;
  const chainsStale = chainLock.stale;

  const busyLocalLock = creation.pending || (vpsRef ? chrome.isLocallyLocked(vpsRef) : false);
  const uncertainLocalLock = vpsRef
    ? chrome.localLocks.find((lock) => lock.kind === vpsRef.kind && lock.id === vpsRef.id && lock.uncertain === true)
    : undefined;
  const currentPasswdMutationPending = passwdM.isPending && passwdM.variables?.vpsId === vpsId;
  const currentPasswdMutationError = passwdM.isError && passwdM.variables?.vpsId === vpsId ? passwdM.error : null;
  const pageMutationError = startM.isError
    ? startM.error
    : stopM.isError && confirm?.kind !== 'stop'
      ? stopM.error
      : restartM.isError && confirm?.kind !== 'restart'
        ? restartM.error
        : currentPasswdMutationError && confirm?.kind !== 'passwd'
          ? currentPasswdMutationError
          : null;
  const busyLocal = busyLocalLock || startM.isPending || stopM.isPending || restartM.isPending || currentPasswdMutationPending;

  const startGate = gateVpsAction('start', { vps, busyLocal, busyTransaction });
  const stopGate = gateVpsAction('stop', { vps, busyLocal, busyTransaction });
  const restartGate = gateVpsAction('restart', { vps, busyLocal, busyTransaction });
  const passwdGate = gateVpsAction('passwd', { vps, busyLocal, busyTransaction });
  const snapshotPowerVariables = (): VpsMutationSnapshot => freezeVpsMutationSnapshot({
    vpsId, canMutate: canMutateVps, knownBusy: busyTransaction || busyLocalLock, objectLabel: vps.hostname ? String(vps.hostname) : t('common.vps_ref', { id: vpsId }),
  });

  const rt = runtimeStateBadge(vps.is_running, t);
  const lc = objectStateBadge(vps.object_state, t);

  const showAsyncError = currentPasswdAsyncError !== null;
  const primaryHeaderAction = canMutateVps && vps.is_running !== true
    ? 'start'
    : vps.is_running === true && isRemoteConsoleAvailable(vps)
      ? 'console'
      : 'access';

  const handleHeaderMoreAction = (value: string) => {
    if (!value) return;

    switch (value) {
      case 'action:root_password':
        if (passwdGate.allowed) {
          passwdM.reset();
          setConfirm({ kind: 'passwd', type: 'secure' });
        }
        return;
      case 'tasks':
        chrome.openTasks();
        return;
      default:
        navigate(value);
    }
  };

  const reconcileUncertainOutcome = async (): Promise<MutationReconcileResult> => {
    const [freshVps, freshChains] = await Promise.all([vpsQ.refetch(), chainsQ.refetch()]);
    if (freshVps.isError || freshChains.isError || !freshVps.data || !freshChains.data) {
      return 'error';
    }
    const reconciledLock = deriveChainLockState({
      chains: freshChains.data,
      updatedAt: Date.now(),
      unreliable: !online,
    });
    return reconciledLock.busy ? 'busy' : 'clear';
  };

  return (
    <VpsContextProvider
      value={{
        vps,
        canMutateVps,
        refetch: () => void vpsQ.refetch(),
        refetchChains: () => void chainsQ.refetch(),
        vpsRef: vpsRef ?? objectRef('Vps', vpsId),
        busyTransaction,
        chainsStale,
        busyLocalLock,
        activeChainIds,
        transactionChains: chainsQ.data ?? [],
        transactionChainsLoading: chainsQ.isLoading,
        transactionChainsError: chainsQ.isError,
        ipAddresses: ipsQ.data ?? [],
        ipAddressesLoading: ipsQ.isLoading,
        ipAddressesError: ipsQ.isError,
        sshCommand,
        detailContextSearch: listContextSearch,
      }}
    >
