import { describe, expect, it } from 'vitest';
import { backupDetailContext, backupDetailHref } from './backupNavigation';

describe('backup detail navigation boundary', () => {
  it('returns to the same center selection without accepting redirect or API scope parameters', () => {
    const href = backupDetailHref(
      '/app/datasets/10/downloads',
      '?tab=downloads&q=%C4%8Desk%C3%BD&dataset=10&backup_snapshot_limit=25&user=99&returnTo=https://outside.test/&action=create'
    );
    const url = new URL(href, 'https://webui.test');
    const context = backupDetailContext(url.pathname, url.search)!;
    const target = new URL(context.returnTo, url.origin);
    expect(target.pathname).toBe('/app/backups');
    expect(target.searchParams.get('q')).toBe('český');
    expect(target.searchParams.get('tab')).toBe('downloads');
    expect(target.searchParams.get('dataset')).toBe('10');
    expect(target.searchParams.get('backup_snapshot_limit')).toBe('25');
    for (const key of ['user', 'returnTo', 'action']) {
      expect(target.searchParams.has(key)).toBe(false);
      expect(url.searchParams.has(key)).toBe(false);
    }
  });
  it('does not turn admin, unrelated, or unmarked routes into backup navigation', () => {
    for (const path of ['/admin/datasets/10', '/app/datasets', '/app/vps/10', '/app/nas/invalid']) {
      expect(backupDetailContext(path, '?from=backups')).toBeUndefined();
    }
    expect(backupDetailContext('/app/nas/10', '?backups.tab=downloads')).toBeUndefined();
  });
  it('retains context through tabs and a reload, but never arbitrary query destinations', () => {
    const context = backupDetailContext(
      '/app/nas/10/downloads',
      '?from=backups&backups.tab=plans&backups.q=&backups.returnTo=//outside.test&user=99&action=create'
    )!;
    expect(context.returnTo).toBe('/app/backups?tab=plans&q=');
    expect(backupDetailContext('/app/nas/10/snapshots', context.search)).toEqual(context);
    expect(backupDetailContext('/app/nas/10', '?from=backups')?.returnTo).toBe('/app/backups');
  });
});
