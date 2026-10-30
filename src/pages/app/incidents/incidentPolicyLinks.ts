/** The anchor belongs to the returned opaque key, never a label or report codename. */
export function incidentPolicyAnchorId(key: string): string {
  return `incident-policy-${key}`;
}

export function incidentPolicyHistoryPath(basePath: string, vpsId: number, key: string): string {
  const query = new URLSearchParams({ vps: String(vpsId), policy_key: key });
  return `${basePath}/incidents?${query.toString()}`;
}

export function incidentPolicyCurrentPath(basePath: string, vpsId: number, key: string): string {
  return `${basePath}/vps/${vpsId}/incidents#${encodeURIComponent(incidentPolicyAnchorId(key))}`;
}

/** A raw historical VPS id is insufficient: callers pass only the authorized report association. */
export function incidentPolicyReferencePaths(
  basePath: string,
  authorizedVpsId: number | null | undefined,
  key: string,
  activeKeys: ReadonlySet<string>
): { current?: string; history?: string } {
  if (!Number.isSafeInteger(authorizedVpsId) || authorizedVpsId == null || authorizedVpsId <= 0 || !key) return {};
  return {
    current: activeKeys.has(key) ? incidentPolicyCurrentPath(basePath, authorizedVpsId, key) : undefined,
    history: incidentPolicyHistoryPath(basePath, authorizedVpsId, key),
  };
}
