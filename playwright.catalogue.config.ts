import { defineConfig } from '@playwright/test';

import base from './playwright.config';

const visual = base.projects?.find((project) => project.name === 'visual');
if (visual === undefined) {
  throw new Error('Existing visual project missing');
}

const portText = process.env.TOYBOX_CAPTURE_PORT ?? '5183';
const port = Number(portText);
if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('TOYBOX_CAPTURE_PORT must be an integer from 1024 to 65535.');
}
const baseURL = `http://127.0.0.1:${String(port)}`;

// Opt-in entry point for the existing visual tooling, not a verification gate.
export default defineConfig(base, {
  fullyParallel: false,
  workers: 1,
  outputDir: 'test-results/catalogue',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/catalogue', open: 'never' }]],
  use: { baseURL },
  projects: [
    {
      ...visual,
      name: 'catalogue',
      testMatch: /visual\/catalogue\.capture\.ts$/,
      use: {
        ...visual.use,
        baseURL,
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
    command: `npm run dev:test -- --host 127.0.0.1 --port ${String(port)} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
