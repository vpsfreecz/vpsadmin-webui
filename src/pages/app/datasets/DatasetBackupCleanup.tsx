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
import {
  getMetaActionStateId,
  HaveApiError,
  isAmbiguousMutationError,
  requireActionStateResult,
} from '../../../lib/api/apiErrors';
import { ApiOutputError } from '../../../lib/api/apiOutput';
import {
  fetchDataset,
  fetchDatasetBackupCleanupAvailable,
  fetchDatasetPlans,
  fetchDatasetSnapshots,
  type DisableBackupsOptions,
} from '../../../lib/api/datasets';
import type { ActionResult } from '../../../lib/api/sdk';
import { fetchActiveTransactionChains } from '../../../lib/api/transactions';
import type { ObjectRef } from '../../../lib/objectRef';
import { formatErrorMessage } from '../../../lib/errors';
import { hasActiveChains } from '../../../lib/taskStatus';
import { useDatasetContext } from './DatasetContext';

/** One ordinary mutation; accepted work belongs to the existing task controller. */
export function DatasetBackupCleanup(props: {
  busy: boolean;
  submit: (datasetId: number, options: DisableBackupsOptions) => Promise<ActionResult<unknown>>;
}) {
  const { dataset, datasetRef, refetch, refetchChains } = useDatasetContext();
  const { role } = useAuth();
  const { t } = useI18n();
  const chrome = useChrome();
  const [search] = useSearchParams();
  const contextKey = `${dataset.id}:${search.get('recursive') ?? ''}`;
  const [recursiveChoice, setRecursiveChoice] = useState({ contextKey, value: false });
  const recursive = recursiveChoice.contextKey === contextKey ? recursiveChoice.value : false;
  useEffect(() => setRecursiveChoice({ contextKey, value: false }), [contextKey]);
  const [backupFirst, setBackupFirst] = useState(true);
  useEffect(() => setBackupFirst(true), [contextKey]);
  const [acknowledgedScope, setAcknowledgedScope] = useState<string | null>(null);
  const pending = useRef(false);
  const scopeKey = `${contextKey}:${recursive}`;
  const acknowledged = acknowledgedScope === scopeKey;
  useEffect(() => setAcknowledgedScope(null), [scopeKey]);
  const label = `${String(dataset['full_name'] ?? dataset.name ?? '')} (#${dataset.id})`;
  const capability = useQuery({
    queryKey: ['datasets', 'backup-cleanup-capability', role],
    queryFn: async () => (await fetchDatasetBackupCleanupAvailable()).data,
    enabled: role === 'admin',
    retry: false,
  });
  const lock = chrome.localLocks.find(
    (item) => item.kind === datasetRef.kind && item.id === datasetRef.id && item.uncertain
  );
  const cleanup = useMutation({
    mutationFn: async (request: {
      datasetId: number;
      object: ObjectRef;
      label: string;
      options: DisableBackupsOptions;
    }) => requireActionStateResult(await props.submit(request.datasetId, request.options), 'dataset backup cleanup'),
    onMutate: async (request) => {
      const active = await fetchActiveTransactionChains({ className: 'Dataset', rowId: request.datasetId });
      if (hasActiveChains(active)) throw new Error(t('toast.action_blocked.body'));
      return { generation: await chrome.acquireLocalLock(request.object, { durable: true }) };
    },
    onSuccess: (result, request, context) => {
      chrome.trackActionState(getMetaActionStateId(result.meta)!, {
        actionLabelKey: 'dataset.backup_cleanup.action',
        objectLabel: request.label,
        object: request.object,
        mutationGeneration: context?.generation,
        progressTitleKey: 'dataset.backup_cleanup.action',
        blockUi: true,
      });
      setAcknowledgedScope(null);
      void refetch();
      void refetchChains();
    },
    onError: (cause, request, context) => {
      const receipt = context
        ? cause instanceof ApiOutputError
          ? cause.result
          : cause instanceof HaveApiError
            ? cause.result
            : undefined
        : undefined;
      const id = getMetaActionStateId(receipt?.meta);
      if (id !== undefined && Number.isSafeInteger(id) && id > 0) {
        chrome.trackActionState(id, { actionLabelKey: 'dataset.backup_cleanup.action', objectLabel: request.label });
      }
      void refetch();
      void refetchChains();
    },
    onSettled: (_result, error, request, context) => {
      if (context) chrome.settleLocalLock(request.object, error, context.generation);
      pending.current = false;
    },
  });
  if (role !== 'admin' || capability.data !== true || capability.isError) return null;
  // Read/acquire failures in onMutate precede submission and have no request context.
  const uncertain = cleanup.isError && cleanup.context !== undefined && isAmbiguousMutationError(cleanup.error);
  const errorDetail = uncertain ? t('dataset.backup_cleanup.unknown') : formatErrorMessage(cleanup.error);

  return (
    <Card testId="dataset.backup_cleanup">
      <CardHeader title={t('dataset.backup_cleanup.action')} />
      <CardBody>
        <MutationUncertaintyPanel
          object={datasetRef}
          lock={lock}
          testIdPrefix="dataset.backup_cleanup.uncertain"
          reconcile={async () => {
            try {
              const [active] = await Promise.all([
                fetchActiveTransactionChains({ className: 'Dataset', rowId: dataset.id }),
                fetchDatasetPlans(dataset.id, { limit: 1 }),
                fetchDatasetSnapshots(dataset.id, { limit: 1 }),
                fetchDataset(dataset.id),
                refetchChains(),
              ]);
              return hasActiveChains(active) ? 'busy' : 'manual';
            } catch {
              return 'error';
            }
          }}
          onManualConfirm={() => {
            chrome.acknowledgeUncertainLocalLock(datasetRef, lock?.uncertaintyId);
            cleanup.reset();
          }}
        />
        <form
          className="space-y-3"
          aria-label={t('dataset.backup_cleanup.action')}
          data-testid="dataset.backup_cleanup.form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!acknowledged || pending.current || props.busy || uncertain || lock) return;
            pending.current = true;
            cleanup.mutate({
              datasetId: dataset.id,
              object: datasetRef,
              label,
              options: { recursive, backup_first: backupFirst },
            });
          }}
        >
          <p className="text-sm text-muted">{t('dataset.backup_cleanup.description')}</p>
          <Checkbox
            checked={recursive}
            onChange={(value) => setRecursiveChoice({ contextKey, value })}
            disabled={cleanup.isPending}
            testId="dataset.backup_cleanup.recursive"
            label={t('dataset.backup_cleanup.recursive')}
          />
          <Checkbox
            checked={backupFirst}
            onChange={setBackupFirst}
            disabled={cleanup.isPending}
            testId="dataset.backup_cleanup.backup_first"
            label={t('dataset.backup_cleanup.backup_first')}
          />
          <Checkbox
            checked={acknowledged}
            onChange={(checked) => setAcknowledgedScope(checked ? scopeKey : null)}
            disabled={cleanup.isPending}
            testId="dataset.backup_cleanup.acknowledgement"
            label={t('dataset.backup_cleanup.acknowledgement')}
          />
          {cleanup.isError ? (
            <Alert
              variant="danger"
              title={t('dataset.backup_cleanup.rejected')}
              description={errorDetail}
              testId="dataset.backup_cleanup.error"
            />
          ) : null}
          <Button
            type="submit"
            variant="danger"
            testId="dataset.backup_cleanup.submit"
            loading={cleanup.isPending}
            disabled={!acknowledged || props.busy || uncertain || Boolean(lock)}
          >
            {t('dataset.backup_cleanup.action')}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
