# Verification

This document records how the project is verified, what each command proves, and which
gates remain open. Run commands from the repository root.

## Full gate

```sh
npm run verify
```

`verify` runs, in order:

1. `format:check`
2. `lint`
3. `typecheck`
4. `test:coverage`
5. `test:e2e`
6. `test:visual` (candidate capture only; see below)
7. `test:release`

`verify:fast` runs steps 1–4 without coverage or browsers. CI runs the full gate plus
`npm run test:browsers`.

## TypeScript

`npm run typecheck` checks every focused project:

| Project                  | Scope                                                 |
| ------------------------ | ----------------------------------------------------- |
| `tsconfig.app.json`      | Browser application source.                           |
| `tsconfig.sim.json`      | `src/config.ts` and `src/sim/**`, DOM- and Node-free. |
| `tsconfig.tooling.json`  | Vite, Vitest, and Playwright configuration.           |
| `tsconfig.unit.json`     | Unit and architecture tests.                          |
| `tsconfig.e2e.json`      | E2E, visual, and release specs.                       |
| `tsconfig.fixtures.json` | Guardrail fixtures (compiled, never bundled).         |

## Lint and guardrails

`npm run lint` runs ESLint with `--max-warnings 0`. The config uses type-checked strict
rules, forbids `any`/unsafe operations/non-null assertions/inline config, and applies
simulation-only restrictions to `src/config.ts` and `src/sim/**`.

`tests/architecture/guardrails.test.ts` starts ESLint programmatically with
`ignore: false` and lints:

- a positive fixture that must have zero messages;
- one negative fixture per violation, asserting the exact rule ID:
  - prohibited import → `no-restricted-imports`
  - restricted global → `no-restricted-globals`
  - explicit `any` → `@typescript-eslint/no-explicit-any`
  - unhandled union variant → `@typescript-eslint/switch-exhaustiveness-check`

The test also asserts exactly one violation per negative fixture. This proves the
guardrail rejects the intended mistake, not merely that some error occurred.

## Unit tests and coverage

`npm run test:unit` runs Vitest over `tests/unit/**` and `tests/architecture/**`.
`passWithNoTests` is false, so an empty suite fails.

`npm run test:coverage` covers only `src/config.ts` and `src/sim/**` with thresholds:

- statements, lines, functions: 85%
- branches: 80%

Coverage is a floor, not proof. Collision, outcome, and determinism invariants have named
tests regardless of percentage.

## Browser suites

All local Playwright commands need the browser path override on this machine:

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e
```

- `test:e2e` — Chromium against the Vite dev server. Covers page load, canvas paint,
  keyboard-started co-op, real `d` key movement read from the debug panel, Escape
  pause/resume, retry/restart, solo mode, and unexpected console/page errors.
- `test:visual` — captures `test-results/visual-candidates/01-menu.png` and
  `02-gameplay-paused.png`. It does **not** compare against committed snapshots and does
  **not** claim aesthetic approval.
- `test:release` — rebuilds both releases, serves `dist/` through Vite preview, and opens
  `dist-single/index.html` through `file://` in Chromium.
- `test:browsers` — hosted release smoke in Chromium, Firefox, and WebKit.

### Local browser limitations

- Chromium: passes.
- WebKit: passes the e2e smoke and hosted release smoke.
- Firefox: blocked before page launch by the nono sandbox with
  `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
  `Could not find profile folder.` This is an environment blocker and is never reported
  as a pass. CI runs Firefox on a normal runner.

Automated WebKit is not physical Safari/iOS verification. Synthetic keyboard tests are
not physical controller verification.

## Visual approval gate

The visual regression gate is **pending**. Candidate screenshots are generated for human
review but no baselines are approved, so no comparison suite runs. See
`docs/adr/0001-visual-gate-pending.md`. Do not auto-approve snapshots, commit generated
baselines, or describe candidate capture as an approved visual suite.

## CI

`.github/workflows/verify.yml` runs on pushes to `main` and on pull requests:

1. clean checkout;
2. Node `24.22.2` with npm cache;
3. `npm ci`;
4. `npx playwright install --with-deps chromium firefox webkit`;
5. `npm run verify`;
6. `npm run test:browsers`;
7. upload `playwright-report/` and `test-results/` on every outcome.

Retries remain at zero. Browser installation or sandbox failures are environment
blockers, not passes. The workflow file alone does not enable branch protection or
required status checks; those are repository settings requiring owner action.
