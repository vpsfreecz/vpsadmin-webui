import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueries, useQuery } from '@tanstack/react-query';
import { ChevronRight, Pin, PinOff, X } from 'lucide-react';

import { cancelActionState, fetchActionState, fetchActionStates, type ActionState } from '../../lib/api/actionStates';
import { useAppMode } from '../../app/appMode';
import { useI18n } from '../../app/i18n';
import { formatDateTime } from '../../lib/format';
import { useActionStatePollIntervalMs, useTierAIntervalMs } from '../../lib/refreshTiers';
import { extractRelatedTransactionChainIdFromActionState } from '../../lib/taskLinks';
import {
  actionStateBadge,
  actionStateProgressLabel,
  actionStateProgressPercent,
  isFailingActionState,
  isFinishedActionState,
} from '../../lib/taskStatus';
import { clsx } from '../ui/clsx';
import { toneProgressFillClass, toneSurfaceClass, type ToneVariant } from '../ui/tone';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { StatusDot } from '../ui/StatusDot';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Spinner } from '../ui/Spinner';
import { useChrome, type TrackedActionState } from './ChromeContext';
import { TrackedTaskTargetLink } from './TrackedTaskTargetLink';
import { ActionStateInspect } from './ActionStateInspect';
import { compactFailureSummary, trackedActionLabel, trackedTargetLabel } from './taskPresentation';

type ActionStateRow = {
  s: ActionState;
  tracked: boolean;
  trackedMeta?: TrackedActionState;
  pinned: boolean;
};

function parseIds(input: unknown, limit: number): number[] {
  if (!Array.isArray(input)) return [];
  const ids: number[] = [];
  for (const v of input) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) continue;
    ids.push(Math.floor(n));
    if (ids.length >= limit) break;
  }
  return ids;
}

export function ActionStatesPanel(props: {
  limit?: number;
  filterText?: string;
  pinnedIds?: number[];
  onTogglePin?: (actionStateId: number) => void;
}) {
  const { basePath } = useAppMode();
  const chrome = useChrome();
  const i18n = useI18n();

  const actionPollMs = useActionStatePollIntervalMs();
  const tierARefetchMs = useTierAIntervalMs();

  const trackedIds = useMemo(
    () => chrome.trackedActionStates.map((x) => x.id),
    [chrome.trackedActionStates]
  );
  const trackedSet = useMemo(() => new Set<number>(trackedIds), [trackedIds]);
  const trackedById = useMemo(
    () => new Map(chrome.trackedActionStates.map((tracked) => [tracked.id, tracked])),
    [chrome.trackedActionStates],
  );

  const pinnedIds = useMemo(() => parseIds(props.pinnedIds, 50), [props.pinnedIds]);
  const pinnedSet = useMemo(() => new Set<number>(pinnedIds), [pinnedIds]);

  const explicitIds = useMemo(() => {
    const set = new Set<number>();
    for (const id of trackedIds) set.add(id);
    for (const id of pinnedIds) set.add(id);
    return Array.from(set)
      .filter((id) => Number.isFinite(id) && id > 0)
      .slice(0, 60);
  }, [trackedIds, pinnedIds]);

  const explicitQs = useQueries({
    queries: explicitIds.map((id) => ({
      queryKey: ['action_state', 'show', { id }],
      queryFn: async () => (await fetchActionState(id)).data,
      enabled: Number.isFinite(id) && id > 0,
      refetchInterval: actionPollMs,
    })),
  });

  const indexQ = useQuery({
    queryKey: ['action_states', 'index', { limit: props.limit ?? 10 }],
    queryFn: async () => (await fetchActionStates({ limit: props.limit ?? 10, order: 'newest' })).data,
    // keep this a bit slower; explicitQs cover the things the user explicitly cares about
    refetchInterval: tierARefetchMs,
  });

  const merged = useMemo(() => {
    const map = new Map<number, ActionStateRow>();

    for (let i = 0; i < explicitIds.length; i++) {
      const requestedId = explicitIds[i];
      const q = explicitQs[i];
      if (q?.data) {
        const id = Number((q.data as any).id ?? requestedId);
        if (!Number.isFinite(id) || id <= 0) continue;
        map.set(id, {
          s: q.data as any,
          tracked: trackedSet.has(id),
          trackedMeta: trackedById.get(id),
          pinned: pinnedSet.has(id),
        });
      }
    }

    const list = indexQ.data ?? [];
    for (const s of list as any[]) {
      const id = Number(s?.id);
      if (!Number.isFinite(id) || id <= 0) continue;
      if (map.has(id)) continue;
      map.set(id, {
        s: s as any,
        tracked: trackedSet.has(id),
        trackedMeta: trackedById.get(id),
        pinned: pinnedSet.has(id),
      });
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const aCreated = Date.parse(String((a.s as any).created_at ?? ''));
      const bCreated = Date.parse(String((b.s as any).created_at ?? ''));
      if (Number.isFinite(aCreated) && Number.isFinite(bCreated) && aCreated !== bCreated) {
        return bCreated - aCreated;
      }
      return Number((b.s as any).id ?? 0) - Number((a.s as any).id ?? 0);
    });

    return arr;
  }, [explicitIds, explicitQs, indexQ.data, pinnedSet, trackedById, trackedSet]);

  const needle = (props.filterText ?? '').trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!needle) return merged;
    return merged.filter((x) => {
      const id = Number((x.s as any).id);
      const backendLabel = (x.s as any).label ? String((x.s as any).label) : `#${id}`;
      const label = trackedActionLabel(x.trackedMeta, backendLabel, i18n.t);
      const target = trackedTargetLabel(x.trackedMeta, x.s);
      return `${id} ${label} ${backendLabel} ${target ?? ''}`.toLowerCase().includes(needle);
    });
  }, [i18n.t, merged, needle]);

  const pinned = filtered.filter((x) => x.pinned);
  const rest = filtered.filter((x) => !x.pinned);

  const failures = rest.filter((x) => isFailingActionState(x.s));
  const active = rest.filter((x) => !isFinishedActionState(x.s) && !isFailingActionState(x.s));
  const done = rest.filter((x) => isFinishedActionState(x.s) && !isFailingActionState(x.s));

  const [cancelTarget, setCancelTarget] = useState<ActionState | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [selectedActionStateId, setSelectedActionStateId] = useState<number | null>(null);

  const cancelM = useMutation({
    mutationFn: async (id: number) => cancelActionState(id),
    onMutate: () => setCancelError(null),
    onSuccess: () => {
      setCancelTarget(null);
      setCancelError(null);
      void indexQ.refetch();
      for (const q of explicitQs) void q.refetch?.();
    },
    onError: (err: any) => {
      setCancelError(String(err?.message ?? err));
    },
  });

  const selectedRow = selectedActionStateId !== null
    ? merged.find((x) => Number((x.s as any).id) === selectedActionStateId)
    : undefined;

  if (selectedActionStateId !== null) {
    return (
      <ActionStateInspect
        actionStateId={selectedActionStateId}
        fallback={selectedRow?.s}
        trackedMeta={selectedRow?.trackedMeta}
        pinned={pinnedSet.has(selectedActionStateId)}
        onTogglePin={props.onTogglePin}
        onBack={() => setSelectedActionStateId(null)}
      />
    );
  }

  const renderRow = (x: ActionStateRow) => {
    const s = x.s;
    const id = Number((s as any).id);
    const backendLabel = (s as any).label ? String((s as any).label) : `#${id}`;
    const label = trackedActionLabel(x.trackedMeta, backendLabel, i18n.t);
    const badge = actionStateBadge(s, i18n.t);
    const toneVariant: ToneVariant | undefined = ((): ToneVariant | undefined => {
      const v = badge.variant;
      if (v === 'ok' || v === 'warn' || v === 'danger' || v === 'info' || v === 'neutral') return v;
      return undefined;
    })();
    const dotVariant = toneVariant && toneVariant !== 'muted' ? toneVariant : 'neutral';
    const pct = actionStateProgressPercent(s);
    const pLabel = actionStateProgressLabel(s);

    const relatedChainId = extractRelatedTransactionChainIdFromActionState(s);

    const highlight = chrome.highlightActionStateId != null && chrome.highlightActionStateId === id;

    const pinLabel = x.pinned ? i18n.t('tasks.action.unpin') : i18n.t('tasks.action.pin');

    const createdAt = (s as any).created_at ? formatDateTime(String((s as any).created_at)) : null;
    const target = trackedTargetLabel(x.trackedMeta, s);
    const failureSummary = compactFailureSummary(s);
    const finished = isFinishedActionState(s);
    const successful = finished && !isFailingActionState(s);

    return (
      <div
        key={id}
        className={clsx(
          'rounded-md border p-2',
          successful ? 'border-border bg-surface' : toneSurfaceClass(toneVariant),
          highlight ? 'ring-1 ring-warn-border' : null,
        )}
        data-testid={`tasks.row.${id}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot variant={dotVariant} title={badge.label} />
          <button
            type="button"
            className="flex min-h-8 min-w-0 flex-1 items-center gap-1 rounded text-left text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus [@media(any-pointer:coarse)]:min-h-11"
            onClick={() => setSelectedActionStateId(id)}
            data-testid={`tasks.inspect.open.${id}`}
            title={i18n.t('tasks.inspect.open')}
          >
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
            <ChevronRight size={14} className="shrink-0 text-faint" aria-hidden="true" />
          </button>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {relatedChainId ? (
            <Link className="break-words underline [overflow-wrap:anywhere]" to={`${basePath}/transactions/${relatedChainId}`} onClick={chrome.closeTasks}>
              {i18n.t('tasks.meta.chain', { id: relatedChainId })}
            </Link>
          ) : null}
          {relatedChainId !== id ? <span>#{id}</span> : null}
          {target ? (
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {i18n.t('tasks.meta.object')}:{' '}
              <TrackedTaskTargetLink tracked={x.trackedMeta} label={target} testId={`tasks.row.target.${id}`} onNavigate={chrome.closeTasks} />
            </span>
          ) : null}
        </div>

        {failureSummary ? (
          <div className="mt-2 rounded-md border border-danger-border bg-danger-bg p-2 text-xs text-muted [overflow-wrap:anywhere]" data-testid={`tasks.row.failure.${id}`}>
            <span className="font-medium text-danger">{i18n.t('tasks.meta.failure_summary')}:</span> {failureSummary}
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 text-xs text-faint">
            {createdAt ? <div title={i18n.t('tasks.meta.created', { time: createdAt })}>{createdAt}</div> : null}
            {pLabel ? <div aria-label={i18n.t('tasks.meta.progress', { progress: pLabel })}>{pLabel}{pct !== null ? ` · ${pct}%` : ''}</div> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1" data-testid={`tasks.row.actions.${id}`}>
            {props.onTogglePin ? (
              <Button
                size="sm"
                variant="ghost"
                className="w-8 px-0"
                onClick={() => props.onTogglePin?.(id)}
                title={pinLabel}
                ariaLabel={pinLabel}
                aria-pressed={x.pinned}
              >
                {x.pinned ? <PinOff size={16} className="shrink-0" aria-hidden="true" /> : <Pin size={16} className="shrink-0" aria-hidden="true" />}
              </Button>
            ) : null}
            {Boolean((s as any).can_cancel) && !finished ? (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setCancelError(null);
                  setCancelTarget(s);
                }}
                disabled={cancelM.isPending}
              >
                {i18n.t('tasks.action.cancel')}
              </Button>
            ) : null}
            {x.tracked ? (
              <Button
                size="sm"
                variant="ghost"
                className="w-8 px-0"
                onClick={() => chrome.dismissActionState(id)}
                title={i18n.t('tasks.action.dismiss_title')}
                ariaLabel={i18n.t('tasks.action.dismiss')}
              >
                <X size={16} className="shrink-0" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>

        {!finished && pct !== null ? (
          <div
            className="mt-1 h-1 rounded-full bg-surface-2"
            role="progressbar"
            aria-label={i18n.t('common.progress')}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={clsx('h-1 rounded-full', toneProgressFillClass(toneVariant))} style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
    );
  };

  const anyLoading =
    indexQ.isLoading || (explicitQs.length > 0 && explicitQs.some((q) => q.isLoading && !q.data));
  const anyError = indexQ.isError || (explicitQs.length > 0 && explicitQs.some((q) => q.isError && !q.data));

  if (anyLoading && merged.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (anyError && merged.length === 0) {
    return (
      <div>
        <div className="text-sm font-medium">{i18n.t('tasks.error.load_action_states')}</div>
        <div className="mt-1 text-sm text-muted">{String((indexQ.error as any)?.message ?? indexQ.error)}</div>
      </div>
    );
  }

  if (merged.length === 0) {
    return (
      <div>
        <div className="text-xs text-muted">{i18n.t('tasks.basic.actions_title')}</div>
        <div className="mt-2 text-sm text-muted">{i18n.t('tasks.empty.no_action_states')}</div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div>
        <div className="text-xs text-muted">{i18n.t('tasks.basic.actions_title')}</div>
        <div className="mt-2 text-sm text-muted">{i18n.t('tasks.empty.no_action_states_filtered')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">
          {i18n.t('tasks.basic.actions_title')}
          {needle ? <span className="text-faint"> · {i18n.t('tasks.meta.filtered')}</span> : null}
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {pinned.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-faint">{i18n.t('tasks.section.pinned')}</div>
            <div className="space-y-2">{pinned.map(renderRow)}</div>
          </div>
        ) : null}

        {failures.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-danger">{i18n.t('tasks.section.failed')}</div>
            <div className="space-y-2">{failures.map(renderRow)}</div>
          </div>
        ) : null}

        {active.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted">{i18n.t('tasks.section.active')}</div>
              <div className="text-xs text-faint">{i18n.t('tasks.meta.auto_refreshing')}</div>
            </div>
            <div className="space-y-2">{active.map(renderRow)}</div>
          </div>
        ) : null}

        {done.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-muted">
              {active.length > 0 ? i18n.t('tasks.section.recent') : i18n.t('tasks.section.most_recent')}
            </div>
            <div className="space-y-2">{done.map(renderRow)}</div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={cancelTarget !== null}
        title={i18n.t('tasks.cancel_dialog.title')}
        description={
          cancelTarget?.label
            ? String(cancelTarget.label)
            : i18n.t('tasks.cancel_dialog.description_default')
        }
        danger
        confirmLabel={i18n.t('tasks.cancel_dialog.confirm')}
        confirmLoading={cancelM.isPending}
        onCancel={() => {
          setCancelTarget(null);
          setCancelError(null);
        }}
        onConfirm={() => {
          if (!cancelTarget) return;
          const id = Number((cancelTarget as any).id);
          if (!Number.isFinite(id) || id <= 0) return;
          cancelM.mutate(id);
        }}
      >
        {cancelError ? (
          <Alert variant="danger" title={i18n.t('tasks.cancel_dialog.failed_title')}>
            {cancelError}
          </Alert>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
