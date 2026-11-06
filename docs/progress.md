# Toybox Tanks — progress

Updated: 2026-11-06  
Current gate: **B — toolchain, guardrails, and minimal executable skeleton (complete, locally verified; visual gate pending)**  
Next gate: **C — behavior-preserving simulation extraction (not started)**  
Gate B handoff notes: `docs/gate-b-handoff.md` (superseded where this file is more recent)  
Verification details: `docs/verification.md`

## Gate B status

Gate A remains committed as `25296e7`. Gate B is complete and locally verified on
Chromium/WebKit and the release paths exercised here. The visual regression gate is
**pending human/vision approval**: candidate screenshots are captured, not approved.
Firefox is blocked locally by the nono sandbox and was exercised in CI configuration but
cannot run as a local pass. No commits were made.

Gate B work completed:

- Minimal executable TypeScript skeleton (`index.html`, `src/main.ts`, `src/styles.css`,
  `src/config.ts`, `src/sim/*`, `src/render/renderer.ts`, `src/input/keyboard.ts`).
- Strict focused tsconfigs, including the DOM-free `tsconfig.sim.json`.
- Flat ESLint config with sim restrictions, fixture isolation, and a small
  project-service default project for `eslint.config.mjs`.
- Prettier, Vite, Vitest, Playwright, coverage, and the full npm script contract.
- Unit tests: config, maps, skeleton world (17 tests).
- Architecture guardrail fixtures (`tests/fixtures/guardrails/sim/{positive,negative}/`)
  and `tests/architecture/guardrails.test.ts` asserting exact rule IDs and exactly one
  violation per negative fixture (6 tests).
- Browser specs: `tests/e2e/smoke.spec.ts` (real keyboard input, menu/start, pause,
  resume, retry, solo), `tests/visual/candidates.spec.ts` (unapproved candidate capture),
  `tests/release/hosted.spec.ts`, `tests/release/single.spec.ts`.
- `.husky/pre-commit` (`npx lint-staged`), `.github/workflows/verify.yml`, `README.md`,
  `docs/architecture.md`, `docs/verification.md`, `docs/adr/0001-visual-gate-pending.md`.

## Gate B verification

All runs are from `/home/toast/dev/toybox-tanks`. Local Playwright commands used
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.

| Command                                                                                      | Exit | Result                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`                                                                       | 0    | All matched files use Prettier. (`docs/baseline.md` was normalized after Gate B edits.)                                                                                                                                                      |
| `npm run lint`                                                                               | 0    | ESLint passed, zero warnings.                                                                                                                                                                                                                |
| `npm run typecheck`                                                                          | 0    | `app`, `sim`, `tooling`, `unit`, `e2e`, `fixtures` all passed.                                                                                                                                                                               |
| `npm run test:unit`                                                                          | 0    | 4 files, 23 tests passed.                                                                                                                                                                                                                    |
| `npm run test:coverage`                                                                      | 0    | 23 tests passed; coverage 93.53/87.43/100/93.28 (st/branch/fn/lines) over `src/config.ts` and `src/sim/**`.                                                                                                                                  |
| `npm run build`                                                                              | 0    | Hosted `dist/` built.                                                                                                                                                                                                                        |
| `npm run build:single`                                                                       | 0    | Single-file `dist-single/index.html` built with `vite-plugin-singlefile`.                                                                                                                                                                    |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e`                     | 0    | Chromium: 2/2 passed (menu/keyboard/pause/resume/retry; solo).                                                                                                                                                                               |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:visual`                  | 0    | Candidate capture: 1/1 passed; wrote `test-results/visual-candidates/01-menu.png`, `02-gameplay-paused.png`. **Not approved baselines.**                                                                                                     |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:release`                 | 0    | Chromium release smoke: 2/2 passed (`dist/` preview + `dist-single/index.html` via `file://`).                                                                                                                                               |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify`                       | 0    | Full local gate passed (includes candidate capture and release checks).                                                                                                                                                                      |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npx playwright test --project=webkit` | 0    | WebKit e2e: 2/2 passed after making the movement assertion poll for animation timing.                                                                                                                                                        |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers`                | 1    | Chromium 1/1 and WebKit 1/1 passed; **Firefox failed before page launch** with `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` / `Could not find profile folder.` Local environment blocker, not a test failure of the app. |

## Fixes applied during Gate B verification

- `eslint.config.mjs`: added `projectService.allowDefaultProject` and migrated from
  deprecated `tseslint.config()` to `defineConfig()` from `eslint/config` to satisfy the
  type-checked deprecation rule.
- `src/input/keyboard.ts`: typed `KeySet` as a record so `Object.values` is not `any[]`.
- `src/main.ts`: checked `world.state` through a small helper so the narrowed-union
  conditional is not false-positive-flagged in the RAF loop.
- `tests/unit/maps.test.ts`: corrected the border-mutation test to use a real border
  coordinate (`0,0`).
- `index.html`: added `<link rel="icon" href="data:,">` to avoid a noisy missing-favicon
  console error in release smoke.
- `tests/e2e/smoke.spec.ts`: fixed Playwright `Page` typing and changed the movement check
  to poll until the tank has moved; a fixed 400 ms wait was flaky in WebKit.
- `vitest.config.ts`: set `testTimeout: 30_000` because the architecture test runs ESLint
  with type services and can exceed Vitest's 5 s default under coverage instrumentation.

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
- [x] Confirm no application source was changed.
- [ ] Gate A owner review.
- [x] Gate B: toolchain, guardrails, minimal skeleton (complete, locally verified; visual gate pending; Firefox local blocker; no commits).
- [ ] Gate C: behavior-preserving simulation extraction.
- [ ] Gate D: adapters, rendering, UI, runtime, automation, releases.
- [ ] Gate E: harden and deliver.

## Known blockers and limitations

1. **Visual approval pending.** `test:visual` captures unapproved candidates in
   `test-results/visual-candidates/`. No snapshots are approved and no comparison suite is
   enabled. A human/vision review is required before `test:visual` can become an approved
   regression gate.
2. **Firefox locally blocked.** `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers` failed
   before page launch with `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
   `Could not find profile folder.` Chromium/WebKit passed the same hosted smoke. This is
   the known nono process-isolation limitation; CI should run Firefox on a normal runner.
3. **Launcher browser path mismatch.** `_start_opencode_with_nono.sh` points
   `PLAYWRIGHT_BROWSERS_PATH` at a non-existent directory. The launcher stays unchanged;
   prefix local Playwright commands with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
4. **No installs/commits performed.** No `npm install`/`npm ci`, lockfile changes, package
   upgrades, browser downloads, commits, pushes, or remote changes were made.
5. **World skeleton is not Gate C parity.** Movement, wall blocking, aiming/firing, swept
   shell hits, damage/invulnerability, and outcome commits exist. Enemy AI, shell bounce,
   muzzle sweep, effects, the deterministic test bridge, and full prototype parity remain
   for later gates.

## Next action

Report Gate B completion with the verification table above. Gate C should extract
behavior-preserving simulation parity from `reference/toybox-tanks.original.html`
(enemy AI, shell bounce/second-contact removal, muzzle sweep, complete outcome/input
semantics, and the deterministic test bridge) while keeping `sim/` DOM/Node-free and
adding named unit/fixture tests for every migrated invariant.
