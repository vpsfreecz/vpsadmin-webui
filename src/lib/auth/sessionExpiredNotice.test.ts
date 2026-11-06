import { describe, expect, it } from 'vitest';

import { consumeSessionExpiredNotice, markSessionExpiredNotice, sessionReturnPath } from './sessionExpiredNotice';

describe('sessionExpiredNotice', () => {
  it('consumes a fresh session-expired marker exactly once', () => {
    markSessionExpiredNotice(1_000);

    expect(consumeSessionExpiredNotice(1_500)).toEqual({ pathname: '/' });
    expect(consumeSessionExpiredNotice(1_500)).toBeNull();
  });

  it('ignores stale markers', () => {
    markSessionExpiredNotice(1_000);

    expect(consumeSessionExpiredNotice(1_000 + 10 * 60 * 1000)).toBeNull();
  });

  it('accepts the previous timestamp-only marker', () => {
    sessionStorage.setItem('webui-next:session-expired-notice-at', '1000');
    expect(consumeSessionExpiredNotice(1_500)).toEqual({ pathname: undefined });
  });

  it('restores only protected page paths under the configured basename', () => {
    expect(sessionReturnPath('/ui/app/vps/7?dialog=delete#confirm', '/ui')).toBe('/ui/app/vps/7');
    expect(sessionReturnPath('/ui/admin/users/3', '/ui')).toBe('/ui/admin/users/3');
    expect(sessionReturnPath('//outside.example/ui/app', '/ui')).toBe('/ui/app');
    expect(sessionReturnPath('/ui/app/../oauth/logout', '/ui')).toBe('/ui/app');
    expect(sessionReturnPath('/ui/app/%2f%2foutside.example', '/ui')).toBe('/ui/app');
    expect(sessionReturnPath('/app/vps/7', '/ui')).toBe('/ui/app');
  });
});
