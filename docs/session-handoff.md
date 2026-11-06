# Toybox Tanks — implementation session handoff

Prepared: 2026-11-06  
Status: planning complete; implementation not started  
Purpose: let a fresh implementation agent resume without re-investigating the repository or re-negotiating decisions.

## Read first

Use these as authority, in this order:

1. `docs/handoff.md` — the complete migration/acceptance contract.
2. `docs/kickoff.md` — owner restrictions, especially the no-install rule.
3. `docs/session-handoff.md` — this file; verified state and decisions.
4. `toybox-tanks-evergreen-kontext.md` — durable game/design context (German).
5. `reference/toybox-tanks.html` — the runnable behavioral/visual reference.
6. `package.json` / `package-lock.json` — pinned toolchain.

Do not create `docs/migration-handoff.md`. The canonical handoff is `docs/handoff.md`. The root `toybox-tanks-opencode-handoff.md` is byte-identical and remains an archive. `docs/kickoff.md` still names the old path; record that discrepancy in `docs/progress.md` rather than rewriting the owner's instructions.

## Current repository state

- Branch: `main`, clean working tree, 1 local commit ahead of `origin/main`.
- Remote: `https://github.com/ratatwiskr/toybox-tanks.git` (GitHub).
- No application source exists yet: no `src/`, `index.html`, tsconfigs, ESLint/Prettier/Vite/Vitest/Playwright configs, `AGENTS.md`, tests, or CI workflow.
- `package.json` currently has only `"prepare": "husky"`.
- `.husky/` contains only Husky's generated `_/` directory; no `pre-commit` hook.
- `reference/toybox-tanks.html` exists and is working. The required immutable copy `reference/toybox-tanks.original.html` does not exist yet.
- The `Perplexity-assets-*` directories and zips are unrelated prior asset explorations. Do not use them in this migration; keep procedural Canvas graphics and do not introduce external asset loading.
- `.tmp/pw-launch-check.mjs` is an ignored local diagnostic script, not project source.

## Verified baseline

The prototype was opened in Chromium via `file://` with Playwright.

- Title: `Toybox Tanks — tabletop co-op`
- Status text: `Built-in checks: 18/18 passed · Keyboard-first · Gamepads optional / hardware untested · No audio`
- All 18 built-in checks passed.
- No page errors or console errors.
- Initial world: room 0, mode `coop`, state `menu`, 2 players, 2 enemies.

Prototype SHA-256:

```text
99e5435b02a9185b26631c734f53d4e9d4680afca281e7bc13d901f73849b4b5  reference/toybox-tanks.html
```

Handoff SHA-256 (also identical for `toybox-tanks-opencode-handoff.md`):

```text
f112712bff7cb048df0134181bfeaaf697a64f033afaafcb7fbf459c1c03daf6  docs/handoff.md
```

Confirmed prototype defaults: logical `960×540`, fixed step `1/120`, `maxFrameTime 0.10`, `maxSteps 16`, player speed `185`, turret rotation `2.8`, shell speed `330`, cooldown `0.28`, 3 active shells, enemy interval `2.7`, 2 HP, `1.25` post-hit invulnerability, tank radius `15`, shell radius `3`, enemy shell speed factor `0.72`, enemy turn speed `1.9`, telegraph `0.50`. Maps: First Bounce (2 sentries), Block Party (3), Together Through (4).

The prototype exposes `window.ToyboxTanks` for inspection/automation. Do not treat that as the production test bridge. The test bridge must exist only in the designated test build.

## Toolchain findings

Installed and compatible:

- Node `24.22.2`, npm `11.19.1`.
- TypeScript `6.0.3`.
- ESLint `10.14.0`, `@eslint/js` `10.0.1`, `typescript-eslint` `8.72.1`, `globals` `17.14.0`.
- typescript-eslint 8.72.1 peer supports ESLint `^10` and TypeScript `<6.1`, so the installed pair is valid.
- Vite `8.3.5` (uses Rolldown), `vite-plugin-singlefile` `2.3.4`; the plugin explicitly supports Vite 8/Rolldown. Rollup is not installed and is not required at runtime by this plugin.
- Vitest `5.1.0`, `@vitest/coverage-v8` `5.1.0`, `@types/node` `26.6.6`.
- Playwright `1.64.1`; Chromium `156.0.8078.4` and WebKit `27.2` launch successfully.
- Prettier `3.9.10`, `eslint-config-prettier` `10.1.8`, Husky `9.1.7`, lint-staged `17.6.0`.
- `package-lock.json` is lockfileVersion 3 and pins the direct dev dependencies exactly.
- No dependency install/upgrade is required to begin implementation.

### Browser path mismatch

`_start_opencode_with_nono.sh` sets:

```bash
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/toybox-tanks-playwright"
```

That directory does not exist. The installed browsers are under `$HOME/.cache/ms-playwright`. Per the owner's decision, do not modify the launcher. Use an environment override for local Playwright commands:

```bash
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" <command>
```

Document this in `README.md` and `AGENTS.md` when those files are created.

### Firefox local blocker

Firefox fails locally before page launch:

```text
Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM
Could not find profile folder.
```

This is a nono process-isolation limitation, not a missing binary. Chromium and WebKit work. Do not claim Firefox passed locally. Escalate the exact failure to the owner if a required gate needs local Firefox; otherwise verify Firefox in CI or after the owner adjusts the sandbox/profile. Do not weaken sandbox settings to force it.

## Decisions made with the owner

1. **Canonical handoff:** keep `docs/handoff.md`; do not create `docs/migration-handoff.md`.
2. **No installs by the agent:** do not run `npm install`/`npm ci`, change the lockfile, download browsers, or install OS packages. Use the existing `node_modules`. If a clean-install gate is required, the owner runs it.
3. **Stage gates:** implement in stages A–E, stop after each gate, and report exact commands/results before continuing.
4. **Launcher unchanged:** keep `_start_opencode_with_nono.sh` as-is; use `PLAYWRIGHT_BROWSERS_PATH` overrides.
5. **Firefox failures are escalated:** report the exact failure for owner-side sandbox repair rather than bypassing it.
6. **No commits or pushes** unless explicitly authorized. Do not alter remote settings or branch protection.
7. **Visual baselines require human/vision approval.** Generate candidates only; do not call them approved.
8. **Preserve behavior and presentation.** No gameplay retuning, no deferred backlog features, no framework/engine replacement.

## Owner-run install commands

These are for the owner to execute if a clean baseline is desired. The agent must not run them.

```bash
cd /home/toast/dev/toybox-tanks
npm ci
```

Verify the lockfile/package files did not change:

```bash
git status --short
```

The `prepare` script runs Husky. If `npm ci` fails, preserve the exact error and report it; do not work around it by editing the lockfile.

Optional browser launch check using the existing browser cache:

```bash
cd /home/toast/dev/toybox-tanks
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" node .tmp/pw-launch-check.mjs
```

Expected: Chromium OK, WebKit OK, Firefox `unshare(CLONE_NEWPID): EPERM`.

## Stage plan and gates

### Gate A — baseline and project memory

First executable gate. Do not start the application rewrite before this is done.

- Copy `reference/toybox-tanks.html` byte-for-byte to `reference/toybox-tanks.original.html`; never reformat or use it as runtime.
- Record the SHA-256 above in `docs/baseline.md`.
- Reproduce/play the prototype once in Chromium; record 18/18 checks, menu state, console/page errors, and limitations.
- Create `docs/baseline.md` with commands, hash, behavior, config, maps, and environment notes.
- Create `docs/progress.md` with current stage, changed files, commands/exit statuses, known blockers, next action.
- Create `docs/backlog.md` with the deferred features from handoff section 1.
- Create root `AGENTS.md` from handoff section 15, adapted to the actual repository and decisions here.
- Add a short task checklist; identify Gate B as the next gate.
- Stop and report.

Gate criteria: baseline is reproducible; original is intact; current gameplay is understood; no application source has been changed.

### Gate B — toolchain, guardrails, and minimal skeleton

- Add `index.html`, `src/main.ts`, `src/styles.css`, and the minimal playable/bootstrap skeleton.
- Add strict tsconfigs, including a DOM-free simulation check with `types: []` and no ambient Node/Vite types.
- Add flat ESLint config with separate environments for browser code, DOM-free simulation, Node tooling, unit tests, and Playwright tests.
- Add Prettier, Vite, Vitest, Playwright, coverage, Husky/lint-staged, and the full npm script contract from handoff section 7.
- Add positive and negative architecture/config fixtures proving prohibited imports, globals, unsafe types, and unhandled union variants fail for the right rule identity.
- Add a real browser-rendering smoke check.
- Add GitHub Actions workflow if appropriate for the existing remote; do not push or claim it ran.
- Stop and report.

Gate criteria: real typecheck/lint/format/unit/build commands execute; intentional violations fail for the right reason; no empty green suites; the app is not permanently excluded.

### Gate C — behavior-preserving simulation extraction

- Extract config, maps, validation, types, collision, combat, enemies, and simulation.
- Port all 18 prototype self-checks into named unit tests; add the handoff's minimum cases (24 total minimum).
- Cover maps/validation, reflection, swept collision, remaining travel, second bounce, corners, friendly-fire rules, invulnerability, shell caps/cooldowns, tank-wall collision, muzzle sweep, sentry LOS/telegraph/cancel, survivor clear, same-tick defeat priority, terminal freeze/clear, solo, completion/replay, reset equivalence, determinism, and renderer non-mutation.
- Keep maps as editable text grids with metadata and shared loading/validation.
- Add coverage with explicit includes and floors: 85% statements/lines/functions and 80% branches for selected simulation/map code. Do not lower to get green.
- Keep the game playable throughout; no gameplay retuning hidden in the refactor.
- Stop and report.

### Gate D — adapters, rendering, UI, runtime, automation, releases

- Extract keyboard/gamepad adapters, procedural Canvas rendering, UI, and runtime composition.
- Preserve focus loss/tab-hide pause and held-input clearing; preserve keyboard activation of overlay buttons.
- Add the typed test-only bridge (`window.__TOYBOX_TEST__` or documented equivalent) in a test build only.
- Ensure one simulation time owner in test mode: manual ticks only; no concurrent RAF simulation; RAF may render.
- Add real keyboard tests, a real-time RAF test, pause/focus/visibility tests, overlays, room transitions, solo/co-op, invalid-map UI, DPR/aspect tests, synthetic gamepad tests, and renderer non-mutation.
- Build hosted production and standalone single-file releases into separate output directories. Prove the test bridge is absent at runtime in both, including with a test-looking query string.
- Verify release flows in Chromium/WebKit locally. Escalate Firefox.
- Generate candidate visual screenshots; request approval; do not auto-accept baselines.
- Stop and report.

### Gate E — harden and deliver

- Run the full local verification, record exact commands/exit statuses/results.
- Inspect architecture boundaries, unused scaffolding, accidental exclusions, runtime dependencies, hooks, coverage includes, and fixture isolation.
- Confirm Husky behavior in an isolated temporary Git fixture; do not rewrite real history or manufacture commits.
- Document setup, commands, map/config editing, release generation, tests, browser limitations, and physical-controller limitations.
- Provide the final report required by handoff section 16, including pending approvals and blockers.
- Stop and report.

## Immediate next actions for a fresh session

1. Read `docs/handoff.md`, `docs/kickoff.md`, and this file.
2. Check `git status --short` and preserve any user changes.
3. Start Gate A only.
4. Create `reference/toybox-tanks.original.html` as an exact copy and verify its hash.
5. Run the prototype baseline in Chromium with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
6. Write `docs/baseline.md`, `docs/progress.md`, `docs/backlog.md`, and `AGENTS.md`.
7. Report Gate A results and wait for approval before Gate B.

## Do not

- Do not install/update packages or change the lockfile.
- Do not download browsers.
- Do not modify `_start_opencode_with_nono.sh` or sandbox profiles.
- Do not rewrite `docs/kickoff.md` or `docs/handoff.md`.
- Do not add React/Angular/Phaser/Godot/ECS/networking/procedural generation or deferred features.
- Do not use the Perplexity asset kits or external asset loading.
- Do not commit, push, alter remote settings, or enable branch protection.
- Do not auto-approve visual baselines.
- Do not report skipped/blocked tests as passed.

## Suggested skills

- `nono-sandbox` — invoke for any real Landlock/Seatbelt/EPERM permission failure. Use diagnostics; never weaken the sandbox. Note that some earlier nono denial text in this session was a false positive triggered by scanning tool output containing `EPERM`/`Landlock`; verify with `nono why` before escalating.
- `opencode` — invoke for questions about OpenCode configuration, plugins, agents, or tooling.
- `handoff` — invoke if the session ends before migration completion, to produce a new handoff.
- `improve-codebase-architecture` — only after the migration is complete and its architecture docs exist; not needed for Gate A–D.

## Fresh-session prompt

Copy/paste this to start the next session:

> Read `docs/handoff.md`, `docs/kickoff.md`, and `docs/session-handoff.md` completely. We are at Gate A. Follow the recorded decisions: no package installs, no launcher changes, no commits, stage gates with reports. Preserve the prototype and begin with the Stage A baseline. Do not start Gate B until Gate A is reported.
