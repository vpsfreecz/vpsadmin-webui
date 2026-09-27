# Generated implementation inventory

Generated with `npm run docs:inventory`. Checked with `npm run audit:design-docs`.

This is a source inventory, not proof of API permissions, feature parity, or test coverage.
Paths are relative to the configured router basename. Parent layers include scope/auth
wrappers; page-level action guards and API authorization still apply.

## Routes (256 entries, including layouts and index routes)

| Route | Kind | Element | Parent layers | Source |
| --- | --- | --- | --- | --- |
| `/oauth/login` | page/redirect | `<OAuthLoginPage />` | `<RouteProvidersLayout />` | [source](../../src/routes/router.tsx) |
| `/oauth/callback` | page/redirect | `<OAuthCallbackPage />` | `<RouteProvidersLayout />` | [source](../../src/routes/router.tsx) |
| `/oauth/logout` | page/redirect | `<OAuthLogoutPage />` | `<RouteProvidersLayout />` | [source](../../src/routes/router.tsx) |
| `/` | layout | `<PublicLayout />` | `<RouteProvidersLayout />` | [source](../../src/routes/router.tsx) |
| `/` | index | `<CoreRoutes.OverviewPage />` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/outages` | page/redirect | `<CoreRoutes.OutagesPage />` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/outages/:outageId` | page/redirect | `<CoreRoutes.OutageDetailPage />` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/news` | page/redirect | `<CoreRoutes.NewsPage />` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/security-advisories` | page/redirect | `<CoreRoutes.SecurityAdvisoriesPage />` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/security-advisories/:advisoryId` | page/redirect | `<CoreRoutes.SecurityAdvisoryDetailPage />` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/requests/registrations/:requestId/:token` | page/redirect | `<ParamKeyedRoute params={['requestId', 'token']}><CoreRoutes.RegistrationCorrectionPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/*` | page/redirect | `<NotFoundPage />` | `<RouteProvidersLayout /> → <PublicLayout />` | [source](../../src/routes/router.tsx) |
| `/app` | layout | `<CoreRoutes.AppShell mode="user" />` | `<RouteProvidersLayout />` | [source](../../src/routes/router.tsx) |
| `/app` | index | `<CoreRoutes.DashboardPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/nodes` | page/redirect | `<NodesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/nodes/:nodeId` | page/redirect | `<ParamKeyedRoute param="nodeId"><NodeHistoryPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/nodes/:nodeId/history` | page/redirect | `<ParamKeyedRoute param="nodeId"><NodeHistoryPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/vps` | page/redirect | `<CoreRoutes.VpsListPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/vps/new` | page/redirect | `<CoreRoutes.VpsCreatePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId` | layout | `<CoreRoutes.VpsLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId` | index | `<CoreRoutes.VpsOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/config` | page/redirect | `<CoreRoutes.VpsConfigurationPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/access` | page/redirect | `<CoreRoutes.VpsAccessPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/network` | page/redirect | `<CoreRoutes.VpsNetworkPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/storage` | page/redirect | `<CoreRoutes.VpsStoragePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/features` | page/redirect | `<CoreRoutes.VpsFeaturesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/maintenance` | page/redirect | `<CoreRoutes.VpsMaintenancePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/history` | page/redirect | `<CoreRoutes.VpsHistoryPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/lifecycle` | page/redirect | `<CoreRoutes.VpsLifecyclePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/lifecycle/:lifecycleAction` | page/redirect | `<CoreRoutes.VpsLifecyclePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/vps/:vpsId/console` | page/redirect | `<CoreRoutes.VpsConsolePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/app/datasets` | page/redirect | `<Navigate to="/app/vps" replace />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/nas` | page/redirect | `<NasDatasetsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/nas/new` | page/redirect | `<NasDatasetCreatePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/backups` | page/redirect | `<BackupCenterPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/exports` | page/redirect | `<ExportsListPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/exports/:exportId` | page/redirect | `<ParamKeyedRoute param="exportId"><ExportDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/datasets/:datasetId` | layout | `<ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/datasets/:datasetId` | index | `<DatasetOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/datasets/:datasetId/snapshots` | page/redirect | `<DatasetSnapshotsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/datasets/:datasetId/downloads` | page/redirect | `<DatasetDownloadsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/datasets/:datasetId/exports` | page/redirect | `<DatasetExportsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/datasets/:datasetId/plans` | page/redirect | `<DatasetPlansPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/datasets/:datasetId/expansion` | page/redirect | `<DatasetExpansionPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/nas/:datasetId` | layout | `<ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/nas/:datasetId` | index | `<DatasetOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/nas/:datasetId/snapshots` | page/redirect | `<DatasetSnapshotsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/nas/:datasetId/downloads` | page/redirect | `<DatasetDownloadsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/nas/:datasetId/exports` | page/redirect | `<DatasetExportsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/nas/:datasetId/plans` | page/redirect | `<DatasetPlansPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/nas/:datasetId/expansion` | page/redirect | `<DatasetExpansionPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/dns` | page/redirect | `<DnsZonesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/dns/tsig-keys` | page/redirect | `<DnsTsigKeysPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/networking` | page/redirect | `<CoreRoutes.UserNetworkPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/dns/zones/:zoneId` | layout | `<ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/dns/zones/:zoneId` | index | `<DnsZoneRecordsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/dns/zones/:zoneId/transfers` | page/redirect | `<DnsZoneTransfersPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/dns/zones/:zoneId/dnssec` | page/redirect | `<DnsZoneDnssecPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/dns/zones/:zoneId/servers` | page/redirect | `<DnsZoneServersPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/dns/zones/:zoneId/settings` | page/redirect | `<DnsZoneSettingsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/dns/zones/:zoneId/logs` | page/redirect | `<DnsZoneLogsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/app/transactions` | page/redirect | `<CoreRoutes.TransactionChainsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/transactions/items` | page/redirect | `<CoreRoutes.TransactionsListPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/transactions/items/:transactionId` | page/redirect | `<CoreRoutes.TransactionDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/transactions/:chainId` | page/redirect | `<CoreRoutes.TransactionChainDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/action-states` | page/redirect | `<CoreRoutes.ActionStatesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/action-states/:actionStateId` | page/redirect | `<ParamKeyedRoute param="actionStateId"><CoreRoutes.ActionStateDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/action_states` | page/redirect | `<Navigate to="../action-states" replace />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/action_states/:actionStateId` | page/redirect | `<ParamKeyedRoute param="actionStateId"><CoreRoutes.ActionStateDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/monitoring` | page/redirect | `<CoreRoutes.MonitoringEventsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/monitoring/:eventId` | page/redirect | `<ParamKeyedRoute param="eventId"><CoreRoutes.MonitoringEventDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/incidents` | page/redirect | `<CoreRoutes.IncidentsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/incidents/new` | page/redirect | `<CoreRoutes.IncidentReportNewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/incidents/:incidentId` | page/redirect | `<CoreRoutes.IncidentReportDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/oom-reports` | page/redirect | `<CoreRoutes.OomReportsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/oom-reports/rules/:vpsId` | page/redirect | `<ParamKeyedRoute param="vpsId"><CoreRoutes.OomReportRulesPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/oom-reports/:oomReportId` | layout | `<CoreRoutes.OomReportLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/oom-reports/:oomReportId` | index | `<CoreRoutes.OomReportOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.OomReportLayout />` | [source](../../src/routes/router.tsx) |
| `/app/oom-reports/:oomReportId/stats` | page/redirect | `<CoreRoutes.OomReportStatsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.OomReportLayout />` | [source](../../src/routes/router.tsx) |
| `/app/oom-reports/:oomReportId/tasks` | page/redirect | `<CoreRoutes.OomReportTasksPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <CoreRoutes.OomReportLayout />` | [source](../../src/routes/router.tsx) |
| `/app/payments` | page/redirect | `<PaymentsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/requests` | page/redirect | `<MyRequestsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/requests/:type/:requestId` | page/redirect | `<MyRequestDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile` | page/redirect | `<ProfilePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/resources` | page/redirect | `<ProfileResourcesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/security` | page/redirect | `<ProfileSecurityPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/mfa` | page/redirect | `<ProfileMfaPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/mail` | page/redirect | `<ProfileMailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/keys` | page/redirect | `<ProfileKeysPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/sessions` | page/redirect | `<ProfileSessionsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/metrics` | page/redirect | `<ProfileMetricsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/user-data` | page/redirect | `<ProfileUserDataPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/user-namespaces` | layout | `<ProfileUserNamespacesLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/profile/user-namespaces` | index | `<ProfileUserNamespacesIndexPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/app/profile/user-namespaces/namespaces` | page/redirect | `<ProfileUserNamespacesNamespacesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/app/profile/user-namespaces/namespaces/:id` | page/redirect | `<ProfileUserNamespacesNamespaceDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/app/profile/user-namespaces/maps` | page/redirect | `<ProfileUserNamespacesMapsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/app/profile/user-namespaces/maps/:mapId` | page/redirect | `<ParamKeyedRoute param="mapId"><ProfileUserNamespacesMapDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/app/_design` | page/redirect | `<DesignSandboxPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/app/*` | page/redirect | `<NotFoundPage appBasePath="/app" />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="user" />` | [source](../../src/routes/router.tsx) |
| `/admin` | layout | `<CoreRoutes.AppShell mode="admin" />` | `<RouteProvidersLayout />` | [source](../../src/routes/router.tsx) |
| `/admin` | index | `<CoreRoutes.DashboardPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/outages` | page/redirect | `<AdminOutagesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/outages/:outageId` | page/redirect | `<ParamKeyedRoute param="outageId"><AdminOutagesPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/security-advisories` | page/redirect | `<AdminSecurityAdvisoriesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <SecurityAdvisoryAdminGate />` | [source](../../src/routes/securityAdvisoryAdminRoutes.tsx) |
| `/admin/security-advisories/:advisoryId` | page/redirect | `<ParamKeyedRoute param="advisoryId"><AdminSecurityAdvisoryDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <SecurityAdvisoryAdminGate />` | [source](../../src/routes/securityAdvisoryAdminRoutes.tsx) |
| `/admin/nodes` | page/redirect | `<NodesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/nodes/:nodeId` | page/redirect | `<NodeDetailPageRoute />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/nodes/:nodeId/history` | page/redirect | `<ParamKeyedRoute param="nodeId"><NodeHistoryPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/migration-plans` | page/redirect | `<MigrationPlansPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/migration-plans/:planId` | page/redirect | `<MigrationPlanDetailPageRoute />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/admin-info` | page/redirect | `<AdminInfoPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/user-namespaces` | layout | `<AdminUserNamespacesLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/user-namespaces` | index | `<AdminUserNamespacesIndexPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/user-namespaces/namespaces` | page/redirect | `<AdminUserNamespacesNamespacesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/user-namespaces/namespaces/:id` | page/redirect | `<AdminUserNamespacesNamespaceDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/user-namespaces/maps` | page/redirect | `<AdminUserNamespacesMapsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/user-namespaces/maps/:mapId` | page/redirect | `<ParamKeyedRoute param="mapId"><AdminUserNamespacesMapDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster` | layout | `<AdminClusterLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster` | index | `<Navigate to="summary" replace />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/summary` | page/redirect | `<ClusterSummaryPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/environments` | page/redirect | `<EnvironmentsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/locations` | page/redirect | `<LocationsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/os-templates` | page/redirect | `<OsTemplatesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/networks` | page/redirect | `<NetworksPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/networks/:networkId` | page/redirect | `<ParamKeyedRoute param="networkId"><NetworkDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/resource-packages` | page/redirect | `<ResourcePackagesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/resource-packages/:packageId` | page/redirect | `<ParamKeyedRoute param="packageId"><ResourcePackageDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/system-config` | page/redirect | `<SystemConfigPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/dns-resolvers` | page/redirect | `<DnsResolversPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/dns-servers` | page/redirect | `<DnsServersPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/cluster/dns-tsig-keys` | page/redirect | `<AdminDnsTsigKeysPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminClusterLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users` | page/redirect | `<UsersPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId` | layout | `<AdminUserLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId` | index | `<AdminUserOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/resources` | page/redirect | `<AdminUserResourcesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/resources/usage` | page/redirect | `<AdminUserResourceUsagePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/payments` | page/redirect | `<AdminUserPaymentsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout /> → <AdminUserFinanceGate />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/environment-configs` | page/redirect | `<AdminUserEnvironmentConfigsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/security` | page/redirect | `<AdminUserSecurityPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/mfa` | page/redirect | `<AdminUserMfaPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/sessions` | page/redirect | `<AdminUserSessionsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/keys` | page/redirect | `<AdminUserKeysPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/metrics` | page/redirect | `<AdminUserMetricsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/mail` | page/redirect | `<AdminUserMailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/user-data` | page/redirect | `<AdminUserUserDataPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/users/:userId/history` | page/redirect | `<AdminUserHistoryPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminUserLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/networking` | layout | `<AdminNetworkingLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/networking` | index | `<Navigate to="ip-addresses" replace />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminNetworkingLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/networking/ip-addresses` | page/redirect | `<IpAddressesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminNetworkingLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/networking/ip-addresses/:ipAddressId` | page/redirect | `<ParamKeyedRoute param="ipAddressId"><IpAddressDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminNetworkingLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/networking/host-ip-addresses` | page/redirect | `<HostIpAddressesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminNetworkingLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/networking/ip-address-assignments` | page/redirect | `<IpAssignmentsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminNetworkingLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/networking/live` | page/redirect | `<NetworkLivePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminNetworkingLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/networking/traffic-users` | page/redirect | `<NetworkTrafficUsersPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminNetworkingLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/ip-addresses` | page/redirect | `<IpAddressesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/ip-addresses/:ipAddressId` | page/redirect | `<ParamKeyedRoute param="ipAddressId"><IpAddressDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/vps` | page/redirect | `<CoreRoutes.VpsListPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/new` | page/redirect | `<CoreRoutes.VpsCreatePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId` | layout | `<CoreRoutes.VpsLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId` | index | `<CoreRoutes.VpsOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/config` | page/redirect | `<CoreRoutes.VpsConfigurationPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/access` | page/redirect | `<CoreRoutes.VpsAccessPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/network` | page/redirect | `<CoreRoutes.VpsNetworkPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/storage` | page/redirect | `<CoreRoutes.VpsStoragePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/features` | page/redirect | `<CoreRoutes.VpsFeaturesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/maintenance` | page/redirect | `<CoreRoutes.VpsMaintenancePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/history` | page/redirect | `<CoreRoutes.VpsHistoryPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/lifecycle` | page/redirect | `<CoreRoutes.VpsLifecyclePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/lifecycle/:lifecycleAction` | page/redirect | `<CoreRoutes.VpsLifecyclePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/vps/:vpsId/console` | page/redirect | `<CoreRoutes.VpsConsolePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.VpsLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/datasets` | page/redirect | `<DatasetsListPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/nas` | page/redirect | `<NasDatasetsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/nas/new` | page/redirect | `<NasDatasetCreatePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/exports` | page/redirect | `<ExportsListPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/exports/:exportId` | page/redirect | `<ParamKeyedRoute param="exportId"><ExportDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/datasets/:datasetId` | layout | `<ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/datasets/:datasetId` | index | `<DatasetOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/datasets/:datasetId/snapshots` | page/redirect | `<DatasetSnapshotsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/datasets/:datasetId/downloads` | page/redirect | `<DatasetDownloadsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/datasets/:datasetId/exports` | page/redirect | `<DatasetExportsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/datasets/:datasetId/plans` | page/redirect | `<DatasetPlansPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/datasets/:datasetId/expansion` | page/redirect | `<DatasetExpansionPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/nas/:datasetId` | layout | `<ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/nas/:datasetId` | index | `<DatasetOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/nas/:datasetId/snapshots` | page/redirect | `<DatasetSnapshotsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/nas/:datasetId/downloads` | page/redirect | `<DatasetDownloadsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/nas/:datasetId/exports` | page/redirect | `<DatasetExportsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/nas/:datasetId/plans` | page/redirect | `<DatasetPlansPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/nas/:datasetId/expansion` | page/redirect | `<DatasetExpansionPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="datasetId"><DatasetLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/dns` | page/redirect | `<DnsZonesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/dns/tsig-keys` | page/redirect | `<AdminDnsTsigKeysPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/dns/zones/:zoneId` | layout | `<ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/dns/zones/:zoneId` | index | `<DnsZoneRecordsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/dns/zones/:zoneId/transfers` | page/redirect | `<DnsZoneTransfersPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/dns/zones/:zoneId/dnssec` | page/redirect | `<DnsZoneDnssecPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/dns/zones/:zoneId/servers` | page/redirect | `<DnsZoneServersPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/dns/zones/:zoneId/settings` | page/redirect | `<DnsZoneSettingsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/dns/zones/:zoneId/logs` | page/redirect | `<DnsZoneLogsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ParamKeyedRoute param="zoneId"><DnsZoneLayout /></ParamKeyedRoute>` | [source](../../src/routes/router.tsx) |
| `/admin/transactions` | page/redirect | `<CoreRoutes.TransactionChainsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/transactions/items` | page/redirect | `<CoreRoutes.TransactionsListPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/transactions/items/:transactionId` | page/redirect | `<CoreRoutes.TransactionDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/transactions/:chainId` | page/redirect | `<CoreRoutes.TransactionChainDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/action-states` | page/redirect | `<CoreRoutes.ActionStatesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/action-states/:actionStateId` | page/redirect | `<ParamKeyedRoute param="actionStateId"><CoreRoutes.ActionStateDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/action_states` | page/redirect | `<Navigate to="../action-states" replace />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/action_states/:actionStateId` | page/redirect | `<ParamKeyedRoute param="actionStateId"><CoreRoutes.ActionStateDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/monitoring` | page/redirect | `<CoreRoutes.MonitoringEventsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/monitoring/:eventId` | page/redirect | `<ParamKeyedRoute param="eventId"><CoreRoutes.MonitoringEventDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/incidents` | page/redirect | `<CoreRoutes.IncidentsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/incidents/new` | page/redirect | `<CoreRoutes.IncidentReportNewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/incidents/:incidentId` | page/redirect | `<CoreRoutes.IncidentReportDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/oom-reports` | page/redirect | `<CoreRoutes.OomReportsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/oom-reports/rules/:vpsId` | page/redirect | `<ParamKeyedRoute param="vpsId"><CoreRoutes.OomReportRulesPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/oom-reports/:oomReportId` | layout | `<CoreRoutes.OomReportLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/oom-reports/:oomReportId` | index | `<CoreRoutes.OomReportOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.OomReportLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/oom-reports/:oomReportId/stats` | page/redirect | `<CoreRoutes.OomReportStatsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.OomReportLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/oom-reports/:oomReportId/tasks` | page/redirect | `<CoreRoutes.OomReportTasksPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <CoreRoutes.OomReportLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/templates` | page/redirect | `<MailTemplatesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/templates/:mailTemplateId` | page/redirect | `<ParamKeyedRoute param="mailTemplateId"><MailTemplateDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/templates/:mailTemplateId/translations/:translationId` | page/redirect | `<ParamKeyedRoute params={['mailTemplateId', 'translationId']}><MailTemplateTranslationPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/mailboxes` | page/redirect | `<MailboxesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/mailboxes/:mailboxId` | page/redirect | `<ParamKeyedRoute param="mailboxId"><MailboxDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/recipients` | page/redirect | `<MailRecipientsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/log` | page/redirect | `<MailLogsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/mailer/log/:mailLogId` | page/redirect | `<MailLogDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/content` | layout | `<AdminContentLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/content` | index | `<Navigate to="news" replace />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminContentLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/content/news` | page/redirect | `<AdminNewsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminContentLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/content/help-boxes` | page/redirect | `<AdminHelpBoxesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <AdminContentLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/audit` | page/redirect | `<AuditPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/audit/:historyId` | page/redirect | `<AuditEventPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/requests` | page/redirect | `<RequestsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/requests/:type/:requestId` | page/redirect | `<ParamKeyedRoute params={['type', 'requestId']}><RequestDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/payments` | page/redirect | `<FinanceOverviewPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <FinanceGlobalAdminGate />` | [source](../../src/routes/adminFinanceRoutes.tsx) |
| `/admin/payments/history` | page/redirect | `<PaymentHistoryPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <FinanceGlobalAdminGate />` | [source](../../src/routes/adminFinanceRoutes.tsx) |
| `/admin/payments/incoming` | page/redirect | `<IncomingPaymentsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <FinanceGlobalAdminGate />` | [source](../../src/routes/adminFinanceRoutes.tsx) |
| `/admin/payments/incoming/:paymentId` | page/redirect | `<ParamKeyedRoute param="paymentId"><IncomingPaymentDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <FinanceGlobalAdminGate />` | [source](../../src/routes/adminFinanceRoutes.tsx) |
| `/admin/payments/forecast` | page/redirect | `<IncomeForecastPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <FinanceGlobalAdminGate />` | [source](../../src/routes/adminFinanceRoutes.tsx) |
| `/admin/profile` | page/redirect | `<ProfilePage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/resources` | page/redirect | `<ProfileResourcesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/security` | page/redirect | `<ProfileSecurityPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/mfa` | page/redirect | `<ProfileMfaPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/mail` | page/redirect | `<ProfileMailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/keys` | page/redirect | `<ProfileKeysPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/sessions` | page/redirect | `<ProfileSessionsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/metrics` | page/redirect | `<ProfileMetricsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/user-data` | page/redirect | `<ProfileUserDataPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/user-namespaces` | layout | `<ProfileUserNamespacesLayout />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/user-namespaces` | index | `<ProfileUserNamespacesIndexPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/user-namespaces/namespaces` | page/redirect | `<ProfileUserNamespacesNamespacesPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/user-namespaces/namespaces/:id` | page/redirect | `<ProfileUserNamespacesNamespaceDetailPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/user-namespaces/maps` | page/redirect | `<ProfileUserNamespacesMapsPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/profile/user-namespaces/maps/:mapId` | page/redirect | `<ParamKeyedRoute param="mapId"><ProfileUserNamespacesMapDetailPage /></ParamKeyedRoute>` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" /> → <ProfileUserNamespacesLayout />` | [source](../../src/routes/router.tsx) |
| `/admin/_design` | page/redirect | `<DesignSandboxPage />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |
| `/admin/*` | page/redirect | `<NotFoundPage appBasePath="/admin" />` | `<RouteProvidersLayout /> → <CoreRoutes.AppShell mode="admin" />` | [source](../../src/routes/router.tsx) |

## API adapter modules (64)

Read these for request/response details. File presence does not prove that the deployed
API implements every parameter; see [API contracts](API_CONTRACTS.md).

- [actionStates.ts](../../src/lib/api/actionStates.ts)
- [app.ts](../../src/lib/api/app.ts)
- [appTypes.ts](../../src/lib/api/appTypes.ts)
- [ascendingIdCollection.ts](../../src/lib/api/ascendingIdCollection.ts)
- [audit.ts](../../src/lib/api/audit.ts)
- [cluster.ts](../../src/lib/api/cluster.ts)
- [clusterResourcePackages.ts](../../src/lib/api/clusterResourcePackages.ts)
- [clusterResources.ts](../../src/lib/api/clusterResources.ts)
- [clusterSearch.ts](../../src/lib/api/clusterSearch.ts)
- [datasets.ts](../../src/lib/api/datasets.ts)
- [dns.ts](../../src/lib/api/dns.ts)
- [dnsResolvers.ts](../../src/lib/api/dnsResolvers.ts)
- [dnsSecretScrubber.ts](../../src/lib/api/dnsSecretScrubber.ts)
- [dnsTransfers.ts](../../src/lib/api/dnsTransfers.ts)
- [dnsTsigKeys.ts](../../src/lib/api/dnsTsigKeys.ts)
- [exports.ts](../../src/lib/api/exports.ts)
- [finance.ts](../../src/lib/api/finance.ts)
- [haveapi.ts](../../src/lib/api/haveapi.ts)
- [haveapiEnvelope.ts](../../src/lib/api/haveapiEnvelope.ts)
- [helpBoxes.ts](../../src/lib/api/helpBoxes.ts)
- [incidents.ts](../../src/lib/api/incidents.ts)
- [infra.ts](../../src/lib/api/infra.ts)
- [ipAddresses.ts](../../src/lib/api/ipAddresses.ts)
- [languages.ts](../../src/lib/api/languages.ts)
- [lifetimes.ts](../../src/lib/api/lifetimes.ts)
- [locationNetworks.ts](../../src/lib/api/locationNetworks.ts)
- [mailTemplateCreateReconciliation.ts](../../src/lib/api/mailTemplateCreateReconciliation.ts)
- [mailer.ts](../../src/lib/api/mailer.ts)
- [migrations.ts](../../src/lib/api/migrations.ts)
- [monitoring.ts](../../src/lib/api/monitoring.ts)
- [networkInterfaces.ts](../../src/lib/api/networkInterfaces.ts)
- [networking.ts](../../src/lib/api/networking.ts)
- [networks.ts](../../src/lib/api/networks.ts)
- [newslog.ts](../../src/lib/api/newslog.ts)
- [nodeCreateReconciliation.ts](../../src/lib/api/nodeCreateReconciliation.ts)
- [nodeHistory.ts](../../src/lib/api/nodeHistory.ts)
- [nodes.ts](../../src/lib/api/nodes.ts)
- [oom.ts](../../src/lib/api/oom.ts)
- [osTemplates.ts](../../src/lib/api/osTemplates.ts)
- [outageScopePaging.ts](../../src/lib/api/outageScopePaging.ts)
- [outages.ts](../../src/lib/api/outages.ts)
- [payments.ts](../../src/lib/api/payments.ts)
- [public.ts](../../src/lib/api/public.ts)
- [requests.ts](../../src/lib/api/requests.ts)
- [securityAdvisories.ts](../../src/lib/api/securityAdvisories.ts)
- [securityAdvisoryRelations.ts](../../src/lib/api/securityAdvisoryRelations.ts)
- [securityAdvisoryUpdates.ts](../../src/lib/api/securityAdvisoryUpdates.ts)
- [systemConfig.ts](../../src/lib/api/systemConfig.ts)
- [transactions.ts](../../src/lib/api/transactions.ts)
- [userAccounts.ts](../../src/lib/api/userAccounts.ts)
- [userDossier.ts](../../src/lib/api/userDossier.ts)
- [userEnvironmentConfigs.ts](../../src/lib/api/userEnvironmentConfigs.ts)
- [userLookups.ts](../../src/lib/api/userLookups.ts)
- [userMail.ts](../../src/lib/api/userMail.ts)
- [userNamespaces.ts](../../src/lib/api/userNamespaces.ts)
- [userTypes.ts](../../src/lib/api/userTypes.ts)
- [users.ts](../../src/lib/api/users.ts)
- [vps.ts](../../src/lib/api/vps.ts)
- [vpsAccess.ts](../../src/lib/api/vpsAccess.ts)
- [vpsFeatures.ts](../../src/lib/api/vpsFeatures.ts)
- [vpsMaintenance.ts](../../src/lib/api/vpsMaintenance.ts)
- [vpsMounts.ts](../../src/lib/api/vpsMounts.ts)
- [vpsUserData.ts](../../src/lib/api/vpsUserData.ts)
- [webuiUserSettings.ts](../../src/lib/api/webuiUserSettings.ts)
