import type { RouteObject } from 'react-router-dom';
import * as CoreRoutes from './coreRouteComponents';

export const vpsDetailRoutes: RouteObject[] = [
  { index: true, element: <CoreRoutes.VpsOverviewPage /> },
  { path: 'config', element: <CoreRoutes.VpsConfigurationPage /> },
  { path: 'access', element: <CoreRoutes.VpsAccessPage /> },
  { path: 'network', element: <CoreRoutes.VpsNetworkPage /> },
  { path: 'storage', element: <CoreRoutes.VpsStoragePage /> },
  { path: 'features', element: <CoreRoutes.VpsFeaturesPage /> },
  { path: 'maintenance', element: <CoreRoutes.VpsMaintenancePage /> },
  { path: 'history', element: <CoreRoutes.VpsHistoryPage /> },
  { path: 'incidents', element: <CoreRoutes.VpsIncidentPoliciesPage /> },
  { path: 'pressure', element: <CoreRoutes.VpsPressurePage /> },
  { path: 'lifecycle', element: <CoreRoutes.VpsLifecyclePage /> },
  { path: 'lifecycle/:lifecycleAction', element: <CoreRoutes.VpsLifecyclePage /> },
  { path: 'console', element: <CoreRoutes.VpsConsolePage /> },
];
