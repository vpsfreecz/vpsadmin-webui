import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../app/auth';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { useChrome } from '../../../../components/layout/ChromeContext';
import type { LocalMutationGeneration } from '../../../../lib/localLocks';
import { objectRef } from '../../../../lib/objectRef';
import { Alert } from '../../../../components/ui/Alert';
import { Button } from '../../../../components/ui/Button';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { Input } from '../../../../components/ui/Input';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { fetchNode, fetchNodeMaintenanceCapability, setNodeMaintenance } from '../../../../lib/api/nodes';
import { isAmbiguousMutationError } from '../../../../lib/api/haveapi';
import { formatErrorMessage } from '../../../../lib/errors';
import { reconcileMaintenanceAttempt, type MaintenanceState } from '../cluster/MaintenanceControl';
import { preflightNodeNotBusy } from '../adminPreflight';

type Target = { id: number; name: string };
type Attempt = { lock: boolean; reason?: string; previousState: MaintenanceState; previousReason?: string };
const Maintenance = createContext<((target: Target) => void) | null>(null);
export function useNodesMaintenance() {
  return useContext(Maintenance);
}

async function readNode(id: number) {
  const node = (await fetchNode(id)).data;
  if (node.id !== id || !['no', 'lock', 'master_lock'].includes(String(node.maintenance_lock))) {
    throw new TypeError('Invalid node maintenance response');
  }
  return node;
}

export function NodesMaintenanceProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [target, setTarget] = useState<Target | null>(null);
  return (
    <Maintenance.Provider value={auth.role === 'admin' ? setTarget : null}>
      {children}
      {target && auth.role === 'admin' ? (
        <NodeMaintenanceDialog key={target.id} target={target} onClose={() => setTarget(null)} />
      ) : null}
    </Maintenance.Provider>
  );
}

function NodeMaintenanceDialog({ target, onClose }: { target: Target; onClose: () => void }) {
  const { t } = useI18n();
  const { pushToast } = useToasts();
  const client = useQueryClient();
  const chrome = useChrome();
  const nodeRef = objectRef('Node', target.id);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const guardKey = ['nodes', 'maintenance-verification', target.id];
  const guard = useQuery<(Attempt & { generation?: LocalMutationGeneration }) | null>({
    queryKey: guardKey,
    queryFn: async () => null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
    gcTime: Infinity,
    structuralSharing: false,
  });
  const nodeQ = useQuery({
    queryKey: ['nodes', 'maintenance-preview', target.id],
    queryFn: async () => {
      await fetchNodeMaintenanceCapability(target.id);
      return readNode(target.id);
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const node = nodeQ.data;
  const inherited = node?.maintenance_lock === 'master_lock';
  const unlock = node?.maintenance_lock === 'lock';
  const refresh = async () => {
    await client.cancelQueries({ queryKey: ['nodes', 'overview'] });
    await client.invalidateQueries({ queryKey: ['nodes'] });
  };
  const mutation = useMutation({
    retry: false,
    onMutate: async (attempt: Attempt & { nodeId: number }) => ({
      generation: await chrome.acquireLocalLock(objectRef('Node', attempt.nodeId), { durable: true }),
    }),
    mutationFn: async (attempt: Attempt & { nodeId: number }) => {
      // Recheck the exact node and permission after confirmation. A stale list
      // must never remove a lock installed by another administrator meanwhile.
      await fetchNodeMaintenanceCapability(attempt.nodeId);
      const fresh = await readNode(attempt.nodeId);
      if (
        fresh.maintenance_lock !== attempt.previousState ||
        (fresh.maintenance_lock_reason ?? '') !== (attempt.previousReason ?? '')
      ) {
        await nodeQ.refetch();
        throw new Error(t('admin.nodes.maintenance.changed'));
      }
      await preflightNodeNotBusy({ nodeId: attempt.nodeId, t });
      let accepted = false;
      try {
        await setNodeMaintenance(attempt.nodeId, { lock: attempt.lock, reason: attempt.reason });
        accepted = true;
        const latest = await readNode(attempt.nodeId);
        if (
          reconcileMaintenanceAttempt(attempt, {
            value: latest.maintenance_lock,
            reason: latest.maintenance_lock_reason,
          }) !== 'applied'
        ) {
          throw new Error(t('admin.nodes.maintenance.unverified'));
        }
      } catch (failure) {
        if (!accepted && !isAmbiguousMutationError(failure)) throw failure;
        // Persist uncertain outcomes across closing/reopening and pagination.
        client.setQueryData(guardKey, attempt);
        try {
          const latest = await readNode(attempt.nodeId);
          const outcome = reconcileMaintenanceAttempt(attempt, {
            value: latest.maintenance_lock,
            reason: latest.maintenance_lock_reason,
          });
          if (outcome === 'applied') {
            client.setQueryData(guardKey, null);
            return;
          }
          if (outcome === 'not_applied' && !accepted) {
            client.setQueryData(guardKey, null);
            // The read verified that this synchronous mutation was not applied.
            failure = new Error(formatErrorMessage(failure));
          }
        } catch {
          /* The verification guard stays active until a successful read. */
        }
        throw failure;
      }
    },
    onSuccess: async (_data, attempt) => {
      await refresh();
      pushToast({
        variant: 'ok',
        title: t(attempt.lock ? 'admin.cluster.maintenance.toast.locked' : 'admin.cluster.maintenance.toast.unlocked', {
          resource: target.name,
        }),
      });
      onClose();
    },
    onError: setError,
    onSettled: (_data, failure, _attempt, context) => {
      if (context) {
        const pending = client.getQueryData<Attempt | null>(guardKey);
        if (pending) {
          // Keep this exact durable generation until explicit read-back. Do not
          // clear an unrelated operation's uncertainty by object ID alone.
          client.setQueryData(guardKey, { ...pending, generation: context.generation });
        } else {
          chrome.settleLocalLock(nodeRef, failure, context.generation);
        }
      }
      submitting.current = false;
    },
  });
  const verify = async () => {
    if (!guard.data?.generation || mutation.isPending) return;
    setError(null);
    try {
      const latest = await readNode(target.id);
      const outcome = reconcileMaintenanceAttempt(guard.data, {
        value: latest.maintenance_lock,
        reason: latest.maintenance_lock_reason,
      });
      if (outcome === 'unknown') throw new Error(t('admin.nodes.maintenance.unverified'));
      chrome.settleLocalLock(nodeRef, null, guard.data.generation);
      client.setQueryData(guardKey, null);
      await refresh();
      await nodeQ.refetch();
    } catch (failure) {
      setError(failure);
    }
  };
  return (
    <ConfirmDialog
      open
      title={t('admin.nodes.maintenance.title', { node: `${target.name} (#${target.id})` })}
      confirmLabel={t(unlock ? 'admin.cluster.maintenance.action.unlock' : 'admin.cluster.maintenance.action.lock')}
      confirmLoading={mutation.isPending}
      confirmDisabled={!nodeQ.isSuccess || nodeQ.isFetching || inherited || Boolean(guard.data)}
      onCancel={onClose}
      testId="admin.nodes.maintenance.dialog"
      onConfirm={() => {
        if (!node || inherited || nodeQ.isFetching || guard.data || submitting.current) return;
        submitting.current = true;
        setError(null);
        mutation.mutate({
          nodeId: target.id,
          lock: !unlock,
          reason: unlock ? undefined : reason.trim() || undefined,
          previousState: node.maintenance_lock as MaintenanceState,
          previousReason: node.maintenance_lock_reason,
        });
      }}
    >
      {nodeQ.isLoading ? <LoadingState /> : null}
      {nodeQ.isError ? (
        <Alert variant="danger" title={t('common.failed')}>
          {formatErrorMessage(nodeQ.error)}
          <Button onClick={() => void nodeQ.refetch()}>{t('common.retry')}</Button>
        </Alert>
      ) : null}
      {node ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {t(
              inherited
                ? 'admin.nodes.maintenance.inherited'
                : unlock
                  ? 'admin.cluster.maintenance.dialog.unlock.body'
                  : 'admin.cluster.maintenance.dialog.lock.body'
            )}
          </p>
          {node.maintenance_lock_reason ? (
            <p className="break-words text-sm text-fg">{node.maintenance_lock_reason}</p>
          ) : null}
          {!unlock && !inherited ? (
            <label className="block space-y-1 text-sm">
              <span>{t('admin.cluster.maintenance.reason')}</span>
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={mutation.isPending}
                testId="admin.nodes.maintenance.reason"
              />
            </label>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <Alert variant="danger" title={t('common.failed')}>
          {formatErrorMessage(error)}
        </Alert>
      ) : null}
      {guard.data ? (
        <Alert variant="warn" title={t('admin.nodes.maintenance.unverified')}>
          <Button disabled={mutation.isPending || !guard.data.generation} onClick={() => void verify()}>
            {t('common.refresh')}
          </Button>
        </Alert>
      ) : null}
    </ConfirmDialog>
  );
}
