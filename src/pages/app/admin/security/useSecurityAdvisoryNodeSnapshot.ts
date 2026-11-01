import { useMemo, useState } from 'react';
import { useI18n } from '../../../../app/i18n';
import type { Node } from '../../../../lib/api/nodes';
import type {
  SecurityAdvisory,
  SecurityAdvisoryNodeStatus,
  SecurityAdvisoryMutationGuards,
} from '../../../../lib/api/securityAdvisories';
import {
  advisoryGuards,
  requireAdvisoryActions,
  type AdvisoryAction,
} from '../../../../lib/api/securityAdvisoryMutations';
import { relevantSecurityAdvisoryNodes } from './securityAdvisoryAdminModel';
import { fetchAdvisoryEditSnapshot } from './securityAdvisoryAdminApi';
import { securityAdvisoryNodeStatusNodeId } from './SecurityAdvisoryNodeForm';

export function nodeStatusMap(statuses: SecurityAdvisoryNodeStatus[]): Map<number, SecurityAdvisoryNodeStatus> {
  const result = new Map<number, SecurityAdvisoryNodeStatus>();
  for (const status of [...statuses].sort((a, b) => a.id - b.id)) {
    const nodeId = securityAdvisoryNodeStatusNodeId(status);
    if (nodeId !== null) result.set(nodeId, status);
  }
  return result;
}

export function useSecurityAdvisoryNodeSnapshot(props: {
  advisoryId: number;
  advisory: SecurityAdvisory;
  nodes: Node[];
  statuses: SecurityAdvisoryNodeStatus[];
}) {
  const { t } = useI18n();
  const activeNodes = useMemo(() => relevantSecurityAdvisoryNodes(props.nodes), [props.nodes]);
  const relevantNodes = useMemo(() => {
    const all = new Map(activeNodes.map((node) => [node.id, node]));
    for (const status of props.statuses) {
      const id = securityAdvisoryNodeStatusNodeId(status);
      if (id !== null && !all.has(id))
        all.set(id, { id, ...(typeof status.node === 'object' ? status.node : {}), active: false } as Node);
    }
    return [...all.values()];
  }, [activeNodes, props.statuses]);
  const resolved = props.advisory.state !== 'draft';
  const [guards, setGuards] = useState<SecurityAdvisoryMutationGuards | null>(null);
  const [writeBlocked, setWriteBlocked] = useState(false);
  const [capturedStatuses, setCapturedStatuses] = useState<SecurityAdvisoryNodeStatus[]>([]);
  const capture = async (actions: Array<'create' | 'update' | 'delete'>) => {
    const snapshot = await fetchAdvisoryEditSnapshot(props.advisoryId);
    // Reject changes to the rendered parent before capturing current child values.
    const rendered = advisoryGuards(props.advisory);
    if (
      rendered.expected_content_revision !== snapshot.guards.expected_content_revision ||
      rendered.expected_state !== snapshot.guards.expected_state
    ) {
      throw new Error(t('admin.security_advisories.correction.reload'));
    }
    await requireAdvisoryActions(
      actions.map((action): AdvisoryAction => ({ resource: 'node_status', action })),
      snapshot.guards
    );
    setGuards(snapshot.guards);
    setWriteBlocked(false);
    setCapturedStatuses(snapshot.statuses);
    return snapshot;
  };
  const captureEditor = async (node: Node, status: SecurityAdvisoryNodeStatus | null) => {
    const snapshot = await capture([status ? 'update' : 'create']);
    const current = nodeStatusMap(snapshot.statuses).get(node.id) ?? null;
    if (status ? current?.id !== status.id : current !== null) {
      throw new Error(t('admin.security_advisories.correction.reload'));
    }
    return current;
  };
  const statusesByNode = useMemo(() => nodeStatusMap(props.statuses), [props.statuses]);

  return {
    activeNodes,
    relevantNodes,
    statusesByNode,
    resolved,
    guards,
    setGuards,
    writeBlocked,
    setWriteBlocked,
    capturedStatuses,
    capture,
    captureEditor,
  };
}

export function stateBadgeVariant(state: string): 'neutral' | 'ok' | 'warn' | 'danger' {
  if (state === 'not_affected') return 'ok';
  if (state === 'mitigated') return 'warn';
  if (state === 'vulnerable') return 'danger';
  return 'neutral';
}

export function nodeLabel(node: Node): string {
  return String(node.domain_name ?? node.fqdn ?? node.name ?? `#${node.id}`);
}
