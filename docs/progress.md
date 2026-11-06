# Toybox Tanks — progress

Updated: 2026-11-06  
Current gate: **C — behavior-preserving simulation extraction (complete, locally verified)**  
Next gate: **D — adapters, rendering, UI, runtime, automation, releases (not started)**  
Earlier handoff notes: `docs/gate-b-handoff.md` (historical)  
Verification details: `docs/verification.md`

## Gate C status

Gate C is complete and locally verified. The simulation now matches the prototype's
gameplay rules: enemy sentry AI, one-bounce shells with remaining travel, ambiguous-corner
removal, muzzle sweeping, damage/invulnerability, feedback effects/events, shell caps and
cooldowns, and terminal outcome semantics. `sim/` remains DOM- and Node-free.

No commits were made. The visual regression gate is still **pending human/vision
approval**: candidate screenshots are captured, not approved. Firefox remains blocked
locally by the nono sandbox; Chromium and WebKit pass.

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
- [x] Gate C: behavior-preserving simulation extraction (complete, locally verified; no
      commits).
- [ ] Gate D: adapters, rendering, UI, runtime, automation, releases.
- [ ] Gate E: harden and deliver.

## Known blockers and limitations

1. **Visual approval pending.** `test:visual` captures unapproved candidates in
   `test-results/visual-candidates/`. No snapshots are approved and no comparison suite is
   enabled. A human/vision review is required before `test:visual` becomes an approved
   regression gate.
2. **Firefox locally blocked.** Prior runs failed before page launch with
   `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
   `Could not find profile folder.` Chromium and WebKit pass the same hosted smoke. This is
   the known nono process-isolation limitation; CI runs Firefox on a normal runner. Gate C
   did not rerun Firefox.
3. **Launcher browser path mismatch.** `_start_opencode_with_nono.sh` points
   `PLAYWRIGHT_BROWSERS_PATH` at a non-existent directory. The launcher stays unchanged;
   prefix local Playwright commands with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
4. **No installs/commits performed.** No `npm install`/`npm ci`, lockfile changes, package
   upgrades, browser downloads, commits, pushes, or remote changes were made.
5. **Gate D remains.** The simulation is at prototype parity, but rendering still lacks the
   prototype's drawn aim/bounce guide, effect visuals, and gamepad/DOM adapters. The
   deterministic test-only bridge and the full overlay/room-transition automation matrix
   are also Gate D. `renderer.render` ignores the new `effects` array for now.

## Next action

Report Gate C completion with the verification table above. Gate D should add adapters
(keyboard refinements and gamepads), full procedural rendering parity (aim/bounce guide,
effects), UI/runtime composition and focus/visibility behavior, the typed test-only bridge,
manual-tick automation, release proof that the bridge is absent, and candidate visual
capture for human approval. Do not commit or approve baselines without explicit
authorization.
