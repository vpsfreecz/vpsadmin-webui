import { defineConfig, devices } from '@playwright/test';

// E2E runs should set E2E_BASE_URL to an already-running server.
// Optionally set E2E_START_SERVER=1 to let Playwright start Vite.
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://127.0.0.1:5173';
const storageState = process.env['E2E_STORAGE_STATE']?.trim() || undefined;
const ignoreHTTPSErrors = process.env['E2E_IGNORE_HTTPS_ERRORS'] === '1';
const chromiumExecutablePath = process.env['E2E_CHROMIUM_EXECUTABLE_PATH']?.trim() || undefined;
const recordArtifacts = process.env['E2E_RECORD_ARTIFACTS'] !== '0';

function readLocalWebServerTarget(url: string): { host: string; port: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' ? parsed.hostname : '127.0.0.1';
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');

    if (!/^\d{1,5}$/.test(port)) return { host: '127.0.0.1', port: '5173' };

    const n = Number(port);
    if (!Number.isInteger(n) || n <= 0 || n > 65535) return { host: '127.0.0.1', port: '5173' };

    return { host, port };
  } catch {
    return { host: '127.0.0.1', port: '5173' };
  }
}

const webServerTarget = readLocalWebServerTarget(baseURL);

export default defineConfig({
  testDir: 'e2e/specs',
  outputDir: 'e2e/test-results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 2,
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  use: {
    baseURL,
    storageState,
    ignoreHTTPSErrors,
    trace: recordArtifacts ? 'retain-on-failure' : 'off',
    screenshot: recordArtifacts ? 'only-on-failure' : 'off',
    video: recordArtifacts ? (process.env['CI'] ? 'on-first-retry' : 'retain-on-failure') : 'off',
  },
  webServer: process.env['E2E_START_SERVER']
    ? {
        command: process.env['CI']
          ? `node scripts/e2e-dev-server.mjs ${webServerTarget.host} ${webServerTarget.port}`
          : `npm run dev -- --host ${webServerTarget.host} --port ${webServerTarget.port}`,
        url: process.env['CI'] ? new URL('/__e2e-ready', baseURL).href : baseURL,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      }
    : undefined,
  projects: [
    {
      name: 'mobile-webkit',
      testMatch: [
        '**/profile_preference_sync_error.spec.ts',
        '**/profile_mail_language_error.spec.ts',
        '**/outage_affected_errors.spec.ts',
        '**/user_environment_configs_smoke.spec.ts',
        '**/admin_newslog.spec.ts',
        '**/profile_control_rhythm.spec.ts',
        '**/networking_filter_rhythm.spec.ts',
        '**/remaining_filter_rhythm.spec.ts',
        '**/action_filter_rhythm.spec.ts',
        '**/vps_all_actions.spec.ts',
        '**/contextual_help_placement.spec.ts',
        '**/approved_vps_journey.spec.ts',
        '**/authenticated_home_smoke.spec.ts',
        '**/dashboard_preferences_accessibility.spec.ts',
        '**/vps_access_readability.spec.ts',
        '**/filter_bar_chip_alignment.spec.ts',
        '**/transaction_items_filter_accessibility.spec.ts',
        '**/about.spec.ts',
        '**/development_runtime.spec.ts',
        '**/oom_report_tasks_pagination.spec.ts',
        '**/oom_report_tasks_mobile_layout.spec.ts',
        '**/theme_switcher.spec.ts',
        '**/news_language_switch.spec.ts',
        '**/overview_readability.spec.ts',
        '**/sidebar_controls.spec.ts',
        '**/account_controls_direct.spec.ts',
        '**/dashboard_own_nodes.spec.ts',
        '**/dashboard_summary.spec.ts',
        '**/header_mobile_controls.spec.ts',
        '**/header_account_menu_narrow_mobile.spec.ts',
        '**/header_account_width.spec.ts',
        '**/action_state_transactions_responsive.spec.ts',
        '**/transactions_readability.spec.ts',
        '**/tasks_compact_history.spec.ts',
        '**/transactions_table_followup.spec.ts',
        '**/ip_addresses_filters_pagination.spec.ts',
        '**/ip_addresses_primary_location.spec.ts',
        '**/ip_assignment_vps_first.spec.ts',
        '**/ip_addresses_suggested_request_budget.spec.ts',
        '**/admin_dashboard.spec.ts',
        '**/sidebar_status.spec.ts',
        '**/profile_user_data.spec.ts',
        '**/pagination_control_rhythm.spec.ts',
        '**/map_kind_control_rhythm.spec.ts',
        '**/secret_field_controls.spec.ts',
        '**/centered_dialogs.spec.ts',

        '**/vps_expiration_reactivation.spec.ts',
        '**/snapshot_export_shortcut.spec.ts',
        '**/snapshot_delete_availability.spec.ts',
        '**/export_hosts_responsive_actions.spec.ts',
        '**/exports_filter_contract.spec.ts',
        '**/monitoring_filter_rhythm.spec.ts',
        '**/monitoring_events_keyset_pagination.spec.ts',
        '**/oom_filter_rhythm.spec.ts',
        '**/oom_reports_smart_filter.spec.ts',
        '**/export_filter_rhythm.spec.ts',
        '**/vps_initialization_templates.spec.ts',
        '**/vps_console_controls.spec.ts',
        '**/vps_console_viewport.spec.ts',
        '**/vps_console_page.spec.ts',
        '**/search_scope_reminder.spec.ts',
        '**/node_heatmaps.spec.ts',
        '**/nodes_overview_maintenance.spec.ts',
        '**/vps_header_ssh_mobile_layout.spec.ts',
        '**/vps_header_system_summary.spec.ts',
        '**/dataset_filter_rhythm.spec.ts',
        '**/vps_mount_dataset_picker.spec.ts',
        '**/vps_storage_tab_mounts.spec.ts',
        '**/vps_memory_evidence.spec.ts',
        '**/vps_overview_access_summary.spec.ts',
        '**/mobile_touch_interactions.spec.ts',
        '**/mobile_lookup_popover.spec.ts',
        '**/mobile_workflows.spec.ts',
        '**/payment_qr_images.spec.ts',
        '**/incident_create_context.spec.ts',
        '**/vps_overview_all_ips.spec.ts',
        '**/member_payment_links.spec.ts',
        '**/vps_admin_modifications.spec.ts',
        '**/vps_maintenance_sunday.spec.ts',
        '**/network_address_details.spec.ts',
        '**/vps_network_editor_feedback.spec.ts',
        '**/vps_route_query_feedback.spec.ts',
        '**/user_packages_bulk_remove.spec.ts',
        '**/user_packages_assigned_date.spec.ts',
        '**/vps_dns_shortcut.spec.ts',
        '**/dns_zone_owner_lookup.spec.ts',
        '**/dns_record_feedback_readability.spec.ts',
        '**/dns_log_column_width.spec.ts',
        '**/ssh_key_validation_readability.spec.ts',
      ],
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
      },
    },
  ],
});
