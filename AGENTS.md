# Toybox Tanks — agent instructions

## Mission and current scope

Maintain a small browser-based couch-co-op tank game. Reliable local two-player
controls, readable one-bounce combat, toy-like presentation, and forgiving
cooperation take priority over infrastructure or extra content.

The TypeScript migration is implemented. PR #14's automatic map borders are
squash-merged as `d5aa53f`. The cork feature and fourth room from PR #15 are
reconstructed on `feature/destructible-cork-blocks-main` from that main revision.
The original branch is preserved. Inspect current GitHub state before assuming
the replacement has merged. Read `docs/progress.md` for evidence. Old migration
and session handoffs are historical context, not permission to repeat completed
work or push main.

ADR 0002 records the accepted cork mechanic and procedural rendering decision.
Do not implement its superseded SVG proposal. The owner reported successful cork
playtesting in the VS Code internal browser on 2026-11-08. Visual regression and
comprehensive visual coverage of cork states are a separate issue, not pending
implementation work for PR #15. No screenshot baselines are approved by this.
Gate E is not declared complete.

## Before editing

- Read this file, applicable nested instructions, `docs/progress.md`,
  `docs/architecture.md`, `docs/verification.md`, relevant ADRs, and tests.
- Consult `docs/handoff.md`, baseline, and historical migration documents when
  needed to understand original behavior, not as current task queues.
- Inspect existing user changes and preserve them. Make the smallest coherent
  change for the explicitly assigned task; update progress with actual evidence.
- `reference/toybox-tanks.original.html` and `reference/toybox-tanks.html` are
  immutable references. Do not edit, reformat, overwrite, or load them as runtime.
- Do not create `docs/migration-handoff.md`; `docs/handoff.md` is the original
  migration contract and `toybox-tanks-opencode-handoff.md` its archive.
- Do not implement backlog or asset-plan items without a separate assignment.

## Product invariants

- Local two-player co-op is primary; solo has exactly one actual player.
- Free 2D movement, normalized diagonals, independent turret aim, persistent
  direction after release, and fixed logical coordinates with aspect/DPR handling.
- Player shells hit enemies only; enemy shells hit players only. No friendly
  fire, shell-shell collision, or tank-tank blocking/pushing.
- Ordinary shells get one permanent-wall bounce; the next contact removes them.
  Sweep complete paths and muzzle travel, resolve earliest impact, preserve
  remaining travel and surface separation, and bound processing. Keep conservative
  ambiguous-corner termination. Cork absorbs qualifying contacts instead of
  reflecting; preserve its separate three-hit contract from ADR 0002.
- Preserve default shell limits, cooldowns, two HP per room, invulnerability,
  visible feedback, and original invulnerable-tank contact behavior.
- Disabled players stay visible; one survivor can finish; next room restores both.
- Same-tick defeat wins over victory. Commit outcomes once, stop combat, and
  clear shells. Restart resets all world and input-adapter state, including
  IDs, timers, effects, and cross-device release gates.
- Preserve the original three layouts/order and the appended fourth room.
  Preserve menu, solo/co-op, pause, retry, transition, completion, and replay.
- Preserve focus-loss/hidden-tab pause and input clearing, keyboard overlay
  activation, and prevention of game-key browser defaults.

## Architecture and maps

- Simulation is DOM/Node-free with explicit world state, time, and commands. No
  real-time reads, scheduling, device polling, drawing, or global randomness.
  Inject reproducible randomness only when needed and reset it with the world.
- Fixed simulation steps stay separate from rendering; bound catch-up work and
  accumulated time after interruptions. Do not promise cross-platform float
  determinism. Same supported-runtime inputs must reproduce state.
- Input adapters emit commands; rendering only reads state; application code
  orchestrates. No second combat/progression implementation in UI or tests.
- Maps/config stay data-driven and validated. Author 22 × 11 interior grids and
  generate the permanent border. Cork destruction must consistently affect
  movement, shells, sight, and aim guides. Reject invalid startup maps safely.
- Prefer small modules and plain data/functions. No engine/framework swap, ECS,
  DI framework, networking, generic plugin system, or speculative infrastructure.
- Preserve hosted and offline single-HTML releases without external resources.
  Keep test bridges out of all production builds, even with `?test=1`.

## Verification and guardrails

- Focused tests while iterating; `npm run verify:fast`, `npm run verify`, and
  `npm run test:browsers` as required by `docs/verification.md`. Run browser
  suites sequentially. CI is authoritative, not the Git hook.
- Never claim an unrun, skipped, or blocked check passed. Record tested SHA or
  exact working-tree context, environment, commands, exits, artifacts, and limits.
  Historical results do not prove a later head or rebased branch passes.
- No `any`, broad casts, unchecked non-null assertions, ignored type errors,
  ESLint disables, broad excludes, weakened assertions/coverage, or disabled
  checks to make work pass. Explain any narrowly scoped exception for review.
- Never silently change validation scripts, CI, guardrail configuration,
  dependencies, lockfiles, or visual baselines. Obtain specific approval.
- No automatic screenshot acceptance. An implementing model that cannot inspect
  images must not approve aesthetics. Candidate capture is not visual regression.
- Test critical collisions, hit assignment, simultaneous deaths, map errors,
  reset independence, and reproducible sequences. Coverage alone is insufficient.
- Use real keyboard/realtime smoke as well as controlled stepping. A Canvas
  tank is not a DOM node; use structured state for mechanics and images for visuals.
- Synthetic gamepads are not hardware verification. Automated WebKit is not
  real Safari/iOS/device verification.

## Environment and permissions

- Node `24.22.2`, npm `11.19.1`, pinned via Volta; one npm lockfile.
- Do not run `npm install`, `npm ci`, package updates, browser downloads, or OS
  installs without separate authorization. Dependencies/browsers are owner-installed.
- The local launcher sets a non-existent browser path. Do not edit it; prefix
  Playwright commands with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
- Local Firefox may fail before launch with
  `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` and
  `Could not find profile folder.` Report the blocker; do not weaken the sandbox.
- Keep browser/server work bounded and on loopback. Respect sandbox restrictions;
  investigate a denied operation narrowly rather than seeking broad access.
- Do not auto-stage unrelated changes, commit, push, rewrite history, alter
  remotes, rebase, retarget, merge, deploy, or change branch protection without
  explicit authorization. Check actual branch state before repository actions.
- Final reports distinguish changes, deliberate behavior changes, checks actually
  run, artifacts, pending work, and limitations.

## Deferred work

Moving AI, fading tracks, rockets, mines, audio, additional rooms, and broader
asset integration require separate tasks. Cork and room four are implemented
feature scope, not deferred migration work. Supplied artwork stays untouched;
never adjust gameplay geometry to fit it. See the asset plan for future decisions.
