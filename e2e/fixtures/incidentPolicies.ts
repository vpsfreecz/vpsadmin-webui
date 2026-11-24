import type { Page } from '@playwright/test';
import { bootstrapVpsAdminWindow } from './bootstrap';
import { defaultHaveApiDescription, installHaveApiMock } from './haveapi';
import { setUiSettingsLocalStorage } from './uiSettings';

export const incidentPolicyDescription = {
  ...defaultHaveApiDescription(),
  resources: {
    incident_policy: { actions: { index: {}, show: {} } },
    vps: {
      actions: { update: { input: { parameters: { incident_enforcement_enabled: { type: 'Boolean' } } } } },
      resources: {
        incident_policy: {
          actions: {
            index: {},
            show: {},
            update: {
              input: {
                parameters: {
                  warning_limit_override: { type: 'Integer', nullable: true },
                  stop_limit_override: { type: 'Integer', nullable: true },
                },
              },
            },
          },
        },
      },
    },
    incident_report: { resources: { policy_evaluation: { actions: { index: {} } } } },
  },
};

export async function installIncidentPolicyFixture(
  page: Page,
  { admin, language }: { admin: boolean; language: 'en' | 'cs' }
) {
  await bootstrapVpsAdminWindow(page, { sessionToken: 'TEST', description: incidentPolicyDescription });
  await setUiSettingsLocalStorage(page, { language, theme: 'dark' });
  let warning: number | null = 5;
  let stop: number | null = 10;
  let enabled = true;
  const writes: { path: string; body: unknown }[] = [];
  const listQueries: Record<string, unknown>[] = [];
  const historyQueries: Record<string, unknown>[] = [];
  const evaluationReads: number[] = [];
  const metadata = { warning_period_days: 7, stop_period_days: 30 };
  const policies = () => [
    {
      ...metadata,
      key: 'alpha',
      label: language === 'en' ? 'Synthetic policy A' : 'Ukázkové pravidlo A',
      description: null,
      count_7d: 6,
      count_30d: 8,
      configuration_valid: true,
      warning_limit: warning ?? 5,
      stop_limit: stop ?? 10,
      status: 'warning',
      global_mode: 'enforce',
      effective_mode: 'enforce',
      stop_enforced: enabled,
      ...(admin
        ? { warning_limit_override: warning, stop_limit_override: stop, settings_category: 'incident_alpha' }
        : {}),
      last_incident_at: '2026-11-17T10:00:00Z',
      last_warning_at: '2026-11-17T10:00:00Z',
      evaluation_report_id: 88,
      evaluated_at: '2026-11-17T10:00:00Z',
      evaluation_state: 'recorded',
    },
    {
      ...metadata,
      key: 'beta',
      label: language === 'en' ? 'Synthetic policy B' : 'Ukázkové pravidlo B',
      description: null,
      count_7d: 0,
      count_30d: 0,
      configuration_valid: true,
      warning_limit: 3,
      stop_limit: 9,
      status: 'clear',
      global_mode: 'notify',
      effective_mode: 'notify',
      stop_enforced: false,
      ...(admin ? { warning_limit_override: null, stop_limit_override: null } : {}),
      evaluation_state: 'none',
    },
  ];
  const vps = () => ({
    id: 123,
    hostname: 'synthetic-policy.example.test',
    object_state: 'active',
    is_running: true,
    user: { id: 7, login: 'synthetic-member' },
    node: { id: 1 },
    memory: 2048,
    incident_warning_count: 1,
    incident_stop_threshold_count: 0,
    incident_enforcement_enabled: enabled,
    incident_action_state: 'none',
    incident_last_stop_at: '2026-11-16T10:00:00Z',
    incident_next_stop_allowed_at: '2026-11-17T10:00:00Z',
    incident_accounting_since: '2026-10-30T00:00:00Z',
  });
  const report = {
    id: 88,
    subject: 'SYNTHETIC source report',
    text: 'SYNTHETIC immutable source facts.',
    codename: 'synthetic_source',
    vps: { id: 123, hostname: 'synthetic-policy.example.test' },
    detected_at: '2026-11-17T10:00:00Z',
    notice_kind: null,
    trigger_incident_report_id: null,
    notice_mail_state: null,
    notice_policy_key: null,
    notice_policy_label: null,
  };
  await installHaveApiMock(page, {
    description: incidentPolicyDescription,
    user: { id: 7, login: admin ? 'synthetic-admin' : 'synthetic-member', level: admin ? 90 : 1 },
    handlers: {
      'GET incident_policies': () => ({ incident_policies: policies() }),
      'GET vpses/123/incident_policies': () => ({ incident_policies: policies() }),
      'GET vpses/123/incident_policies/alpha': () => ({ incident_policy: policies()[0] }),
      'PUT vpses/123/incident_policies/alpha': (ctx) => {
        writes.push({ path: ctx.pathname, body: ctx.json });
        if (ctx.json && typeof ctx.json === 'object' && 'incident_policy' in ctx.json) {
          const values = ctx.json.incident_policy;
          if (values && typeof values === 'object') {
            if ('warning_limit_override' in values)
              warning = typeof values.warning_limit_override === 'number' ? values.warning_limit_override : null;
            if ('stop_limit_override' in values)
              stop = typeof values.stop_limit_override === 'number' ? values.stop_limit_override : null;
          }
        }
        return { incident_policy: policies()[0] };
      },
      'GET vpses/123': () => ({ vps: vps() }),
      'GET users/7': () => ({ user: { id: 7, login: 'synthetic-member' } }),
      'GET vpses': (ctx) => {
        listQueries.push(ctx.params);
        return { vpses: [vps()] };
      },
      'PUT vpses/123': (ctx) => {
        writes.push({ path: ctx.pathname, body: ctx.json });
        if (
          ctx.json &&
          typeof ctx.json === 'object' &&
          'vps' in ctx.json &&
          ctx.json.vps &&
          typeof ctx.json.vps === 'object' &&
          'incident_enforcement_enabled' in ctx.json.vps
        )
          enabled = ctx.json.vps.incident_enforcement_enabled === true;
        return { vps: { ok: true } };
      },
      'GET incident_reports': (ctx) => {
        historyQueries.push(ctx.params);
        return { incident_reports: [report] };
      },
      'GET incident_reports/88': () => ({ incident_report: report }),
      'GET incident_reports/89': () => ({
        incident_report: {
          ...report,
          id: 89,
          subject: 'SYNTHETIC policy notice',
          notice_kind: 'warning',
          notice_policy_key: 'alpha',
          notice_policy_label: 'Saved originating policy',
          trigger_incident_report_id: 88,
          notice_mail_state: 'queued',
        },
      }),
      'GET incident_reports/88/policy_evaluations': () => {
        evaluationReads.push(88);
        return {
          policy_evaluations: [
            {
              policy_key: 'alpha',
              matched: true,
              warning_period_days: 7,
              stop_period_days: 30,
              label: language === 'en' ? 'Saved historical policy' : 'Uložené historické pravidlo',
              count_7d: 7,
              count_30d: 10,
              warning_limit: 5,
              stop_limit: 10,
              evaluated_at: '2026-11-17T10:00:00Z',
              effective_mode: 'enforce',
              stop_enforced: true,
              decision: 'warning',
              state: 'recorded',
            },
            {
              policy_key: 'beta',
              label: language === 'en' ? 'Second saved policy' : 'Druhé uložené pravidlo',
              matched: true,
              warning_period_days: 7,
              stop_period_days: 30,
              count_7d: 2,
              count_30d: 3,
              warning_limit: 3,
              stop_limit: 9,
              evaluated_at: '2026-11-17T10:00:00Z',
              state: 'audit_only',
              decision: 'none',
            },
            {
              policy_key: 'retired_key',
              label: language === 'en' ? 'Retired saved policy' : 'Dřívější uložené pravidlo',
              matched: true,
              warning_period_days: 7,
              stop_period_days: 30,
              count_7d: 1,
              count_30d: 4,
              warning_limit: 2,
              stop_limit: 7,
              evaluated_at: '2026-11-17T10:00:00Z',
              state: 'recorded',
              decision: 'none',
            },
            ...(admin
              ? [
                  {
                    policy_key: 'did_not_match',
                    label: 'SYNTHETIC unmatched policy',
                    matched: false,
                    state: 'audit_only',
                    warning_period_days: 7,
                    stop_period_days: 30,
                    count_7d: null,
                    count_30d: null,
                    warning_limit: null,
                    stop_limit: null,
                    decision: null,
                  },
                  {
                    policy_key: 'selection_error',
                    label: 'SYNTHETIC selection error',
                    matched: null,
                    state: 'error',
                    warning_period_days: 7,
                    stop_period_days: 30,
                    count_7d: null,
                    count_30d: null,
                    warning_limit: null,
                    stop_limit: null,
                    decision: null,
                    error_stage: 'selection',
                    error_class: 'TypeError',
                  },
                ]
              : []),
          ],
        };
      },
    },
  });
  return { writes, listQueries, historyQueries, evaluationReads };
}
