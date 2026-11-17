# Enemy variety and touch controls — 2026-11

> **Historical record.** Frozen 2026-11-17; not current instructions.
> Current state: [../progress.md](../progress.md) · Index: [README.md](README.md).
>
> Extracted from the former `docs/progress.md`; Git history keeps the original.

## Enemy variety, mines & secondary weapon (scopes A–E)

Branch `feature/improve-enemy-variety` implements the five scopes described in
`docs/enemy-kinds-opencode-handoff.md`. Scopes A–D add the deterministic world
RNG and enemy-kind framework, the Roamer, Bruiser bank shots and telegraphs,
Lobber poms, Prankster mines, and the player secondary weapon. Scope E adds
campaign rooms 16–19, enemy-symbol validation and co-op-only lowercase spawns,
HUD wording, per-kind renderer art and HP pips, level-select preview colors,
and the `enemy-kinds`, `mines-armed`, and `lobber-pom` visual scenes. Existing
rooms 1–15 keep their order; `bc1e5a8` varies sentry placements and updates
hints in those rooms.

Touch P1 now has a secondary button above the aim pad: one press lays a mine and
the next press detonates it, matching the keyboard `G` / `/` contract. Automated
captures cannot be read as images by the implementing model, so this entry
records deterministic capture/comparison only, not aesthetic approval.

### Verification (2026-11-17, `f0f0dfb` plus working-tree touch-button changes)

| Command                                            | Result                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run verify:fast`                              | passed: format, lint, typecheck, 38 files / 345 unit tests                 |
| `npm run test:coverage`                            | passed: 89.81% statements, 82.79% branches, 95.37% functions, 90.71% lines |
| `npm run capture:visual:baseline`                  | passed; development checkpoint replaced with 49 captured scenes            |
| `npm run test:visual:compare`                      | 50 passed, exit 0; baseline was not updated                                |
| `PLAYWRIGHT_BROWSERS_PATH=… npm run test:e2e`      | 28 passed (Chromium)                                                       |
| `PLAYWRIGHT_BROWSERS_PATH=… npm run test:release`  | 5 passed (hosted and single-file releases)                                 |
| `PLAYWRIGHT_BROWSERS_PATH=… npm run test:browsers` | 9 passed (Chromium, Firefox, WebKit hosted release smoke)                  |

The touch secondary button is a separate circular control above the aim pad with
a 16 px gap, so it is not part of the aim/tap target. `TouchAdapter` keeps a held
flag plus a one-tick pending flag for taps shorter than a simulation step; the
simulation's existing rising-edge `alt` handling still guarantees one lay or
detonate per press. `tests/e2e/mobile.spec.ts` covers laying and then detonating
a mine through native Chromium touch delivery, and `tests/e2e/mobile-layout.spec.ts`
checks the button's size, bounds, and separation from the aim pad at three
landscape sizes.

The first e2e run without `PLAYWRIGHT_BROWSERS_PATH` failed to launch, and the
first run with it exposed two smoke assertions hard-coded to `15` rooms. Those
assertions now derive the room count from `MAPS`. `tests/unit/test-bridge.test.ts`
also now counts uppercase enemies for the solo last-room scenario, matching the
co-op-only lowercase contract.

New coverage includes `tests/unit/poms.test.ts` (predicted landing, blast damage,
wall-blocked blast, cork chip), lobber and Prankster tests in
`tests/unit/enemies.test.ts`, pom step/room-clear checks in
`tests/unit/world.test.ts`, mine tests in `tests/unit/combat.test.ts`, alt input
tests in `tests/unit/keyboard.test.ts` and `tests/unit/gamepad.test.ts`, mine/alt
bridge checks in `tests/unit/test-bridge.test.ts`, per-kind art, telegraph, mine,
pom, and pip checks in `tests/unit/renderer.test.ts`, and touch secondary
tap/hold/world tests in `tests/unit/touch.test.ts`.

The refreshed `docs/visual-catalogue/current/` checkpoint is development
evidence, not an approved regression baseline. Only three captured images changed:
`touch-landscape-gameplay.full.png` shows the idle secondary button, and the
`ui-menu` full/arena captures show the updated instructions. No new mobile scene
was added; the engaged button and placed mine are covered mechanically by the e2e
and mine fixture rather than a separate touch screenshot.

## Issue 38 new maps: merged as PR #42

PR #42 is squash-merged as `f0ce3d4` on 2026-11-13. The branch results below
were recorded on the uncommitted working tree before that merge; CI is
authoritative for the merged commit.

- The campaign now contains the 15 rooms from issue #38, authored as 22 × 11
  interiors in the existing schema.
- Fixed `Spiral`: its inner chamber was fully enclosed by permanent wall and
  failed cleared-reachability validation. The bottom wall now has a two-cell
  opening, so the room loads and the inner sentry is reachable.
- Removed test coupling to authored map content. Exact name/hint/enemy arrays and
  the legacy full-grid copies were dropped. Map-format and loader checks use a
  test-owned interior; cork loading uses two test-owned maps; name lookups guard
  missing rooms; campaign sweeps derive expectations from `MAPS` metadata, so
  adding rooms does not require editing those assertions.
- Refreshed the development visual checkpoint. The campaign scenes are generated
  from `MAPS`, so all 15 room-start scenes are present. Full-frame UI captures
  changed because the HUD/menu now show the 15-room count; this is development
  evidence, not aesthetic approval or a formal regression reference.
- Updated the README room summary and the campaign invariant in `AGENTS.md`.

### Verification

| Command                           | Result                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify:fast`             | passed (format, lint, typecheck, 267 unit tests)                                                                             |
| `npm run capture:visual:baseline` | passed; development checkpoint replaced                                                                                      |
| `npm run test:visual:compare`     | 42 passed, exit 0                                                                                                            |
| `npm run test:visual`             | initially failed on the launcher's missing browser path; passed with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"` |
| `npm run test:e2e`                | 23 passed (Chromium, same browser-path override)                                                                             |

The owner previously playtested the added maps. Exact tested SHA, browser, and
exhaustive room-by-room scenarios were not supplied. Release/browser-matrix
suites were not run for this update; CI remains authoritative.
