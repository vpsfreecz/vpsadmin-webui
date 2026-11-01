import type {
  MetricsAccessToken__IndexOutput,
  UserSession__CreateOutput,
  UserSession__IndexOutput,
  User__KnownDevice__IndexOutput,
  User__PublicKey__IndexOutput,
  User__ShowOutput,
  User__TotpDevice__CreateOutput,
  User__TotpDevice__IndexOutput,
  User__WebauthnCredential__IndexOutput,
  Webauthn__Registration__BeginOutput,
} from 'vpsadmin-typescript-client';

export type UserPublicKey = User__PublicKey__IndexOutput[number] & { id: number };
export type UserSession = Omit<UserSession__IndexOutput[number], 'id' | 'user' | 'admin'> &
  Pick<UserSession__CreateOutput, 'token_full'> & {
    id: number;
    user?: UserSessionUserRef | null;
    admin?: UserSessionUserRef | null;
  };
export type MetricsAccessToken = Omit<MetricsAccessToken__IndexOutput[number], 'id' | 'user'> & {
  id: number;
  user?: UserSessionUserRef | null;
};
export type UserKnownDevice = User__KnownDevice__IndexOutput[number] & { id: number };
export type UserTotpDevice = User__TotpDevice__IndexOutput[number] & { id: number };
export type UserWebauthnCredential = User__WebauthnCredential__IndexOutput[number] & { id: number };
export type UserSessionToken = Omit<UserSession__CreateOutput, 'id' | 'user' | 'admin'> &
  UserSession & { token_full: string };
export type UserSessionUserRef = Pick<User__ShowOutput, 'id' | 'login'>;
export type UserTotpDeviceCreateResponse = User__TotpDevice__CreateOutput &
  UserTotpDevice & { secret: string; provisioning_uri: string };
export type WebauthnRegistrationBeginResponse = Webauthn__Registration__BeginOutput & { challenge_token: string };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function sessionUser(value: unknown): value is UserSessionUserRef {
  return (
    record(value) &&
    (value['id'] == null ||
      (typeof value['id'] === 'number' && Number.isSafeInteger(value['id']) && value['id'] > 0)) &&
    (value['login'] == null || typeof value['login'] === 'string')
  );
}
function isTotpCreate(value: unknown): value is UserTotpDeviceCreateResponse {
  return (
    record(value) &&
    typeof value['secret'] === 'string' &&
    Boolean(value['secret']) &&
    typeof value['provisioning_uri'] === 'string' &&
    Boolean(value['provisioning_uri']) &&
    isUserTotpDevice(value)
  );
}
export function readTotpCreate(value: unknown): UserTotpDeviceCreateResponse {
  if (!isTotpCreate(value)) throw new TypeError('Missing secret/provisioning_uri');
  return value;
}
export function readRegistration(value: unknown): WebauthnRegistrationBeginResponse {
  if (!isRegistration(value)) throw new TypeError('Missing WebAuthn challenge');
  return value;
}
function isRegistration(value: unknown): value is WebauthnRegistrationBeginResponse {
  return (
    record(value) &&
    typeof value['challenge_token'] === 'string' &&
    Boolean(value['challenge_token']) &&
    'options' in value
  );
}
export function readToken(value: unknown): UserSessionToken {
  if (!isToken(value)) throw new TypeError('Missing session token');
  return value;
}
function isToken(value: unknown): value is UserSessionToken {
  return (
    record(value) && isUserSession(value) && typeof value['token_full'] === 'string' && Boolean(value['token_full'])
  );
}

function isUserPublicKey(value: unknown): value is UserPublicKey {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['label', 'key', 'fingerprint', 'comment', 'created_at', 'updated_at'].every(
      (key) => value[key] == null || typeof value[key] === 'string'
    ) &&
    ['auto_add'].every((key) => value[key] == null || typeof value[key] === 'boolean')
  );
}
export function readUserPublicKey(value: unknown): UserPublicKey {
  if (!isUserPublicKey(value)) throw new TypeError('Expected UserPublicKey');
  return value;
}
export function readUserPublicKeyList(value: unknown): UserPublicKey[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserPublicKey collection');
  return value.map(readUserPublicKey);
}
function isUserSession(value: unknown): value is UserSession {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    [
      'label',
      'auth_type',
      'api_ip_addr',
      'api_ip_ptr',
      'client_ip_addr',
      'client_ip_ptr',
      'user_agent',
      'client_version',
      'scope',
      'token_fragment',
      'token_lifetime',
      'created_at',
      'last_request_at',
      'closed_at',
    ].every((key) => value[key] == null || typeof value[key] === 'string') &&
    ['token_interval', 'request_count'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    (value['user'] == null || sessionUser(value['user'])) &&
    (value['admin'] == null || sessionUser(value['admin']))
  );
}
export function readUserSession(value: unknown): UserSession {
  if (!isUserSession(value)) throw new TypeError('Expected UserSession');
  return value;
}
export function readUserSessionList(value: unknown): UserSession[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserSession collection');
  return value.map(readUserSession);
}
function isMetricsAccessToken(value: unknown): value is MetricsAccessToken {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['metric_prefix', 'access_token', 'last_use', 'created_at', 'updated_at'].every(
      (key) => value[key] == null || typeof value[key] === 'string'
    ) &&
    ['use_count'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    (value['user'] == null || sessionUser(value['user']))
  );
}
export function readMetricsAccessToken(value: unknown): MetricsAccessToken {
  if (!isMetricsAccessToken(value)) throw new TypeError('Expected MetricsAccessToken');
  return value;
}
export function readMetricsAccessTokenList(value: unknown): MetricsAccessToken[] {
  if (!Array.isArray(value)) throw new TypeError('Expected MetricsAccessToken collection');
  return value.map(readMetricsAccessToken);
}
function isUserKnownDevice(value: unknown): value is UserKnownDevice {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    [
      'api_ip_addr',
      'api_ip_ptr',
      'client_ip_addr',
      'client_ip_ptr',
      'user_agent',
      'skip_multi_factor_auth_until',
      'last_seen_at',
      'created_at',
      'updated_at',
    ].every((key) => value[key] == null || typeof value[key] === 'string')
  );
}
export function readUserKnownDevice(value: unknown): UserKnownDevice {
  if (!isUserKnownDevice(value)) throw new TypeError('Expected UserKnownDevice');
  return value;
}
export function readUserKnownDeviceList(value: unknown): UserKnownDevice[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserKnownDevice collection');
  return value.map(readUserKnownDevice);
}
function isUserTotpDevice(value: unknown): value is UserTotpDevice {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['label', 'last_use_at', 'created_at', 'updated_at'].every(
      (key) => value[key] == null || typeof value[key] === 'string'
    ) &&
    ['use_count'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['confirmed', 'enabled'].every((key) => value[key] == null || typeof value[key] === 'boolean')
  );
}
export function readUserTotpDevice(value: unknown): UserTotpDevice {
  if (!isUserTotpDevice(value)) throw new TypeError('Expected UserTotpDevice');
  return value;
}
export function readUserTotpDeviceList(value: unknown): UserTotpDevice[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserTotpDevice collection');
  return value.map(readUserTotpDevice);
}
function isUserWebauthnCredential(value: unknown): value is UserWebauthnCredential {
  return (
    record(value) &&
    typeof value['id'] === 'number' &&
    Number.isSafeInteger(value['id']) &&
    value['id'] > 0 &&
    ['label', 'last_use_at', 'created_at', 'updated_at'].every(
      (key) => value[key] == null || typeof value[key] === 'string'
    ) &&
    ['use_count'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    ['enabled'].every((key) => value[key] == null || typeof value[key] === 'boolean')
  );
}
export function readUserWebauthnCredential(value: unknown): UserWebauthnCredential {
  if (!isUserWebauthnCredential(value)) throw new TypeError('Expected UserWebauthnCredential');
  return value;
}
export function readUserWebauthnCredentialList(value: unknown): UserWebauthnCredential[] {
  if (!Array.isArray(value)) throw new TypeError('Expected UserWebauthnCredential collection');
  return value.map(readUserWebauthnCredential);
}

export function readTotpRecovery(value: unknown): string {
  if (!record(value) || typeof value['recovery_code'] !== 'string' || !value['recovery_code'])
    throw new TypeError('Expected recovery_code');
  return value['recovery_code'];
}
