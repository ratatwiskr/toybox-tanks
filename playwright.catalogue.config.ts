import { defineConfig } from '@playwright/test';

import base from './playwright.config';

const visual = base.projects?.find((project) => project.name === 'visual');
if (visual === undefined) {
  throw new Error('Existing visual project missing');
}

// Opt-in entry point for the existing visual tooling, not a verification gate.
export default defineConfig(base, {
  fullyParallel: false,
  workers: 1,
  outputDir: 'test-results/catalogue',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/catalogue', open: 'never' }]],
  projects: [
    {
      ...visual,
      name: 'catalogue',
      testMatch: /visual\/catalogue\.capture\.ts$/,
      use: {
        ...visual.use,
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
        colorScheme: 'light',
        reducedMotion: 'reduce',
        locale: 'en-US',
        timezoneId: 'UTC',
      },
    },
  ],
  webServer: {
    command: 'npm run dev:test -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
