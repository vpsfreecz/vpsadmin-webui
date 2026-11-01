import type {
  UserRequest__Registration__ShowOutput,
  UserRequest__Registration__IndexInput,
  UserRequest__Registration__ResolveInput,
  UserRequest__Registration__UpdateInput,
  UserRequest__Change__ShowOutput,
  UserRequest__Change__IndexInput,
  UserRequest__Change__CreateInput,
  UserRequest__Change__ResolveInput,
  User__ShowOutput,
  OsTemplate__ShowOutput,
  Location__IndexOutput,
  OsTemplate__IndexOutput,
  Language__IndexOutput,
} from 'vpsadmin-typescript-client';
import { expectArray } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { getApi, getPublicApi } from './sdk';

export type UserRef = Pick<User__ShowOutput, 'login' | 'full_name'> & { id?: number | string | null } & Pick<
    OsTemplate__ShowOutput,
    'label' | 'name'
  > &
  Record<string, unknown>;
export type UserRequestState = NonNullable<UserRequest__Registration__ShowOutput['state']>;
export type UserRequestCommon = Pick<
  UserRequest__Registration__ShowOutput,
  | 'raw_user_id'
  | 'state'
  | 'api_ip_addr'
  | 'api_ip_ptr'
  | 'client_ip_addr'
  | 'client_ip_ptr'
  | 'admin_response'
  | 'created_at'
  | 'updated_at'
  | 'label'
> & {
  id: number;
  user?: UserRef | null;
  admin?: UserRef | null;
} & Record<string, unknown>;
export type RegistrationRequest = Omit<
  UserRequest__Registration__ShowOutput,
  'id' | 'user' | 'admin' | 'language' | 'location' | 'os_template'
> &
  UserRequestCommon & {
    language?: UserRef | null;
    location?: UserRef | null;
    os_template?: UserRef | null;
  };
export type ChangeRequest = Omit<UserRequest__Change__ShowOutput, 'id' | 'user' | 'admin'> & UserRequestCommon;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function ownerId(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
  const parsed = Number(value);
  return id(parsed) ? parsed : null;
}
function reference(value: unknown): value is UserRef | null | undefined {
  return (
    value == null ||
    (record(value) &&
      (value['id'] == null || ownerId(value['id']) !== null) &&
      ['login', 'full_name', 'label', 'name'].every((key) => value[key] == null || typeof value[key] === 'string'))
  );
}
function isRequest(value: unknown): value is RegistrationRequest {
  if (!record(value) || !id(value['id'])) return false;
  const stringFields = [
    'state',
    'label',
    'admin_response',
    'api_ip_addr',
    'api_ip_ptr',
    'client_ip_addr',
    'client_ip_ptr',
    'created_at',
    'updated_at',
    'login',
    'full_name',
    'org_name',
    'org_id',
    'email',
    'address',
    'how',
    'note',
    'currency',
    'time_zone',
    'ip_request_id',
    'ip_message',
    'ip_errors',
    'mail_request_id',
    'mail_message',
    'mail_errors',
    'mail_deliverability',
    'mail_spam_trap_score',
    'change_reason',
  ];
  const booleanFields = [
    'ip_checked',
    'ip_success',
    'ip_proxy',
    'ip_crawler',
    'ip_recent_abuse',
    'ip_vpn',
    'ip_tor',
    'mail_checked',
    'mail_success',
    'mail_valid',
    'mail_disposable',
    'mail_timed_out',
    'mail_catch_all',
    'mail_leaked',
    'mail_suspect',
    'mail_dns_valid',
    'mail_honeypot',
    'mail_recent_abuse',
    'mail_frequent_complainer',
  ];
  return (
    stringFields.every((key) => value[key] == null || typeof value[key] === 'string') &&
    booleanFields.every((key) => value[key] == null || typeof value[key] === 'boolean') &&
    [
      'raw_user_id',
      'year_of_birth',
      'ip_fraud_score',
      'mail_smtp_score',
      'mail_overall_score',
      'mail_fraud_score',
    ].every((key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))) &&
    ['user', 'admin', 'language', 'location', 'os_template'].every((key) => reference(value[key]))
  );
}
function registration(value: unknown): RegistrationRequest {
  if (!isRequest(value)) throw new Error('Invalid request identity or fields');
  return value;
}
function change(value: unknown): ChangeRequest {
  return registration(value);
}

export interface MyRequestListOptions {
  limit?: number;
  fromId?: number;
  state?: string;
  count?: boolean;
  /** Privileged My-view callers must also prefilter on the API. */
  explicitOwnerFilter?: boolean;
}
export class UserRequestOwnershipError extends Error {
  constructor() {
    super('Request ownership could not be verified.');
    this.name = 'UserRequestOwnershipError';
  }
}
export function assertOwnedUserRequest<T extends UserRequestCommon>(request: T, expectedUserId: number): T {
  if (!id(expectedUserId) || !request.user || ownerId(request.user.id) !== expectedUserId) {
    throw new UserRequestOwnershipError();
  }
  return request;
}
export function assertOwnedUserRequests<T extends UserRequestCommon>(requests: T[], expectedUserId: number): T[] {
  for (const request of requests) assertOwnedUserRequest(request, expectedUserId);
  return requests;
}

export async function createChangeRequest(params: UserRequest__Change__CreateInput) {
  const res = await (await getApi()).user_request.change.create({ params });
  return narrowApiResult(res, change, 'change request create');
}
export type ResolveUserRequestAction = 'approve' | 'deny' | 'ignore' | 'request_correction';
type ListOptions = {
  limit?: number;
  fromId?: number;
  state?: string;
  userId?: number;
  adminId?: number;
  apiIpAddr?: string;
  clientIpAddr?: string;
  clientIpPtr?: string;
  count?: boolean;
};
function listParams(opts?: ListOptions): UserRequest__Registration__IndexInput & UserRequest__Change__IndexInput {
  return {
    limit: opts?.limit,
    from_id: opts?.fromId,
    state: opts?.state || undefined,
    user: opts?.userId,
    admin: opts?.adminId,
    api_ip_addr: opts?.apiIpAddr || undefined,
    client_ip_addr: opts?.clientIpAddr || undefined,
    client_ip_ptr: opts?.clientIpPtr || undefined,
  };
}
export async function fetchRegistrationRequests(opts?: ListOptions) {
  const res = await (
    await getApi()
  ).user_request.registration.index({ params: listParams(opts), meta: opts?.count ? { count: true } : undefined });
  return narrowApiResult(
    res,
    (data) => expectArray<unknown>(data, 'registration requests').map(registration),
    'registration requests'
  );
}
export async function fetchRegistrationRequest(requestId: number) {
  const res = await (await getApi()).user_request.registration.show({ path: { registration_id: requestId } });
  return narrowApiResult(res, registration, 'registration request');
}
export async function fetchMyRegistrationRequests(expectedUserId: number, opts?: MyRequestListOptions) {
  const { explicitOwnerFilter = false, ...listOptions } = opts ?? {};
  const res = await fetchRegistrationRequests({
    ...listOptions,
    userId: explicitOwnerFilter ? expectedUserId : undefined,
  });
  return { ...res, data: assertOwnedUserRequests(res.data, expectedUserId) };
}
export async function fetchMyRegistrationRequest(requestId: number, expectedUserId: number) {
  const res = await fetchRegistrationRequest(requestId);
  return { ...res, data: assertOwnedUserRequest(res.data, expectedUserId) };
}
export async function resolveRegistrationRequest(
  requestId: number,
  params: UserRequest__Registration__ResolveInput & { action: ResolveUserRequestAction }
) {
  return (await getApi()).user_request.registration.resolve({ path: { registration_id: requestId }, params });
}
export async function previewRegistrationRequest(requestId: number, token: string) {
  const res = await getPublicApi().user_request.registration.preview({ path: { registration_id: requestId, token } });
  return narrowApiResult(res, registration, 'registration preview');
}
export async function updateRegistrationRequestByToken(
  requestId: number,
  token: string,
  params: UserRequest__Registration__UpdateInput
) {
  const res = await getPublicApi().user_request.registration.update({
    path: { registration_id: requestId, token },
    params,
  });
  return narrowApiResult(res, registration, 'registration correction');
}
export async function fetchChangeRequests(opts?: ListOptions) {
  const res = await (
    await getApi()
  ).user_request.change.index({ params: listParams(opts), meta: opts?.count ? { count: true } : undefined });
  return narrowApiResult(res, (data) => expectArray<unknown>(data, 'change requests').map(change), 'change requests');
}
export async function fetchChangeRequest(requestId: number) {
  const res = await (await getApi()).user_request.change.show({ path: { change_id: requestId } });
  return narrowApiResult(res, change, 'change request');
}
export async function fetchMyChangeRequests(expectedUserId: number, opts?: MyRequestListOptions) {
  const { explicitOwnerFilter = false, ...listOptions } = opts ?? {};
  const res = await fetchChangeRequests({ ...listOptions, userId: explicitOwnerFilter ? expectedUserId : undefined });
  return { ...res, data: assertOwnedUserRequests(res.data, expectedUserId) };
}
export async function fetchMyChangeRequest(requestId: number, expectedUserId: number) {
  const res = await fetchChangeRequest(requestId);
  return { ...res, data: assertOwnedUserRequest(res.data, expectedUserId) };
}
export async function resolveChangeRequest(
  requestId: number,
  params: UserRequest__Change__ResolveInput & { action: ResolveUserRequestAction }
) {
  return (await getApi()).user_request.change.resolve({ path: { change_id: requestId }, params });
}

/** These purpose-specific lists use the anonymous registration contract even in an admin browser. */
export type RegistrationCorrectionLocation = Pick<Location__IndexOutput[number], 'id' | 'label'> & { id: number };
export type RegistrationCorrectionTemplate = Pick<
  OsTemplate__IndexOutput[number],
  'id' | 'name' | 'label' | 'hypervisor_type'
> & { id: number };
export type RegistrationCorrectionLanguage = Pick<Language__IndexOutput[number], 'id' | 'code' | 'label'> & {
  id: number;
};
function correctionOption<T extends { id?: number | null }>(value: T): T & { id: number } {
  const row: unknown = value;
  if (
    !record(row) ||
    !id(row['id']) ||
    !['name', 'label', 'code', 'hypervisor_type'].every((key) => row[key] == null || typeof row[key] === 'string')
  ) {
    throw new Error('Invalid registration option identity or fields');
  }
  return { ...value, id: row['id'] };
}
export async function fetchRegistrationCorrectionLocations() {
  const res = await getPublicApi().location.index({ params: { limit: 500 } });
  return narrowApiResult(
    res,
    (data) => expectArray<Location__IndexOutput[number]>(data, 'registration locations').map(correctionOption),
    'registration locations'
  );
}
export async function fetchRegistrationCorrectionTemplates() {
  // Anonymous Index is explicitly server-scoped to enabled+supported templates.
  const res = await getPublicApi().os_template.index({ params: { limit: 500 } });
  return narrowApiResult(
    res,
    (data) => expectArray<OsTemplate__IndexOutput[number]>(data, 'registration templates').map(correctionOption),
    'registration templates'
  );
}
export async function fetchRegistrationCorrectionLanguages() {
  const res = await getPublicApi().language.index({ params: { limit: 250 } });
  return narrowApiResult(
    res,
    (data) => expectArray<Language__IndexOutput[number]>(data, 'registration languages').map(correctionOption),
    'registration languages'
  );
}
