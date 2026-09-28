import type { PlaywrightTestConfig } from '@playwright/test';
import type { BuildInfo } from '../../../build/buildInfo';

export const buildInfo: BuildInfo = {
  schemaVersion: 1,
  commit: '0123456789abcdef0123456789abcdef01234567',
  shortCommit: '0123456789ab',
  dirty: false,
  source: 'environment',
};

export const playwrightConfig: PlaywrightTestConfig = {
  retries: 2,
  use: { trace: 'retain-on-failure' },
};
