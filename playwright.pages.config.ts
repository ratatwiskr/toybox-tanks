import { defineConfig, devices } from '@playwright/test';

const configuredURL = process.env.PAGES_BASE_URL;
if (!configuredURL) {
  throw new Error('PAGES_BASE_URL must identify the published site, including its project path.');
}

const baseURL = new URL(configuredURL);
if (baseURL.protocol !== 'https:' && baseURL.protocol !== 'http:') {
  throw new Error('PAGES_BASE_URL must use HTTP or HTTPS.');
}
baseURL.pathname = `${baseURL.pathname.replace(/\/+$/, '')}/`;
baseURL.search = '';
baseURL.hash = '';

export default defineConfig({
  testDir: './tests/release',
  testMatch: 'pages.smoke.ts',
  outputDir: 'test-results/pages',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 180_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/pages', open: 'never' }]],
  use: {
    baseURL: baseURL.href,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
