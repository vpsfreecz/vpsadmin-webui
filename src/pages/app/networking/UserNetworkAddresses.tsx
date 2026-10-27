import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../app/i18n';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { StatusDot } from '../../../components/ui/StatusDot';
import { TableCard } from '../../../components/ui/TableCard';
import type { IpAddress } from '../../../lib/api/ipAddresses';
import type { Vps } from '../../../lib/api/vps';
import { assignableIpKind, ipAddressLabel, isAssignedIp, type AssignableIpKind } from './IpAddressAssignmentModel';
import { interfaceName, ipVpsId, ipOwnership } from './UserNetworkAddressesModel';

function locationLabel(ip: IpAddress): string {
  const primary = ip.network?.primary_location;
  const location = String(primary?.label ?? '').trim();
  const environment = String(primary?.environment?.label ?? '').trim();
  if (location && environment) return `${location} · ${environment}`;
  return location || environment || '—';
}

function kindTranslationKey(kind: AssignableIpKind) {
  if (kind === 'ipv4_private') return 'network.user.kind.ipv4_private' as const;
  if (kind === 'ipv6') return 'network.user.kind.ipv6' as const;
  return 'network.user.kind.ipv4_public' as const;
}

export function UserNetworkAddresses({
  rows,
  vpsById,
  assignedVpsByIpId,
  assignedIpIds,
  userId,
  basePath,
  rowActions,
}: {
  rows: IpAddress[];
  vpsById: Map<number, Vps>;
  assignedVpsByIpId: Map<number, number | null>;
  assignedIpIds: Set<number>;
  userId: number | null;
  basePath: string;
  rowActions: (ip: IpAddress) => React.ReactNode;
}) {
  const { t } = useI18n();
  const ownershipLabel = (ip: IpAddress) => {
    const owned = ipOwnership(ip, userId);
    return owned === null ? '—' : t(owned ? 'common.yes' : 'common.no');
  };
  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((ip) => {
          const vpsId = assignedVpsByIpId.get(ip.id) ?? ipVpsId(ip);
          const vps = vpsId ? vpsById.get(vpsId) : undefined;
          const assigned = assignedIpIds.has(ip.id) || isAssignedIp(ip);
          return (
            <Card key={ip.id} testId={`network.user.ip.card.${ip.id}`}>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <StatusDot variant={assigned ? 'ok' : 'warn'} />
                    <span className="break-all font-mono font-semibold">{ipAddressLabel(ip)}</span>
                  </div>
                  <Badge variant={assignableIpKind(ip) === 'ipv4_private' ? 'neutral' : 'info'}>
                    {t(kindTranslationKey(assignableIpKind(ip)))}
                  </Badge>
                </div>
                <div className="grid gap-1 text-xs text-muted">
                  <span>
                    {t('network.user.field.location')}: {locationLabel(ip)}
                  </span>
                  <span>
                    {t('network.user.field.vps')}: {vps?.hostname ?? (vpsId ? `#${vpsId}` : '—')}
                  </span>
                  <span>
                    {t('network.user.field.interface')}: {interfaceName(ip)}
                  </span>
                  <span>
                    {t('network.user.field.owned')}: {ownershipLabel(ip)}
                  </span>
                  {ip.network?.enabled === false ? (
                    <Badge variant="warn">{t('admin.cluster.networks.disabled')}</Badge>
                  ) : null}
                </div>
                <div className="flex justify-end">{rowActions(ip)}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <TableCard className="hidden md:block" minWidth="md" tableTestId="network.user.table">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="w-8 px-4 py-2" aria-label={t('common.state')} />
            <th className="px-4 py-2">{t('network.user.field.address')}</th>
            <th className="px-4 py-2">{t('network.user.field.type')}</th>
            <th className="px-4 py-2">{t('network.user.field.location')}</th>
            <th className="px-4 py-2">{t('network.user.field.vps')}</th>
            <th className="px-4 py-2">{t('network.user.field.interface')}</th>
            <th className="px-4 py-2">{t('network.user.field.owned')}</th>
            <th className="px-4 py-2 text-right">{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((ip) => {
            const vpsId = assignedVpsByIpId.get(ip.id) ?? ipVpsId(ip);
            const vps = vpsId ? vpsById.get(vpsId) : undefined;
            const assigned = assignedIpIds.has(ip.id) || isAssignedIp(ip);
            return (
              <tr
                key={ip.id}
                data-testid={`network.user.ip.row.${ip.id}`}
                className="border-b border-border/60 last:border-0"
              >
                <td className="px-4 py-3">
                  <StatusDot variant={assigned ? 'ok' : 'warn'} />
                </td>
                <td className="px-4 py-3 font-mono text-sm font-medium">
                  {ipAddressLabel(ip)}
                  {ip.network?.enabled === false ? (
                    <Badge variant="warn">{t('admin.cluster.networks.disabled')}</Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={assignableIpKind(ip) === 'ipv4_private' ? 'neutral' : 'info'}>
                    {t(kindTranslationKey(assignableIpKind(ip)))}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{locationLabel(ip)}</td>
                <td className="px-4 py-3 text-sm">
                  {vpsId ? (
                    <Link className="text-accent hover:underline" to={`${basePath}/vps/${vpsId}`}>
                      {vps?.hostname ?? `#${vpsId}`}
                    </Link>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted">{interfaceName(ip)}</td>
                <td className="px-4 py-3 text-sm text-muted">{ownershipLabel(ip)}</td>
                <td className="px-4 py-3 text-right">{rowActions(ip)}</td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>
    </>
  );
}
