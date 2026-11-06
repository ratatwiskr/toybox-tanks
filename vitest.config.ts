import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/architecture/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'tests/visual/**', 'tests/release/**', 'node_modules/**'],
    passWithNoTests: false,
    testTimeout: 30_000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/config.ts', 'src/sim/**/*.ts'],
      thresholds: {
        statements: 85,
        lines: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
});
