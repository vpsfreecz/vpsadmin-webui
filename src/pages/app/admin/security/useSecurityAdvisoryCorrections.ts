import type { AdvisoryPartialResult } from './AdvisoryPartialResult';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { useChrome } from '../../../../components/layout/ChromeContext';
import {
  updateSecurityAdvisory,
  publishSecurityAdvisory,
  retractSecurityAdvisory,
  deleteSecurityAdvisory,
  type SecurityAdvisory,
} from '../../../../lib/api/securityAdvisories';
import {
  advisoryGuards,
  requireAdvisoryActions,
  nextAdvisoryRevision,
} from '../../../../lib/api/securityAdvisoryMutations';
import { getMetaActionStateId } from '../../../../lib/api/apiErrors';
import { localInputToIso } from '../../../../lib/datetimeLocal';
import { advisoryFailureMessage } from './advisoryFailureMessage';
import {
  AdvisoryChildSequenceError,
  advisoryCveActions,
  fetchAdvisoryEditSnapshot,
  reconcileSecurityAdvisoryCves,
} from './securityAdvisoryAdminApi';
import { advisoryDateInput, advisoryDateValue } from './advisoryDateTime';
import { securityAdvisoryEditorPayload, type SecurityAdvisoryEditorValues } from './SecurityAdvisoryEditorModal';

export function useSecurityAdvisoryCorrections(opts: {
  advisoryId: number;
  advisory?: SecurityAdvisory;
  invalidate: () => Promise<void>;
  evict: () => void;
}) {
  const { t } = useI18n();
  const { pushToast } = useToasts();
  const chrome = useChrome();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof fetchAdvisoryEditSnapshot>> | null>(null);
  const [partialResult, setPartialResult] = useState<AdvisoryPartialResult | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editBlocked, setEditBlocked] = useState(false);
  const [opening, setOpening] = useState(false);
  const openEdit = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const next = await fetchAdvisoryEditSnapshot(opts.advisoryId);
      await requireAdvisoryActions([{ resource: 'advisory', action: 'update' }], next.guards);
      setSnapshot(next);
      setEditorError(null);
      setEditBlocked(partialResult !== null);
      setEditorOpen(true);
    } catch (error) {
      pushToast({ variant: 'danger', title: t('common.error'), body: advisoryFailureMessage(error, t) });
    } finally {
      setOpening(false);
    }
  };
  const editM = useMutation({
    mutationFn: async ({ values, cves }: { values: SecurityAdvisoryEditorValues; cves: string[] }) => {
      if (!snapshot || editBlocked) throw new Error(t('admin.security_advisories.correction.reload'));
      await requireAdvisoryActions(
        [{ resource: 'advisory', action: 'update' }, ...advisoryCveActions(snapshot.cves, cves)],
        snapshot.guards
      );
      // Any refusal or uncertain response requires a new explicit load, including partial CVE success.
      setEditBlocked(true);
      const updated = await updateSecurityAdvisory(opts.advisoryId, {
        ...securityAdvisoryEditorPayload(values, snapshot.advisory),
        ...snapshot.guards,
      });
      try {
        const revision = nextAdvisoryRevision(snapshot.guards.expected_content_revision, updated.data.content_revision);
        await reconcileSecurityAdvisoryCves(opts.advisoryId, snapshot.cves, cves, {
          ...snapshot.guards,
          expected_content_revision: revision,
        });
      } catch (error) {
        const sequence =
          error instanceof AdvisoryChildSequenceError ? error : new AdvisoryChildSequenceError([], cves, error);
        throw new Error(
          `${t('admin.security_advisories.toast.saved_without_cves')} ${advisoryFailureMessage(error, t)}`,
          { cause: sequence }
        );
      }
    },
    onSuccess: async () => {
      setEditorOpen(false);
      await opts.invalidate();
    },
    onError: async (error, variables) => {
      const sequence =
        error instanceof AdvisoryChildSequenceError
          ? error
          : error instanceof Error && error.cause instanceof AdvisoryChildSequenceError
            ? error.cause
            : null;
      if (sequence)
        setPartialResult({
          advisoryId: opts.advisoryId,
          desiredCves: Object.freeze([...variables.cves]),
          sequenceError: sequence,
        });
      setEditorError(advisoryFailureMessage(error, t));
      await opts.invalidate();
    },
  });
  const [publishTarget, setPublishTarget] = useState<SecurityAdvisory | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAt, setPublishAt] = useState('');
  const [publishMail, setPublishMail] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishBlocked, setPublishBlocked] = useState(false);
  const openPublish = () => {
    if (!opts.advisory) return;
    setPublishTarget({ ...opts.advisory });
    setPublishAt(advisoryDateInput(opts.advisory.published_at ?? new Date().toISOString()));
    setPublishMail(false);
    setPublishError(null);
    setPublishBlocked(false);
    setPublishOpen(true);
  };
  // audit:ignore trackActionState-no-object -- security advisories are not a supported Chrome object lock.
  const publishM = useMutation({
    mutationFn: async () => {
      if (!publishTarget || publishBlocked) throw new Error(t('admin.security_advisories.correction.reload'));
      const guards = advisoryGuards(publishTarget);
      if (guards.expected_state !== 'draft' || !localInputToIso(publishAt).valid)
        throw new Error(t('admin.security_advisories.validation.date'));
      await requireAdvisoryActions([{ resource: 'advisory', action: 'publish' }], guards);
      setPublishBlocked(true);
      return publishSecurityAdvisory(opts.advisoryId, {
        expected_content_revision: guards.expected_content_revision,
        published_at: advisoryDateValue(publishAt, publishTarget.published_at),
        send_mail: publishMail,
      });
    },
    onSuccess: async (result) => {
      const actionState = getMetaActionStateId(result.meta);
      if (actionState) chrome.trackActionState(actionState);
      setPublishOpen(false);
      await opts.invalidate();
    },
    onError: (error) => setPublishError(advisoryFailureMessage(error, t)),
  });
  const [lifecycleTarget, setLifecycleTarget] = useState<{
    action: 'retract' | 'delete';
    advisory: SecurityAdvisory;
  } | null>(null);
  const [lifecycleBlocked, setLifecycleBlocked] = useState(false);
  const lifecycleM = useMutation({
    mutationFn: async () => {
      if (!lifecycleTarget || lifecycleBlocked) throw new Error(t('admin.security_advisories.correction.reload'));
      const { advisory, action } = lifecycleTarget;
      const guards = advisoryGuards(advisory);
      await requireAdvisoryActions(
        [
          {
            resource: 'advisory',
            action,
            id: advisory.id,
          },
        ],
        guards
      );
      setLifecycleBlocked(true);
      if (action === 'retract') await retractSecurityAdvisory(advisory.id, guards);
      else await deleteSecurityAdvisory(advisory.id, guards);
      return action;
    },
    onSuccess: async (action) => {
      setLifecycleTarget(null);
      if (action === 'delete') {
        opts.evict();
        navigate('/admin/security-advisories');
      }
      await opts.invalidate();
    },
    onError: async () => {
      if (lifecycleTarget?.action !== 'delete') await opts.invalidate();
    },
  });
  const openLifecycle = (action: 'retract' | 'delete') => {
    if (!opts.advisory) return;
    setLifecycleTarget({ action, advisory: { ...opts.advisory } });
    setLifecycleBlocked(false);
    lifecycleM.reset();
  };
  return {
    snapshot,
    partialResult,
    reviewPartial: async () => {
      setEditorOpen(false);
      await opts.invalidate();
    },
    editorOpen,
    setEditorOpen,
    editorError,
    editBlocked,
    editM,
    openEdit,
    opening,
    publishOpen,
    setPublishOpen,
    publishAt,
    setPublishAt,
    publishMail,
    setPublishMail,
    publishError,
    publishBlocked,
    publishM,
    openPublish,
    lifecycleTarget,
    setLifecycleTarget,
    lifecycleBlocked,
    lifecycleM,
    openLifecycle,
  };
}
