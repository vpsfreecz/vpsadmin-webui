import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../app/auth';
import {
  deleteUserClusterResourcePackage,
  fetchUserClusterResourcePackages,
  type UserClusterResourcePackage,
} from '../../../../lib/api/clusterResourcePackages';
import {
  canBulkRemovePackage,
  packageRemovalTargets,
  removePackagesSequentially,
  type PackageRemovalOutcome,
  type PackageRemovalTarget,
} from './UserPackageBulkRemovalModel';

type Review = { userId: number; userLabel: string; targets: readonly PackageRemovalTarget[] };
type Result = { userId: number; outcomes: PackageRemovalOutcome[]; refreshed: boolean; reconciled: boolean };

export function useUserPackageBulkRemoval(props: {
  userId: number;
  userLabel: string;
  rows: UserClusterResourcePackage[];
  ready: boolean;
  otherPending: boolean;
}) {
  const auth = useAuth();
  const qc = useQueryClient();
  const [selection, setSelection] = useState<{ userId: number; ids: number[] }>({ userId: props.userId, ids: [] });
  const [review, setReview] = useState<Review | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [completed, setCompleted] = useState(0);
  const [reconciling, setReconciling] = useState(false);
  const submitting = useRef(false);
  const [refreshError, setRefreshError] = useState<unknown>(null);
  useEffect(() => {
    setSelection({ userId: props.userId, ids: [] });
    setReview(null);
    setRefreshError(null);
  }, [props.userId]);
  const allowed = auth.role === 'admin';
  const eligible = props.rows.filter((row) => canBulkRemovePackage(row, props.userId));
  const selected = packageRemovalTargets(
    props.rows,
    selection.userId === props.userId ? selection.ids : [],
    props.userId
  );
  const selectedIds = new Set(selected.map((row) => row.id));
  const currentReview = review?.userId === props.userId ? review : null;
  const currentResult = result?.userId === props.userId ? result : null;
  const unknown = Boolean(
    currentResult && !currentResult.reconciled && currentResult.outcomes.some((item) => item.status === 'unknown')
  );
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['user_cluster_resource_packages'] });
    await qc.invalidateQueries({ queryKey: ['user_cluster_resources'] });
  };
  const mutation = useMutation({
    mutationFn: async (job: Review) =>
      removePackagesSequentially(job.targets, deleteUserClusterResourcePackage, setCompleted),
    onSuccess: async (outcomes, job) => {
      const removedIds = new Set(outcomes.filter((item) => item.status === 'removed').map((item) => item.id));
      setSelection((previous) =>
        previous.userId === job.userId
          ? { ...previous, ids: previous.ids.filter((id) => !removedIds.has(id)) }
          : previous
      );
      setReview(null);
      await refresh();
      const state = qc.getQueryState(['user_cluster_resource_packages', { userId: job.userId, limit: 500 }]);
      setResult({
        userId: job.userId,
        outcomes,
        refreshed: state?.status === 'success' && !state.isInvalidated,
        reconciled: false,
      });
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const busy = mutation.isPending || reconciling;
  const disabled = !allowed || !props.ready || props.otherPending || busy || unknown;
  const reviewValid = Boolean(
    currentReview &&
    currentReview.targets.every((target) =>
      props.rows.some((row) => row.id === target.id && canBulkRemovePackage(row, props.userId))
    )
  );
  return {
    allowed,
    eligible,
    selected,
    selectedIds,
    currentReview,
    currentResult,
    completed,
    busy,
    disabled,
    reviewValid,
    unknown,
    refreshError,
    canSelect: (row: UserClusterResourcePackage) => canBulkRemovePackage(row, props.userId),
    toggle: (id: number, checked: boolean) => {
      if (disabled || submitting.current || !eligible.some((row) => row.id === id)) return;
      setSelection({
        userId: props.userId,
        ids: checked ? [...new Set([...selectedIds, id])] : [...selectedIds].filter((value) => value !== id),
      });
    },
    selectAll: () => {
      if (!disabled && !submitting.current) setSelection({ userId: props.userId, ids: eligible.map((row) => row.id) });
    },
    clear: () => {
      if (!busy && !submitting.current) setSelection({ userId: props.userId, ids: [] });
    },
    openReview: () => {
      if (disabled || submitting.current || selected.length === 0) return;
      setReview(
        Object.freeze({
          userId: props.userId,
          userLabel: props.userLabel,
          targets: Object.freeze(selected.map((target) => Object.freeze({ ...target }))),
        })
      );
    },
    closeReview: () => {
      if (!submitting.current && !mutation.isPending) setReview(null);
    },
    confirm: () => {
      if (disabled || !reviewValid || !currentReview || submitting.current) return;
      submitting.current = true;
      setCompleted(0);
      setResult(null);
      mutation.mutate(currentReview);
    },
    reconcile: async () => {
      if (busy || !allowed) return;
      setReconciling(true);
      setRefreshError(null);
      try {
        const fresh = (await fetchUserClusterResourcePackages({ userId: props.userId, limit: 500 })).data;
        qc.setQueryData(['user_cluster_resource_packages', { userId: props.userId, limit: 500 }], fresh);
        setSelection({ userId: props.userId, ids: [] });
        setResult((value) =>
          value?.userId === props.userId ? { ...value, reconciled: true, refreshed: true } : value
        );
        await qc.invalidateQueries({ queryKey: ['user_cluster_resources'] });
      } catch (error) {
        setRefreshError(error);
      } finally {
        setReconciling(false);
      }
    },
  };
}
export type UserPackageBulkRemoval = ReturnType<typeof useUserPackageBulkRemoval>;
