import React, { useMemo, useState } from 'react';
import { Layers3, Pencil, Trash2 } from 'lucide-react';

import { useI18n } from '../../../../app/i18n';
import { useToasts } from '../../../../app/toasts';
import { Alert } from '../../../../components/ui/Alert';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../../components/ui/Card';
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { Modal } from '../../../../components/ui/Modal';
import { TableCard } from '../../../../components/ui/TableCard';
import {
  createSecurityAdvisoryNodeStatus,
  deleteSecurityAdvisoryNodeStatus,
  updateSecurityAdvisoryNodeStatus,
  type SecurityAdvisoryNodeStatus,
  type SecurityAdvisory,
} from '../../../../lib/api/securityAdvisories';
import { nextAdvisoryRevision } from '../../../../lib/api/securityAdvisoryMutations';
import type { Language } from '../../../../lib/api/languages';
import type { Node } from '../../../../lib/api/nodes';
import { advisoryFailureMessage } from './advisoryFailureMessage';
import { formatDateTime } from '../../../../lib/format';
import {
  useSecurityAdvisoryNodeSnapshot,
  nodeStatusMap,
  nodeLabel,
  stateBadgeVariant,
} from './useSecurityAdvisoryNodeSnapshot';
import {
  buildSecurityAdvisoryNodeStatusPayload,
  remainingSecurityAdvisoryBulkNodeIds,
  SecurityAdvisoryNodeFormFields,
  MobileCellLabel,
  withoutNode,
  securityAdvisoryNodeFormValues,
  securityAdvisoryNodeStatusNodeId,
  type SecurityAdvisoryNodeFormValues,
} from './SecurityAdvisoryNodeForm';

export function SecurityAdvisoryNodesPanel(props: {
  advisoryId: number;
  advisory: SecurityAdvisory;
  languages: Language[];
  nodes: Node[];
  statuses: SecurityAdvisoryNodeStatus[];
  loading?: boolean;
  onChanged: () => void;
}) {
  const i18n = useI18n();
  const { t } = i18n;
  const { pushToast } = useToasts();
  const {
    activeNodes,
    relevantNodes,
    statusesByNode,
    resolved,
    guards,
    writeBlocked,
    setWriteBlocked,
    capturedStatuses,
    capture,
    captureEditor,
  } = useSecurityAdvisoryNodeSnapshot(props);
  const [editor, setEditor] = useState<{ node: Node; status: SecurityAdvisoryNodeStatus | null } | null>(null);
  const [editorValues, setEditorValues] = useState<SecurityAdvisoryNodeFormValues>(() =>
    securityAdvisoryNodeFormValues()
  );
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ node: Node; status: SecurityAdvisoryNodeStatus } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkValues, setBulkValues] = useState<SecurityAdvisoryNodeFormValues>(() => securityAdvisoryNodeFormValues());
  const [bulkTargetIds, setBulkTargetIds] = useState<number[]>([]);
  const [bulkCompleted, setBulkCompleted] = useState<Set<number>>(() => new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const editorPayload = editor ? buildSecurityAdvisoryNodeStatusPayload(editor.node.id, editorValues) : null;
  const bulkPayload = buildSecurityAdvisoryNodeStatusPayload(relevantNodes[0]?.id ?? 0, bulkValues);
  const remainingBulkIds = remainingSecurityAdvisoryBulkNodeIds(bulkTargetIds, bulkCompleted);

  const stateLabel = (state: string) => t(`admin.security_advisories.nodes.state.${state}`);
  const openEditor = async (node: Node, status: SecurityAdvisoryNodeStatus | null) => {
    try {
      const current = await captureEditor(node, status);
      setEditor({ node, status: current });
      setEditorValues(securityAdvisoryNodeFormValues(current, props.languages, resolved));
      setEditorError(null);
    } catch (error) {
      pushToast({ variant: 'danger', title: t('common.error'), body: advisoryFailureMessage(error, t) });
    }
  };

  const saveEditor = async () => {
    if (!editor || !editorPayload?.valid || !guards || writeBlocked || editorSaving) return;
    setWriteBlocked(true);
    setEditorSaving(true);
    setEditorError(null);
    try {
      if (editor.status) {
        await updateSecurityAdvisoryNodeStatus(props.advisoryId, editor.status.id, {
          ...withoutNode(editorPayload.payload),
          ...guards,
        });
      } else {
        await createSecurityAdvisoryNodeStatus(props.advisoryId, { ...editorPayload.payload, ...guards });
      }
      props.onChanged();
      setEditor(null);
      pushToast({ variant: 'ok', title: t('admin.security_advisories.nodes.toast.saved') });
    } catch (error) {
      const message = advisoryFailureMessage(error, t);
      props.onChanged();
      setEditorError(message);
      pushToast({ variant: 'danger', title: t('admin.security_advisories.nodes.toast.save_failed'), body: message });
    } finally {
      setEditorSaving(false);
    }
  };

  const deleteStatus = async () => {
    if (!deleteTarget || !guards || writeBlocked || deleting) return;
    setWriteBlocked(true);
    setDeleting(true);
    try {
      await deleteSecurityAdvisoryNodeStatus(props.advisoryId, deleteTarget.status.id, guards);
      setDeleteTarget(null);
      props.onChanged();
      pushToast({ variant: 'ok', title: t('admin.security_advisories.nodes.toast.deleted') });
    } catch (error) {
      props.onChanged();
      setDeleteError(advisoryFailureMessage(error, t));
      pushToast({
        variant: 'danger',
        title: t('admin.security_advisories.nodes.toast.delete_failed'),
        body: advisoryFailureMessage(error, t),
      });
    } finally {
      setDeleting(false);
    }
  };

  const openBulk = async () => {
    try {
      await capture([
        ...new Set(activeNodes.map((node) => (statusesByNode.has(node.id) ? ('PUT' as const) : ('POST' as const)))),
      ]);
    } catch (error) {
      pushToast({ variant: 'danger', title: t('common.error'), body: advisoryFailureMessage(error, t) });
      return;
    }
    setBulkOpen(true);
    setBulkConfirm(false);
    setBulkValues(securityAdvisoryNodeFormValues(null, props.languages, resolved));
    setBulkTargetIds(activeNodes.map((node) => node.id));
    setBulkCompleted(new Set());
    setBulkError(null);
  };

  const runBulk = async () => {
    const parsed = buildSecurityAdvisoryNodeStatusPayload(0, bulkValues);
    if (!parsed.valid || !guards || writeBlocked || bulkRunning) return;
    setWriteBlocked(true);
    let revision = guards.expected_content_revision;

    setBulkConfirm(false);
    setBulkRunning(true);
    setBulkError(null);
    const completed = new Set(bulkCompleted);
    let changed = false;

    try {
      for (const nodeId of remainingSecurityAdvisoryBulkNodeIds(bulkTargetIds, completed)) {
        const payload = { ...parsed.payload, node: nodeId };
        const existing = nodeStatusMap(capturedStatuses).get(nodeId);
        const nextGuards = { ...guards, expected_content_revision: revision };
        if (existing) {
          await updateSecurityAdvisoryNodeStatus(props.advisoryId, existing.id, {
            ...withoutNode(payload),
            ...nextGuards,
          });
        } else {
          await createSecurityAdvisoryNodeStatus(props.advisoryId, { ...payload, ...nextGuards });
        }
        revision = nextAdvisoryRevision(revision);
        changed = true;
        completed.add(nodeId);
        setBulkCompleted(new Set(completed));
      }

      if (changed) props.onChanged();
      setBulkOpen(false);
      pushToast({ variant: 'ok', title: t('admin.security_advisories.nodes.toast.bulk_saved') });
    } catch (error) {
      props.onChanged();
      const message = advisoryFailureMessage(error, t);
      setBulkError(message);
      pushToast({
        variant: 'danger',
        title: t('admin.security_advisories.nodes.toast.bulk_failed'),
        body: message,
        autoDismissMs: false,
      });
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <Card testId="admin.security_advisories.nodes.panel">
      <CardHeader
        className="flex-col md:flex-row"
        title={t('admin.security_advisories.nodes.title')}
        subtitle={t('admin.security_advisories.nodes.subtitle')}
        actions={
          <Button
            variant="secondary"
            className="min-h-11 md:min-h-9"
            onClick={openBulk}
            disabled={props.loading || activeNodes.length === 0}
            testId="admin.security_advisories.nodes.bulk.open"
          >
            <Layers3 size={16} /> {t('admin.security_advisories.nodes.action.bulk')}
          </Button>
        }
      />

      {props.loading ? (
        <CardBody>
          <LoadingState />
        </CardBody>
      ) : relevantNodes.length === 0 ? (
        <CardBody>
          <Alert variant="neutral" title={t('admin.security_advisories.nodes.empty.title')}>
            {t('admin.security_advisories.nodes.empty.body')}
          </Alert>
        </CardBody>
      ) : (
        <TableCard
          className="rounded-none border-0 shadow-none"
          tableClassName="block md:table md:min-w-table-lg"
          testId="admin.security_advisories.nodes.table"
        >
          <thead className="hidden md:table-header-group">
            <tr>
              <th>{t('admin.security_advisories.nodes.table.node')}</th>
              <th>{t('admin.security_advisories.nodes.table.type')}</th>
              <th>{t('admin.security_advisories.nodes.table.state')}</th>
              <th>{t('admin.security_advisories.nodes.table.vulnerable_until')}</th>
              <th>{t('admin.security_advisories.nodes.table.mitigated_since')}</th>
              <th>{t('admin.security_advisories.nodes.table.note')}</th>
              <th className="text-right">{t('admin.security_advisories.nodes.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group">
            {relevantNodes.map((node) => {
              const status = statusesByNode.get(node.id) ?? null;
              const state = String(status?.state ?? 'missing');
              return (
                <tr
                  key={node.id}
                  className="table-row-tone block border-b border-border last:border-b-0 md:table-row md:border-0"
                  data-testid={`admin.security_advisories.nodes.row.${node.id}`}
                >
                  <td className="grid min-w-0 grid-cols-[minmax(7rem,0.42fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2 md:table-cell md:p-0">
                    <MobileCellLabel>{t('admin.security_advisories.nodes.table.node')}</MobileCellLabel>
                    <div className="min-w-0">
                      <div className="break-words font-semibold">{nodeLabel(node)}</div>
                      <div className="text-xs text-faint">#{node.id}</div>
                    </div>
                  </td>
                  <td className="grid min-w-0 grid-cols-[minmax(7rem,0.42fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2 md:table-cell md:p-0">
                    <MobileCellLabel>{t('admin.security_advisories.nodes.table.type')}</MobileCellLabel>
                    <span className="min-w-0 break-words">
                      {t(`admin.security_advisories.nodes.type.${String(node.type ?? 'node')}`)}
                    </span>
                  </td>
                  <td className="grid min-w-0 grid-cols-[minmax(7rem,0.42fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2 md:table-cell md:p-0">
                    <MobileCellLabel>{t('admin.security_advisories.nodes.table.state')}</MobileCellLabel>
                    <div className="min-w-0">
                      <Badge variant={stateBadgeVariant(state)}>
                        {state === 'missing' ? t('admin.security_advisories.nodes.state.missing') : stateLabel(state)}
                      </Badge>
                    </div>
                  </td>
                  <td className="grid min-w-0 grid-cols-[minmax(7rem,0.42fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2 text-sm text-muted md:table-cell md:whitespace-nowrap md:p-0">
                    <MobileCellLabel>{t('admin.security_advisories.nodes.table.vulnerable_until')}</MobileCellLabel>
                    <span className="min-w-0 break-words">
                      {status?.vulnerable_until ? formatDateTime(status.vulnerable_until) : '—'}
                    </span>
                  </td>
                  <td className="grid min-w-0 grid-cols-[minmax(7rem,0.42fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2 text-sm text-muted md:table-cell md:whitespace-nowrap md:p-0">
                    <MobileCellLabel>{t('admin.security_advisories.nodes.table.mitigated_since')}</MobileCellLabel>
                    <span className="min-w-0 break-words">
                      {status?.mitigated_since ? formatDateTime(status.mitigated_since) : '—'}
                    </span>
                  </td>
                  <td className="grid min-w-0 grid-cols-[minmax(7rem,0.42fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2 text-sm text-muted md:table-cell md:max-w-xs md:p-0">
                    <MobileCellLabel>{t('admin.security_advisories.nodes.table.note')}</MobileCellLabel>
                    <span className="min-w-0 break-words">
                      {String(
                        status?.[`${i18n.preferredLanguageCodes[0] ?? 'en'}_note`] ?? status?.['en_note'] ?? ''
                      ) || '—'}
                    </span>
                  </td>
                  <td className="grid min-w-0 grid-cols-[minmax(7rem,0.42fr)_minmax(0,1fr)] items-start gap-3 px-3 py-2 md:table-cell md:p-0">
                    <MobileCellLabel>{t('admin.security_advisories.nodes.table.actions')}</MobileCellLabel>
                    <div className="flex min-w-0 flex-wrap justify-end gap-2 md:flex-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="min-h-11 w-full whitespace-nowrap md:min-h-8 md:w-auto md:whitespace-normal"
                        onClick={() => void openEditor(node, status)}
                        disabled={node.active === false}
                        testId={`admin.security_advisories.nodes.row.${node.id}.edit`}
                      >
                        <Pencil size={14} /> {t('admin.security_advisories.nodes.action.edit')}
                      </Button>
                      {status ? (
                        <Button
                          size="sm"
                          variant="danger"
                          className="min-h-11 w-full whitespace-nowrap md:min-h-8 md:w-auto md:whitespace-normal"
                          onClick={() => {
                            void capture(['DELETE'])
                              .then(() => {
                                setDeleteError(null);
                                setDeleteTarget({ node, status });
                              })
                              .catch((error) =>
                                pushToast({
                                  variant: 'danger',
                                  title: t('common.error'),
                                  body: advisoryFailureMessage(error, t),
                                })
                              );
                          }}
                          testId={`admin.security_advisories.nodes.row.${node.id}.delete`}
                        >
                          <Trash2 size={14} /> {t('admin.security_advisories.nodes.action.delete')}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}

      <Modal
        open={editor !== null}
        onClose={() => !editorSaving && setEditor(null)}
        title={t('admin.security_advisories.nodes.editor.title', { node: editor ? nodeLabel(editor.node) : '' })}
        testId="admin.security_advisories.nodes.editor"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditor(null)} disabled={editorSaving}>
              {t('admin.security_advisories.nodes.action.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={saveEditor}
              loading={editorSaving}
              disabled={
                !editorPayload?.valid ||
                writeBlocked ||
                (resolved && !['not_affected', 'mitigated'].includes(editorValues.state))
              }
              testId="admin.security_advisories.nodes.editor.save"
            >
              {t('admin.security_advisories.nodes.action.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {editorError ? (
            <Alert variant="danger" title={t('admin.security_advisories.nodes.error.title')}>
              {editorError}
            </Alert>
          ) : null}
          <SecurityAdvisoryNodeFormFields
            values={editorValues}
            onChange={setEditorValues}
            testId="admin.security_advisories.nodes.editor"
            resolved={resolved}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.security_advisories.nodes.delete.title')}
        description={t('admin.security_advisories.nodes.delete.description', {
          node: deleteTarget ? nodeLabel(deleteTarget.node) : '',
        })}
        danger
        confirmLabel={t('admin.security_advisories.nodes.action.delete')}
        confirmLoading={deleting}
        onConfirm={deleteStatus}
        onCancel={() => setDeleteTarget(null)}
        testId="admin.security_advisories.nodes.delete"
        confirmDisabled={writeBlocked}
      >
        {deleteError ? (
          <Alert variant="danger" title={t('common.error')}>
            {deleteError}
          </Alert>
        ) : null}
      </ConfirmDialog>

      <Modal
        open={bulkOpen}
        onClose={() => !bulkRunning && setBulkOpen(false)}
        title={t('admin.security_advisories.nodes.bulk.title')}
        testId="admin.security_advisories.nodes.bulk"
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted">
              {t('admin.security_advisories.nodes.bulk.progress', {
                completed: bulkCompleted.size,
                total: bulkTargetIds.length,
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setBulkOpen(false)} disabled={bulkRunning}>
                {t('admin.security_advisories.nodes.action.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={() => setBulkConfirm(true)}
                loading={bulkRunning}
                disabled={
                  !bulkPayload.valid ||
                  remainingBulkIds.length === 0 ||
                  writeBlocked ||
                  (resolved && !['not_affected', 'mitigated'].includes(bulkValues.state))
                }
                testId="admin.security_advisories.nodes.bulk.apply"
              >
                {bulkError && bulkCompleted.size > 0
                  ? t('admin.security_advisories.nodes.action.continue_remaining')
                  : t('admin.security_advisories.nodes.action.apply')}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert variant="warn" title={t('admin.security_advisories.nodes.bulk.warning_title')}>
            {t('admin.security_advisories.nodes.bulk.warning_body', { count: bulkTargetIds.length })}
          </Alert>
          {bulkError ? (
            <Alert variant="danger" title={t('admin.security_advisories.nodes.bulk.partial_failure_title')}>
              {t('admin.security_advisories.nodes.bulk.partial_failure_body', {
                completed: bulkCompleted.size,
                remaining: remainingBulkIds.length,
              })}
              <div className="mt-1">{bulkError}</div>
            </Alert>
          ) : null}
          <SecurityAdvisoryNodeFormFields
            values={bulkValues}
            onChange={setBulkValues}
            testId="admin.security_advisories.nodes.bulk"
            resolved={resolved}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={bulkConfirm}
        title={t('admin.security_advisories.nodes.bulk.confirm_title')}
        description={t('admin.security_advisories.nodes.bulk.confirm_description', {
          count: remainingBulkIds.length,
          state: stateLabel(bulkValues.state),
        })}
        danger
        confirmLabel={t('admin.security_advisories.nodes.action.apply')}
        onConfirm={runBulk}
        onCancel={() => setBulkConfirm(false)}
        testId="admin.security_advisories.nodes.bulk.confirm"
      />
    </Card>
  );
}
