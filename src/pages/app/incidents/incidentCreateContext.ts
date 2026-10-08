import { parsePositiveInt } from '../../../lib/parse';

export function incidentCreateHref(basePath: string, search: URLSearchParams, vpsId?: number): string {
  const params = new URLSearchParams();
  if (vpsId) params.set('vps', String(vpsId));
  const query = search.toString();
  params.set('returnTo', `${basePath}/incidents${query ? `?${query}` : ''}`);
  return `${basePath}/incidents/new?${params}`;
}

/** Keep list filters, but never allow a return URL outside this mode's incident list. */
export function incidentReturnHref(basePath: string, search: URLSearchParams): string {
  const listPath = `${basePath}/incidents`;
  const vpsId = parsePositiveInt(search.get('vps'));
  const fallback = `${listPath}${vpsId ? `?vps=${vpsId}` : ''}`;
  const value = search.get('returnTo');
  if (!value || value.length > 2_048) return fallback;
  try {
    const origin = 'https://vpsadmin.invalid';
    const parsed = new URL(value, origin);
    if (parsed.origin !== origin || parsed.pathname !== listPath) return fallback;
    return `${listPath}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
