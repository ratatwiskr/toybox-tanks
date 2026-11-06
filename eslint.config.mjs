import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const restrictedSimGlobals = [
  ['window', 'simulation code must not touch the DOM'],
  ['document', 'simulation code must not touch the DOM'],
  ['navigator', 'simulation code must not poll devices'],
  ['localStorage', 'simulation code must not touch browser storage'],
  ['sessionStorage', 'simulation code must not touch browser storage'],
  ['fetch', 'simulation code must not perform network access'],
  ['Date', 'simulation code must not read wall-clock time'],
  ['performance', 'simulation code must not read wall-clock time'],
  ['setTimeout', 'simulation code must not schedule callbacks'],
  ['setInterval', 'simulation code must not schedule callbacks'],
  ['requestAnimationFrame', 'simulation code must not schedule callbacks'],
  ['queueMicrotask', 'simulation code must not schedule callbacks'],
  ['process', 'simulation code must not use Node globals'],
  ['Buffer', 'simulation code must not use Node globals'],
  ['require', 'simulation code must not use Node globals'],
  ['__dirname', 'simulation code must not use Node globals'],
  ['__filename', 'simulation code must not use Node globals'],
].map(([name, message]) => ({ name, message }));

export default defineConfig(
  {
    ignores: [
      'node_modules/',
      'dist/',
      'dist-*/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.vite/',
      '.tmp/',
      'reference/',
      'Perplexity-assets-*/',
      'tests/fixtures/guardrails/sim/negative/',
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { allowDefaultCaseForExhaustiveSwitch: false, requireDefaultForNonUnion: false },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'prefer-const': 'error',
    },
  },
  {
    files: ['eslint.config.mjs', '*.config.ts', '*.config.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['src/**/*.ts', '!src/sim/**/*.ts', '!src/config.ts'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['src/config.ts', 'src/sim/**/*.ts', 'tests/fixtures/guardrails/sim/**/*.ts'],
    languageOptions: {
      globals: { ...globals.builtin, ...globals.browser, ...globals.node },
    },
    rules: {
      'no-restricted-globals': ['error', ...restrictedSimGlobals],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/input/**',
                '**/render/**',
                '**/ui/**',
                '**/app/**',
                '**/main',
                '**/main.ts',
              ],
              message:
                'simulation code may not depend on adapters, rendering, UI, or application composition',
            },
            {
              group: [
                'node:*',
                'fs',
                'path',
                'os',
                'vite',
                'vitest',
                '@playwright/*',
                'playwright',
                'playwright-core',
              ],
              message: 'simulation code must stay environment-neutral',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'inject seeded randomness instead of using ambient randomness',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'simulation time must come from the explicit tick clock',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'simulation time must come from the explicit tick clock',
        },
      ],
    },
  },
  {
    files: ['tests/unit/**/*.ts', 'tests/architecture/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['tests/e2e/**/*.ts', 'tests/visual/**/*.ts', 'tests/release/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  prettier,
);
