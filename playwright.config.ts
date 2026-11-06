import { defineConfig, devices } from '@playwright/test';

const devServer = {
  command: 'npm run dev -- --port 5173 --strictPort',
  url: 'http://127.0.0.1:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 120_000,
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /e2e\/.*\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'visual',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: devServer,
});
