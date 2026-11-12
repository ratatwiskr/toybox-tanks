import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /visual\/review\.approve\.ts$/,
  outputDir: 'test-results/visual-approval',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  updateSnapshots: 'none',
  reporter: [['list']],
});
