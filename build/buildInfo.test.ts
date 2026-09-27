import { describe, expect, it } from 'vitest';

import { normalizeCommitSha, resolveBuildInfo } from './buildInfo';

const FULL_SHA = '0123456789abcdef0123456789abcdef01234567';

describe('build info', () => {
  it('normalizes valid commit identifiers and rejects arbitrary values', () => {
    expect(normalizeCommitSha(`  ${FULL_SHA.toUpperCase()}  `)).toBe(FULL_SHA);
    expect(normalizeCommitSha('not-a-commit')).toBeUndefined();
    expect(normalizeCommitSha('abc123')).toBeUndefined();
  });

  it('prefers an explicit CI commit and exposes only provenance fields', () => {
    const result = resolveBuildInfo({
      cwd: '/workspace',
      env: {
        GITHUB_SHA: FULL_SHA,
        SECRET_TOKEN: 'must-not-leak',
      },
      run: (_command, args) => {
        if (args[0] === 'rev-parse') return 'fedcba9876543210fedcba9876543210fedcba98';
        return '';
      },
    });

    expect(result).toEqual({
      schemaVersion: 1,
      commit: FULL_SHA,
      shortCommit: FULL_SHA.slice(0, 12),
      dirty: false,
      source: 'environment',
    });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
    expect(Object.keys(result).sort()).toEqual(
      ['schemaVersion', 'commit', 'shortCommit', 'dirty', 'source'].sort()
    );
  });

  it('falls back to Git and reports tracked changes', () => {
    const result = resolveBuildInfo({
      cwd: '/workspace',
      env: {},
      run: (_command, args) => {
        if (args[0] === 'rev-parse') return FULL_SHA;
        if (args[0] === 'status') return ' M src/app.tsx';
        throw new Error('unexpected command');
      },
    });

    expect(result.commit).toBe(FULL_SHA);
    expect(result.source).toBe('git');
    expect(result.dirty).toBe(true);
  });

  it('retains explicit dirty provenance when an archive has no Git metadata', () => {
    const result = resolveBuildInfo({
      env: { VITE_BUILD_SHA: FULL_SHA, VITE_BUILD_DIRTY: 'true' },
      run: () => { throw new Error('Git unavailable'); },
    });
    expect(result).toEqual({
      schemaVersion: 1,
      commit: FULL_SHA,
      shortCommit: FULL_SHA.slice(0, 12),
      dirty: true,
      source: 'environment',
    });
  });

  it('marks a revisionless archive as non-release and rejects false clean claims', () => {
    const unavailable = () => { throw new Error('Git unavailable'); };
    expect(resolveBuildInfo({ env: {}, run: unavailable })).toEqual({
      schemaVersion: 1, commit: 'unknown', shortCommit: 'unknown',
      dirty: true, source: 'unavailable',
    });
    expect(resolveBuildInfo({
      env: { VITE_BUILD_SHA: 'unknown', VITE_BUILD_DIRTY: 'true' }, run: unavailable,
    }).dirty).toBe(true);
    expect(resolveBuildInfo({
      env: { VITE_BUILD_SHA: 'unknown' },
      run: (_command, args) => args[0] === 'status' ? '' : FULL_SHA,
    })).toMatchObject({ commit: 'unknown', dirty: true, source: 'unavailable' });
    expect(() => resolveBuildInfo({
      env: { VITE_BUILD_SHA: 'unknown', VITE_BUILD_DIRTY: 'false' }, run: unavailable,
    })).toThrow('full VITE_BUILD_SHA');
    expect(() => resolveBuildInfo({
      env: { VITE_BUILD_SHA: FULL_SHA, VITE_BUILD_DIRTY: 'maybe' }, run: unavailable,
    })).toThrow('VITE_BUILD_DIRTY');
  });
});
