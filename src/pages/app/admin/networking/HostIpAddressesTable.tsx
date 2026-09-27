import React from 'react';

import { useI18n } from '../../../../app/i18n';
import type { HostIpAddress } from '../../../../lib/api/networking';
import { Badge } from '../../../../components/ui/Badge';
import { KeysetPagination } from '../../../../components/ui/KeysetPagination';
import { StatusDot } from '../../../../components/ui/StatusDot';
import { TableCard } from '../../../../components/ui/TableCard';
import { clsx } from '../../../../components/ui/clsx';
import { toneSurfaceClass } from '../../../../components/ui/tone';
import { HostIpAddressRowActions } from '../ipAddresses/HostIpAddressRowActions';

function idOf(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'number') return value.id;
  return null;
}

function ipAddrLabel(row: HostIpAddress): string {
  const ip = row.ip_address;
  if (ip && typeof ip === 'object') {
    const addr = String(ip.ip_addr ?? ip.addr ?? '').trim();
    if (addr) return addr;
  }
  return '—';
}

function vpsLabel(row: HostIpAddress): string {
  const ni = row.ip_address?.network_interface;
  const vps = ni && typeof ni === 'object' && 'vps' in ni ? ni.vps : undefined;
  if (vps && typeof vps === 'object') {
    const hostname = String('hostname' in vps ? vps.hostname ?? '' : '').trim();
    const id = idOf(vps);
    if (hostname && id) return `${hostname} (#${id})`;
    if (hostname) return hostname;
    if (id) return `#${id}`;
  }
  return '—';
}

function userLabel(row: HostIpAddress): string {
  const user = row.ip_address?.user;
  if (user && typeof user === 'object') {
    const login = String('login' in user ? user.login ?? '' : '').trim();
    const id = idOf(user);
    if (login && id) return `${login} (#${id})`;
    if (login) return login;
    if (id) return `#${id}`;
  }
  return '—';
}

function ifaceLabel(row: HostIpAddress): string {
  const iface = row.ip_address?.network_interface;
  if (iface && typeof iface === 'object') {
    const name = String('name' in iface ? iface.name ?? '' : '').trim();
    const id = idOf(iface);
    if (name && id) return `${name} (#${id})`;
    if (name) return name;
    if (id) return `#${id}`;
  }
  return '—';
}

export function hostAddr(row: HostIpAddress): string {
  return String(row.addr ?? row['ip_addr'] ?? `#${row.id}`);
}

export function isDefaultHiddenLegacyHostIp(row: HostIpAddress): boolean {
  const address = `${hostAddr(row)} ${ipAddrLabel(row)}`.toLowerCase();
  return address.startsWith('83.167.228.') || address.includes(' 83.167.228.') ||
    address.startsWith('2a01:430:17:') || address.includes(' 2a01:430:17:');
}

function MobileCellLabel(props: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-semibold text-muted md:hidden">{props.children}</div>;
}

export function HostIpAddressesTable(props: {
  rows: HostIpAddress[];
  partial: boolean;
  page: number;
  pageCount: number;
  limit: number;
  ptrLoadingId: number | null;
  assignPending: boolean;
  freePending: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onEditPtr: (id: number) => void;
  onAssign: (row: HostIpAddress) => void;
  onFree: (id: number) => void;
  onDelete: (row: HostIpAddress) => void;
}) {
  const { t } = useI18n();
  return (
    <TableCard
      testId="admin.host_ip_addresses.table"
      className="relative min-w-0 max-w-full overflow-x-hidden"
      tableClassName="block md:table"
      footer={<KeysetPagination
        testId="admin.host_ip_addresses.pagination"
        page={props.page}
        pageCount={props.pageCount}
        canPrev={props.page > 1}
        canNext={props.page < props.pageCount}
        onPrev={() => props.onPageChange(props.page - 1)}
        onNext={() => props.onPageChange(props.page + 1)}
        onGoToPage={props.onPageChange}
        limit={props.limit}
        onLimitChange={props.onLimitChange}
      />}
    >
      <thead className="hidden md:table-header-group">
        <tr>
          <th aria-label={t('common.state')} />
          <th>{t('admin.host_ip_addresses.field.address')}</th>
          <th>{t('admin.host_ip_addresses.field.route')}</th>
          <th>{t('admin.host_ip_addresses.field.interface')}</th>
          <th>{t('admin.host_ip_addresses.field.vps')}</th>
          <th>{t('admin.host_ip_addresses.field.user')}</th>
          <th>{t('admin.host_ip_addresses.field.ptr')}</th>
          <th>{t('admin.host_ip_addresses.field.flags')}</th>
          <th><span className="sr-only">{t('common.actions')}</span></th>
        </tr>
      </thead>
      <tbody className="block md:table-row-group">
        {props.rows.map((row) => {
          const id = row.id;
          const variant = row.assigned === false ? 'warn' : undefined;
          return (
            <tr
              key={id}
              data-testid={`admin.host_ip_addresses.row.${id}`}
              data-row-variant={variant}
              className={clsx(
                'block border-b border-border last:border-b-0 md:table-row md:border-b-0',
                variant ? toneSurfaceClass(variant) : undefined,
              )}
            >
              <td className="hidden md:table-cell">
                <StatusDot variant={row.assigned === true ? 'ok' : variant ?? 'neutral'} testId={`admin.host_ip_addresses.row.${id}.dot`} />
              </td>
              <td className="block px-3 pb-1 pt-3 font-medium tabular-nums md:table-cell md:p-0">
                <MobileCellLabel>{t('admin.host_ip_addresses.field.address')}</MobileCellLabel>
                <span className="break-words">{hostAddr(row)}</span>
              </td>
              <td className="block px-3 py-1 tabular-nums md:table-cell md:p-0">
                <MobileCellLabel>{t('admin.host_ip_addresses.field.route')}</MobileCellLabel>
                <span className="break-words">{ipAddrLabel(row)}</span>
              </td>
              <td className="block px-3 py-1 md:table-cell md:p-0">
                <MobileCellLabel>{t('admin.host_ip_addresses.field.interface')}</MobileCellLabel>
                <span className="break-words">{ifaceLabel(row)}</span>
              </td>
              <td className="block px-3 py-1 md:table-cell md:p-0">
                <MobileCellLabel>{t('admin.host_ip_addresses.field.vps')}</MobileCellLabel>
                <span className="break-words">{vpsLabel(row)}</span>
              </td>
              <td className="block px-3 py-1 md:table-cell md:p-0">
                <MobileCellLabel>{t('admin.host_ip_addresses.field.user')}</MobileCellLabel>
                <span className="break-words">{userLabel(row)}</span>
              </td>
              <td className="block px-3 py-1 md:table-cell md:max-w-80 md:truncate md:p-0">
                <MobileCellLabel>{t('admin.host_ip_addresses.field.ptr')}</MobileCellLabel>
                <span className="break-words">{String(row.reverse_record_value ?? t('common.na'))}</span>
              </td>
              <td className="block px-3 py-1 md:table-cell md:p-0">
                <MobileCellLabel>{t('admin.host_ip_addresses.field.flags')}</MobileCellLabel>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={row.assigned === false ? 'warn' : row.assigned === true ? 'ok' : 'neutral'}>
                    {row.assigned === false ? t('common.unassigned') : row.assigned === true ? t('common.assigned') : t('common.na')}
                  </Badge>
                  {row.user_created === true ? <Badge tone="neutral">{t('common.custom')}</Badge> : null}
                </div>
              </td>
              <td className="block px-3 pb-3 pt-1 md:table-cell md:p-0 md:text-right">
                <MobileCellLabel>{t('common.actions')}</MobileCellLabel>
                <HostIpAddressRowActions
                  assigned={row.assigned}
                  userCreated={row.user_created === true}
                  allowStateActions={!props.partial}
                  testIdPrefix={`admin.host_ip_addresses.row.${id}`}
                  responsive
                  assignLoading={props.assignPending}
                  freeLoading={props.freePending}
                  onEditPtr={() => { if (props.ptrLoadingId === null) props.onEditPtr(id); }}
                  onAssign={() => props.onAssign(row)}
                  onFree={() => props.onFree(id)}
                  onDelete={() => props.onDelete(row)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableCard>
  );
}
