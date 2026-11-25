import { useI18n } from '../../../../app/i18n';
import { FilterBar } from '../../../../components/layout/FilterBar';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { UserLookupInput } from '../../../../components/ui/UserLookupInput';
import { VpsLookupInput } from '../../../../components/ui/VpsLookupInput';

export function HostIpAddressFilters(props: {
  addr: string;
  userId: number | undefined;
  vpsId: number | undefined;
  assigned: boolean | undefined;
  active: boolean;
  onParamChange: (key: 'addr' | 'user' | 'vps' | 'assigned', value?: string) => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const { addr, userId, vpsId, assigned, active: filtersActive, onParamChange: setParam, onClear: clearFilters } = props;
  return (
    <FilterBar className="[&_input]:h-11 [&_select]:h-11">
      <div className="w-full sm:w-96">
        <Input testId="admin.host_ip_addresses.filter.addr" value={addr} onChange={(e) => setParam('addr', e.target.value)} placeholder={t('admin.network_list.exact_addr')} />
      </div>
      <div className="w-full sm:w-64">
        <UserLookupInput testId="admin.host_ip_addresses.filter.user" value={userId ? String(userId) : ''} onChange={(v) => setParam('user', v)} placeholder={t('admin.host_ip_addresses.filter.user.placeholder')} />
      </div>
      <div className="w-full sm:w-64">
        <VpsLookupInput testId="admin.host_ip_addresses.filter.vps" value={vpsId ?? null} onChange={(v) => setParam('vps', v == null ? '' : String(v))} placeholder={t('admin.host_ip_addresses.filter.vps.placeholder')} />
      </div>
      <div className="w-full sm:w-40">
        <Select
          testId="admin.host_ip_addresses.filter.assigned"
          value={assigned === undefined ? 'all' : assigned ? 'true' : 'false'}
          onChange={(e) => setParam('assigned', e.target.value === 'all' ? '' : e.target.value)}
          options={[
            { value: 'all', label: t('admin.host_ip_addresses.filter.assigned.all') },
            { value: 'true', label: t('admin.host_ip_addresses.filter.assigned.true') },
            { value: 'false', label: t('admin.host_ip_addresses.filter.assigned.false') },
          ]}
        />
      </div>
      {filtersActive ? <Button variant="secondary" className="h-11 w-full sm:w-auto" testId="admin.host_ip_addresses.filter.clear" onClick={clearFilters}>{t('common.clear_filters')}</Button> : null}
    </FilterBar>
  );
}
