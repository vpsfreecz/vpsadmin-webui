import type { User } from './users';
import { narrowApiResult } from './apiOutput';
import { getApi } from './sdk';
import { readUsers } from './userTypes';

/** Resolve one active user login without invoking the legacy compatibility scan. */
export async function findUserByExactLogin(login: string, opts?: { signal?: AbortSignal }): Promise<User | null> {
  const needle = String(login ?? '').trim();
  if (!needle) return null;

  const result = narrowApiResult(
    await (
      await getApi()
    ).user.index({
      params: { login: needle, limit: 2, object_state: 'active' },
      signal: opts?.signal,
    }),
    readUsers,
    'exact user lookup'
  );
  const normalized = needle.toLowerCase();
  const exact = result.data.filter((user) => user.login.trim().toLowerCase() === normalized);

  return exact.length === 1 ? (exact[0] ?? null) : null;
}
