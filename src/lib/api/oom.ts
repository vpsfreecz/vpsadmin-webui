import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  Location__ShowOutput,
  OomReportRule__IndexOutput,
  OomReport__IndexOutput,
  OomReport__Stat__IndexOutput,
  OomReport__Task__IndexOutput,
  OomReport__Usage__IndexOutput,
} from 'vpsadmin-typescript-client';
import type {
  OomReportRule__IndexInput,
  OomReport__IndexInput,
  OomReport__Stat__IndexInput,
  OomReport__Task__IndexInput,
  OomReport__Usage__IndexInput,
} from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import type { Vps } from './app';

// Re-export shared infra types/helpers to avoid duplication.
export { fetchEnvironments, fetchLocations, type Environment, type Location } from './infra';

// NOTE: Environment/Location live in ./infra.

export type OomReportRule = Omit<OomReportRule__IndexOutput[number], 'id' | 'vps'> & {
  id: number;
  vps?: OperationsReference | null;
  [k: string]: unknown;
};

export type OomReport = Omit<OomReport__IndexOutput[number], 'id' | 'oom_report_rule' | 'vps'> & {
  id: number;
  oom_report_rule?: OperationsReference | null;
  vps?: OperationsReference | null;
  [k: string]: unknown;
};

export type OomReportUsage = Omit<OomReport__Usage__IndexOutput[number], 'id'> & { id: number;
  [k: string]: unknown };

export type OomReportStat = Omit<OomReport__Stat__IndexOutput[number], 'id'> & { id: number;
  [k: string]: unknown };

export type OomReportTask = Omit<OomReport__Task__IndexOutput[number], 'id'> & { id: number;
  [k: string]: unknown };

// fetchEnvironments/fetchLocations re-exported from ./infra.

export async function fetchOomReports(opts?: {
  limit?: number;
  fromId?: number;
  vpsId?: number;
  userId?: number;
  nodeId?: number;
  locationId?: number;
  environmentId?: number;
  ruleId?: number;
  cgroup?: string;
  sinceIso?: string;
  untilIso?: string;
  includes?: string;
}) {
  const params: OomReport__IndexInput = {};

  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  if (opts?.vpsId !== undefined) params['vps'] = opts.vpsId;
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.nodeId !== undefined) params['node'] = opts.nodeId;
  if (opts?.locationId !== undefined) params['location'] = opts.locationId;
  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;
  if (opts?.ruleId !== undefined) params['oom_report_rule'] = opts.ruleId;

  const cg = opts?.cgroup ? String(opts.cgroup).trim() : '';
  if (cg) params['cgroup'] = cg;

  if (opts?.sinceIso) params['since'] = opts.sinceIso;
  if (opts?.untilIso) params['until'] = opts.untilIso;

  const res = await (
    await getApi()
  ).oom_report.index({ params,
    meta: opts?.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(res, narrowOomReportList, 'oom_reports#index');
}

export async function fetchOomReport(oomReportId: number, opts?: { includes?: string; signal?: AbortSignal }) {
  return narrowApiResult(
    await (
      await getApi()
    ).oom_report.show({
      path: { oom_report_id: oomReportId },
      meta: opts?.includes ? { includes: opts.includes } : undefined,
      signal: opts?.signal,
    }),
    narrowOomReport,
    'oom_report.show'
  );
}

export async function fetchOomReportUsages(oomReportId: number, opts?: { limit?: number }) {
  const params: OomReport__Usage__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (await getApi()).oom_report.usage.index({ path: { oom_report_id: oomReportId }, params });

  return narrowApiResult(res, narrowOomReportUsageList, `oom_reports/${oomReportId}/usages#index`);
}

export async function fetchOomReportStats(oomReportId: number, opts?: { limit?: number }) {
  const params: OomReport__Stat__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (await getApi()).oom_report.stat.index({ path: { oom_report_id: oomReportId }, params });

  return narrowApiResult(res, narrowOomReportStatList, `oom_reports/${oomReportId}/stats#index`);
}

export async function fetchOomReportTasks(oomReportId: number, opts?: { limit?: number }) {
  const params: OomReport__Task__IndexInput = {};
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = await (await getApi()).oom_report.task.index({ path: { oom_report_id: oomReportId }, params });

  return narrowApiResult(res, narrowOomReportTaskList, `oom_reports/${oomReportId}/tasks#index`);
}

export async function fetchOomReportRules(opts: { vpsId: number; limit?: number }) {
  const params: OomReportRule__IndexInput = { vps: opts.vpsId };
  if (opts.limit !== undefined) params['limit'] = opts.limit;

  const res = await (await getApi()).oom_report_rule.index({ params });

  return narrowApiResult(res, narrowOomReportRuleList, 'oom_report_rules#index');
}

export async function createOomReportRule(payload: {
  vpsId: number;
  action: 'notify' | 'ignore' | string;
  cgroupPattern: string;
}) {
  return narrowApiResult(
    await (
      await getApi()
    ).oom_report_rule.create({
      params: {
        vps: payload.vpsId,
        action: payload.action,
        cgroup_pattern: payload.cgroupPattern,
      },
    }),
    narrowOomReportRule,
    'oom_report_rule.create'
  );
}

export async function updateOomReportRule(
  ruleId: number,
  payload: { action: 'notify' | 'ignore' | string; cgroupPattern: string }
) {
  return narrowApiResult(
    await (
      await getApi()
    ).oom_report_rule.update({
      path: { oom_report_rule_id: ruleId },
      params: {
        action: payload.action,
        cgroup_pattern: payload.cgroupPattern,
      },
    }),
    narrowOomReportRule,
    'oom_report_rule.update'
  );
}

export async function deleteOomReportRule(ruleId: number) {
  return (await getApi()).oom_report_rule.delete({ path: { oom_report_rule_id: ruleId } });
}

function isOomReportRule(value: unknown): value is OomReportRule {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['action', 'cgroup_pattern', 'created_at', 'label', 'updated_at'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['hit_count'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['vps'].every((key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key]))
  );
}
function narrowOomReportRule(value: unknown): OomReportRule {
  if (!isOomReportRule(value)) throw new TypeError('Invalid OomReportRule fields');
  return value;
}
function narrowOomReportRuleList(value: unknown): OomReportRule[] {
  if (!Array.isArray(value)) throw new TypeError('Expected OomReportRule list');
  return value.map(narrowOomReportRule);
}

function isOomReport(value: unknown): value is OomReport {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['cgroup', 'created_at', 'invoked_by_name', 'killed_name', 'reported_at'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['count', 'invoked_by_pid', 'killed_pid'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['oom_report_rule', 'vps'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowOomReport(value: unknown): OomReport {
  if (!isOomReport(value)) throw new TypeError('Invalid OomReport fields');
  return value;
}
function narrowOomReportList(value: unknown): OomReport[] {
  if (!Array.isArray(value)) throw new TypeError('Expected OomReport list');
  return value.map(narrowOomReport);
}

function isOomReportUsage(value: unknown): value is OomReportUsage {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['memtype'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    ['failcnt', 'limit', 'usage'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function narrowOomReportUsage(value: unknown): OomReportUsage {
  if (!isOomReportUsage(value)) throw new TypeError('Invalid OomReportUsage fields');
  return value;
}
function narrowOomReportUsageList(value: unknown): OomReportUsage[] {
  if (!Array.isArray(value)) throw new TypeError('Expected OomReportUsage list');
  return value.map(narrowOomReportUsage);
}

function isOomReportStat(value: unknown): value is OomReportStat {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['parameter'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    ['value'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function narrowOomReportStat(value: unknown): OomReportStat {
  if (!isOomReportStat(value)) throw new TypeError('Invalid OomReportStat fields');
  return value;
}
function narrowOomReportStatList(value: unknown): OomReportStat[] {
  if (!Array.isArray(value)) throw new TypeError('Expected OomReportStat list');
  return value.map(narrowOomReportStat);
}

function isOomReportTask(value: unknown): value is OomReportTask {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['name'].every((key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string') &&
    [
      'host_pid',
      'oom_score_adj',
      'pgtables_bytes',
      'rss',
      'rss_anon',
      'rss_file',
      'rss_shmem',
      'swapents',
      'tgid',
      'total_vm',
      'vps_pid',
      'vps_uid',
    ].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    )
  );
}
function narrowOomReportTask(value: unknown): OomReportTask {
  if (!isOomReportTask(value)) throw new TypeError('Invalid OomReportTask fields');
  return value;
}
function narrowOomReportTaskList(value: unknown): OomReportTask[] {
  if (!Array.isArray(value)) throw new TypeError('Expected OomReportTask list');
  return value.map(narrowOomReportTask);
}
