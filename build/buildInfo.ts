import { execFileSync } from 'node:child_process';

import type { Plugin } from 'vite';

export type BuildInfoSource = 'environment' | 'git' | 'unavailable';

export interface BuildInfo {
  schemaVersion: 1;
  commit: string;
  shortCommit: string;
  dirty: boolean;
  source: BuildInfoSource;
}

type CommandRunner = (command: string, args: string[], cwd: string) => string;

const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function defaultCommandRunner(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export function normalizeCommitSha(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return SHA_PATTERN.test(normalized) ? normalized : undefined;
}

export function resolveBuildInfo(options?: {
  cwd?: string;
  env?: Record<string, string | undefined>;
  run?: CommandRunner;
}): BuildInfo {
  const cwd = options?.cwd ?? process.cwd();
  const env = options?.env ?? process.env;
  const run = options?.run ?? defaultCommandRunner;

  const declaredDirty = env['VITE_BUILD_DIRTY'];
  if (declaredDirty !== undefined && declaredDirty !== 'true' && declaredDirty !== 'false') {
    throw new Error('VITE_BUILD_DIRTY must be true or false');
  }
  if (declaredDirty === 'false' && !FULL_SHA_PATTERN.test(env['VITE_BUILD_SHA'] ?? '')) {
    throw new Error('A clean build requires a full VITE_BUILD_SHA');
  }
  if (env['VITE_BUILD_SHA'] !== undefined && env['VITE_BUILD_SHA'] !== 'unknown'
    && !normalizeCommitSha(env['VITE_BUILD_SHA'])) {
    throw new Error('VITE_BUILD_SHA must be a commit SHA or unknown');
  }

  const environmentCommit = env['VITE_BUILD_SHA'] !== undefined
    ? normalizeCommitSha(env['VITE_BUILD_SHA'])
    : normalizeCommitSha(env['GITHUB_SHA']) ?? normalizeCommitSha(env['CI_COMMIT_SHA']);

  let gitCommit: string | undefined;
  try {
    gitCommit = normalizeCommitSha(run('git', ['rev-parse', 'HEAD'], cwd));
  } catch {
    gitCommit = undefined;
  }

  let dirty = declaredDirty === 'true';
  if (declaredDirty === undefined) {
    try {
      dirty = run('git', ['status', '--porcelain', '--untracked-files=no'], cwd).trim().length > 0;
    } catch {
      // An archive without an explicit source state cannot claim a clean release.
      dirty = true;
    }
  }

  const explicitlyUnknown = env['VITE_BUILD_SHA'] === 'unknown';
  const commit = explicitlyUnknown ? 'unknown' : environmentCommit ?? gitCommit ?? 'unknown';
  const source: BuildInfoSource = explicitlyUnknown ? 'unavailable'
    : environmentCommit ? 'environment' : gitCommit ? 'git' : 'unavailable';

  return {
    schemaVersion: 1,
    commit,
    shortCommit: commit === 'unknown' ? commit : commit.slice(0, 12),
    dirty: commit === 'unknown' ? true : dirty,
    source,
  };
}

export function buildInfoPlugin(options?: {
  cwd?: string;
  env?: Record<string, string | undefined>;
  run?: CommandRunner;
}): Plugin {
  return {
    name: 'webui-next-build-info',
    apply: 'build',
    generateBundle() {
      const buildInfo = resolveBuildInfo(options);
      this.emitFile({
        type: 'asset',
        fileName: 'build-info.json',
        source: `${JSON.stringify(buildInfo, null, 2)}\n`,
      });
    },
  };
}
