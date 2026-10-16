import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe('bundled build identity', () => {
  it('does not invent a commit link when metadata is unavailable', async () => {
    vi.stubGlobal('__WEBUI_BUILD_INFO__', undefined);
    const result = await import('./buildInfo');
    expect(result.buildInfo.commit).toBe('unknown');
    expect(result.buildCommitUrl).toBeUndefined();
  });
  it('uses the loaded bundle revision, not a runtime build-info request', async () => {
    const sha = 'abcde12345'.repeat(4);
    vi.stubGlobal('__WEBUI_BUILD_INFO__', { commit: sha, shortCommit: sha.slice(0, 12), dirty: true });
    const result = await import('./buildInfo');
    expect(result.buildCommitUrl).toBe(`https://github.com/vpsfreecz/vpsadmin-webui/commit/${sha}`);
    expect(result.buildInfo.dirty).toBe(true);
  });
});
