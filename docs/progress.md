# Toybox Tanks — progress

Updated: 2026-11-07  
Current gate: **D — adapters, rendering, UI, runtime, automation, releases (complete, committed, pushed)**  
Next gate: **E — harden and deliver (blocked on human decisions)**  
Next handoff: `docs/gate-e-handoff.md`  
Earlier handoff notes: `docs/gate-b-handoff.md` (historical)  
Verification details: `docs/verification.md`  
Visual asset plan: `docs/asset-integration-plan.md`

## Gate D status

Gate D is complete and committed. Input parity, rendering parity, UI/runtime composition,
the typed test bridge, deterministic automation, and release isolation are all in place.

Gate D work completed:

- `src/input/gamepad.ts`: optional two-gamepad adapter with deadzones, normalized sticks,
  keyboard-vs-stick precedence, absolute right-stick aim, A/right-trigger fire, Start edge
  detection, disconnect cleanup, neutral gating after focus/pause/restart, and solo
  assignment limited to one pad. Synthetic pads use structural types, so unit tests never
  need a real controller.
- `src/main.ts`: polls pads each frame, merges pad and keyboard commands, clears both
  adapters on focus loss/pause/room reset, shows assigned pad labels in the HUD, and adds a
  manual test clock so RAF renders without racing explicit ticks.
- `src/render/renderer.ts`: restores the prototype's dashed aim line, first-bounce
  continuation and marker, and spark/poof effect drawing. Rendering still never mutates
  gameplay.
- `src/test-bridge.ts`: typed `window.__TOYBOX_TEST__` with `loadScenario`, `advanceTicks`,
  `snapshot`, `events`, `render`, and `clearInput`; scenario validation, bounded tick
  counts, mutually exclusive command sources, and copied snapshots. Installed only when the
  build-time `__TEST_BUILD__` constant is true.
- `vite.config.ts`, `package.json`, and `playwright.config.ts`: `dev:test`/`build:test`,
  isolated `dist-test/` output, and a test-mode dev server for browser suites. Production
  `dist/` and `dist-single/` contain no bridge code and cannot enable it with `?test=1`.
- Unit coverage: `tests/unit/gamepad.test.ts` (10 tests) and
  `tests/unit/test-bridge.test.ts` (9 tests).
- Browser coverage: `tests/e2e/bridge.spec.ts` (scenario/time ownership, real keyboard
  sampling during explicit ticks, outcome/error states, render non-mutation) and
  `tests/e2e/gamepad.spec.ts` (synthetic pad move/aim/fire/pause/resume/disconnect). Release
  specs prove bridge absence in both production artifacts. The candidate visual spec now
  captures nine stable scenes.

WebKit throttles `requestAnimationFrame` under Playwright, so the synthetic-gamepad spec
waits for real animation frames when the adapter must observe a Start release or a neutral
sample. Fixed sleeps were replaced; the adapter's neutral gate and Start edge detection were
not weakened.

Visual approval remains pending: `test:visual` writes nine unapproved candidates to
`test-results/visual-candidates/`. Firefox remains blocked locally by the nono sandbox and
is exercised in CI.

## Visual asset integration (drafted, not started)

Two content-identical copies of a drafted asset pack (plus their zips, about 8 MB total)
are committed at the repository root under
`Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte/` and its
`+handoff` twin. They contain a warm-wood floor, an optional rug, 60 block variants, an
arena border kit, player/enemy tank and turret art, projectiles, and sandbox-only
catapult/chick/cork/roof studies.

None of it is integrated. The plan in `docs/asset-integration-plan.md` records the verified
API revision (`ToyboxAssets` v0.1 has no `prepareLayers`), the renderer mapping, the
conflicts that need decisions (enemy palette, projectile colors, wall-cell framing, border
padding), and five reviewable phases: inventory, adapter, floor, walls/border, existing
tanks/shells, then a sandbox for future content. Asset work must stay presentation-only and
must not change simulation, collision, controls, or releases.

## Gate C status

Gate C is complete and locally verified. The simulation now matches the prototype's
gameplay rules: enemy sentry AI, one-bounce shells with remaining travel, ambiguous-corner
removal, muzzle sweeping, damage/invulnerability, feedback effects/events, shell caps and
cooldowns, and terminal outcome semantics. `sim/` remains DOM- and Node-free.

Gate C is committed as `891fee4` (`WIP gate c`) and was re-verified unchanged on
2026-11-07 with the full local gate. The visual regression gate is still **pending
human/vision approval**: candidate screenshots are captured, not approved. Firefox
remains blocked locally by the nono sandbox; Chromium and WebKit pass.

Gate C work completed:

- `src/sim/types.ts`: added `Effect` and the prototype's `effects`/`events` world state.
- `src/sim/collision.ts`: extracted ray/AABB and ray/circle collision, earliest-wall
  selection, reflection, tank movement/correction, hit eligibility, and line of sight.
- `src/sim/combat.ts`: extracted damage, firing, muzzle sweep, wall contact, and bounded
  one-bounce shell advancement with remaining travel.
- `src/sim/enemies.ts`: extracted sentry target selection, line-of-sight gating, turning,
  telegraph, cancel, and firing.
- `src/sim/feedback.ts`: prototype event log and spark/poof effect creation.
- `src/sim/world.ts`: now owns entity creation, room loading, outcome commits, and the
  fixed-step simulation loop.
- `src/render/renderer.ts`: accepts a narrow `RenderCanvas`/`RenderContext` surface so a
  headless unit test can prove rendering never mutates world state. Production behavior is
  unchanged.
- `tests/unit/collision.test.ts`, `combat.test.ts`, `enemies.test.ts`,
  `world.test.ts`, `renderer.test.ts`, and the existing map/config tests: **59 tests**
  including all 18 prototype self-checks plus muzzle sweep, telegraph/cancel, target
  switching, completion/replay, reset equivalence, bounded event/effect state, automatic
  sentry updates, and renderer non-mutation.
- `tsconfig.unit.json` includes `DOM` solely for the renderer contract test. The
  `tsconfig.sim.json` project remains DOM-free with `types: []`.
- `src/main.ts`: removed Gate B skeleton/status copy; player-facing text now matches the
  prototype menu.

## Gate B summary

Gate A remains committed as `25296e7`; Gate B is committed as `1c12fcf`. Gate B delivered
the strict toolchain, guardrails, skeleton, browser/release suites, Husky hook, CI
workflow, and documentation. Its verification details remain in this file's history and in
`docs/verification.md`. Gate C did not change package dependencies, the lockfile, CI, or
the launcher.

## Gate C verification

All runs are from `/home/toast/dev/toybox-tanks`. Local Playwright commands used
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.

| Command                                                                                      | Exit | Result                                                                                                      |
| -------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                                                                       | 0    | All matched files use Prettier.                                                                             |
| `npm run lint`                                                                               | 0    | ESLint passed with `--max-warnings 0`.                                                                      |
| `npm run typecheck`                                                                          | 0    | `app`, `sim`, `tooling`, `unit`, `e2e`, and `fixtures` projects passed.                                     |
| `npm run test:unit`                                                                          | 0    | 8 files, 59 tests passed (53 unit + 6 architecture guardrails).                                             |
| `npm run test:coverage`                                                                      | 0    | 59 tests passed; coverage 96.07/93.36/100/95.93 (st/branch/fn/lines) over `src/config.ts` and `src/sim/**`. |
| `npm run build`                                                                              | 0    | Hosted `dist/` built.                                                                                       |
| `npm run build:single`                                                                       | 0    | Single-file `dist-single/index.html` built.                                                                 |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e`                     | 0    | Chromium: 2/2 passed (real keyboard movement, pause/resume/retry, solo).                                    |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:visual`                  | 0    | Candidate capture: 1/1 passed. **Not approved baselines.**                                                  |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:release`                 | 0    | Chromium release smoke: 2/2 passed (`dist/` preview + `dist-single/index.html` via `file://`).              |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify`                       | 0    | Full local gate passed sequentially.                                                                        |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npx playwright test --project=webkit` | 0    | WebKit e2e: 2/2 passed.                                                                                     |

Browser suites must not be run concurrently in this repo: they share
`test-results/.playwright-artifacts-*`, and a parallel visual/release invocation produced
false `ENOENT ... browserContext.close` errors. Running them sequentially (as `verify`
does) passes.

## Gate D verification

All runs are from `/home/toast/dev/toybox-tanks`. Local Playwright commands used
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`, and browser suites were run
sequentially.

| Command                                                                                      | Exit | Result                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| `npm run format:check`                                                                       | 0    | All matched files use Prettier.                                                                                                |
| `npm run lint`                                                                               | 0    | ESLint passed with `--max-warnings 0`.                                                                                         |
| `npm run typecheck`                                                                          | 0    | `app`, `sim`, `tooling`, `unit`, `e2e`, and `fixtures` projects passed.                                                        |
| `npm run test:unit`                                                                          | 0    | 10 files, 78 tests passed (72 unit + 6 architecture guardrails).                                                               |
| `npm run test:coverage`                                                                      | 0    | 78 tests passed; coverage 96.07/93.36/100/95.93 (st/branch/fn/lines) over `src/config.ts` and `src/sim/**`.                    |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e`                     | 0    | Chromium: 6/6 passed (bridge scenarios/manual ticks, real keyboard sampling, synthetic gamepad, real-time smoke, solo).        |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npx playwright test --project=webkit` | 0    | WebKit e2e: 6/6 passed, including the synthetic gamepad flow with frame-based synchronization.                                 |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:visual`                  | 0    | Candidate capture: 1/1 passed; nine unapproved PNGs. **Not approved baselines.**                                               |
| `npm run build`                                                                              | 0    | Hosted `dist/` built; `__TOYBOX_TEST__` count in bundled JS: 0.                                                                |
| `npm run build:test`                                                                         | 0    | Test build in `dist-test/`; bridge present.                                                                                    |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:release`                 | 0    | Chromium release: 4/4 passed (hosted + single-file, normal smoke + bridge absence with `?test=1`).                             |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify`                       | 0    | Full local gate passed sequentially.                                                                                           |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers`                | n/a  | Not run locally: Firefox still fails before launch in the nono sandbox. Chromium/WebKit evidence is above; CI runs the matrix. |

The WebKit regression was a test-synchronization issue, not an adapter bug: WebKit throttles
`requestAnimationFrame` under Playwright, so a fixed sleep could contain no poll frame and
the adapter never observed a Start release. The spec now waits for real frames before
re-pressing Start. Neutral gating and edge detection are unchanged.

## Task checklist

- [x] Read `docs/handoff.md`, `docs/kickoff.md`, `docs/session-handoff.md` completely.
- [x] Inspect the existing repository and preserve existing user changes.
- [x] Copy the source prototype byte-for-byte to `reference/toybox-tanks.original.html`.
- [x] Record and re-verify SHA-256 hashes.
- [x] Reproduce the prototype in Chromium through `file://` and record checks/state/errors.
- [x] Capture startup/menu, gameplay, and pause evidence.
- [x] Write `docs/baseline.md`.
- [x] Write `docs/backlog.md`.
- [x] Write root `AGENTS.md` from the handoff template, adapted to this repository.
- [x] Confirm no application source was changed during Gate A.
- [ ] Gate A owner review.
- [x] Gate B: toolchain, guardrails, minimal skeleton (committed as `1c12fcf`; visual gate
      pending; Firefox local blocker).
- [x] Gate C: behavior-preserving simulation extraction (complete, committed as `891fee4`,
      re-verified).
- [x] Gate D: adapters, rendering, UI, runtime, automation, releases (complete, committed,
      pushed; visual approval still pending).
- [ ] Gate E: harden and deliver (see `docs/gate-e-handoff.md`).
- [ ] Optional follow-on: integrate the drafted visual assets
      (`docs/asset-integration-plan.md`), starting with phase 0.

## Known blockers and limitations

1. **Visual approval pending.** `test:visual` captures unapproved candidates in
   `test-results/visual-candidates/`. No snapshots are approved and no comparison suite is
   enabled. A human/vision review is required before `test:visual` becomes an approved
   regression gate.
2. **Firefox locally blocked.** Prior runs failed before page launch with
   `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
   `Could not find profile folder.` Chromium and WebKit pass the hosted smoke. This is the
   known nono process-isolation limitation; CI runs Firefox on a normal runner. Gate D did
   not claim a local Firefox pass.
3. **Launcher browser path mismatch.** `_start_opencode_with_nono.sh` points
   `PLAYWRIGHT_BROWSERS_PATH` at a non-existent directory. The launcher stays unchanged;
   prefix local Playwright commands with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
4. **No installs or untracked remote changes.** Gate D added no dependencies, lockfile
   changes, package upgrades, browser downloads, or branch-protection changes. The Gate D
   commit and the handoff commit were pushed to `origin/main` on explicit user
   authorization; no visual baselines were committed.
5. **CI for the Gate D push is pending at handoff time.** The only recorded CI run before
   this push covered Gate C (`891fee4`) and passed, including the full browser matrix. The
   Gate D run must be checked and recorded; do not reuse the Gate C result.
6. **Gate E remains.** Gate D covers adapters, full rendering parity, UI/runtime, the
   test-only bridge, deterministic automation, and release isolation. Gate E still owns
   hardening, final delivery, cross-browser CI evidence, and visual-baseline approval.
7. **Asset integration is a separate task.** Drafted art is committed but unused. Do not
   wire it into gameplay without the phase 0 decisions and visual approval described in
   `docs/asset-integration-plan.md`.

## Next action

Follow `docs/gate-e-handoff.md`. In order: confirm the CI run for the pushed Gate D commit,
review the nine visual candidates and record approve/reject decisions, choose a
visual-baseline policy, run or explicitly authorize clean-install verification, and set
branch protection with owner access. Only then decide between finishing Gate E delivery and
starting asset integration phase 0. Do not approve visual baselines, weaken tests, or
fabricate a local Firefox pass.
