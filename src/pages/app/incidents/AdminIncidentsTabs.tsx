import { useLocation } from 'react-router-dom';
import { useAppMode } from '../../../app/appMode';
import { useAuth } from '../../../app/auth';
import { useI18n } from '../../../app/i18n';
import { TabsNav } from '../../../components/ui/TabsNav';

export function AdminIncidentsTabs() {
  const { mode } = useAppMode();
  const auth = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  if (mode !== 'admin' || auth.role !== 'admin') return null;
  return (
    <TabsNav
      testId="incidents.admin.tabs"
      items={(
        [
          ['/admin/incidents/overview', 'incidentAdmin.overview'],
          ['/admin/incidents', 'incidentAdmin.reports'],
          ['/admin/incidents/history', 'incidentAdmin.history'],
        ] as const
      ).map(([path, key]) => ({
        to: path + (location.pathname === path ? location.search : ''),
        label: t(key),
        end: true,
      }))}
    />
  );
}
