import type { QueryClient } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';
import type { useChrome } from '../../../components/layout/ChromeContext';
import { getMetaActionStateId } from '../../../lib/api/haveapi';
import type { createVps, CreateVpsPayload } from '../../../lib/api/vps';
import { objectRef } from '../../../lib/objectRef';
import type { LocalMutationGeneration } from '../../../lib/localLocks';
import { clearVpsCreateOutcomeMarker, markVpsCreateOutcomeAccepted, readLatestVpsCreateOutcomeMarker, type VpsCreateOutcomeMarker } from '../../../lib/vpsCreateOutcomeGuard';
import { pendingVpsCreateNavigationState } from './VpsDetailVisibility';

export type CreateMutationVariables = { payload: CreateVpsPayload; identity: { hostname: string; ownerId?: number; locationId?: number };
    userId?: number; ownerContextUserId?: number; pageSessionId: string; effectiveBasePath: string; objectLabel: string; persistenceErrorMessage: string; outcomeUncertainMessage: string };
export type AcceptedCreateBinding = Readonly<{ userId?: number; actionStateId: number; object: ReturnType<typeof objectRef>; mutationGeneration: LocalMutationGeneration; objectLabel: string }>;
export type CreateMutationContext = { active: { userId?: number; marker: VpsCreateOutcomeMarker }; responseReceived: boolean; acceptedBinding?: AcceptedCreateBinding };

export async function acceptVpsCreation(
  res: Awaited<ReturnType<typeof createVps>>,
  variables: CreateMutationVariables,
  context: CreateMutationContext | undefined,
  { scopeIsActive, setCreateOutcomeMarker, chrome, qc, navigate }: {
    scopeIsActive: (userId: number | undefined) => boolean;
    setCreateOutcomeMarker: (marker: VpsCreateOutcomeMarker | null) => void;
    chrome: ReturnType<typeof useChrome>;
    qc: QueryClient;
    navigate: NavigateFunction;
  },
) {
  // A received create response makes every later failure ambiguous.
  if (context) context.responseReceived = true;
  const vpsId = Number(res.data?.id);
  const actionStateId = getMetaActionStateId(res.meta);
  const active = context?.active;
  if (!active || actionStateId === undefined) throw new Error(variables.persistenceErrorMessage);
  const receipt = await markVpsCreateOutcomeAccepted({
    userId: active.userId,
    marker: active.marker,
    candidateVpsId: vpsId,
    actionStateId,
    persistenceErrorMessage: variables.persistenceErrorMessage,
  });
  context.active = { ...active, marker: receipt };
  if (!scopeIsActive(variables.userId)) return;
  setCreateOutcomeMarker(receipt);
  const vpsRef = Number.isInteger(vpsId) && vpsId > 0 ? objectRef('Vps', vpsId) : undefined;
  if (vpsRef) context.acceptedBinding = Object.freeze({ userId: variables.userId, actionStateId, object: vpsRef,
    mutationGeneration: await chrome.acquireLocalLock(vpsRef, { durable: true }), objectLabel: variables.objectLabel });
  const binding = context.acceptedBinding;
  if (!scopeIsActive(variables.userId) && binding) return void chrome.acquireLocalLock(binding.object, { actionStateId, generation: binding.mutationGeneration });
  if (!scopeIsActive(variables.userId)) return;
  void qc.invalidateQueries({ queryKey: ['vps', 'list'] });
  void qc.invalidateQueries({ queryKey: ['transaction_chain', 'active'] });
  chrome.trackActionState(actionStateId, { actionLabelKey: 'action.vps.create.label', objectLabel: variables.objectLabel,
    object: context.acceptedBinding?.object, mutationGeneration: context.acceptedBinding?.mutationGeneration });
  const receiptCleared = await clearVpsCreateOutcomeMarker({
    userId: active.userId,
    marker: receipt,
    persistenceErrorMessage: variables.persistenceErrorMessage,
  });
  if (!receiptCleared) throw new Error(variables.persistenceErrorMessage);
  if (!scopeIsActive(variables.userId)) return;
  setCreateOutcomeMarker(readLatestVpsCreateOutcomeMarker(variables.userId));
  const detailContextSearch = variables.ownerContextUserId === undefined
    ? ''
    : `?user=${encodeURIComponent(String(variables.ownerContextUserId))}`;
  navigate(
    Number.isFinite(vpsId)
      ? `${variables.effectiveBasePath}/vps/${vpsId}${detailContextSearch}`
      : `${variables.effectiveBasePath}/vps${detailContextSearch}`,
    Number.isFinite(vpsId)
      ? { state: pendingVpsCreateNavigationState(vpsId, actionStateId) }
      : undefined,
  );
}
