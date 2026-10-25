import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigationType, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../../app/auth';
import { useAppMode } from '../../../app/appMode';
import { useI18n } from '../../../app/i18n';
import { useObjectScope } from '../../../app/objectScope';
import { ListShell } from '../../../components/layout/ListShell';
import { MutationUncertaintyPanel, type MutationReconcileResult } from '../../../components/layout/MutationUncertaintyPanel';
import { PageHeader } from '../../../components/layout/PageHeader';
import { useChrome } from '../../../components/layout/ChromeContext';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { LoadingState } from '../../../components/ui/LoadingState';
import { Select } from '../../../components/ui/Select';
import { UserNetworkAddressActions } from './UserNetworkAddressActions';
import { NetworkTabButton } from './NetworkTabButton';
import { UserNetworkAddresses } from './UserNetworkAddresses';
import { fetchAssignedIpAddresses, ipVpsId } from './UserNetworkAddressesModel';
import type { ResourceRef } from '../../../lib/api/appTypes';
import { fetchIpAddress, fetchIpAddresses, type IpAddress } from '../../../lib/api/ipAddresses';
import { fetchVpsList } from '../../../lib/api/vps';
import { reconcileIpAddressMutation } from '../../../lib/ipAddressMutationIntent';
import type { LocalLock } from '../../../lib/localLocks';
import { AssignIpAddressModal } from './AssignIpAddressModal';
import {
  assignableIpKind,
  isAssignedIp,
  isOwnedByUser,
  resourceId,
  type AssignableIpKind,
  uniqueIpAddresses,
} from './IpAddressAssignmentModel';
import { UserNetworkTrafficCard } from './UserNetworkTrafficCard';
import { UserNetworkLiveCard } from './UserNetworkLiveCard';

type KindFilter = 'all' | AssignableIpKind;
const NETWORK_TABS = ['addresses', 'traffic', 'live'] as const;
const HISTORY_FOCUS_GRACE_MS = 250;
type NetworkTab = (typeof NETWORK_TABS)[number];

function networkTabId(tab: NetworkTab): string {
  return `network-user-tab-${tab}`;
}

function networkPanelId(tab: NetworkTab): string {
  return `network-user-panel-${tab}`;
}

export function UserNetworkPage() {
  const auth = useAuth();
  const { basePath } = useAppMode();
  const { t } = useI18n();
  const chrome = useChrome();
  const scope = useObjectScope();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = resourceId(auth.user?.id as number | string | undefined);
  const scopedUserId = scope.mineUserId;
  const requestedTab = searchParams.get('tab');
  const activeTab: NetworkTab = requestedTab === 'traffic' || requestedTab === 'live'
    ? requestedTab
    : 'addresses';
  const currentSearch = searchParams.toString();
  const latestSearchRef = useRef(currentSearch);
  const pageRootRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLDivElement>(null);
  const previousActiveTabRef = useRef(activeTab);
  const recentPageFocusRef = useRef(false);
  const restoreFocusAfterHistoryRef = useRef(false);
  const pageFocusInvalidatedRef = useRef(false);
  const recentFocusResetTimerRef = useRef<number | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [assignOpen, setAssignOpen] = useState(false);
  const [initialIp, setInitialIp] = useState<IpAddress | null>(null);

  const vpsesQ = useQuery({
    queryKey: ['vps', 'list', 'user-network', { userId, limit: 250 }],
    queryFn: async () => (
      await fetchVpsList({
        limit: 250,
        user: scopedUserId,
        includes: 'node__location__environment,user',
      })
    ).data,
    enabled: activeTab === 'addresses',
    staleTime: 10_000,
  });

  const assignedQ = useQuery({
    queryKey: ['ip_address_assignment', 'user-network', 'active', { userId, scopedUserId, vpsIds: (vpsesQ.data ?? []).map((vps) => vps.id) }],
    queryFn: () => fetchAssignedIpAddresses(scopedUserId, new Set((vpsesQ.data ?? []).map((vps) => vps.id))),
    enabled: activeTab === 'addresses' && userId !== null && vpsesQ.isSuccess,
    staleTime: 5_000,
  });

  const detachedQ = useQuery({
    queryKey: ['ip_address', 'user-network', 'detached-owned', { userId }],
    queryFn: async () => (
      await fetchIpAddresses({
        limit: 250,
        assignedToInterface: false,
        user: scopedUserId,
        includes: 'network__primary_location__environment,network_interface__vps,user',
      })
    ).data,
    enabled: activeTab === 'addresses' && userId !== null,
    staleTime: 5_000,
  });

  const vpsById = useMemo(() => new Map((vpsesQ.data ?? []).map((vps) => [vps.id, vps])), [vpsesQ.data]);
  const assignedVpsByIpId = useMemo(
    () => new Map((assignedQ.data ?? []).map(({ ip, vpsId }) => [ip.id, vpsId])),
    [assignedQ.data]
  );
  const assignedIpIds = useMemo(
    () => new Set((assignedQ.data ?? []).map(({ ip }) => ip.id)),
    [assignedQ.data]
  );

  const rows = useMemo(() => {
    // Results fetched through a user's VPS are authoritative even when the
    // API omits the nested network_interface.vps relation from the response.
    const assigned = (assignedQ.data ?? [])
      .filter(({ vpsId }) => vpsId === null || vpsById.has(vpsId))
      .map(({ ip }) => ip);
    const detached = (detachedQ.data ?? []).filter((ip) => isOwnedByUser(ip, userId));
    const visible = uniqueIpAddresses([...assigned, ...detached]);
    if (kindFilter === 'all') return visible;
    return visible.filter((ip) => assignableIpKind(ip) === kindFilter);
  }, [assignedQ.data, detachedQ.data, kindFilter, userId, vpsById]);

  const ownedDetachedIps = useMemo(
    () => (detachedQ.data ?? []).filter((ip) => isOwnedByUser(ip, userId)),
    [detachedQ.data, userId]
  );

  const loading = vpsesQ.isLoading || assignedQ.isLoading || (detachedQ.isLoading && rows.length === 0);
  const error = vpsesQ.error ?? assignedQ.error ?? (rows.length === 0 ? detachedQ.error : null);
  const uncertainIpLocks = useMemo(
    () => chrome.localLocks.filter((lock) => lock.kind === 'IpAddress' && lock.uncertain === true),
    [chrome.localLocks]
  );

  const openAssignment = (ip?: IpAddress) => {
    setInitialIp(ip ?? null);
    setAssignOpen(true);
  };

  const selectTab = (tab: NetworkTab) => {
    const next = new URLSearchParams(latestSearchRef.current);
    if (tab === 'addresses') next.delete('tab');
    else next.set('tab', tab);
    const nextSearch = next.toString();
    if (nextSearch === latestSearchRef.current) return;
    latestSearchRef.current = nextSearch;
    setSearchParams(next);
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

    const focusedId = event.target instanceof HTMLElement ? event.target.id : '';
    const focusedIndex = NETWORK_TABS.findIndex((tab) => networkTabId(tab) === focusedId);
    const currentIndex = focusedIndex >= 0 ? focusedIndex : NETWORK_TABS.indexOf(activeTab);
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % NETWORK_TABS.length;
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + NETWORK_TABS.length) % NETWORK_TABS.length;
    }
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = NETWORK_TABS.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTab = NETWORK_TABS[nextIndex];
    if (!nextTab) return;
    selectTab(nextTab);
    document.getElementById(networkTabId(nextTab))?.focus();
  };

  useEffect(() => {
    latestSearchRef.current = currentSearch;
  }, [currentSearch]);

  useEffect(() => {
    const isWithinPage = (target: EventTarget | null) => (
      target instanceof Node
      && Boolean(pageRootRef.current?.contains(target))
    );

    const clearRecentPageFocus = () => {
      recentPageFocusRef.current = false;
      if (recentFocusResetTimerRef.current !== null) {
        window.clearTimeout(recentFocusResetTimerRef.current);
        recentFocusResetTimerRef.current = null;
      }
    };

    const clearPageFocusOwnership = () => {
      clearRecentPageFocus();
      restoreFocusAfterHistoryRef.current = false;
      pageFocusInvalidatedRef.current = true;
    };

    const handleFocusIn = (event: FocusEvent) => {
      clearRecentPageFocus();
      const focusIsWithinPage = isWithinPage(event.target);
      recentPageFocusRef.current = focusIsWithinPage;
      if (focusIsWithinPage) pageFocusInvalidatedRef.current = false;
      else clearPageFocusOwnership();
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isWithinPage(event.target)) return;

      const nextTarget = event.relatedTarget;
      const nextIsDocumentFallback = nextTarget === document.body || nextTarget === document.documentElement;
      if (!document.hasFocus()) {
        clearPageFocusOwnership();
        return;
      }

      if (nextTarget instanceof Node && !nextIsDocumentFallback) {
        clearRecentPageFocus();
        const nextFocusIsWithinPage = isWithinPage(nextTarget);
        recentPageFocusRef.current = nextFocusIsWithinPage;
        if (!nextFocusIsWithinPage) clearPageFocusOwnership();
        return;
      }

      // Chromium can move focus to body immediately before dispatching
      // popstate. Keep that otherwise ownerless blur only briefly;
      // ordinary blur is cleared before a later history traversal can use it.
      if (recentFocusResetTimerRef.current !== null) {
        window.clearTimeout(recentFocusResetTimerRef.current);
      }
      recentFocusResetTimerRef.current = window.setTimeout(
        clearRecentPageFocus,
        HISTORY_FOCUS_GRACE_MS
      );
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isWithinPage(event.target)) clearPageFocusOwnership();
    };

    const captureHistoryFocus = () => {
      restoreFocusAfterHistoryRef.current = Boolean(
        !pageFocusInvalidatedRef.current
        && document.hasFocus()
        && (isWithinPage(document.activeElement) || recentPageFocusRef.current)
      );
      clearRecentPageFocus();
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('blur', clearPageFocusOwnership);
    window.addEventListener('popstate', captureHistoryFocus, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('blur', clearPageFocusOwnership);
      window.removeEventListener('popstate', captureHistoryFocus, true);
      clearRecentPageFocus();
    };
  }, []);

  useEffect(() => {
    const tabChanged = previousActiveTabRef.current !== activeTab;
    previousActiveTabRef.current = activeTab;

    // React Router may commit the URL change from its popstate listener before
    // this page captures focus ownership, so consume the snapshot next task.
    const focusTimer = window.setTimeout(() => {
      const tablist = tablistRef.current;
      const restoreAfterHistory = restoreFocusAfterHistoryRef.current;
      restoreFocusAfterHistoryRef.current = false;
      if (!tabChanged || !document.hasFocus()) return;
      if (!restoreAfterHistory) {
        // A POP may leave focus on the outgoing tab after an outside pointer's
        // default was canceled; only an explicit ownership snapshot may restore it.
        if (navigationType === 'POP') return;
        if (!tablist || !tablist.contains(document.activeElement)) return;
      }
      document.getElementById(networkTabId(activeTab))?.focus();
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [activeTab, currentSearch, navigationType]);

  const refresh = () => {
    void vpsesQ.refetch();
    void assignedQ.refetch();
    void detachedQ.refetch();
  };

  const reconcileUncertainIp = async (lock: LocalLock): Promise<MutationReconcileResult> => {
    try {
      const current = (await fetchIpAddress(lock.id, {
        includes:
          'network__primary_location__environment,network_interface__vps,'
          + 'user,vps,charged_environment',
      })).data;
      await Promise.all([assignedQ.refetch(), detachedQ.refetch(), vpsesQ.refetch()]);
      return reconcileIpAddressMutation(lock, current);
    } catch {
      return 'error';
    }
  };

  const rowActions = (ip: IpAddress) => {
    const vpsId = assignedVpsByIpId.get(ip.id) ?? ipVpsId(ip);
    return (
      <UserNetworkAddressActions ip={ip} assigned={assignedIpIds.has(ip.id) || isAssignedIp(ip)}
        vpsId={vpsId} basePath={basePath} onAssign={openAssignment} />
    );
  };

  return (
    <div ref={pageRootRef}>
      <ListShell
        testId="network.user.page"
        header={
          <PageHeader
            title={t('network.user.title')}
            description={t('network.user.subtitle')}
            testId="network.user.header"
            actions={activeTab === 'addresses' ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={refresh}>{t('common.refresh')}</Button>
                <Button variant="primary" testId="network.user.add" onClick={() => openAssignment()}>
                  {t('network.user.action.add')}
                </Button>
              </div>
            ) : undefined}
          />
        }
        filters={
          <div className="space-y-4">
            <div
              id="network-user-tabs"
              ref={tablistRef}
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label={t('network.user.tabs.aria')}
              data-testid="network.user.tabs"
              onKeyDown={handleTabKeyDown}
            >
              <NetworkTabButton
                active={activeTab === 'addresses'}
                onClick={() => selectTab('addresses')}
                tab="addresses"
                testId="network.user.tab.addresses"
              >
                {t('network.user.tab.addresses')}
              </NetworkTabButton>
              <NetworkTabButton
                active={activeTab === 'traffic'}
                onClick={() => selectTab('traffic')}
                tab="traffic"
                testId="network.user.tab.traffic"
              >
                {t('network.user.tab.traffic')}
              </NetworkTabButton>
              <NetworkTabButton
                active={activeTab === 'live'}
                onClick={() => selectTab('live')}
                tab="live"
                testId="network.user.tab.live"
              >
                {t('network.user.tab.live')}
              </NetworkTabButton>
            </div>

            {activeTab === 'addresses' ? (
              <Card>
                <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,240px)_1fr] sm:items-end">
                  <Select
                    label={t('network.user.filter.kind')}
                    testId="network.user.filter.kind"
                    value={kindFilter}
                    onChange={(event) => setKindFilter(event.target.value as KindFilter)}
                    options={[
                      { value: 'all', label: t('network.user.filter.kind.all') },
                      { value: 'ipv4_public', label: t('network.user.kind.ipv4_public') },
                      { value: 'ipv4_private', label: t('network.user.kind.ipv4_private') },
                      { value: 'ipv6', label: t('network.user.kind.ipv6') },
                    ]}
                  />
                  <div className="text-sm text-muted">{t('network.user.scope_hint')}</div>
                </div>
              </Card>
            ) : null}
          </div>
        }
      >
      <div
        id={networkPanelId('addresses')}
        role="tabpanel"
        aria-labelledby={networkTabId('addresses')}
        hidden={activeTab !== 'addresses'}
        tabIndex={activeTab === 'addresses' ? 0 : -1}
        className="space-y-6"
        data-testid="network.user.panel.addresses"
      >
        {uncertainIpLocks.length > 0 ? (
          <div className="space-y-3" data-testid="network.user.assignment_uncertainties">
            {uncertainIpLocks.map((lock) => (
              <MutationUncertaintyPanel
                key={lock.uncertaintyId ?? lock.key}
                object={{ kind: 'IpAddress', id: lock.id }}
                lock={lock}
                reconcile={() => reconcileUncertainIp(lock)}
                testIdPrefix={`network.user.assign.uncertain.${lock.id}`}
              />
            ))}
          </div>
        ) : null}

        {loading ? (
          <LoadingState testId="network.user.loading" />
        ) : error ? (
          <ErrorState error={error} testId="network.user.error" onRetry={refresh} />
        ) : rows.length === 0 ? (
          <EmptyState
            testId="network.user.empty"
            title={kindFilter === 'all' ? t('network.user.empty') : t('network.user.empty_filtered')}
            body={t('network.user.empty_body')}
            actionLabel={t('network.user.action.add')}
            onAction={() => openAssignment()}
          />
        ) : (
          <UserNetworkAddresses rows={rows} vpsById={vpsById} assignedVpsByIpId={assignedVpsByIpId}
            assignedIpIds={assignedIpIds} userId={userId} basePath={basePath} rowActions={rowActions} />
        )}

        {activeTab === 'addresses' ? (
          <AssignIpAddressModal
            open={assignOpen}
            availableVpses={vpsesQ.data ?? []}
            initialIp={initialIp}
            ownedDetachedIps={ownedDetachedIps}
            onClose={() => {
              setAssignOpen(false);
              setInitialIp(null);
            }}
            onAssigned={refresh}
          />
        ) : null}
      </div>

      <div
        id={networkPanelId('traffic')}
        role="tabpanel"
        aria-labelledby={networkTabId('traffic')}
        hidden={activeTab !== 'traffic'}
        tabIndex={activeTab === 'traffic' ? 0 : -1}
        data-testid="network.user.panel.traffic"
      >
        {activeTab === 'traffic' ? (
          <UserNetworkTrafficCard userId={userId} isAdmin={scopedUserId !== undefined} />
        ) : null}
      </div>

      <div
        id={networkPanelId('live')}
        role="tabpanel"
        aria-labelledby={networkTabId('live')}
        hidden={activeTab !== 'live'}
        tabIndex={activeTab === 'live' ? 0 : -1}
        data-testid="network.user.panel.live"
      >
        {activeTab === 'live' ? (
          <UserNetworkLiveCard userId={userId} isAdmin={scopedUserId !== undefined} />
        ) : null}
      </div>
      </ListShell>
    </div>
  );
}
