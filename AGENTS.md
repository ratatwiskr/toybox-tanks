# Toybox Tanks — agent instructions

## Mission

Maintain a small browser-based couch-co-op tank game. Preserve reliable controls,
readable one-bounce combat, original toy-like presentation, and forgiving local
cooperation. Prefer a finished small game over speculative infrastructure.

The current assignment is a behavior-preserving migration of the supplied HTML
prototype to TypeScript with verified build/test guardrails. See `docs/handoff.md`
(the canonical migration contract) and `docs/progress.md` for the active stage.
Do not implement backlog features from `docs/backlog.md` without a separate task.

## Current repository stage

At the time of writing, the repository is at **Gate D (adapters, full rendering parity,
UI/runtime, test bridge, and releases — complete and committed locally; push pending)**.
Gates A, B, and C are committed as `25296e7`, `1c12fcf`, and `891fee4`; Gate D is `2cfbba8`
and the Gate E handoff/asset plan is `7f3b448`. Both local commits are **not pushed**:
`origin/main` is still at `891fee4`, and nono has no GitHub credential helper or readable
SSH key, so the owner must push from a host terminal. The simulation
matches the prototype's gameplay rules (sentry AI, one-bounce shells with remaining travel,
corners, muzzle sweeping, damage/invulnerability, effects/events, shell caps/cooldowns, and
terminal outcomes), and Gate D adds the gamepad adapter, aim/bounce/effect rendering, the
typed test-only bridge, deterministic manual ticks, and release proof that the bridge is
absent. The suite has 78 unit/architecture tests plus Chromium and WebKit browser coverage.
The visual regression gate is still **pending human approval**: `test:visual` captures nine
unapproved candidates only. Firefox is blocked locally by the nono sandbox and is exercised
in CI instead. Gate E (harden and deliver) is next and is blocked on human decisions; follow
`docs/gate-e-handoff.md`. Read `docs/progress.md` for the authoritative checkpoint and
`docs/verification.md` for exact checks.

Drafted high-fidelity art is committed at the repository root under
`Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte/` (and its
`+handoff` twin). **None of it is integrated.** Adopting it is a separate, presentation-only
task described in `docs/asset-integration-plan.md`; it requires the phase 0 decisions and
human visual approval. Never change simulation, collision, controls, world size, or release
behavior to fit the art.

Always check `docs/progress.md` before assuming the stage; it is the authoritative
checkpoint.

## Read before editing

- Read this file and any more-specific `AGENTS.md` affecting files you will change.
- Read `docs/handoff.md`, `docs/session-handoff.md`, `docs/baseline.md`,
  `docs/progress.md`, `docs/gate-e-handoff.md`, and `docs/backlog.md`. Read
  `docs/architecture.md`, `docs/asset-integration-plan.md`, and relevant tests once they
  exist.
- Inspect the actual repository and existing user changes; do not overwrite them.
- `reference/toybox-tanks.original.html` is the immutable behavioral/visual reference.
  Do not edit, reformat, overwrite, or use it as runtime. `reference/toybox-tanks.html`
  is the same supplied prototype and must also be preserved.
- Do not create `docs/migration-handoff.md`; the canonical handoff is `docs/handoff.md`.
  `toybox-tanks-opencode-handoff.md` is a byte-identical archive.
- Make the smallest coherent change for the current stage. Update `docs/progress.md`.

## Product invariants

- Local two-player co-op is primary; solo creates exactly one real player.
- Free 2D movement; independently aimed turret; aim persists after release.
- Player shells hit enemies only; enemy shells hit players only; no shell-shell hits.
- One wall bounce; second contact removes the shell. Use swept collision, earliest
  impact, remaining travel, surface separation, and bounded processing.
- Walls block tanks; tanks do not block or push tanks.
- Three active player shells and two HP per room by default; preserve config.
- Temporary post-hit invulnerability has clear feedback. Preserve the prototype's
  observable contact-consumption behavior for invulnerable tanks.
- Disabled players remain visible; one survivor can clear; next room restores both.
- Same-tick defeat precedes victory. Commit outcome once and clear combat shells.
- Restart resets all simulation and input-adapter state.
- Preserve the three original maps and the full menu/pause/retry/clear/replay loop.
- Keep fixed logical coordinates, aspect ratio, DPR-aware rendering, and readability.
- Preserve keyboard activation of overlay buttons while preventing game-key defaults.

## Architecture

- `sim/` is DOM/Node-free gameplay code with explicit state, commands, and time.
- No real-time reads, global randomness, device polling, drawing, or scheduling inside
  simulation. Inject seeded randomness only if gameplay needs it.
- Input produces commands; renderer reads state; app/runtime owns orchestration.
- Rendering does not mutate gameplay. No alternate combat rules in UI or tests.
- Keep maps/settings data-driven and validated. Reject invalid startup maps safely.
- Small modules/plain data/functions; no ECS, DI framework, engine rewrite, networking,
  generic plugin architecture, or speculative systems.

## Verification commands

The command names below are the required script contract from `docs/handoff.md`
section 7. They are wired and exercised in Gate B. Do not claim a command passed until
it has actually been run in the current state.

- `npm run verify:fast` — formatting, lint, typecheck, unit/architecture checks.
- `npm run verify` — complete local gate including coverage, browser/visual, and
  release checks; consult `package.json` for the exact composition.
- `npm run test:browsers` — hosted Chromium/Firefox/WebKit smoke matrix.
- `npm run dev` — development server on loopback.
- Use focused tests while iterating; run the required complete gates before claiming
  completion. CI is authoritative, not the local Git hook.

Environment specifics:

- Node `24.22.2`, npm `11.19.1`, pinned via Volta; one npm lockfile.
- Do **not** run `npm install`, `npm ci`, package updates, browser downloads, or OS
  package installs. Dependencies and Playwright browsers are owner-installed.
- `_start_opencode_with_nono.sh` sets a non-existent `PLAYWRIGHT_BROWSERS_PATH`; do not
  modify the launcher. Prefix local Playwright commands with
  `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
- Firefox currently fails locally before page launch with
  `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
  `Could not find profile folder.` Report that exact blocker; do not weaken the sandbox.
- Do not commit, push, alter remotes, or change branch protection unless explicitly
  authorized.

## Guardrails are requirements

- No `any`, broad casts, unchecked non-null assertions, ignored type errors, ESLint
  disables, broad excludes, weakened assertions/coverage, or disabled checks to make a
  task pass. A reviewed, narrowly scoped exception is different.
- Never silently alter validation scripts, CI, guardrail config, or screenshot
  baselines. Explain and obtain approval when a policy change is needed.
- Do not auto-accept visual snapshots. First baselines require human/vision review.
  An implementing model that cannot see images must not approve aesthetics.
- Do not add runtime/development packages without a concrete need; preserve the one npm
  lockfile and compatible pinned versions.
- Do not auto-stage unrelated changes, rewrite history, commit, or push unless
  explicitly authorized by user/repository policy.

## Test discipline

- Prefer discrete invariants and geometric tolerances over fragile long float
  snapshots. Tests fail on no tests and produce meaningful failures.
- Deterministic browser hooks exist only in test builds; production must not expose
  them, even with a test-looking URL parameter.
- In test mode, manual ticks are the sole simulation clock. Also test real keyboard
  input and ordinary real-time RAF scheduling.
- A Canvas tank is not a DOM node. Use structured state/events for mechanics,
  screenshots for visual evidence, and human/vision review for aesthetics.
- Mocked gamepads do not prove physical controller compatibility. Automated WebKit does
  not prove physical Safari/iOS/device support.

## Environment and reporting

- Respect sandbox restrictions. A harness denial notice may be a false positive; verify
  with `nono why --self --path <path> --op <read|write>` before escalating. Never weaken
  security or request broad access when a narrow missing permission can be identified.
- Keep browser/server setup bounded, local, and reproducible; use loopback.
- Record exact commands, exit status, remaining failures, and next task in
  `docs/progress.md`. Never report an unavailable/skipped test as passed.
- Final report: changes, behavior parity, justified fixes, checks actually run,
  artifacts, blockers, pending visual approval, and known limitations.

## Deferred scope

Moving AI, fading tracks, rockets, contact/remote mines, cork destruction, audio, and
new rooms are backlog, not permission to expand this migration. Preserve clear
cooperative play and existing bank shots when implementing future tasks.
