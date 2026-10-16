import type { BuildInfo } from '../../build/buildInfo';

declare const __WEBUI_BUILD_INFO__: BuildInfo;

// Embedded in the bundle: an old tab must not claim a newly deployed revision.
export const buildInfo: BuildInfo =
  typeof __WEBUI_BUILD_INFO__ === 'undefined'
    ? { schemaVersion: 1, commit: 'unknown', shortCommit: 'unknown', dirty: true, source: 'unavailable' }
    : __WEBUI_BUILD_INFO__;

export const webuiRepository = 'https://github.com/vpsfreecz/vpsadmin-webui';
export const buildCommitUrl = /^[0-9a-f]{7,40}$/i.test(buildInfo.commit)
  ? `${webuiRepository}/commit/${buildInfo.commit}`
  : undefined;
