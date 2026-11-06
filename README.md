# Toybox Tanks

A small browser-based couch co-op tank game, migrated from a single-file HTML
prototype to TypeScript with verified build and test guardrails.

- Two local players: free movement, independently aimed turrets, one-bounce shells.
- Three handcrafted rooms with the original menu, pause, retry, clear, and replay loop.
- Keyboard-first, with gamepad support planned as part of the migration contract.
- Both a hosted release (`dist/`) and a self-contained `file://` release
  (`dist-single/index.html`).

**Status:** Gate B (toolchain, guardrails, and minimal executable skeleton) is complete
and locally verified. Gate C (behavior-preserving simulation extraction) is next. The
current world skeleton is intentionally not feature-complete; see `docs/progress.md` and
`docs/handoff.md`.

## Requirements

- Node `24.22.2` and npm `11.19.1` (pinned through Volta in `package.json`).
- One npm lockfile (`package-lock.json`).
- Playwright browsers installed locally for browser suites.

## Setup

```sh
npm ci
npx playwright install chromium firefox webkit
```

If Playwright browsers are stored outside the default location, set
`PLAYWRIGHT_BROWSERS_PATH` for every browser command. On this machine the working path is:

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e
```

The repository launcher sets a different, non-existent path. Do not edit the launcher;
override the variable on the command line instead.

## Commands

| Command                 | Purpose                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `npm run dev`           | Vite dev server on `http://127.0.0.1:5173`.                               |
| `npm run typecheck`     | All focused TypeScript projects, including the DOM-free sim check.        |
| `npm run lint`          | Whole maintained tree, zero warnings.                                     |
| `npm run format:check`  | Non-mutating Prettier check.                                              |
| `npm run test:unit`     | Vitest unit and architecture/guardrail tests.                             |
| `npm run test:coverage` | Unit coverage with explicit includes and thresholds.                      |
| `npm run test:e2e`      | Chromium browser smoke suite against the dev server.                      |
| `npm run test:visual`   | Candidate screenshot capture (not an approved baseline suite).            |
| `npm run build`         | Hosted production build in `dist/`.                                       |
| `npm run build:single`  | Self-contained production HTML in `dist-single/`.                         |
| `npm run test:release`  | Build both releases and smoke them in Chromium.                           |
| `npm run test:browsers` | Hosted release smoke in Chromium, Firefox, and WebKit.                    |
| `npm run verify:fast`   | Format, lint, typecheck, and unit tests.                                  |
| `npm run verify`        | Full local gate: fast checks, coverage, E2E, candidate capture, releases. |

Run `npm run verify` before claiming a gate is complete. CI is authoritative; the Git
hook is convenience feedback only.

## Maps and configuration

- Gameplay defaults live in `src/config.ts`. Keep them data-driven and validated.
- Rooms live in `src/sim/maps.ts` as fixed-width grids: `#` wall, `.` floor, `1`/`2`
  player spawns, `S` sentry. Grids are `24 × 13` cells with a solid border.
- `validateMap()` rejects wrong dimensions, unknown symbols, open borders, missing or
  duplicate spawns, unreachable floor, and mismatched sentry counts.
- `sim/` must stay DOM- and Node-free. Add gameplay data to config/maps rather than
  branching on rendering or input concerns.

## Releases

```sh
npm run build         # hosted: dist/index.html + hashed assets
npm run build:single  # standalone: dist-single/index.html
npm run test:release  # rebuild and smoke both in Chromium
```

`test:release` serves `dist/` through Vite preview and opens
`dist-single/index.html` directly through `file://`. Both are production builds; the
test bridge is not installed in either.

## Browser notes

- Chromium and WebKit pass the local smoke suites.
- Firefox is currently blocked locally before page launch by the nono sandbox:
  `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
  `Could not find profile folder.` This is an environment limitation, not a test pass.
  CI runs Firefox on a normal runner.
- Automated WebKit is not physical Safari/iOS verification, and synthetic gamepad tests
  are not physical controller verification.

## Visual review

`npm run test:visual` writes candidate screenshots to `test-results/visual-candidates/`.
They are **not** approved baselines and are not compared against committed snapshots.
A human/vision review must approve candidates before a real visual regression suite is
enabled. See `docs/adr/0001-visual-gate-pending.md`.

## Project layout

```text
src/config.ts        gameplay constants
src/sim/             DOM-free simulation state and rules
src/render/          Canvas renderer (reads state only)
src/input/           keyboard adapter (emits commands)
src/main.ts          application orchestration and UI
tests/unit/          simulation and validation tests
tests/architecture/  ESLint guardrail tests
tests/e2e/           browser smoke tests
tests/visual/        unapproved candidate capture
tests/release/       hosted and single-file release smoke tests
docs/                migration contract, architecture, verification, progress
```

See `docs/architecture.md` and `docs/verification.md` for details.
