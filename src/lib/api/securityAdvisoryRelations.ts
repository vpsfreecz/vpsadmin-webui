import { isOperationsRecord, isOperationsReference, type OperationsReference } from './operationsReference';
import type {
  SecurityAdvisory__NodeStatus__CreateInput,
  SecurityAdvisory__NodeStatus__UpdateInput,
  UserSecurityAdvisory__IndexOutput,
  VpsSecurityAdvisory__IndexOutput,
} from 'vpsadmin-typescript-client';
import type {
  Location__ShowOutput,
  OutageSecurityAdvisory__IndexOutput,
  SecurityAdvisory__NodeStatus__IndexOutput,
} from 'vpsadmin-typescript-client';
import type {
  OutageSecurityAdvisory__IndexInput,
  SecurityAdvisory__NodeStatus__IndexInput,
  UserSecurityAdvisory__IndexInput,
  VpsSecurityAdvisory__IndexInput,
} from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { narrowApiResult } from './apiOutput';
import type { ResourceRef } from './appTypes';
import type { SecurityAdvisoryMutationGuards } from './securityAdvisories';

export type SecurityAdvisoryNodeState = 'unknown' | 'not_affected' | 'vulnerable' | 'mitigated' | string;

export type SecurityAdvisoryNodeStatus = Omit<
  SecurityAdvisory__NodeStatus__IndexOutput[number],
  'id' | 'node' | 'security_advisory'
> & {
  id: number;
  node?: OperationsReference | null;
  security_advisory?: OperationsReference | null;
  [k: string]: unknown;
};

export type SecurityAdvisoryNodeStatusCreatePayload = SecurityAdvisory__NodeStatus__CreateInput;
export type SecurityAdvisoryNodeStatusUpdatePayload = SecurityAdvisory__NodeStatus__UpdateInput;

export type SecurityAdvisoryAffectedUser = Omit<
  UserSecurityAdvisory__IndexOutput[number],
  'id' | 'security_advisory' | 'user'
> & {
  id: number;
  security_advisory?: OperationsReference | null;
  user?: OperationsReference | null;
  [k: string]: unknown;
};

export type SecurityAdvisoryAffectedVps = Omit<
  VpsSecurityAdvisory__IndexOutput[number],
  'id' | 'environment' | 'location' | 'node' | 'security_advisory' | 'user' | 'vps'
> & {
  id: number;
  environment?: OperationsReference | null;
  location?: OperationsReference | null;
  node?: OperationsReference | null;
  security_advisory?: OperationsReference | null;
  user?: OperationsReference | null;
  vps?: OperationsReference | null;
  [k: string]: unknown;
};

export type SecurityAdvisoryOutageLink = Omit<
  OutageSecurityAdvisory__IndexOutput[number],
  'id' | 'outage' | 'security_advisory'
> & {
  id: number;
  outage?: OperationsReference | null;
  security_advisory?: OperationsReference | null;
  [k: string]: unknown;
};

export interface SecurityAdvisoryNodeStatusFilters {
  nodeId?: number;
  state?: SecurityAdvisoryNodeState;
  limit?: number;
  fromId?: number;
  includes?: string;
}

export interface SecurityAdvisoryAffectedUserFilters {
  securityAdvisoryId?: number;
  userId?: number;
  limit?: number;
  fromId?: number;
  includes?: string;
}

export interface SecurityAdvisoryAffectedVpsFilters {
  securityAdvisoryId?: number;
  vpsId?: number;
  userId?: number;
  environmentId?: number;
  locationId?: number;
  nodeId?: number;
  limit?: number;
  fromId?: number;
  includes?: string;
}

export interface SecurityAdvisoryOutageLinkFilters {
  outageId?: number;
  securityAdvisoryId?: number;
  limit?: number;
  fromId?: number;
  includes?: string;
}

export async function fetchSecurityAdvisoryNodeStatuses(
  securityAdvisoryId: number,
  opts?: SecurityAdvisoryNodeStatusFilters
) {
  const params: SecurityAdvisory__NodeStatus__IndexInput = {};
  if (opts?.nodeId !== undefined) params['node'] = opts.nodeId;
  if (opts?.state) params['state'] = opts.state;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (
    await getApi()
  ).security_advisory.node_status.index({
    path: { security_advisory_id: securityAdvisoryId },
    params,
    meta: opts?.includes ? { includes: opts.includes } : undefined,
  });

  return narrowApiResult(res, narrowSecurityAdvisoryNodeStatusList, 'security_advisory#node_statuses#index');
}

export async function createSecurityAdvisoryNodeStatus(
  securityAdvisoryId: number,
  params: SecurityAdvisoryNodeStatusCreatePayload & SecurityAdvisoryMutationGuards
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory.node_status.create({
      path: { security_advisory_id: securityAdvisoryId },
      params: { ...params },
    }),
    narrowSecurityAdvisoryNodeStatus,
    'security_advisory.node_status.create'
  );
}

export async function updateSecurityAdvisoryNodeStatus(
  securityAdvisoryId: number,
  nodeStatusId: number,
  params: SecurityAdvisoryNodeStatusUpdatePayload & SecurityAdvisoryMutationGuards
) {
  return narrowApiResult(
    await (
      await getApi()
    ).security_advisory.node_status.update({
      path: { security_advisory_id: securityAdvisoryId, node_status_id: nodeStatusId },
      params: { ...params },
    }),
    narrowSecurityAdvisoryNodeStatus,
    'security_advisory.node_status.update'
  );
}

export async function deleteSecurityAdvisoryNodeStatus(
  securityAdvisoryId: number,
  nodeStatusId: number,
  guards: SecurityAdvisoryMutationGuards
) {
  return (await getApi()).security_advisory.node_status.delete({
    path: { security_advisory_id: securityAdvisoryId, node_status_id: nodeStatusId },
    params: { ...guards },
  });
}

export async function fetchSecurityAdvisoryAffectedUsers(opts?: SecurityAdvisoryAffectedUserFilters) {
  const params: UserSecurityAdvisory__IndexInput = {};
  if (opts?.securityAdvisoryId !== undefined) params['security_advisory'] = opts.securityAdvisoryId;
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (
    await getApi()
  ).user_security_advisory.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(res, narrowSecurityAdvisoryAffectedUserList, 'user_security_advisories#index');
}

export async function fetchSecurityAdvisoryAffectedVps(opts?: SecurityAdvisoryAffectedVpsFilters) {
  const params: VpsSecurityAdvisory__IndexInput = {};
  if (opts?.securityAdvisoryId !== undefined) params['security_advisory'] = opts.securityAdvisoryId;
  if (opts?.vpsId !== undefined) params['vps'] = opts.vpsId;
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.environmentId !== undefined) params['environment'] = opts.environmentId;
  if (opts?.locationId !== undefined) params['location'] = opts.locationId;
  if (opts?.nodeId !== undefined) params['node'] = opts.nodeId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (
    await getApi()
  ).vps_security_advisory.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(res, narrowSecurityAdvisoryAffectedVpsList, 'vps_security_advisories#index');
}

export async function fetchSecurityAdvisoryOutageLinks(opts?: SecurityAdvisoryOutageLinkFilters) {
  const params: OutageSecurityAdvisory__IndexInput = {};
  if (opts?.outageId !== undefined) params['outage'] = opts.outageId;
  if (opts?.securityAdvisoryId !== undefined) params['security_advisory'] = opts.securityAdvisoryId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;

  const res = await (
    await getApi()
  ).outage_security_advisory.index({ params, meta: opts?.includes ? { includes: opts.includes } : undefined });

  return narrowApiResult(res, narrowSecurityAdvisoryOutageLinkList, 'outage_security_advisories#index');
}

export async function fetchSecurityAdvisoryOutageLink(
  outageSecurityAdvisoryId: number,
  opts?: { includes?: string; signal?: AbortSignal }
) {
  return narrowApiResult(
    await (
      await getApi()
    ).outage_security_advisory.show({
      path: { outage_security_advisory_id: outageSecurityAdvisoryId },
      meta: opts?.includes ? { includes: opts.includes } : undefined,
      signal: opts?.signal,
    }),
    narrowSecurityAdvisoryOutageLink,
    'outage_security_advisory.show'
  );
}

export async function createSecurityAdvisoryOutageLink(params: { outage: number; security_advisory: number }) {
  return narrowApiResult(
    await (await getApi()).outage_security_advisory.create({ params: { ...params } }),
    narrowSecurityAdvisoryOutageLink,
    'outage_security_advisory.create'
  );
}

export async function deleteSecurityAdvisoryOutageLink(outageSecurityAdvisoryId: number) {
  return (await getApi()).outage_security_advisory.delete({
    path: { outage_security_advisory_id: outageSecurityAdvisoryId },
  });
}

function isSecurityAdvisoryNodeStatus(value: unknown): value is SecurityAdvisoryNodeStatus {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['cs_note', 'en_note', 'mitigated_since', 'state', 'vulnerable_until'].every(
      (key) => value[key] === undefined || value[key] === null || typeof value[key] === 'string'
    ) &&
    ['node', 'security_advisory'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowSecurityAdvisoryNodeStatus(value: unknown): SecurityAdvisoryNodeStatus {
  if (!isSecurityAdvisoryNodeStatus(value)) throw new TypeError('Invalid SecurityAdvisoryNodeStatus fields');
  return value;
}
function narrowSecurityAdvisoryNodeStatusList(value: unknown): SecurityAdvisoryNodeStatus[] {
  if (!Array.isArray(value)) throw new TypeError('Expected SecurityAdvisoryNodeStatus list');
  return value.map(narrowSecurityAdvisoryNodeStatus);
}

function isSecurityAdvisoryOutageLink(value: unknown): value is SecurityAdvisoryOutageLink {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['outage_id', 'security_advisory_id'].every(
      (key) =>
        value[key] === undefined ||
        value[key] === null ||
        (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['outage', 'security_advisory'].every(
      (key) => value[key] === undefined || value[key] === null || isOperationsReference(value[key])
    )
  );
}
function narrowSecurityAdvisoryOutageLink(value: unknown): SecurityAdvisoryOutageLink {
  if (!isSecurityAdvisoryOutageLink(value)) throw new TypeError('Invalid SecurityAdvisoryOutageLink fields');
  return value;
}
function narrowSecurityAdvisoryOutageLinkList(value: unknown): SecurityAdvisoryOutageLink[] {
  if (!Array.isArray(value)) throw new TypeError('Expected SecurityAdvisoryOutageLink list');
  return value.map(narrowSecurityAdvisoryOutageLink);
}

function narrowSecurityAdvisoryAffectedUserList(
  data: UserSecurityAdvisory__IndexOutput
): SecurityAdvisoryAffectedUser[] {
  if (!Array.isArray(data)) throw new TypeError('Expected advisory relation list');
  return data.map((value) => {
    if (!isSecurityAdvisoryAffectedUser(value)) throw new TypeError('Invalid advisory relation');
    return value;
  });
}

function isSecurityAdvisoryAffectedUser(value: unknown): value is SecurityAdvisoryAffectedUser {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['security_advisory', 'user'].every((key) => value[key] == null || isOperationsReference(value[key]))
  );
}

function narrowSecurityAdvisoryAffectedVpsList(data: VpsSecurityAdvisory__IndexOutput): SecurityAdvisoryAffectedVps[] {
  if (!Array.isArray(data)) throw new TypeError('Expected advisory relation list');
  return data.map((value) => {
    if (!isSecurityAdvisoryAffectedVps(value)) throw new TypeError('Invalid advisory relation');
    return value;
  });
}

function isSecurityAdvisoryAffectedVps(value: unknown): value is SecurityAdvisoryAffectedVps {
  return (
    isOperationsRecord(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['environment', 'location', 'node', 'security_advisory', 'user', 'vps'].every(
      (key) => value[key] == null || isOperationsReference(value[key])
    )
  );
}
