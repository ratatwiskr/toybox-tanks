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

| Project                  | Scope                                                                        |
| ------------------------ | ---------------------------------------------------------------------------- |
| `tsconfig.app.json`      | Browser application source.                                                  |
| `tsconfig.sim.json`      | `src/config.ts` and `src/sim/**`, DOM- and Node-free.                        |
| `tsconfig.tooling.json`  | Vite, Vitest, and Playwright configuration.                                  |
| `tsconfig.unit.json`     | Unit and architecture tests (includes `DOM` for the renderer contract test). |
| `tsconfig.e2e.json`      | E2E, visual, and release specs.                                              |
| `tsconfig.fixtures.json` | Guardrail fixtures (compiled, never bundled).                                |

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
tests regardless of percentage. Gamepad and test-bridge code are covered by named unit
tests but are outside the simulation coverage include set; do not lower or broaden the
simulation thresholds to include them.

## Test build and test bridge

The deterministic bridge exists only in the dedicated test build:

```sh
npm run dev:test    # Vite dev server with __TEST_BUILD__ = true
npm run build:test  # test bundle in dist-test/
```

`vite.config.ts` replaces the compile-time `__TEST_BUILD__` constant with `mode === 'test'`.
`src/main.ts` installs `window.__TOYBOX_TEST__` only under that constant. A `?test=1`
query parameter cannot enable the bridge in `dist/` or `dist-single/`; both release suites
assert its runtime absence in addition to the source/bundle check.

The bridge API is typed in `src/test-bridge.ts`:

- `loadScenario(name, options?)` loads a validated `menu`, `coop`, `solo`, `room`,
  `active-shot`, `disabled-player`, `paused`, `cleared`, `defeat`, `completed`, or `error`
  fixture.
- `advanceTicks(count, { commands?, sampleInput? })` steps bounded ticks synchronously.
  `commands` and `sampleInput` are mutually exclusive; `sampleInput` reads the real
  keyboard/gamepad adapters once per tick.
- `snapshot()` returns copied gameplay state including room/state/time/ticks, entities,
  effects, and recent events. It never exposes the mutable world.
- `events()`, `render()`, and `clearInput()` support event assertions, explicit drawing,
  and input reset between scenarios.

Calling `loadScenario` or `advanceTicks` takes the simulation clock: RAF still renders and
updates the HUD, but no real-time stepping can race manual ticks. Tests that do not use the
bridge keep ordinary RAF simulation, which the real-time smoke suite exercises.

## Browser suites

All local Playwright commands need the browser path override on this machine:

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e
```

- `test:e2e` — Chromium against the test-mode Vite dev server. Covers page load, canvas
  paint, keyboard-started co-op, real `d` key movement read from the debug panel, Escape
  pause/resume, retry/restart, solo mode, and unexpected console/page errors. It also runs
  bridge scenario/manual-tick tests, real keyboard sampling during explicit ticks, and the
  synthetic-gamepad flow (move, aim, fire, pause/resume via Start, disconnect cleanup).
- `test:visual` — captures nine scenes under `test-results/visual-candidates/`: menu,
  co-op gameplay, active shot, disabled player, pause, clear, defeat, completion, and
  resized gameplay. It does **not** compare against committed snapshots and does **not**
  claim aesthetic approval.
- `test:release` — rebuilds both releases, serves `dist/` through Vite preview, and opens
  `dist-single/index.html` through `file://` in Chromium. Each artifact runs a normal smoke
  test plus a `?test=1` check proving `window.__TOYBOX_TEST__` is absent.
- `test:browsers` — hosted release smoke in Chromium, Firefox, and WebKit.

Playwright artifacts use namespaced output directories (`test-results/e2e` and
`test-results/release`) so the unapproved candidates in `test-results/visual-candidates/`
survive later suites. CI uploads the whole `test-results/` tree.

### Local browser limitations

- Chromium: passes the e2e and release suites.
- WebKit: passes the e2e suite, including the synthetic-gamepad flow. WebKit throttles
  `requestAnimationFrame` under Playwright, so specs wait on real frames rather than fixed
  sleeps when the adapter must observe a neutral sample or a Start release.
- Firefox: blocked before page launch by the nono sandbox with
  `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
  `Could not find profile folder.` This is an environment blocker and is never reported
  as a pass. CI runs Firefox on a normal runner.

Automated WebKit is not physical Safari/iOS verification. Synthetic gamepad tests are not
physical controller verification.

## Visual approval gate

The visual regression gate is **pending**. `test:visual` captures nine candidate scenes
for human review but no baselines are approved, so no comparison suite runs. See
`docs/adr/0001-visual-gate-pending.md`. Do not auto-approve snapshots, commit generated
baselines, or describe candidate capture as an approved visual suite. Approval must cover
menu, co-op gameplay, active shot, disabled player, pause, clear, defeat, completion, and
resized gameplay.

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
