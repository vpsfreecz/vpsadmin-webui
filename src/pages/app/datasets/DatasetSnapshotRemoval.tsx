import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../app/auth';
import { useI18n } from '../../../app/i18n';
import { useChrome } from '../../../components/layout/ChromeContext';
import { MutationUncertaintyPanel } from '../../../components/layout/MutationUncertaintyPanel';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { getMetaActionStateId, HaveApiError, isAmbiguousMutationError, requireActionStateResult } from '../../../lib/api/apiErrors';
import { ApiOutputError } from '../../../lib/api/apiOutput';
import { fetchDataset, fetchDatasetPlans, fetchDatasetSnapshots, fetchDatasetSnapshotRemovalAvailable, isStaleSnapshotRemovalPreview } from '../../../lib/api/datasets';
import type { SnapshotRemovalPreview, SnapshotRemovalManifest } from '../../../lib/api/datasetSnapshotRemovalManifest';
import type { ActionResult } from '../../../lib/api/sdk';
import { fetchActiveTransactionChains } from '../../../lib/api/transactions';
import { formatErrorMessage } from '../../../lib/errors';
import { hasActiveChains } from '../../../lib/taskStatus';
import type { ObjectRef } from '../../../lib/objectRef';
import { useDatasetContext } from './DatasetContext';
import { DatasetSnapshotRemovalReview, SnapshotRemovalTotals } from './DatasetSnapshotRemovalReview';

type Options = SnapshotRemovalManifest['options'];
type Props = {
  busy: boolean;
  preview: (datasetId: number, options: Options) => Promise<ActionResult<SnapshotRemovalPreview>>;
  submit: (datasetId: number, options: Options & { manifest_digest: string }) => Promise<ActionResult<unknown>>;
};

export function DatasetSnapshotRemoval(props: Props) {
  const { dataset } = useDatasetContext();
  const { role, user, status } = useAuth();
  const [search] = useSearchParams();
  const capability = useQuery({
    queryKey: ['datasets', 'snapshot-removal-capability', user?.id, role, status],
    queryFn: async () => (await fetchDatasetSnapshotRemovalAvailable()).data,
    enabled: role === 'admin' && status === 'authenticated',
    retry: false,
  });
  if (role !== 'admin' || status !== 'authenticated' || capability.data !== true || capability.isError) return null;
  // A new dataset, URL context or principal starts with new defaults and no review.
  return <SnapshotRemovalForm key={`${dataset.id}:${user?.id}:${search.get('recursive') ?? ''}`} {...props} />;
}

function SnapshotRemovalForm(props: Props) {
  const { dataset, datasetRef, refetch, refetchChains } = useDatasetContext();
  const { t } = useI18n();
  const chrome = useChrome();
  const [options, setOptions] = useState<Options>({ recursive: false, disable_plans: true });
  const [review, setReview] = useState<SnapshotRemovalPreview | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const epoch = useRef(0);
  const pending = useRef(false);
  const previewPending = useRef(false);
  useEffect(() => () => { epoch.current += 1; }, []);
  const lock = chrome.localLocks.find(item => item.kind === datasetRef.kind && item.id === datasetRef.id && item.uncertain);
  const label = `${String(dataset['full_name'] ?? dataset.name ?? '')} (#${dataset.id})`;
  const reviewedRoot = review?.manifest.datasets.find(row => row.id === review.manifest.root_dataset_id);
  const reviewedLabel = reviewedRoot ? `${reviewedRoot.full_name} (#${reviewedRoot.id})` : label;
  const removal = useMutation({
    mutationFn: async (request: { datasetId: number; object: ObjectRef; label: string; review: SnapshotRemovalPreview; epoch: number }) => {
      // Navigation/permission changes during preflight cannot dispatch a newly authenticated request.
      if (request.epoch !== epoch.current) throw new Error(t('toast.action_blocked.body'));
      return requireActionStateResult(await props.submit(request.datasetId, {
        ...request.review.manifest.options, manifest_digest: request.review.manifest_digest,
      }), 'dataset snapshot removal');
    },
    onMutate: async request => {
      const active = await fetchActiveTransactionChains({ className: 'Dataset', rowId: request.datasetId });
      if (hasActiveChains(active)) throw new Error(t('toast.action_blocked.body'));
      return { generation: await chrome.acquireLocalLock(request.object, { durable: true }) };
    },
    onSuccess: (result, request, context) => {
      chrome.trackActionState(getMetaActionStateId(result.meta)!, {
        actionLabelKey: 'dataset.snapshot_removal.action', objectLabel: request.label,
        object: request.object, mutationGeneration: context?.generation,
        progressTitleKey: 'dataset.snapshot_removal.action', blockUi: true,
      });
      setReview(null);
      setAcknowledged(false);
      setFinalOpen(false);
      void refetch();
      void refetchChains();
    },
    onError: (cause, request, context) => {
      const receipt = context && (cause instanceof ApiOutputError || cause instanceof HaveApiError) ? cause.result : undefined;
      const actionId = getMetaActionStateId(receipt?.meta);
      if (actionId !== undefined && Number.isSafeInteger(actionId) && actionId > 0) {
        chrome.trackActionState(actionId, { actionLabelKey: 'dataset.snapshot_removal.action', objectLabel: request.label });
      }
      if (isStaleSnapshotRemovalPreview(cause)) setReview(null);
      setAcknowledged(false);
      setFinalOpen(false);
      void refetch();
      void refetchChains();
    },
    onSettled: (_result, error, request, context) => {
      if (context) chrome.settleLocalLock(request.object, error, context.generation);
      pending.current = false;
    },
  });
  const uncertain = removal.isError && removal.context !== undefined && isAmbiguousMutationError(removal.error);
  const blocked = props.busy || Boolean(lock) || uncertain || removal.isPending;
  const invalidate = () => {
    epoch.current += 1;
    setReview(null);
    setAcknowledged(false);
    setFinalOpen(false);
    setPreviewError(null);
  };
  const changeOption = (key: keyof Options, value: boolean) => {
    invalidate();
    setOptions(previous => ({ ...previous, [key]: value }));
  };
  const preview = async () => {
    if (previewPending.current || pending.current || blocked) return;
    invalidate();
    const requestEpoch = epoch.current;
    previewPending.current = true;
    setPreviewLoading(true);
    removal.reset();
    try {
      const result = await props.preview(dataset.id, { ...options });
      if (epoch.current === requestEpoch) setReview(result.data);
    } catch (error) {
      if (epoch.current === requestEpoch) setPreviewError(error);
    } finally {
      previewPending.current = false;
      setPreviewLoading(false);
    }
  };
  return (
    <Card testId="dataset.snapshot_removal">
      <CardHeader title={t('dataset.snapshot_removal.action')} />
      <CardBody className="space-y-4">
        <MutationUncertaintyPanel object={datasetRef} lock={lock} testIdPrefix="dataset.snapshot_removal.uncertain"
          reconcile={async () => {
            try {
              const [active] = await Promise.all([
                fetchActiveTransactionChains({ className: 'Dataset', rowId: dataset.id }),
                fetchDatasetPlans(dataset.id, { limit: 1 }), fetchDatasetSnapshots(dataset.id, { limit: 1 }),
                fetchDataset(dataset.id), refetchChains(),
              ]);
              return hasActiveChains(active) ? 'busy' : 'manual';
            } catch { return 'error'; }
          }}
          onManualConfirm={() => {
            chrome.acknowledgeUncertainLocalLock(datasetRef, lock?.uncertaintyId);
            removal.reset();
            invalidate();
          }}
        />
        <p className="text-sm text-muted">{t('dataset.snapshot_removal.description')}</p>
        <Checkbox checked={options.recursive} onChange={value => changeOption('recursive', value)} disabled={removal.isPending}
          testId="dataset.snapshot_removal.recursive" label={t('dataset.snapshot_removal.recursive')} />
        <Checkbox checked={options.disable_plans} onChange={value => changeOption('disable_plans', value)} disabled={removal.isPending}
          testId="dataset.snapshot_removal.disable_plans" label={t('dataset.snapshot_removal.disable_plans')}
          description={t('dataset.snapshot_removal.plans_help')} />
        <Button testId="dataset.snapshot_removal.preview" variant="secondary" onClick={() => void preview()}
          loading={previewLoading} disabled={blocked}>{t('dataset.snapshot_removal.preview')}</Button>
        {previewError ? <Alert variant="danger" title={t('dataset.snapshot_removal.preview_failed')}
          description={previewError instanceof ApiOutputError ? t('dataset.snapshot_removal.invalid_preview') : formatErrorMessage(previewError)} /> : null}
        {removal.isError ? <Alert variant="danger" testId="dataset.snapshot_removal.error" title={t('dataset.snapshot_removal.rejected')}
          description={uncertain ? t('dataset.snapshot_removal.unknown') : isStaleSnapshotRemovalPreview(removal.error)
            ? t('dataset.snapshot_removal.stale') : formatErrorMessage(removal.error)} /> : null}
        {review ? <>
          <DatasetSnapshotRemovalReview manifest={review.manifest} />
          <Checkbox checked={acknowledged} onChange={setAcknowledged} disabled={blocked}
            testId="dataset.snapshot_removal.acknowledgement" label={t('dataset.snapshot_removal.acknowledgement')} />
          <Button testId="dataset.snapshot_removal.continue" disabled={!acknowledged || blocked}
            onClick={() => { if (acknowledged && !blocked && !pending.current) setFinalOpen(true); }}>
            {t('dataset.snapshot_removal.continue')}
          </Button>
          <ConfirmDialog open={finalOpen} testId="dataset.snapshot_removal.final" danger
            title={t('dataset.snapshot_removal.final_title')} description={t('dataset.snapshot_removal.final_description')}
            confirmLabel={t('dataset.snapshot_removal.action')} confirmLoading={removal.isPending}
            confirmDisabled={!acknowledged || blocked} onCancel={() => { if (!pending.current) setFinalOpen(false); }}
            onConfirm={() => {
              if (!finalOpen || !acknowledged || blocked || pending.current) return;
              pending.current = true;
              removal.mutate({ datasetId: dataset.id, object: datasetRef, label: reviewedLabel, review, epoch: epoch.current });
            }}>
            <p className="mb-3 break-all font-semibold">{reviewedLabel}</p>
            <p className="mb-3 text-sm">{t(review.manifest.options.recursive ? 'dataset.snapshot_removal.scope_recursive' : 'dataset.snapshot_removal.scope_root')}</p>
            <p className="mb-3 text-sm">{t(review.manifest.options.disable_plans ? 'dataset.snapshot_removal.plans_disabled' : 'dataset.snapshot_removal.plans_retained')}</p>
            <SnapshotRemovalTotals manifest={review.manifest} />
          </ConfirmDialog>
        </> : null}
      </CardBody>
    </Card>
  );
}
