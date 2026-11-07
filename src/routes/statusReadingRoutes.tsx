import type { RouteObject } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { ErrorPage } from '../pages/ErrorPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ParamKeyedRoute } from './ParamKeyedRoute';
import { lazyRoute } from './lazyRoute';
import * as CoreRoutes from './coreRouteComponents';

const AboutPage = lazyRoute(() => import('../pages/public/AboutPage'), 'AboutPage');

export const statusReadingRoutes: RouteObject[] = [
  { path: 'outages', element: <CoreRoutes.OutagesPage /> },
  { path: 'outages/:outageId', element: <CoreRoutes.OutageDetailPage /> },
  { path: 'security-advisories', element: <CoreRoutes.SecurityAdvisoriesPage /> },
  { path: 'security-advisories/:advisoryId', element: <CoreRoutes.SecurityAdvisoryDetailPage /> },
];

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <ErrorPage />,
    children: [
      ...statusReadingRoutes,
      { index: true, element: <CoreRoutes.OverviewPage /> },
      { path: 'news', element: <CoreRoutes.NewsPage /> },
      { path: 'about', element: <AboutPage /> },
      {
        path: 'requests/registrations/:requestId/:token',
        element: (
          <ParamKeyedRoute params={['requestId', 'token']}>
            <CoreRoutes.RegistrationCorrectionPage />
          </ParamKeyedRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
      // The old webui has a useful index page. We keep public status pages accessible.
    ],
  },
];
