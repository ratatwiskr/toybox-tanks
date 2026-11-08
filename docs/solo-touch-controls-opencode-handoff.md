# Toybox Tanks — solo touch controls / OpenCode handoff

Updated: 2026-11-08. Concrete implementation assignment, not another planning task.
Read `docs/opencode-handoff-workflow.md` and `AGENTS.md` first. This file replaces
the earlier adapter-only task description; its historical CI evidence is retained below.

## Mission and authority

Finish experimental landscape-first solo touch controls, iterate against the existing
gates, and return a reviewable diff with exact evidence. No dependency, framework,
generic input system, mobile redesign, touch co-op, or control-remapping work.
Preserve existing gameplay except the explicitly authorized bounded directional
turret aiming change and necessary touch UI/layout additions. Preserve cork and maps.

Read applicable nested instructions, `docs/progress.md`, `docs/architecture.md`,
`docs/verification.md`, relevant ADRs and tests. Historical migration tasks are not
current work; do not restart migration or modify immutable reference HTML.

## Source checkpoints and evidence

- Repository: `ratatwiskr/toybox-tanks`; branch: `feature/solo-touch-controls`; draft PR #17.
- Adapter source: `90587ef3ffff0ac062eab1f36181fe0f3327bc20`; original base recorded
  by the earlier handoff: `57e73d64bbf3404dc1379bcc28d3b622f35bf833`.
- Adapter-only `verify` passed at 2026-11-08 09:41:29 UTC:
  https://github.com/ratatwiskr/toybox-tanks/actions/runs/42468106327/job/128692235368
- Latest inspected pre-aiming head: `6fd6317ffd81727fc6c3d604eefec36f690238a8`.
  Its `verify` passed at 2026-11-08 11:20:55 UTC:
  https://github.com/ratatwiskr/toybox-tanks/actions/runs/42475213869/job/128714905810
  `deploy-pages` and `pages-smoke` were skipped, not passed. PR base was then
  `5bec29e3ba4a2779286da406dba0ce113e94dba7`.
- This handoff accompanies the bounded-aiming source/test change, after that head.
  Determine its actual commit with `git log`; no final SHA is fabricated here.
- This change uses existing `turnToward` in `world.ts`, replaces instant-angle
  expectations in world/touch tests, and authors named bounds/wrap/no-overshoot/
  release/keyboard/opposite-direction/fire-during-turn tests in `world.test.ts`.
- No local formatter, lint, typecheck, unit, browser, release or device commands
  were run by the remote author. Those tests are authored, not verified. Earlier
  green checks do not prove this new revision passes. Inspect its CI separately.
- Touch adapter exists with 13 tests. It is still not wired to the app; no usable
  on-screen touch controls exist yet. Do not describe the feature as finished.

## Local preparation and coordination

Owner fetches/prepares the branch outside a restricted agent environment if needed.
Do not repair credentials, bypass sandbox restrictions or reconstruct missing code
from prose. Preserve local edits and inspect divergence before any update.

```sh
git status --short
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
```

Check expected checkpoints are ancestors of the supplied branch; inspect newer work.
Stop on missing/unrelated source or conflicting changes. No reset, stash, clean,
forced checkout, merge/rebase, commits, pushes, ready-for-review, merge or deployment
is authorized by this document. Coordinate handback before competing remote edits.

## Locked controls and behaviour

- Solo P1 only; exactly one real solo player. No touch commands to P2 or touch co-op.
- Fixed left stick: existing free-2D movement, bounded/normalized, unchanged speed.
- Fixed right pad: drag to request direction, never fire; release stops rotation
  at actual heading and never fires. No remembered target pursuit after release.
- Short non-dragging tap requests one immediate shot in retained barrel direction;
  tap position never redirects aim. Stationary hold does nothing. No auto-fire,
  auto-aim, alignment waiting, delayed queue, or release-to-fire.
- Drag classification is sticky even after returning to origin/centre.
- Consume pending shot once at next simulation sample; cooldown or active-shell
  rejection must not retry later. Multiple unsampled taps may coalesce; no queue.
- One owner per pad; simultaneous thumbs; extra pointers never steal ownership.
- Keep named provisional thresholds: 10 CSS-pixel drag, 250 ms tap; reuse existing
  stick deadzone. These are unvalidated ergonomic settings, not device evidence.
- Directional gamepad/touch aiming uses shortest-path turning capped each step by
  `CONFIG.turretRotationSpeed * dt`, with no overshoot. Reuse existing helper;
  preserve enemy behaviour. Both co-op players and solo share these semantics.
- Release retains actual angle. Fire uses actual barrel angle after that step's
  aiming update; never desired angle or a deferred alignment-dependent shot.
- Keyboard incremental turning stays unchanged. Gamepad: left move, right aim,
  A/right trigger fire, Start pause. No face-button turning, bumper remap or
  precision modes. This is an intentional game-feel change, not migration parity.

## Remaining implementation

1. Add lightweight browser-facing touch wiring, visible pads and a pre-solo toggle.
   Initially enable on touch-capable devices; allow desktop manual testing; no
   persistence needed. Keep listener lifetime simple, not per-room duplication.
2. In `src/main.ts`, compose touch after keyboard/gamepad only for enabled solo P1.
   Override engaged channels only; preserve fallback otherwise. Consume commands
   on simulation ticks only, including the existing test-bridge sampling path.
3. Extend shared `clearInputs()` to clear gestures, pending shot, ownership, capture
   and thumb visuals. Reuse all existing load/state/pause/restart/menu/error/
   replaceWorld/blur/hidden-tab paths; do not duplicate progression logic.
4. Use Pointer Events and capture accepted pointers; never filter `isPrimary`.
   Handle pointerup, pointercancel and lostpointercapture. Cancel never fires.
   No click-to-fire listener. Scope `touch-action: none` to pads before interaction;
   do not disable page gestures/zoom globally. Keep focus inside `#app`.
5. Clear ownership before releasing capture. Stale moves/releases after reset do
   nothing; fresh pointerdown is required. Disabling, hiding, switching mode,
   leaving play, and geometry-invalidating resize/orientation changes cancel input.
6. Show pads only during enabled solo play; hide/clear at every overlay. Provide
   a portrait rotation hint; if portrait disables pads, clear/disable them explicitly.
   No orientation lock/fullscreen dependency. Keep overlay actions tappable and
   keyboard-operable. Instructions: left move; right drag aim, lift retain, tap fire.
7. Preserve full 960 x 540 arena, 16:9 aspect, letterboxing and DPR resolution.
   Landscape-first compact secondary HUD/footer on short touch layouts, without
   changing normal desktop presentation. Use lower corners, safe-area margins
   and translucent pads where needed; retain readable shells and essential UI.
8. Update user-facing controls docs, `docs/progress.md`, and PR checklist with exact
   evidence. Do not mistake the stale PR body for current implementation status.

`TouchAdapter` in `src/input/touch.ts` accepts CSS-pixel coordinates relative to a
fixed pad centre, radius in CSS pixels and supplied millisecond times. Its methods
are `begin`, `move`, `end`, `cancel`, `clear`, and consuming `readCommand(fallback)`.
It emits commands, never mutates world or reads time. Simulation remains DOM/Node/
device/clock-free; rendering reads actual heading and never samples input.

## Verification and iteration

Establish the local baseline with installed dependencies/browsers only. First run:

```sh
npm run test:unit -- tests/unit/touch.test.ts tests/unit/world.test.ts
npm run format:check
npm run lint
npm run typecheck
npm run verify:fast
```

Fix actual failures narrowly; do not weaken checks. Focused formatting may use the
installed Prettier binary on changed files only. No indiscriminate repository rewrite.
Inspect other tests that explicitly assume instant target-angle assignment and
update only assumptions invalidated by the authorized change. Keep original
keyboard, enemy, collision, combat and outcome assertions intact.

Add active-shell-cap blocked tap coverage (cooldown coverage already exists).
Exercise solo directional aiming as well as both co-op players; retained touch
heading, stale pointer releases, cancellation and fallback remain required.
Keep exact turn-rate/shortest-path/no-overshoot/fire-direction assertions rather
than weakening them to eventual movement. Existing synthetic-gamepad E2E waits
up to five seconds for alignment; inspect/run it before changing any wait.

Browser integration cases, using existing compile-time test bridge only:

- Toggle and real Solo flow with one player; simultaneous move/aim and occupied pad.
- Drag/hold/release no firing; tap once; no retry across subsequent ticks.
- Captured outside drag, cancellation/capture loss; pause/resume, retry/restart,
  menu, room transition and reset without stale/pending input.
- Disabled touch in co-op; existing two-player keyboard/gamepad paths unchanged.
- Short landscape/portrait layout, essential UI, arena/backing dimensions, no errors.
- Real pointer/touch delivery and real-time RAF interaction where tooling allows.
  Label dispatched PointerEvents synthetic; they do not prove native capture,
  scroll suppression, ergonomics or physical multitouch.

Run browser suites sequentially:

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers
```

`verify` includes format/lint/typecheck/coverage/E2E, unapproved visual candidate
capture, and hosted plus standalone file:// release checks. Confirm production
test-bridge absence. `test:browsers` adds hosted cross-browser smoke. Run final
gates on final source; later edits invalidate earlier final-gate claims.

## Restrictions and handback

- Node 24.22.2/npm 11.19.1; inspect installed versions. No automatic installs,
  npm ci/install, downloads, dependency/lockfile/CI/guardrail/baseline changes.
- Leave `_start_opencode_with_nono.sh` unchanged; use the browser-path override.
  Report actual Firefox namespace/profile sandbox failures as blocked, never passed.
  Do not bypass restrictions. Missing tools require owner assistance.
- No any, broad casts, suppressions, disabled tests or weakened coverage/assertions.
  No immutable reference edits, unrelated map/cork work or screenshot approval.
- Report exact start/end revision and dirty state, changed files, actual commands,
  exit statuses, blockers and artifacts. Separate baseline, final local, CI and
  human evidence. Do not invent a tested SHA or treat coverage as correctness.
- Return a reviewable diff; no commits/pushes/merge without separate authorization.
  PR #17 stays draft pending completion and subsequent-head CI review.
- Human checks remain: real phone multitouch/scroll/background return, aiming/tap
  ergonomics, readability and two-controller co-op feel. Automated WebKit is not
  Safari/iOS certification; synthetic gamepads are not hardware tests.
- Pages deploy/smoke runs on main only, not PR previews. Do not merge for testing
  an unfinished feature. No local or remote deployment is authorized here.
