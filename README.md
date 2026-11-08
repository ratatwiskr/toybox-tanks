# Toybox Tanks

A small browser-based couch co-op tank game. Play solo or with two local players:
https://ratatwiskr.github.io/toybox-tanks/

- Free movement, independently aimed turrets, and one-bounce shells.
- Four rooms: First Bounce, Block Party, Together Through, and Cork Keep.
- Destructible three-hit cork in the fourth room; permanent wooden walls retain
  ordinary bank-shot behavior.
- Keyboard-first, with optional two-gamepad input.
- Static hosted and self-contained single-HTML releases.

## Status and scope

The TypeScript migration, automatic map borders, destructible cork, and fourth
room are implemented on their respective PR branches. PR #15 is stacked on #14;
check actual branch state before assuming either has merged. See
`docs/progress.md` for the current checkpoint and ADR 0002 for the cork decision.
Historical migration handoffs are not active assignments. Gate E is not declared
complete. Procedural cork is intentional; SVG integration is not pending work.

The owner reported successful cork playtesting in the VS Code internal browser.
Visual regression and comprehensive visual coverage of cork states belong to a
separate issue; no screenshot baselines are approved here.

## Development and verification

Node `24.22.2` and npm `11.19.1` are pinned through Volta. Keep one npm lockfile.
Initial setup requires owner authorization; agents must respect `AGENTS.md` and
its no-install rule. Do not reinstall packages or browsers as a routine fix.

- `npm run dev`: development without the test bridge.
- `npm run dev:test`: development with the deterministic test bridge.
- `npm run typecheck`: all focused TypeScript projects.
- `npm run lint`: maintained tree, zero warnings.
- `npm run format:check`: non-mutating Prettier check.
- `npm run test:unit`: unit and architecture tests.
- `npm run test:coverage`: coverage with explicit thresholds.
- `npm run test:e2e`: Chromium browser suite.
- `npm run test:visual`: unapproved candidate screenshot capture.
- `npm run verify:fast`: format, lint, typecheck, and unit tests.
- `npm run verify`: full sequential verification including release checks.
- `npm run test:browsers`: hosted Chromium, Firefox, and WebKit release smoke.

Run browser suites sequentially. In the documented local environment, prefix
Playwright commands with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
Do not modify the launcher. CI is authoritative; hooks are convenience feedback.
See `docs/verification.md` for exact procedures.

## Maps and configuration

Defaults live in `src/config.ts`; rooms live in `src/sim/maps.ts`. Author exactly
`22 × 11` interior cells: `#` permanent wall, `C` cork, `.` floor, `1`/`2` player
spawns, and `S` sentry. The loader adds the solid perimeter outside the authored
interior, retaining the `24 × 13` arena. Outermost authored cells are interior.

Validation rejects wrong dimensions, unknown symbols, invalid spawns, missing or
mismatched sentries, and permanent disconnection. Intact cork may initially
block a route; cleared-terrain reachability is required. This is topology
validation, not a guarantee of balance. Keep map errors stable and actionable.

## Releases and test bridge

- `npm run build`: hosted `dist/`.
- `npm run build:single`: self-contained `dist-single/index.html`.
- `npm run build:test`: test-only `dist-test/`.
- `npm run test:release`: rebuild and smoke hosted and single-file releases.

The single HTML runs through `file://` without external resources. Production
builds never install `window.__TOYBOX_TEST__`, including with `?test=1`. Test-mode
builds provide scenario loading, bounded manual ticks, snapshots, events,
rendering, and input clearing. Manual ticks own simulation time while RAF
continues rendering. See `src/test-bridge.ts` and the e2e bridge types.

## Browser, visual, and asset limitations

Local Firefox may fail before launch under nono with
`Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` and
`Could not find profile folder.` This is not a pass. CI exercises Firefox on a
normal runner. Automated WebKit does not prove real Safari/iOS compatibility;
synthetic gamepads do not prove physical controller compatibility.

`test:visual` captures candidates in `test-results/visual-candidates/`, not
approved regression baselines. Do not auto-accept screenshots or infer visual
approval from passing tests. See `docs/adr/0001-visual-gate-pending.md`.

Cork is drawn procedurally. Supplied asset packs remain unintegrated reference
material; broader adoption is separate under `docs/asset-integration-plan.md`.
Never change collision geometry to fit artwork.

## Project layout

- `src/config.ts`: gameplay constants.
- `src/sim/`: DOM/Node-free state, maps, collision, and combat.
- `src/render/`: read-only Canvas rendering.
- `src/input/`: keyboard and gamepad command adapters.
- `src/main.ts`: application orchestration and UI.
- `tests/`: unit, architecture, browser, visual-candidate, and release checks.
- `reference/`: immutable original prototypes.
- `docs/`: architecture, verification, decisions, and progress.

Read `AGENTS.md`, `docs/architecture.md`, and `docs/verification.md` before editing.
