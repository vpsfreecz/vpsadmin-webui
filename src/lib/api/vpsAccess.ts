import type { ActionResult, Vps__PasswdInput, Vps__SshHostKey__ShowOutput } from 'vpsadmin-typescript-client';
import { getApi } from './sdk';
import { requireActionStateResult } from './apiErrors';
import { narrowApiResult } from './apiOutput';
import { fields, rows } from './vpsStorageOutput';
import { vpsPasswd, type VpsPasswdReply } from './vps';
import { fetchUserPublicKeys, type UserPublicKey } from './userDossier';
import { fetchCurrentUser, type User } from './users';

export type VpsPasswordType = 'secure' | 'simple';
export type VpsPasswordOptions = Vps__PasswdInput & { type?: VpsPasswordType };
export type VpsGeneratedPassword = VpsPasswdReply;
export type UserIdentity = User;
export type VpsPublicKey = UserPublicKey;
export type VpsSshHostKey = Vps__SshHostKey__ShowOutput;
export type ApiResult<T> = ActionResult<T> & { raw?: unknown };

function isSshHostKey(value: unknown): value is VpsSshHostKey {
  return fields(value, ['algorithm', 'fingerprint', 'created_at', 'updated_at'], ['id', 'bits']);
}

/** Retain the original receipt while preserving the access page's raw alias. */
function withRaw<T extends { envelope: unknown }>(result: T) {
  return { ...result, raw: result.envelope };
}

export async function resetVpsRootPassword(vpsId: number, options?: VpsPasswordOptions) {
  return withRaw(await vpsPasswd(vpsId, options?.type ?? 'secure'));
}

export async function getCurrentUser() {
  return withRaw(await fetchCurrentUser());
}

export async function listUserPublicKeys(userId: number) {
  return withRaw(await fetchUserPublicKeys(userId, { limit: 100 }));
}

export async function deployVpsPublicKey(vpsId: number, publicKeyId: number) {
  const result = await (await getApi()).vps.deploy_public_key({ path: { vps_id: vpsId }, params: { public_key: publicKeyId } });
  return withRaw(requireActionStateResult(result, 'VPS public-key deployment'));
}

export async function listVpsSshHostKeys(vpsId: number) {
  const result = await (await getApi()).vps.ssh_host_key.index({ path: { vps_id: vpsId } });
  return withRaw(narrowApiResult(result, data => rows(data, isSshHostKey), 'VPS SSH host keys'));
}
