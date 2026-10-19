import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const chromium = {
  browserName: 'chromium' as const,
  launchOptions: { executablePath: process.env['E2E_CHROMIUM_EXECUTABLE_PATH'] || undefined },
};
export default defineConfig({
  testDir: '.',
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: 'test-results',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5189', trace: 'retain-on-failure' },
  projects: [
    { name: 'adapter-chromium', testMatch: 'browser.spec.ts', use: chromium },
    { name: 'umd-chromium', testMatch: 'umd.spec.ts', use: chromium },
    { name: 'umd-firefox', testMatch: 'umd.spec.ts', use: { browserName: 'firefox' } },
    { name: 'umd-webkit', testMatch: 'umd.spec.ts', use: { browserName: 'webkit' } },
  ],
  webServer: {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    command:
      'node node_modules/vite/bin/vite.js preview --config scripts/haveapi-package/vite.config.ts --host 127.0.0.1 --port 5189 --strictPort',
    url: 'http://127.0.0.1:5189',
    reuseExistingServer: false,
  },
});
