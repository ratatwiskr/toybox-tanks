# Toybox Tanks — local OpenCode implementation handoff

Prepared: 2026-11-08. This is a concrete implementation assignment, not another planning task.

Handoff convention: see `docs/opencode-handoff-workflow.md`. This document is the repository-backed task reference; no chat attachment or GitHub access is needed once this branch is available locally.

## 1. Mission and authority

Finish experimental landscape-first solo touch controls and the explicitly requested bounded directional turret aiming change. Implement locally, iterate against lint/typecheck/tests, and leave a reviewable diff plus an exact verification report. You do not need GitHub access to perform this assignment.

Keep the feature small: no dependencies, framework, generalized input framework, configurable control schemes, or mobile redesign. Preserve all existing gameplay and presentation except the expressly authorized directional-aiming change and necessary touch UI/layout additions.

Read root `AGENTS.md`, any more-specific instructions, and relevant repository documentation before editing. In particular read `docs/progress.md`, `docs/architecture.md`, `docs/verification.md`, and the migration/baseline/handoff documents required by `AGENTS.md`. Some documents still describe historical migration stages or unpushed commits. Do not follow obsolete “start Gate A” instructions or restart migration: this assignment authorizes this specific feature. Existing restrictions on installs, guardrails, reference files, visual approval, and unauthorized commits/pushes remain in force.

## 2. Verified remote checkpoint — do not assume it is available locally

Repository: `ratatwiskr/toybox-tanks`.

- Branch: `feature/solo-touch-controls`.
- Feature source checkpoint: `90587ef3ffff0ac062eab1f36181fe0f3327bc20`, before the documentation commit adding this handoff. Treat it as an expected ancestor, not a permanent HEAD.
- Branch base: `57e73d64bbf3404dc1379bcc28d3b622f35bf833` on `main`.
- Draft PR: https://github.com/ratatwiskr/toybox-tanks/pull/17
- PR title: `WIP: experimental solo touch controls and bounded turret aiming`.
- The source checkpoint changes exactly two files: `src/input/touch.ts` and `tests/unit/touch.test.ts` (331 additions in total).
- GitHub check `verify` completed successfully on that adapter-only PR checkpoint, finishing at 2026-11-08 09:41:29 UTC. Job: https://github.com/ratatwiskr/toybox-tanks/actions/runs/42468106327/job/128692235368
- `deploy-pages` and `pages-smoke` were skipped, not passed.
- These are connector-observed job conclusions, not a new local test run or a detailed log audit. No physical phone or controller test occurred in this session.

Only the gesture adapter and 13 unit tests exist. The adapter is not wired into the application. There are no usable on-screen touch controls. Bounded turret aiming has not been implemented. Do not present the draft PR as a finished feature or the green check as proof of phone usability.

### Owner preparation, if the agent cannot access GitHub

The owner should fetch and prepare the branch outside the restricted agent environment, after preserving any local changes. Do not ask the agent to repair credentials or bypass sandbox restrictions.

On a suitable clean checkout, owner-only commands are:

```sh
git fetch origin feature/solo-touch-controls
# If the local branch does not exist:
git switch --track -c feature/solo-touch-controls origin/feature/solo-touch-controls
# If it already exists, switch to it and inspect divergence before updating it.
```

If a local branch already exists, do not run the creation command or blindly reset it. The owner can provide a separate worktree or bundle if needed. The adapter files, handoff documents, and expected source commit must be available locally; do not reconstruct missing implementation from this handoff.

### Agent first checks

```sh
git status --short
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
```

Check that the expected feature commit exists and is an ancestor of the working branch. If the owner has supplied a newer revision, inspect it and preserve it. If the branch/source is missing, unrelated, or has conflicting local edits, stop and request the owner’s preparation rather than overwrite work. No reset, stash, clean, forced checkout, merge/rebase, commit, push, or GitHub writes are authorized by this handoff.

## 3. Locked behaviour decisions

### Touch controls

- Solo P1 only. Solo has exactly one real player. Do not enable touch co-op or send touch commands to P2.
- Left fixed virtual stick moves with the existing free-2D movement model, normalized/clamped output, and no speed increase.
- Right fixed aim/fire pad: drag to specify a desired turret direction. Dragging never fires.
- Releasing after a drag stops touch-driven rotation at the actual current barrel heading; do not keep turning toward a stored target. Release never fires.
- A subsequent short tap on the right pad requests exactly one shot in the retained/current barrel direction. Tap position must not redirect the barrel.
- Returning a drag to its starting point or pad centre must never reclassify it as a tap.
- A stationary hold does nothing. No held auto-fire, release-to-fire, auto-aim, aim assist, auto-alignment waiting, or delayed-shot queue.
- Consume a shot request once on the next simulation input sample. Existing cooldown and active-shell rules decide whether it succeeds; a blocked request must not retry later.
- Multiple taps arriving before one simulation sample may coalesce into a single pending request, as in the existing adapter. Do not add a queue.
- Left-thumb movement and right-thumb aiming/tapping must work simultaneously.
- Additional pointers must not steal occupied controls.

Existing provisional thresholds in `src/input/touch.ts`:

- `TOUCH_DRAG_DISTANCE = 10`, in CSS pixels, relative to touch-down position.
- `TOUCH_TAP_DURATION = 250`, in milliseconds.
- Stick deadzone reuses `CONFIG.stickDeadzone` (currently 0.22).

These are initial test settings, not scientifically validated ergonomics. Keep named constants. Tune only with a concrete reason and corresponding tests; do not create a settings screen.

### Intentional directional-aiming change, including gamepads

The owner explicitly rejected instant gamepad turret-angle assignment. Preserve dual-stick bindings; fix rotation rather than redesign the controller.

- Right-stick and touch aim specify a desired angle, not an instant angle assignment.
- Rotate by the shortest angular path toward that target, capped per simulation step by `CONFIG.turretRotationSpeed * dt` (currently 2.8 radians/second).
- Do not overshoot a nearby target. Handle angle wraparound correctly.
- Stop when directional input is released; retain actual heading, with no stored target pursuit.
- Fire immediately if requested and allowed, along the actual barrel angle after that step’s normal aiming update. Never teleport to the target, wait for alignment, or fire along the desired-but-not-yet-reached angle.
- Use the same bounded target-aim semantics for both co-op players and solo. Keep keyboard incremental turning unchanged.
- Keep existing gamepad mapping: left stick move; right stick aim; A/right trigger fire; Start pause/resume.
- Do not add face-button turning, bumper remapping, slow/precision modifiers, freeze-and-fire modes, or analog rotation-speed curves in this task.
- Do not change enemy rotation, targeting, telegraph, or firing.

This is a deliberate gameplay-feel change, not a migration-parity bug fix. Document it clearly.

## 4. Architecture and concrete integration points

Inspect the actual local code before making edits; paths below are verified at the checkpoint, not a promise that no one has subsequently changed them.

### Existing touch core

`src/input/touch.ts` exports `TouchAdapter` and `TouchControl = 'move' | 'aim'`.

- `begin(control, id, x, y, radius, time)` claims a pointer and returns whether accepted.
- `move(id, x, y)` updates position and sticky drag classification.
- `end(id, x, y, time)` checks final displacement, optionally sets a single pending shot, then releases ownership.
- `cancel(id)` releases that pointer without firing.
- `clear()` drops gestures and pending shots.
- `readCommand(fallback)` merges touch movement/aim with the fallback command and consumes the pending shot once.

Coordinates are CSS pixels relative to the fixed pad centre; radius is in the same units. Times are milliseconds supplied by the input layer. Keep these units consistent. A touch tap does not emit an aim direction. The adapter produces commands, never mutates the world, and does not read a clock itself.

### Application wiring

`src/main.ts` owns the app lifecycle and is the one orchestration point.

- Current `readCommand(index)` returns gamepad input merged with keyboard input. Add touch composition only for P1 in enabled solo play. Keep existing keyboard/gamepad precedence when touch is inactive and override only engaged touch channels.
- Only consume touch shot requests when commands are sampled for a simulation tick. Do not call a consuming `readCommand()` for HUD/rendering or every RAF frame without a simulation step.
- Existing `clearInputs()` clears keyboard and gamepad adapters. Extend it to clear touch gestures, pending shots, pointer ownership, capture, and visual stick state.
- State transitions already go through `setOverlay()`, `loadRoom()`, pause/resume, restart/menu, `replaceWorld()`, and error handling. Reuse their shared reset path rather than duplicate progression/combat rules.
- Blur and hidden-tab handlers already clear input and pause. Preserve them.
- The test bridge calls the same command-reading/reset paths; maintain this integration.
- Ensure touching the controls keeps focus inside `#app` and does not accidentally invoke the focus-loss pause handler.

Keep a small browser-facing touch control module if separating Pointer Events/DOM wiring from the existing gesture core helps. No generic plugin layer or new infrastructure.

### Bounded aiming

`src/sim/world.ts` currently does this in the player loop:

```ts
if (command.aim !== undefined) {
  player.angle = command.aim;
} else {
  player.angle += command.turn * CONFIG.turretRotationSpeed * dt;
}
```

Change the `aim` branch to bounded shortest-path turning. `src/sim/enemies.ts` already exports `angleDelta(a, b)` and `turnToward(a, b, max)`; `world.ts` already imports `updateEnemy` from that module. Reuse the existing helper if appropriate rather than introduce duplicate angle math or a broad module extraction. Do not change enemy behaviour as a side effect.

Simulation stays DOM/Node/device/real-time-free. No remembered target state or special touch/gamepad simulation branch is required. Renderer and bounce guide continue reading actual tank angle.

### Pointer Events lifecycle

- One owner pointer per pad; capture accepted pointers so dragging outside the visible pad remains bounded and releases cleanly.
- Do not filter to `isPrimary`: the second thumb is required.
- Handle `pointerup`, `pointercancel`, and `lostpointercapture`. Cancellation must never synthesize a shot.
- Do not wire an additional click-to-fire listener that duplicates a pointer-up tap.
- Apply `touch-action: none` before interaction, scoped to the control surfaces. Do not disable page gestures or zoom globally.
- Bound movement output even outside the pad; show clear active-thumb feedback.
- A lifecycle clear must discard ownership before releasing captures, so resulting lost-capture events cannot fire or corrupt a new gesture.
- After clear/resume, ignore old pointer moves/releases; only a fresh accepted pointer-down can re-arm input.
- Turning controls off, switching mode, leaving gameplay, resizing/orientation changes that invalidate pad geometry, and hiding controls must cancel active gestures and pending shots.
- Keep any event listener cleanup consistent if controls can be recreated. Avoid duplicate listeners on each room load.

## 5. Minimum UI/layout

- Add a simple `Touch controls` toggle accessible before starting solo; initially enable on touch-capable devices. Keep it available for manual testing on desktop. No persistence is required.
- Show the gameplay pads only for enabled solo gameplay. Hide and clear them during pause, menus, error, defeat, clear, and completion overlays. Existing action buttons remain tappable.
- Give concise instructions: “Left stick: move. Right pad: drag to aim, lift to keep direction, tap to shoot.” Label this experimental/solo-only.
- Landscape-first. Show a portrait hint to rotate the phone; no orientation-lock/fullscreen dependency. If pads are unavailable in portrait, disable and clear them explicitly rather than leaving invisible active controls.
- Preserve the entire logical 960 × 540 arena, 16:9 aspect, letterboxing, and DPR-aware backing resolution. Do not crop the arena, expand world visibility, or change simulation coordinates.
- Compact secondary HUD/footer/status content on short touch layouts; retain useful room/HP/pause/menu information. Avoid changing the normal desktop layout just to make phone testing work.
- Position controls at lower corners, using margins where practical and translucent overlays if needed. Respect safe areas. Some obstruction is acceptable for this experiment; unreadable projectiles or inaccessible overlays are not.
- Preserve keyboard operation of existing overlay buttons and existing desktop/gamepad play.

## 6. Tests and local iteration

### Establish the baseline

Use installed dependencies and browser binaries only. Run the relevant existing checks before changing behaviour if possible. CI was green at the remote checkpoint, but local availability/status is independent.

The existing 13 touch tests cover gesture classification, pointer ownership, normalized movement/deadzone, no release firing, one-shot taps, reset, fallback commands, retained angle, and cooldown-blocked shots. One world-level test currently expects the turret to reach angle zero in one tick; replace that instant-angle expectation with bounded progress and a captured actual heading. Do not simply delete it or weaken it to “angle changed.”

### Add targeted mechanics/adapter tests

- Per-tick rotation bound using the existing config speed and fixed step.
- Both turning directions and shortest-path wraparound near ±pi.
- No overshoot on a nearby target; deterministic handling of an exact opposite direction.
- Neutral/released input freezes the actual intermediate heading.
- Keyboard turning remains unchanged.
- Fire during rotation produces a projectile consistent with the actual barrel direction, not desired target direction.
- Touch aim release freezes actual heading, emits no shot, and a subsequent tap fires without changing heading.
- Cooldown and active-shell-cap rejection consume the touch request without a later automatic shot; existing combat rules stay authoritative.
- Clear/cancel and stale pointer release never cause a shot or stuck movement.
- Existing gamepad assignment, solo restriction, neutral gates, and Start edges remain valid.

Prefer real world/simulation tests for behaviour and adapter tests for intent. Use discrete assertions and geometry tolerances; no long fragile float snapshots.

### Add browser integration tests

Use the existing `tests/e2e/support/bridge.ts` and compile-time-only test bridge. Do not expose new production hooks.

- Toggle and real Solo button flow; exactly one player.
- Simultaneous move and aim pointers; occupied-pad ownership and independent release.
- Drag/hold/release never fires; tap fires once; repeated simulation ticks do not retry it.
- Captured drag outside the pad, cancellation, and capture loss.
- Pause/resume, retry/restart, menu, room transition, and input clear with no stale input or pending shot.
- Touch unavailable/disabled in co-op; both keyboard/gamepad player paths still work.
- Landscape small-height fit, portrait hint, safe essential UI, arena aspect/backing dimensions, and no console/page errors.
- Exercise real pointer/touch delivery where browser tooling allows, plus a real-time RAF interaction. Clearly label manually dispatched PointerEvents as synthetic; they do not prove native capture/gesture suppression or physical device usability.

Existing synthetic-gamepad E2E test polls until angle approaches zero with a five-second bound. Do not assume it needs weakening for bounded rotation: inspect and run it. Add explicit bounded-turn tests rather than rely on an eventual-alignment assertion alone.

### Commands

Run from repository root. `package.json` at the checkpoint defines these scripts:

```sh
npm run test:unit -- tests/unit/touch.test.ts
# Add the relevant aiming/world test paths to targeted runs after inspecting names.
npm run lint
npm run typecheck
npm run format:check
npm run verify:fast
```

For focused formatting, use the installed binary on changed files only, for example:

```sh
./node_modules/.bin/prettier --write src/input/touch.ts tests/unit/touch.test.ts
```

Do not indiscriminately rewrite the whole repository. Do not use package-installing fallback commands.

On the previously used Linux/nono environment, the launcher points at a missing browser cache. Leave `_start_opencode_with_nono.sh` unchanged and override locally:

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers
```

Run browser suites sequentially, not concurrently. `verify` already includes formatting, lint, all focused TypeScript checks, coverage, Chromium E2E, unapproved visual-candidate capture, and hosted/single-file release tests. `test:browsers` additionally builds and runs hosted release smoke across the configured browsers. Avoid redundant full-suite loops while iterating; run focused tests first and full gates on the final revision.

Use the existing release tests to check production hosted output and standalone `file://` HTML, including absence of the test bridge. No external resources or phone-only runtime dependency.

### Environment restrictions

- Repository runtime pin is Node 24.22.2. Inspect actual local versions; do not install a replacement automatically.
- Do not run `npm install`, `npm ci`, package updates, browser downloads, or OS installs. Do not change dependencies or the lockfile. Missing dependencies require owner assistance.
- Known historical local Firefox failure: `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` / `Could not find profile folder.` Report an actual occurrence as blocked, not passed; never bypass sandbox restrictions. Do not assume it will occur in every environment.
- No `any`, broad casts/suppressions, disabled tests, weakened assertions/coverage, edited CI policy, or auto-approved visual baselines to make checks green.
- `reference/toybox-tanks.original.html` and the supplied reference HTML are immutable. Do not rewrite migration contracts or unrelated map/cork work.

## 7. Completion and handback

Update `docs/progress.md` with a clearly dated feature section; preserve historical evidence while distinguishing it from new results. Document touch controls and the intentional gamepad aim change in the relevant user-facing documentation. No need for another tracker or ADR unless a real unresolved decision arises.

Deliver:

1. Changed files and a concise explanation of the implementation.
2. Exact starting and ending local revision/status; uncommitted diff summary (do not commit unless separately authorized).
3. Exact commands executed, exit statuses, and failures/blocks. Separate baseline results from post-change results. A later edit invalidates earlier final-gate evidence until rerun appropriately.
4. Test coverage of the important cases above, without claiming that a percentage proves correctness.
5. Builds/artifact locations and any captured phone-size screenshots; candidates are not approved baselines.
6. Explicit remaining human checks: actual phone multitouch/scroll suppression/background return, aiming/tap ergonomics, visual readability, and two-controller co-op feel after bounded aiming.
7. A short owner handback: changes ready for review/push on `feature/solo-touch-controls`, PR #17 remains draft, and CI must be inspected again for the subsequently pushed revision. The prior green adapter-only check is not evidence for your new code.

Do not merge, mark the PR ready, push, change credentials/remotes/protection, or claim human testing. GitHub is not a dependency for local implementation: when the local work is complete, return the diff and report to the owner.
