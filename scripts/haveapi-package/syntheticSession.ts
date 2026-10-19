import { getRuntimeConfig } from '../../src/app/config';
import { getBffSessionKey, rememberBffSession } from '../../src/lib/auth/bffSession';
import { bindBffImpersonationToSession, getValidatedBffSessionKey } from '../../src/lib/auth/impersonation';

/** The fixture supplies an already validated synthetic identity, without OAuth/bootstrap proof. */
export function bindSyntheticBffSession(key: string, token: string) {
  const runtime = window.vpsAdmin;
  bindBffImpersonationToSession(key, window.sessionStorage);
  rememberBffSession(new URL('/session.json', window.location.href).href, key, token);
  return {
    auth: getRuntimeConfig().auth,
    boundKey: getValidatedBffSessionKey(),
    rememberedKey: getBffSessionKey(),
    sameRuntime: window.vpsAdmin === runtime,
  };
}
