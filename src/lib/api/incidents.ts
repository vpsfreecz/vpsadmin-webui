import type {
  IncidentReport__ShowOutput,
  IncidentReport__IndexInput,
  IncidentReport__CreateInput,
  IpAddressAssignment__IndexOutput,
  IpAddressAssignment__IndexInput,
  User__ShowOutput,
  Vps__ShowOutput,
  Mailbox__ShowOutput,
} from 'vpsadmin-typescript-client';
import { expectArray } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';

type UserRef = Pick<User__ShowOutput, 'id' | 'login' | 'full_name'> & Record<string, unknown>;
type VpsRef = Pick<Vps__ShowOutput, 'id' | 'hostname'> & Record<string, unknown>;
type MailboxRef = Pick<Mailbox__ShowOutput, 'id' | 'label'> & Record<string, unknown>;
export type IpAddressAssignment = Omit<IpAddressAssignment__IndexOutput[number], 'id' | 'user' | 'vps'> & {
  id: number;
  user?: UserRef | null;
  vps?: VpsRef | null;
};
export type IncidentReport = Omit<
  IncidentReport__ShowOutput,
  'id' | 'user' | 'vps' | 'filed_by' | 'mailbox' | 'ip_address_assignment'
> & {
  id: number;
  user?: UserRef | null;
  vps?: VpsRef | null;
  filed_by?: UserRef | null;
  mailbox?: MailboxRef | null;
  ip_address_assignment?: Partial<IpAddressAssignment> | null;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function strings(row: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => row[key] == null || typeof row[key] === 'string');
}
function reference(value: unknown, keys: readonly string[]): boolean {
  return value == null || (record(value) && (value['id'] == null || id(value['id'])) && strings(value, keys));
}
function isAssignment(value: unknown): value is IpAddressAssignment {
  return (
    record(value) &&
    id(value['id']) &&
    strings(value, ['ip_addr', 'from_date', 'to_date', 'created_at', 'updated_at']) &&
    (value['ip_prefix'] == null ||
      (typeof value['ip_prefix'] === 'number' && Number.isSafeInteger(value['ip_prefix']))) &&
    reference(value['user'], ['login', 'full_name']) &&
    reference(value['vps'], ['hostname'])
  );
}
function assignment(value: unknown): IpAddressAssignment {
  if (!isAssignment(value)) throw new Error('Invalid IP assignment identity or fields');
  return value;
}
function isIncident(value: unknown): value is IncidentReport {
  return (
    record(value) &&
    id(value['id']) &&
    strings(value, ['subject', 'text', 'codename', 'vps_action', 'detected_at', 'created_at', 'reported_at']) &&
    ['raw_user_id', 'raw_vps_id', 'cpu_limit'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    reference(value['user'], ['login', 'full_name']) &&
    reference(value['filed_by'], ['login', 'full_name']) &&
    reference(value['vps'], ['hostname']) &&
    reference(value['mailbox'], ['label']) &&
    reference(value['ip_address_assignment'], ['ip_addr', 'from_date', 'to_date'])
  );
}
function incident(value: unknown): IncidentReport {
  if (!isIncident(value)) throw new Error('Invalid incident identity or fields');
  return value;
}

export async function fetchIncidentReports(opts?: {
  limit?: number;
  fromId?: number;
  userId?: number;
  vpsId?: number;
  ipAddressAssignmentId?: number;
  ipAddr?: string;
  mailboxId?: number;
  filedById?: number;
  codename?: string;
  includes?: string;
}) {
  const params: IncidentReport__IndexInput = {
    limit: opts?.limit,
    from_id: opts?.fromId,
    user: opts?.userId,
    vps: opts?.vpsId,
    ip_address_assignment: opts?.ipAddressAssignmentId,
    ip_addr: opts?.ipAddr?.trim() || undefined,
    mailbox: opts?.mailboxId,
    filed_by: opts?.filedById,
    codename: opts?.codename?.trim() || undefined,
  };
  const res = await (
    await getApi()
  ).incident_report.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });
  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'incidents').map(incident), 'incidents');
}

export async function fetchIncidentReport(
  incidentReportId: number,
  opts?: { includes?: string; signal?: AbortSignal }
) {
  const res = await (
    await getApi()
  ).incident_report.show({
    path: { incident_report_id: incidentReportId },
    meta: opts?.includes ? { includes: opts.includes } : undefined,
    signal: opts?.signal,
  });
  return narrowApiResult(res, incident, 'incident');
}

export async function createIncidentReport(payload: {
  vpsId: number;
  subject: string;
  text: string;
  codename?: string;
  detectedAtIso?: string;
  ipAddressAssignmentId?: number;
  cpuLimit?: number;
  vpsAction?: string;
}) {
  const params: IncidentReport__CreateInput = {
    vps: payload.vpsId,
    subject: payload.subject,
    text: payload.text,
    codename: payload.codename,
    detected_at: payload.detectedAtIso,
    ip_address_assignment: payload.ipAddressAssignmentId,
    cpu_limit: payload.cpuLimit,
    vps_action: payload.vpsAction,
  };
  const res = await (await getApi()).incident_report.create({ params });
  return narrowApiResult(res, incident, 'incident create');
}

export async function fetchIpAddressAssignments(opts?: {
  limit?: number;
  vpsId?: number;
  active?: boolean;
  includes?: string;
}) {
  const params: IpAddressAssignment__IndexInput = { limit: opts?.limit, vps: opts?.vpsId, active: opts?.active };
  const res = await (
    await getApi()
  ).ip_address_assignment.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });
  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'IP assignments').map(assignment), 'IP assignments');
}
