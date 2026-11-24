/** URL-only presentation context; never an API scope or arbitrary return URL. */
const backupKeys = new Set(['tab', 'q', 'dataset', 'intent']);
const isBackupKey = (key: string) => backupKeys.has(key) || key.startsWith('backup_snapshot_');

export function backupDetailHref(path: string, centerSearch: string): string {
  const query = new URLSearchParams({ from: 'backups' });
  for (const [key, value] of new URLSearchParams(centerSearch)) {
    if (isBackupKey(key)) query.set(`backups.${key}`, value);
  }
  return `${path}?${query}`;
}

export function backupDetailContext(
  pathname: string,
  search: string
):
  | {
      search: string;
      returnTo: string;
    }
  | undefined {
  if (!/^\/app\/(?:nas|datasets)\/[1-9]\d*(?:\/|$)/.test(pathname)) return undefined;
  const query = new URLSearchParams(search);
  if (query.get('from') !== 'backups') return undefined;
  const preserved = new URLSearchParams({ from: 'backups' });
  const returnQuery = new URLSearchParams();
  for (const [key, value] of query) {
    if (!key.startsWith('backups.') || !isBackupKey(key.slice(8))) continue;
    preserved.set(key, value);
    returnQuery.set(key.slice(8), value);
  }
  const suffix = returnQuery.toString();
  return { search: `?${preserved}`, returnTo: `/app/backups${suffix ? `?${suffix}` : ''}` };
}
