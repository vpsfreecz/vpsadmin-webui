import type {
  MetricsAccessToken__CreateInput,
  MetricsAccessToken__IndexInput,
  UserSession__IndexInput,
  User__KnownDevice__IndexInput,
  User__PublicKey__CreateInput,
  User__PublicKey__IndexInput,
  User__PublicKey__UpdateInput,
  User__TotpDevice__ConfirmInput,
  User__TotpDevice__CreateInput,
  User__TotpDevice__IndexInput,
  User__TotpDevice__UpdateInput,
  User__WebauthnCredential__IndexInput,
  User__WebauthnCredential__UpdateInput,
} from 'vpsadmin-typescript-client';
import type { WebauthnPublicKeyCredentialJson } from '../webauthn';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import {
  readTotpCreate,
  readRegistration,
  readToken,
  readUserPublicKey,
  readUserPublicKeyList,
  readUserSession,
  readUserSessionList,
  readMetricsAccessToken,
  readMetricsAccessTokenList,
  readUserKnownDeviceList,
  readUserTotpDevice,
  readUserTotpDeviceList,
  readUserWebauthnCredential,
  readUserWebauthnCredentialList,
  readTotpRecovery,
} from './userDossierViews';
export type {
  UserPublicKey,
  UserSession,
  MetricsAccessToken,
  UserKnownDevice,
  UserTotpDevice,
  UserWebauthnCredential,
  UserSessionToken,
  UserSessionUserRef,
  UserTotpDeviceCreateResponse,
  WebauthnRegistrationBeginResponse,
} from './userDossierViews';

/**
 * User dossier API wrappers
 *
 * Shared primitives used by:
 * - /profile/* (current user)
 * - /admin/users/:id/* (admin user dossier)
 */

// ---- SSH public keys -------------------------------------------------------

export async function fetchUserPublicKeys(userId: number, opts?: { fromId?: number; limit?: number }) {
  const params: User__PublicKey__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = narrowApiResult(
    await (
      await getApi()
    ).user.public_key.index({ path: { user_id: userId }, params: Object.keys(params).length > 0 ? params : undefined }),
    readUserPublicKeyList,
    'fetchUserPublicKeys'
  );

  return { ...res, data: res.data };
}

export async function createUserPublicKey(userId: number, payload: User__PublicKey__CreateInput) {
  return narrowApiResult(
    await (await getApi()).user.public_key.create({ path: { user_id: userId }, params: payload }),
    readUserPublicKey,
    'createUserPublicKey'
  );
}

export async function updateUserPublicKey(userId: number, keyId: number, payload: User__PublicKey__UpdateInput) {
  return narrowApiResult(
    await (await getApi()).user.public_key.update({ path: { user_id: userId, public_key_id: keyId }, params: payload }),
    readUserPublicKey,
    'updateUserPublicKey'
  );
}

export async function deleteUserPublicKey(userId: number, keyId: number) {
  return await (await getApi()).user.public_key.delete({ path: { user_id: userId, public_key_id: keyId } });
}

// ---- Sessions (API tokens) -------------------------------------------------

export async function fetchUserSessions(opts?: {
  /** Admin-only: list sessions for specific user. */
  userId?: number;
  fromId?: number;
  limit?: number;
  state?: 'all' | 'open' | 'closed';
  ip_addr?: string;
  api_ip_addr?: string;
  client_ip_addr?: string;
  user_agent?: string;
  client_version?: string;
  token_fragment?: string;
  auth_type?: 'basic' | 'token' | 'oauth2';
  adminId?: number;
}) {
  const params: UserSession__IndexInput = {};
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.state !== undefined) params['state'] = opts.state;
  if (opts?.ip_addr) params['ip_addr'] = opts.ip_addr;
  if (opts?.api_ip_addr) params['api_ip_addr'] = opts.api_ip_addr;
  if (opts?.client_ip_addr) params['client_ip_addr'] = opts.client_ip_addr;
  if (opts?.user_agent) params['user_agent'] = opts.user_agent;
  if (opts?.client_version) params['client_version'] = opts.client_version;
  if (opts?.token_fragment) params['token_fragment'] = opts.token_fragment;
  if (opts?.auth_type) params['auth_type'] = opts.auth_type;
  if (opts?.adminId !== undefined) params['admin'] = opts.adminId;

  const res = narrowApiResult(
    await (await getApi()).user_session.index({ params }),
    readUserSessionList,
    'fetchUserSessions'
  );

  return { ...res, data: res.data };
}

export async function fetchUserSession(sessionId: number) {
  return narrowApiResult(
    await (await getApi()).user_session.show({ path: { user_session_id: sessionId } }),
    readUserSession,
    'fetchUserSession'
  );
}

export async function updateUserSessionLabel(sessionId: number, label: string) {
  return narrowApiResult(
    await (await getApi()).user_session.update({ path: { user_session_id: sessionId }, params: { label } }),
    (data) => {
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new TypeError('Expected session update object');
      return data;
    },
    'updateUserSessionLabel'
  );
}

export async function closeUserSession(sessionId: number) {
  // In HaveAPI, the "close" action is POST /user_sessions/:id
  return await (await getApi()).user_session.close({ path: { user_session_id: sessionId } });
}

export async function createUserSessionToken(payload: {
  /** Admin-only: user to create token for */
  userId: number;
  label: string;
  token_lifetime: 'fixed' | 'renewable_manual' | 'renewable_auto' | 'permanent';
  /** Seconds; required when token_lifetime is fixed/renewable_* */
  token_interval?: number;
  scope?: string;
}) {
  return narrowApiResult(
    await (
      await getApi()
    ).user_session.create({
      params: {
        user: payload.userId,
        label: payload.label,
        token_lifetime: payload.token_lifetime,
        token_interval: payload.token_interval,
        scope: payload.scope ?? 'all',
      },
    }),
    readToken,
    'createUserSessionToken'
  );
}

// ---- Metrics access tokens -------------------------------------------------

export async function fetchMetricsAccessTokens(opts?: { userId?: number; fromId?: number; limit?: number }) {
  const params: MetricsAccessToken__IndexInput = {};
  if (opts?.userId !== undefined) params['user'] = opts.userId;
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = narrowApiResult(
    await (await getApi()).metrics_access_token.index({ params: Object.keys(params).length > 0 ? params : undefined }),
    readMetricsAccessTokenList,
    'fetchMetricsAccessTokens'
  );

  return {
    ...res,
    data: res.data,
  };
}

export async function createMetricsAccessToken(payload: { userId?: number; metric_prefix: string }) {
  const params: MetricsAccessToken__CreateInput = { metric_prefix: payload.metric_prefix };
  if (payload.userId !== undefined) params['user'] = payload.userId;

  return narrowApiResult(
    await (await getApi()).metrics_access_token.create({ params }),
    readMetricsAccessToken,
    'createMetricsAccessToken'
  );
}

export async function deleteMetricsAccessToken(tokenId: number) {
  return await (await getApi()).metrics_access_token.delete({ path: { metrics_access_token_id: tokenId } });
}

// ---- Known devices ---------------------------------------------------------

export async function fetchUserKnownDevices(userId: number, opts?: { fromId?: number; limit?: number }) {
  const params: User__KnownDevice__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;

  const res = narrowApiResult(
    await (
      await getApi()
    ).user.known_device.index({
      path: { user_id: userId },
      params: Object.keys(params).length > 0 ? params : undefined,
    }),
    readUserKnownDeviceList,
    'fetchUserKnownDevices'
  );

  return {
    ...res,
    data: res.data,
  };
}

export async function deleteUserKnownDevice(userId: number, deviceId: number) {
  return await (await getApi()).user.known_device.delete({ path: { user_id: userId, known_device_id: deviceId } });
}

// ---- TOTP devices ----------------------------------------------------------

export async function fetchUserTotpDevices(
  userId: number,
  opts?: { fromId?: number; limit?: number; confirmed?: boolean; enabled?: boolean }
) {
  const params: User__TotpDevice__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.confirmed !== undefined) params['confirmed'] = opts.confirmed;
  if (opts?.enabled !== undefined) params['enabled'] = opts.enabled;

  const res = narrowApiResult(
    await (
      await getApi()
    ).user.totp_device.index({
      path: { user_id: userId },
      params: Object.keys(params).length > 0 ? params : undefined,
    }),
    readUserTotpDeviceList,
    'fetchUserTotpDevices'
  );

  return {
    ...res,
    data: res.data,
  };
}

export async function createUserTotpDevice(userId: number, payload: User__TotpDevice__CreateInput) {
  return narrowApiResult(
    await (await getApi()).user.totp_device.create({ path: { user_id: userId }, params: payload }),
    readTotpCreate,
    'TOTP create'
  );
}

export async function confirmUserTotpDevice(userId: number, deviceId: number, payload: User__TotpDevice__ConfirmInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).user.totp_device.confirm({ path: { user_id: userId, totp_device_id: deviceId }, params: payload }),
    readTotpRecovery,
    'TOTP confirmation'
  );
}

export async function updateUserTotpDevice(userId: number, deviceId: number, payload: User__TotpDevice__UpdateInput) {
  return narrowApiResult(
    await (
      await getApi()
    ).user.totp_device.update({ path: { user_id: userId, totp_device_id: deviceId }, params: payload }),
    readUserTotpDevice,
    'updateUserTotpDevice'
  );
}

export async function deleteUserTotpDevice(userId: number, deviceId: number) {
  return await (await getApi()).user.totp_device.delete({ path: { user_id: userId, totp_device_id: deviceId } });
}

// ---- WebAuthn credentials --------------------------------------------------

export async function fetchUserWebauthnCredentials(
  userId: number,
  opts?: { fromId?: number; limit?: number; enabled?: boolean }
) {
  const params: User__WebauthnCredential__IndexInput = {};
  if (opts?.fromId !== undefined) params['from_id'] = opts.fromId;
  if (opts?.limit !== undefined) params['limit'] = opts.limit;
  if (opts?.enabled !== undefined) params['enabled'] = opts.enabled;

  const res = narrowApiResult(
    await (
      await getApi()
    ).user.webauthn_credential.index({
      path: { user_id: userId },
      params: Object.keys(params).length > 0 ? params : undefined,
    }),
    readUserWebauthnCredentialList,
    'fetchUserWebauthnCredentials'
  );

  return {
    ...res,
    data: res.data,
  };
}

export async function updateUserWebauthnCredential(
  userId: number,
  credId: number,
  payload: User__WebauthnCredential__UpdateInput
) {
  return narrowApiResult(
    await (
      await getApi()
    ).user.webauthn_credential.update({ path: { user_id: userId, webauthn_credential_id: credId }, params: payload }),
    readUserWebauthnCredential,
    'updateUserWebauthnCredential'
  );
}

export async function deleteUserWebauthnCredential(userId: number, credId: number) {
  return await (
    await getApi()
  ).user.webauthn_credential.delete({ path: { user_id: userId, webauthn_credential_id: credId } });
}

// ---- WebAuthn registration (current user) ---------------------------------

export async function beginWebauthnRegistration() {
  return narrowApiResult(
    await (await getApi()).webauthn.registration.begin({}),
    readRegistration,
    'beginWebauthnRegistration'
  );
}

export async function finishWebauthnRegistration(payload: {
  challenge_token: string;
  label: string;
  public_key_credential: WebauthnPublicKeyCredentialJson;
}) {
  return await (
    await getApi()
  ).webauthn.registration.finish({
    params: {
      ...payload,
      public_key_credential: {
        ...payload.public_key_credential,
        response: { ...payload.public_key_credential.response },
      },
    },
  });
}
