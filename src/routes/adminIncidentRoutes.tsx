import type { RouteObject } from 'react-router-dom';
import * as CoreRoutes from './coreRouteComponents';

export const adminIncidentRoutes: RouteObject[] = [
  { path: 'incidents', element: <CoreRoutes.IncidentsPage /> },
  { path: 'incidents/overview', element: <CoreRoutes.AdminIncidentOverviewPage /> },
  { path: 'incidents/history', element: <CoreRoutes.AdminIncidentHistoryPage /> },
  { path: 'incidents/new', element: <CoreRoutes.IncidentReportNewPage /> },
  { path: 'incidents/:incidentId', element: <CoreRoutes.IncidentReportDetailPage /> },
];
