import type { User__ShowOutput, User__CreateInput } from 'vpsadmin-typescript-client';

/** Full account workflows need these identities; included references do not. */
export type User = Omit<User__ShowOutput, 'id' | 'login' | 'level' | 'language'> & {
  id: number;
  login: string;
  level: number;
  language?: Pick<import('vpsadmin-typescript-client').Language__ShowOutput, 'id' | 'code' | 'label'> | null;
  [key: string]: unknown;
};

export type CreateUserPayload = User__CreateInput & { login: string; password: string; level: number };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isUser(value: unknown): value is User {
  if (
    !record(value) ||
    typeof value['id'] !== 'number' ||
    !Number.isSafeInteger(value['id']) ||
    value['id'] <= 0 ||
    typeof value['login'] !== 'string' ||
    !value['login'].trim() ||
    typeof value['level'] !== 'number' ||
    !Number.isSafeInteger(value['level'])
  )
    return false;
  const strings = [
    'full_name',
    'email',
    'address',
    'created_at',
    'last_activity_at',
    'paid_until',
    'object_state',
    'expiration_date',
    'remind_after_date',
    'time_zone',
    'info',
  ] satisfies readonly (keyof User__ShowOutput)[];
  const flags = [
    'mailer_enabled',
    'lockout',
    'password_reset',
    'enable_basic_auth',
    'enable_token_auth',
    'enable_oauth2_auth',
    'enable_single_sign_on',
    'enable_new_login_notification',
    'enable_multi_factor_auth',
    'preferred_logout_all',
  ] satisfies readonly (keyof User__ShowOutput)[];
  const language = value['language'];
  return (
    strings.every((key) => value[key] == null || typeof value[key] === 'string') &&
    flags.every((key) => value[key] == null || typeof value[key] === 'boolean') &&
    ['monthly_payment', 'preferred_session_length'].every(
      (key) => value[key] == null || (typeof value[key] === 'number' && Number.isFinite(value[key]))
    ) &&
    (language == null ||
      (record(language) &&
        (language['id'] == null ||
          (typeof language['id'] === 'number' && Number.isSafeInteger(language['id']) && language['id'] > 0)) &&
        ['code', 'label'].every((key) => language[key] == null || typeof language[key] === 'string')))
  );
}

export function readUser(value: unknown): User {
  if (!isUser(value)) throw new TypeError('Expected user identity and account fields');
  return value;
}
export function readUsers(value: unknown): User[] {
  if (!Array.isArray(value)) throw new TypeError('Expected users collection');
  return value.map(readUser);
}

export interface FetchUsersOpts {
  limit?: number;
  fromId?: number;
  signal?: AbortSignal;
  /** Explicit lifecycle scope; omitted requests default to active users. */
  objectState?: string;
  /** Request an exact total for filters supported directly by HaveAPI. */
  count?: boolean;

  /**
   * Legacy admin list search from the redesign snapshot.
   *
   * Current upstream no longer exposes `q` on `GET /users`, so we emulate it
   * client-side by scanning keyset pages and filtering locally.
   */
  q?: string;

  /**
   * Role filter from the redesign snapshot.
   *
   * Current upstream only exposes `admin=true`; `support`/`user` are derived
   * client-side from `level`.
   */
  role?: 'user' | 'support' | 'admin';

  /** Explicit level filter (admin only). */
  level?: number;

  /** Additional admin filters. */
  mailerEnabled?: boolean;
  lockout?: boolean;
  passwordReset?: boolean;
  enableMfa?: boolean;
  enableOAuth2?: boolean;
  enableTokenAuth?: boolean;
  enableBasicAuth?: boolean;
  enableSingleSignOn?: boolean;
  enableNewLoginNotification?: boolean;
}

export interface UserCompatPagination {
  /** Cursor after the last raw user inspected in this bounded scan chunk. */
  nextFromId?: number;
  /** True only when this scan reached the end of the server-side result set. */
  complete: boolean;
  scannedRows: number;
}
