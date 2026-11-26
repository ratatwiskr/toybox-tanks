# Toybox Tanks — agent instructions

## Mission

Maintain a small browser-based couch-co-op tank game. Reliable local two-player
controls, readable one-bounce combat, toy-like presentation, and forgiving
cooperation take priority over infrastructure or extra content.

This file holds durable instructions, not project status. Current branch, PR, CI
and deployment state lives in `docs/progress.md` and on GitHub. Completed or
superseded work is summarized in `docs/history/`. Never infer merge state from a
branch name, a handoff title, or this file.

## Before editing

- Read this file, applicable nested instructions, `docs/progress.md`,
  `docs/architecture.md`, `docs/verification.md`, relevant ADRs, and tests.
- Consult `docs/history/`, `docs/handoff.md`, baseline, and migration documents
  only to understand original behavior or past decisions, not as task queues.
- Closed PRs, rejected proposals and superseded handoffs recorded in
  `docs/history/` must not be reopened or reconstructed as routine cleanup.
- Inspect existing user changes and preserve them. Make the smallest coherent
  change for the explicitly assigned task; update `docs/progress.md` with actual
  evidence except for roadmap #49 work, which uses PR descriptions instead.
- One slice per PR when an issue lists slices, in the listed order; otherwise one
  issue per PR. Use the smallest diff that satisfies the active slice.
- Preserve current behavior unless the active slice explicitly changes it; approved
  roadmap decisions do not apply early to unrelated work. Update affected rules and
  tests in the slice that changes the behavior or in the issue's named cleanup slice.
- If a requirement is unclear or a file differs from the issue, stop and comment
  instead of guessing.
- Apart from current-state evidence in `docs/progress.md`, update docs only when a
  durable rule or contract changes; do not add dev logs.
- When extending this file, merge durable non-inferable rules into existing sections
  and link to live issues/config for volatile detail instead of duplicating it.
- Keep `docs/progress.md` current-state only. When work merges or is superseded,
  move detailed evidence to `docs/history/<topic>-<year>-<month>.md` and leave a
  one-line summary with the link.
- `reference/toybox-tanks.original.html` and `reference/toybox-tanks.html` are
  immutable references. Do not edit, reformat, overwrite, or load them as runtime.
- Do not create `docs/migration-handoff.md`; `docs/handoff.md` is the original
  migration contract and `toybox-tanks-opencode-handoff.md` its archive.
- Do not implement backlog or asset-plan items without a separate assignment.
- Follow ADRs. ADR 0002 accepts procedural cork; do not implement its superseded
  SVG proposal.

## Product invariants

- Local two-player co-op is primary; solo has exactly one actual player.
- Free 2D movement, normalized diagonals, independent turret aim, persistent
  direction after release, and fixed logical coordinates with aspect/DPR handling.
  The logical arena is letterboxed; never reveal extra area on wide screens
  (dimensions in `src/config.ts`).
- Player shells hit enemies only; enemy shells hit players only. No friendly
  fire or tank-tank blocking/pushing. Any two shells that touch mid-air are
  both removed, regardless of faction.
- Bruiser's configured HP and one-bounce behavior are not retuned by roadmap #49.
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
- Preserve existing campaign rooms and their relative order; map additions or
  reordering require an explicit assignment. Every authored room must pass map
  validation. Preserve menu, solo/co-op, pause, retry, transition, completion,
  and replay.
- Preserve focus-loss/hidden-tab pause and input clearing, keyboard overlay
  activation, and prevention of game-key browser defaults.

## Architecture and maps

- Simulation is DOM/Node-free with explicit world state, time, and commands. No
  real-time reads, scheduling, device polling, drawing, or global randomness.
  Inject reproducible randomness only when needed and reset it with the world.
  Rendering-only cosmetic randomness (effects, shake) may be nondeterministic;
  simulation stays reproducible.
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

## Development screenshot coverage

- For every assigned change with visible effects, consider screenshot coverage as
  part of implementation: new states, damage stages, effects, interactions, map
  situations, and relevant responsive/orientation/fullscreen layouts. Explain any
  visible aspect left uncovered.
- Extend the shared registry in `tests/visual/catalogue-support.ts` and existing
  production-renderer/test-bridge fixtures. Reuse named scenes and standard view
  kinds. Do not add a separate renderer, fake fullscreen, fixed sleeps, duplicated
  gameplay logic, or unrelated backlog fixtures.
- `docs/development-workflow.md` is the procedure. The three commands are
  `npm run capture:visual:baseline`, `npm run test:visual:compare`, and
  `npm run test:visual:report`; they handle browser paths and ports internally.
- `docs/visual-catalogue/current/` is overwriteable development evidence, not an
  approved regression expectation or aesthetic approval. Compare before replacing
  it, preserve uncommitted owner captures, and refresh it only when the assignment
  includes catalogue/evidence updates.
- Do not overwrite the checkpoint to hide differences. A saved screenshot does not
  assert owner acceptance. Formal reference approval and mandatory CI visual
  regression are deferred (ADR 0001).
- Record added/changed scene IDs, commands, exit codes, source context, artifacts,
  and limitations in the task handoff. If captures cannot be generated, report the
  blocker; do not claim appearance was inspected. Images do not replace mechanical
  tests or brief playtesting of timing, control feel, and cooperation.

## Verification and guardrails

- Focused tests while iterating; `npm run verify:fast`, `npm run verify`, and
  `npm run test:browsers` as required by `docs/verification.md`. Run browser
  suites sequentially. CI is authoritative, not the Git hook.
- Never claim an unrun, skipped, or blocked check passed. Record tested SHA or
  exact working-tree context, environment, commands, exits, artifacts, and limits.
  Historical results do not prove a later head or rebased branch passes.
- No `any`, broad casts, unchecked non-null assertions, ignored type errors,
  ESLint disables, broad excludes, weakened/deleted tests, weakened assertions or
  coverage, or disabled checks to make work pass. Add the tests the issue lists;
  explain any narrowly scoped exception for review.
- Never silently change validation scripts, CI, guardrail configuration,
  dependencies, lockfiles, or formal regression references. Obtain specific
  approval. Development-catalogue updates follow the explicit scope above and
  must always be reported, not described as aesthetic approval.
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
- The local launcher sets a non-existent browser path. Do not edit it. The
  three visual workflow commands handle the installed browser cache. For other
  raw Playwright commands, prefix with
  `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
- Local Firefox may fail before launch with
  `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` and
  `Could not find profile folder.` Report the blocker; do not weaken the sandbox.
- Keep browser/server work bounded and on loopback. Respect sandbox restrictions;
  investigate a denied operation narrowly rather than seeking broad access.
- Do not auto-stage unrelated changes, commit, push, rewrite history, alter
  remotes, rebase, retarget, merge, deploy, or change branch protection without
  explicit authorization. Check actual branch state before repository actions.
- Final reports and PR descriptions distinguish changes, deliberate behavior changes,
  checks actually run, artifacts, pending work, and limitations. List commands run,
  results, and anything not verified in the PR description.

## GitHub state and updates

- Read issues and pull requests directly from GitHub rather than keeping local
  markdown copies. The repository is public and the sandbox allows outbound
  network, so unauthenticated API reads work, for example:
  `curl -sS https://api.github.com/repos/ratatwiskr/toybox-tanks/pulls/<n>`,
  `/issues/<n>`, or `/commits/<sha>/check-runs`. Use `git` for local history.
- Do not create `docs/handoffs/current-issue.md`, `current-pr.md` or similar
  dumps. The live GitHub state is the source of truth; local dumps go stale and
  hide which PR, base, head and CI result are current.
- `gh` is not installed and no GitHub token is available in the sandbox, so
  GitHub writes (PR title/body, comments, labels, issue updates, merges) fail.
  Do not attempt unauthenticated writes or claim a write succeeded.
- When the owner asks for a GitHub update, write the exact proposed text to a
  temporary, git-ignored file under `.tmp/github/`, for example
  `.tmp/github/pr-47.md` or `.tmp/github/issue-24.md`. Report the path and let
  the owner apply it. Keep these drafts out of commits.
- Never infer merge state from a branch name or local commit graph alone. Query
  the PR and check CI on the exact head SHA.

## Deferred work

`docs/backlog.md` lists deferred features; `docs/asset-integration-plan.md` covers
future artwork adoption. Do not start either without a separate assignment. Cork,
enemy kinds, mines, audio, and campaign rooms 1–19 are implemented scope, not
deferred migration work. Supplied artwork stays untouched; never adjust gameplay
geometry to fit it.

## Roadmap #49 decisions

Applies only to issues under [#49](https://github.com/ratatwiskr/toybox-tanks/issues/49);
see that issue for full decisions, constraints and rejected prototypes.

- Friendly fire and shell-cap / HP / cooldown tuning belong to #54; no wall-slam
  damage and no Pogo/bouncing-betty state machine until an issue adopts it.
- No progress persistence; room select stays free. Formal browser accessibility
  compliance is not a goal; readability and game feel win, and existing control
  rules still apply.
- Ideas from other agents' prototypes are not adopted unless an issue says so.
