import { Server, Wrench } from 'lucide-react';
import { NodeHeatmapButton } from '../../../../components/cluster/NodeHeatmaps';
import { Button } from '../../../../components/ui/Button';
import { CopyButton } from '../../../../components/ui/CopyButton';
import { useNodesMaintenance } from './NodesMaintenanceProvider';
import type { NodeRow } from '../NodesModel';
import type { NodesPageTranslator } from '../NodesFilters';

export function NodesRowActions({ row, basePath, t, layout = 'row' }: { row: NodeRow; basePath: string; t: NodesPageTranslator; layout?: 'row' | 'card' }) {
  const openMaintenance = useNodesMaintenance();
  const nodeId = row.id;
  return (
    <div className="flex flex-wrap items-center gap-2 md:w-44" data-row-no-nav>
      {openMaintenance && typeof nodeId === 'number' ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openMaintenance({ id: nodeId, name: row.name })}
          testId={`admin.nodes.${layout}.${nodeId}.maintenance`}
        >
          <Wrench className="h-5 w-5" aria-hidden="true" />
          {t('admin.nodes.maintenance.action')}
        </Button>
      ) : null}
      {typeof nodeId === 'number' ? (
        <Button
          to={`${basePath}/vps?node=${nodeId}`}
          variant="secondary"
          size="sm"
          title={t('admin.node.action.show_vps.title')}
          testId={`admin.nodes.${layout}.${nodeId}.vps`}
        >
          <Server className="h-5 w-5" aria-hidden="true" />
          {t('admin.nodes.action.vpses')}
        </Button>
      ) : null}
      <CopyButton
        text={row.fqdn || row.name}
        label={t('admin.nodes.copy_hostname')}
        size="sm"
        variant="secondary"
        testId={typeof nodeId === 'number' ? `admin.nodes.${layout}.${nodeId}.copy` : undefined}
      />
      <NodeHeatmapButton node={row} showLabel />
    </div>
  );
}
