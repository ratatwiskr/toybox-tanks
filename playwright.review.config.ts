import { defineConfig, devices } from '@playwright/test';

import { assertReadOnlyComparison } from './tests/visual/review-safety';

assertReadOnlyComparison('none', process.argv);
const portText = process.env.TOYBOX_REVIEW_PORT ?? '5184';
const port = Number(portText);
if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('TOYBOX_REVIEW_PORT must be an integer from 1024 to 65535.');
}
const baseURL = `http://127.0.0.1:${String(port)}`;

export default defineConfig({
  testDir: './tests',
  testMatch: /visual\/review\.compare\.ts$/,
  outputDir: 'test-results/visual-review',
  snapshotPathTemplate: '{testDir}/../docs/visual-references/chromium-local/{arg}{ext}',
  updateSnapshots: 'none',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual-review', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    headless: true,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev:test -- --host 127.0.0.1 --port ${String(port)} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
