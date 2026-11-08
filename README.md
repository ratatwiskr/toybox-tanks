# Toybox Tanks

A small browser-based couch co-op tank game, migrated from a single-file HTML
prototype to TypeScript. Play solo or with two local players:
https://ratatwiskr.github.io/toybox-tanks/

- Free movement, independently aimed turrets, and one-bounce shells.
- Three handcrafted rooms with menu, pause, retry, room-clear, and replay flows.
- Keyboard-first; optional two-gamepad input uses left stick movement, right
  stick aim, A/right-trigger fire, and Start pause/resume.
- Static hosted and self-contained single-HTML releases.

## Status

The TypeScript migration and automatic map-border refactor are implemented.
Read current PR checks and `docs/progress.md` rather than treating historical
local push instructions or session handoffs as current assignments. Gate E is
not declared complete. Visual regression remains separate from candidate capture.

## Development and verification

Node `24.22.2` and npm `11.19.1` are pinned through Volta. Keep one npm lockfile.
For an owner-authorized initial setup:

```sh
npm ci
npx playwright install chromium firefox webkit
```

Agents must respect the no-install restriction in `AGENTS.md`; these setup
commands are not blanket authorization to reinstall dependencies or browsers.

- `npm run dev`: production-like development server without the test bridge.
- `npm run dev:test`: development server with the deterministic test bridge.
- `npm run typecheck`: focused TypeScript projects, including DOM-free simulation.
- `npm run lint`: maintained tree, zero warnings.
- `npm run format:check`: non-mutating Prettier check.
- `npm run test:unit`: unit and architecture tests.
- `npm run test:coverage`: unit coverage with explicit thresholds.
- `npm run test:e2e`: Chromium browser suite.
- `npm run test:visual`: unapproved candidate screenshot capture.
- `npm run verify:fast`: format, lint, typecheck, and unit tests.
- `npm run verify`: full sequential verification including release checks.
- `npm run test:browsers`: hosted Chromium, Firefox, and WebKit release smoke.

Run browser suites sequentially. In the documented local environment, prefix
Playwright commands with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
Do not modify the launcher to work around its browser-path setting. CI is
authoritative; hooks are convenience feedback. See `docs/verification.md`.

## Maps and configuration

Gameplay defaults live in `src/config.ts`; rooms live in `src/sim/maps.ts`.
Author exactly `22 × 11` interior cells: `#` wall, `.` floor, `1`/`2` player
spawns, and `S` sentry. Do not draw an outer arena border. The loader adds one
solid cell outside every side, preserving the original `24 × 13` arena, world
coordinates, room geometry, and entity ordering. Outermost authored cells remain
interior cells.

`validateMap()` rejects wrong dimensions, unknown symbols, missing or duplicate
spawns, missing sentries, mismatched enemy counts, and unreachable floor. Keep
simulation DOM/Node-free and map errors stable and actionable.

## Releases and test bridge

```sh
npm run build
npm run build:single
npm run build:test
npm run test:release
```

The hosted build is `dist/`; the self-contained release is
`dist-single/index.html`, playable through `file://` without external resources.
Release tests rebuild and smoke both formats in Chromium.

Only test-mode development and `dist-test/` install `window.__TOYBOX_TEST__`.
Production builds never expose it, including with `?test=1`. The bridge provides
scenario loading, bounded manual ticks, snapshots, events, rendering, and input
clearing. Manual ticks own simulation time while RAF continues rendering. See
`src/test-bridge.ts` and `tests/e2e/support/bridge.ts`.

## Browser and visual limitations

Local Firefox may fail before launch under the documented nono sandbox with
`Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` and
`Could not find profile folder.` This is not a pass; CI exercises Firefox on a
normal runner. Automated WebKit does not prove real Safari/iOS compatibility,
and synthetic gamepad tests do not prove physical controller compatibility.

`test:visual` writes candidates to `test-results/visual-candidates/`, not approved
regression baselines. Do not auto-accept screenshots or infer visual approval
from passing tests. See `docs/adr/0001-visual-gate-pending.md`.

Supplied asset packs remain reference material, not runtime dependencies. Broader
asset adoption is a separate task under `docs/asset-integration-plan.md`; do not
change gameplay geometry to fit artwork.

## Project layout

- `src/config.ts`: gameplay constants.
- `src/sim/`: explicit simulation state, maps, collision, and combat.
- `src/render/`: read-only Canvas rendering.
- `src/input/`: keyboard and gamepad command adapters.
- `src/main.ts`: application orchestration and UI.
- `tests/`: unit, architecture, browser, visual-candidate, and release checks.
- `reference/`: immutable original prototypes.
- `docs/`: architecture, verification, decisions, and progress.

See `AGENTS.md`, `docs/architecture.md`, and `docs/verification.md` before editing.
