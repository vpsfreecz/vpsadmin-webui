import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import {
  bootstrapVpsAdminWindow,
  installHaveApiMock,
  setUiSettingsLocalStorage,
  type HaveApiHandler,
} from '../../fixtures';
const cases = [
  {
    file: 'src/pages/app/admin/AuditPage.tsx',
    route: '/admin/audit',
    barTestId: 'admin.audit.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.audit.smart_filter.help_btn',
  },
  {
    file: 'src/pages/app/admin/cluster/DnsResolversPage.tsx',
    route: '/admin/cluster/dns-resolvers',
    barTestId: 'admin.cluster.dns_resolvers.filters',
    referenceHeight: 36,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/cluster/EnvironmentsPage.tsx',
    route: '/admin/cluster/environments',
    barTestId: 'admin.cluster.environments.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/cluster/LocationsPage.tsx',
    route: '/admin/cluster/locations',
    barTestId: 'admin.cluster.locations.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/cluster/NetworksPage.tsx',
    route: '/admin/cluster/networks',
    barTestId: 'admin.cluster.networks.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.cluster.networks.smart.help_button',
  },
  {
    file: 'src/pages/app/admin/cluster/OsTemplatesPage.tsx',
    route: '/admin/cluster/os-templates',
    barTestId: 'admin.cluster.os_templates.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.cluster.os_templates.advanced',
  },
  {
    file: 'src/pages/app/admin/cluster/ResourcePackagesPage.tsx',
    route: '/admin/cluster/resource-packages',
    barTestId: 'admin.cluster.resource_packages.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.cluster.resource_packages.smart.help_button',
  },
  {
    file: 'src/pages/app/admin/cluster/SystemConfigPage.tsx',
    route: '/admin/cluster/system-config',
    barTestId: 'admin.cluster.system_config.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.cluster.system_config.smart.help_button',
  },
  {
    file: 'src/pages/app/dns/DnsZonesPage.tsx',
    route: '/admin/dns',
    barTestId: 'dns.zones.list.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/incidents/IncidentsPage.tsx',
    route: '/admin/incidents',
    barTestId: 'incidents.list.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'incidents.smart_filter.help_btn',
  },
  {
    file: 'src/pages/app/admin/mailer/MailLogsPage.tsx',
    route: '/admin/mailer/log',
    barTestId: 'admin.mailer.log.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/mailer/MailboxesPage.tsx',
    route: '/admin/mailer/mailboxes',
    barTestId: 'admin.mailer.mailboxes.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.mailer.mailboxes.smart_filter.help_btn',
  },
  {
    file: 'src/pages/app/admin/mailer/MailRecipientsPage.tsx',
    route: '/admin/mailer/recipients',
    barTestId: 'admin.mailer.recipients.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.mailer.recipients.smart_filter.help_btn',
  },
  {
    file: 'src/pages/app/admin/mailer/MailTemplatesPage.tsx',
    route: '/admin/mailer/templates',
    barTestId: 'admin.mailer.templates.filters',
    referenceHeight: 36,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/MigrationPlansPage.tsx',
    route: '/admin/migration-plans',
    barTestId: 'admin.migration_plans.list.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/ipAddresses/IpAddressesFilters.tsx',
    route: '/admin/networking/ip-addresses',
    barTestId: 'admin.ip_addresses.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/NodesFilters.tsx',
    route: '/admin/nodes',
    barTestId: 'admin.nodes.list.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.nodes.smart_help.open',
  },
  {
    file: 'src/pages/app/admin/PaymentHistoryPage.tsx',
    route: '/admin/payments/history',
    barTestId: 'admin.finance.history.filters',
    referenceHeight: 36,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/IncomingPaymentsFilters.tsx',
    route: '/admin/payments/incoming',
    barTestId: null,
    referenceHeight: 36,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/RequestsFilters.tsx',
    route: '/admin/requests',
    barTestId: 'admin.requests.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/users/UsersFilters.tsx',
    route: '/admin/users',
    barTestId: 'admin.users.list.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: null,
  },
  {
    file: 'src/pages/app/admin/user/AdminUserHistoryPage.tsx',
    route: '/admin/users/42/history',
    barTestId: 'admin.user.history.filters',
    referenceHeight: 44,
    mode: 'admin',
    helpId: 'admin.user.history.smart_filter.help_btn',
  },
  {
    file: 'src/pages/app/dns/DnsZonesPage.tsx',
    route: '/app/dns',
    barTestId: 'dns.zones.list.filters',
    referenceHeight: 44,
    mode: 'member',
    helpId: null,
  },
  {
    file: 'src/pages/app/dns/DnsZonesPage.tsx',
    route: '/app/dns',
    barTestId: 'dns.zones.list.filters',
    referenceHeight: 44,
    mode: 'mine',
    helpId: null,
  },
  {
    file: 'src/pages/app/dns/DnsZonesPage.tsx',
    route: '/admin/dns',
    barTestId: 'dns.zones.list.filters',
    referenceHeight: 44,
    mode: 'support',
    helpId: null,
  },
  {
    file: 'src/pages/app/incidents/IncidentsPage.tsx',
    route: '/app/incidents',
    barTestId: 'incidents.list.filters',
    referenceHeight: 44,
    mode: 'member',
    helpId: 'incidents.smart_filter.help_btn',
  },
  {
    file: 'src/pages/app/incidents/IncidentsPage.tsx',
    route: '/app/incidents',
    barTestId: 'incidents.list.filters',
    referenceHeight: 44,
    mode: 'mine',
    helpId: 'incidents.smart_filter.help_btn',
  },
  {
    file: 'src/pages/app/incidents/IncidentsPage.tsx',
    route: '/admin/incidents',
    barTestId: 'incidents.list.filters',
    referenceHeight: 44,
    mode: 'support',
    helpId: 'incidents.smart_filter.help_btn',
  },
];
const endpoints = [
  'action_states',
  'cluster',
  'cluster_resource_packages',
  'cluster_resources',
  'components',
  'dataset_expansions',
  'datasets',
  'default_object_cluster_resources',
  'dns_record_logs',
  'dns_records',
  'dns_resolvers',
  'dns_server_zone_transfer_logs',
  'dns_server_zones',
  'dns_servers',
  'dns_tsig_keys',
  'dns_zone_transfers',
  'dns_zones',
  'dnssec_records',
  'environments',
  'export_outages',
  'exports',
  'help_boxes',
  'host_ip_addresses',
  'incident_reports',
  'incoming_payments',
  'ip_address_assignments',
  'ip_addresses',
  'languages',
  'location_networks',
  'locations',
  'mail_logs',
  'mail_recipients',
  'mail_templates',
  'mailboxes',
  'metrics_access_tokens',
  'migration_plans',
  'monitored_events',
  'network_interface_accountings',
  'network_interface_monitors',
  'network_interfaces',
  'networks',
  'news_logs',
  'node_kernel_evidences',
  'nodes',
  'object_histories',
  'oom_report_rules',
  'oom_reports',
  'os_families',
  'os_templates',
  'outage_security_advisories',
  'outage_updates',
  'outages',
  'pools',
  'security_advisories',
  'security_advisory_cves',
  'security_advisory_updates',
  'snapshot_downloads',
  'system_configs',
  'transaction_chains',
  'transactions',
  'user_cluster_resource_packages',
  'user_namespace_maps',
  'user_namespaces',
  'user_outages',
  'user_payments',
  'user_security_advisories',
  'user_sessions',
  'users',
  'vps_outages',
  'vps_security_advisories',
  'vps_user_data',
  'vpses',
];
for (const [language, theme] of [
  ['cs', 'dark'],
  ['en', 'light'],
] as const) {
  for (const item of cases)
    test(`@pr-smoke @pr-smoke-mobile remaining filters ${language} ${item.mode} ${item.route}`, async ({
      page,
    }, info) => {
      const mobile = info.project.name.startsWith('mobile');
      const baseline = process.env['CAPTURE_SIDE']?.startsWith('baseline') ?? false;
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
      await bootstrapVpsAdminWindow(page);
      await setUiSettingsLocalStorage(page, { language, theme });
      const errors: string[] = [],
        writes: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('request', (r) => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method()))
          writes.push(r.method() + ' ' + new URL(r.url()).pathname);
      });
      const handlers: Record<string, HaveApiHandler> = Object.fromEntries(
        endpoints.map((name) => ['GET ' + name, () => ({ [name]: [] })])
      );
      handlers['GET users/42'] = () => ({
        user: {
          id: 42,
          login: 'audit-member',
          level: 1,
          full_name: 'Kontrolní účet s dlouhým českým jménem',
          object_state: 'active',
        },
      });
      await installHaveApiMock(page, {
        user: { id: 90, login: item.mode, level: item.mode === 'member' ? 1 : item.mode === 'support' ? 30 : 100 },
        handlers,
      });
      await page.goto(item.route + '?q=' + encodeURIComponent('Ověření rozměrů s dlouhým českým názvem a diakritikou'));
      const bar = item.barTestId
        ? page.getByTestId(item.barTestId)
        : page
            .locator('div.flex.w-full.flex-wrap.items-end.gap-2')
            .filter({ has: page.locator('input,select') })
            .first();
      await expect(bar).toBeVisible();
      const geometry = await bar.evaluate((root) =>
        Array.from(root.querySelectorAll('input,select,button,a'))
          .filter((el) => !!(el as HTMLElement).offsetParent)
          .map((el) => ({
            tag: el.tagName,
            id: el.getAttribute('data-testid'),
            height: el.getBoundingClientRect().height,
            width: el.getBoundingClientRect().width,
            type: el.getAttribute('type'),
            secondaryChip: !!el.closest('span.inline-flex.text-xs'),
          }))
      );
      const fields = geometry.filter(
        (c) => ['INPUT', 'SELECT'].includes(c.tag) && !['checkbox', 'radio', 'hidden'].includes(c.type ?? '')
      );
      const controls = geometry.filter((c) => ['BUTTON', 'A'].includes(c.tag) && c.height > 20 && !c.secondaryChip);
      expect(controls.length).toBeGreaterThan(0);
      const reference = mobile ? 44 : item.referenceHeight;
      for (const field of fields) {
        expect(Math.round(field.height)).toBe(reference);
        if (!baseline && item.referenceHeight === 44) expect(field.width).toBeGreaterThanOrEqual(160);
      }
      const nativeHelp = /\/(Environments|Locations)Page\.tsx$/.test(item.file);
      if (baseline && !mobile) expect(controls.some((c) => Math.round(c.height) !== reference)).toBe(true);
      else if (baseline && nativeHelp) {
        expect(controls.filter((c) => Math.round(c.height) === 32)).toHaveLength(1);
        for (const control of controls) expect([32, 44]).toContain(Math.round(control.height));
      } else
        for (const control of controls) {
          expect(Math.round(control.height), control.id ?? control.tag).toBe(reference);
          expect(control.width).toBeGreaterThanOrEqual(reference);
        }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow).toBe(false);
      await bar.screenshot({ path: info.outputPath('filter.png'), scale: 'css' });
      await writeFile(
        info.outputPath('geometry.json'),
        JSON.stringify({ ...item, language, theme, project: info.project.name, baseline, geometry }, null, 2)
      );
      if (item.helpId || nativeHelp) {
        const help = item.helpId
          ? page.getByTestId(item.helpId)
          : bar.locator('input').first().locator('..').getByRole('button');
        await help.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(help).toBeFocused();
      }
      if (mobile) {
        await page.setViewportSize({ width: 320, height: 750 });
        await page.evaluate(
          () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        );
        const narrow = await page.evaluate(() => ({
          width: innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        await writeFile(info.outputPath('narrow.json'), JSON.stringify({ ...item, language, narrow }, null, 2));
        if (['/admin/cluster/system-config', '/admin/users/42/history'].includes(item.route))
          await page.screenshot({ path: info.outputPath('narrow.png'), scale: 'css' });
        if (!baseline) expect(Math.max(narrow.document, narrow.body)).toBeLessThanOrEqual(narrow.width);
      }
      expect(errors).toEqual([]);
      expect(
        writes.filter((w) => !/^PUT \/api\/v7\.0\/webui_user_settings\/(ui|ui_setting)\/settings$/.test(w))
      ).toEqual([]);
    });
}
