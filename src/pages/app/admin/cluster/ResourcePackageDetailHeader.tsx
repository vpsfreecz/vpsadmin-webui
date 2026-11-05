import React from 'react';
import { Link } from 'react-router-dom';
import type { I18nContextValue } from '../../../../app/i18n';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { ObjectHeader } from '../../../../components/ui/ObjectHeader';
import { StatCard } from '../../../../components/ui/StatCard';

type Props = {
  t: I18nContextValue['t'];
  id: number;
  label: string;
  badge: { variant: 'warn' | 'neutral'; label: string };
  personal: boolean;
  environmentDisplay: string;
  userDisplay: string;
  itemCountDisplay: string;
  assignmentCountDisplay: string;
  openPkgEditor: () => void;
  onDelete: () => void;
};

export function ResourcePackageDetailHeader({
  t,
  id,
  label,
  badge,
  personal,
  environmentDisplay,
  userDisplay,
  itemCountDisplay,
  assignmentCountDisplay,
  openPkgEditor,
  onDelete,
}: Props) {
  return (
    <ObjectHeader
      testId="admin.cluster.resource_package_detail.header"
      kicker={
        <span>
          <Link className="hover:underline" to="/admin/cluster/resource-packages">
            {t('admin.cluster.tab.resource_packages')}
          </Link>{' '}
          · <span className="font-mono text-xs">#{id}</span>
        </span>
      }
      title={label}
      badges={<Badge variant={badge.variant}>{badge.label}</Badge>}
      meta={
        personal ? (
          <span>
            {t('common.environment')}: <span className="font-medium text-fg">{environmentDisplay}</span>
            <span className="mx-2 text-faint">·</span>
            {t('common.user')}: <span className="font-medium text-fg">{userDisplay}</span>
          </span>
        ) : (
          <span>{t('admin.cluster.resource_package_detail.meta.global')}</span>
        )
      }
      right={
        <div className="flex items-center gap-2">
          <StatCard size="sm" label={t('admin.cluster.resource_package_detail.stat.items')} value={itemCountDisplay} />
          <StatCard
            size="sm"
            label={t('admin.cluster.resource_package_detail.stat.assigned')}
            value={personal ? '—' : assignmentCountDisplay}
          />
        </div>
      }
      actions={
        <>
          <Button variant="secondary" onClick={openPkgEditor} testId="admin.cluster.resource_package_detail.edit">
            {t('common.edit')}
          </Button>
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={personal}
            disabledReason={personal ? t('admin.cluster.resource_packages.delete_disabled.personal') : undefined}
            testId="admin.cluster.resource_package_detail.delete"
          >
            {t('common.delete')}
          </Button>
        </>
      }
    />
  );
}
