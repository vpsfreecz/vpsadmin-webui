import React from 'react';
import { useI18n } from '../../../app/i18n';
import { TableCard } from '../../../components/ui/TableCard';
import type { SnapshotRemovalManifest } from '../../../lib/api/datasetSnapshotRemovalManifest';

export function SnapshotRemovalTotals({ manifest }: { manifest: SnapshotRemovalManifest }) {
  const { t } = useI18n();
  return (
    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" data-testid="dataset.snapshot_removal.totals">
      {(['datasets', 'copies', 'snapshots', 'snapshot_locations', 'trees', 'branches', 'plans', 'plans_to_disable'] as const).map(key => (
        <div key={key}>
          <dt className="text-muted">{t(`dataset.snapshot_removal.count.${key}`)}</dt>
          <dd className="font-semibold tabular-nums">{manifest.counts[key]}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Every row comes from the one validated complete inventory, including empty structures. */
export function DatasetSnapshotRemovalReview({ manifest }: { manifest: SnapshotRemovalManifest }) {
  const { t } = useI18n();
  const branches = new Map(manifest.branches.map(row => [row.id, row]));
  const trees = new Map(manifest.trees.map(row => [row.id, row]));
  const locationContext = (row: SnapshotRemovalManifest['snapshot_locations'][number]) => {
    const branch = row.branch_id === null ? undefined : branches.get(row.branch_id);
    const tree = branch ? trees.get(branch.dataset_tree_id) : undefined;
    return branch && tree ? `${tree.name} (#${tree.id}) / ${branch.name} (#${branch.id})`
      : t('dataset.snapshot_removal.source');
  };
  const locationFacts = (row: SnapshotRemovalManifest['snapshot_locations'][number]) => (
    <>
      <div>{locationContext(row)}</div>
      <div>{t('dataset.snapshot_removal.copy_id')}: {`#${row.snapshot_in_pool_id}`}</div>
      {row.snapshot_in_pool_in_branch_id !== null ? <div>{t('dataset.snapshot_removal.membership')}: {`#${row.snapshot_in_pool_in_branch_id}`}</div> : null}
      {row.origin_snapshot_in_pool_in_branch_id !== null ? <div>{t('dataset.snapshot_removal.origin')}: {`#${row.origin_snapshot_in_pool_in_branch_id}`}</div> : null}
    </>
  );
  return (
    <div className="space-y-4" data-testid="dataset.snapshot_removal.inventory">
      <SnapshotRemovalTotals manifest={manifest} />
      {manifest.datasets.map(dataset => (
        <section key={dataset.id} className="min-w-0 space-y-3" data-testid={`dataset.snapshot_removal.dataset.${dataset.id}`}>
          <h3 className="break-all font-semibold">{dataset.full_name} (#{dataset.id})</h3>
          <p className="text-xs text-muted">
            {t('dataset.snapshot_removal.owner')}: {`#${dataset.user_id}`} · {t('dataset.snapshot_removal.parent')}: {dataset.parent_id === null ? t('common.na') : `#${dataset.parent_id}`} · {t('dataset.snapshot_removal.history')}: {dataset.current_history_id}
          </p>
          {manifest.copies.filter(copy => copy.dataset_id === dataset.id).map(copy => {
            const locations = manifest.snapshot_locations.filter(row => row.dataset_in_pool_id === copy.id);
            const copyTrees = manifest.trees.filter(row => row.dataset_in_pool_id === copy.id);
            const plans = manifest.plans.filter(row => row.dataset_in_pool_id === copy.id);
            return (
              <section key={copy.id} className="min-w-0 space-y-3 rounded-lg border border-border p-3" data-testid={`dataset.snapshot_removal.copy.${copy.id}`}>
                <h4 className="break-words text-sm font-semibold">{copy.pool_label} (#{copy.pool_id}) · {copy.node_name} (#{copy.node_id})</h4>
                <p className="break-all text-xs text-muted">
                  {t(`dataset.snapshot_removal.role.${copy.pool_role}`)} · {copy.pool_filesystem} · {t('dataset.snapshot_removal.dataset_copy')}: {`#${copy.id}`} · {t(copy.pool_open ? 'dataset.snapshot_removal.pool_open' : 'dataset.snapshot_removal.pool_closed')}
                </p>
                {locations.length === 0 ? <p className="text-sm text-muted">{t('dataset.snapshot_removal.no_snapshots')}</p> : (
                  <div className="@container">
                    <div className="space-y-2 @4xl:hidden">
                      {locations.map(row => <TableCard
                        key={`${row.snapshot_in_pool_id}:${row.snapshot_in_pool_in_branch_id}`}
                        title={`${row.snapshot_name} (#${row.snapshot_id})`}
                        subtitle={row.snapshot_label}
                        rows={[
                          { label: t('dataset.snapshot_removal.created'), value: row.created_at ?? t('common.na') },
                          { label: t('dataset.snapshot_removal.history'), value: row.history_id },
                          { label: t('dataset.snapshot_removal.location'), value: locationFacts(row) },
                        ]}
                      />)}
                    </div>
                    <TableCard className="hidden @4xl:block" minWidth="md">
                      <thead><tr>
                        {['snapshot', 'created', 'history', 'location'].map(key => <th key={key} className="px-3 py-2 text-left text-xs text-muted">{t(`dataset.snapshot_removal.${key}`)}</th>)}
                      </tr></thead>
                      <tbody>{locations.map(row => <tr key={`${row.snapshot_in_pool_id}:${row.snapshot_in_pool_in_branch_id}`}>
                        <td className="break-all px-3 py-2">{row.snapshot_name} (#{row.snapshot_id}){row.snapshot_label ? <div className="text-xs text-muted">{row.snapshot_label}</div> : null}</td>
                        <td className="px-3 py-2">{row.created_at ?? t('common.na')}</td>
                        <td className="px-3 py-2">{row.history_id}</td>
                        <td className="break-words px-3 py-2 text-xs">{locationFacts(row)}</td>
                      </tr>)}</tbody>
                    </TableCard>
                  </div>
                )}
                {copyTrees.length ? <div className="space-y-2 text-sm">
                  <h5 className="font-semibold">{t('dataset.snapshot_removal.structures')}</h5>
                  {copyTrees.map(tree => <div key={tree.id} className="break-all" data-testid={`dataset.snapshot_removal.tree.${tree.id}`}>
                    {tree.name} (#{tree.id}) · {t(tree.head ? 'dataset.snapshot_removal.head' : 'dataset.snapshot_removal.historical')}
                    <ul className="ml-4 list-disc">{manifest.branches.filter(row => row.dataset_tree_id === tree.id).map(branch => <li key={branch.id}>
                      {branch.name} (#{branch.id}) · {t(branch.head ? 'dataset.snapshot_removal.head' : 'dataset.snapshot_removal.historical')}
                    </li>)}</ul>
                  </div>)}
                </div> : null}
                {plans.length ? <div className="text-sm">
                  <h5 className="font-semibold">{t('dataset.snapshot_removal.plan_effects')}</h5>
                  <ul className="ml-4 list-disc">{plans.map(plan => <li key={plan.id} className="break-words">
                    {plan.name} (#{plan.id}; {t('dataset.snapshot_removal.plan_id')}: {`#${plan.dataset_plan_id}`}; {t('dataset.snapshot_removal.environment_plan')}: {`#${plan.environment_dataset_plan_id}`}) · {t(`dataset.snapshot_removal.plan.${plan.action}`)}
                  </li>)}</ul>
                </div> : null}
              </section>
            );
          })}
        </section>
      ))}
    </div>
  );
}
