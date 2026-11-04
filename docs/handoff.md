# Toybox Tanks — OpenCode project-bootstrap and TypeScript migration handoff

Prepared: 2026-11-03  
Status: implementation instructions, not an already-created project  
Input: this document plus the user's runnable, self-contained HTML prototype

## 0. Start here: your assignment

You are the implementation agent. Create a maintainable, lightweight TypeScript browser-game project from the attached Toybox Tanks HTML prototype. Set up working build, formatting, lint, architecture, unit-test, browser-test, hook, and CI checks. Refactor the actual game into small modules while preserving its behavior, authored maps, presentation, and full two-player loop.

Do the work, run the checks, repair failures, and deliver the working repository. Do not substitute a roadmap, starter template, empty scaffolding, or a new game. Work in the stages below and leave concise checkpoint notes so another agent can resume.

The prototype is the behavioral and visual reference, not code to discard and recreate approximately. This handoff is the target architecture and acceptance contract. If a genuine prototype defect conflicts with the original gameplay rules, document it, add a reproducing test, and make the smallest justified fix. Do not silently change game feel while migrating.

### Inputs and authority

1. Locate the user-supplied HTML. Do not assume a file from a previous chat exists locally.
2. If it is absent or unreadable, ask for that input; do not reconstruct it from this description.
3. Inspect the existing repository before creating files. Preserve unrelated work and existing user changes.
4. Copy the source unchanged into `reference/toybox-tanks.original.html`; record its SHA-256 in the baseline report. Do not overwrite this copy, reformat it, or use it as the project's runtime.
5. Read this handoff completely. Preserve it as `docs/migration-handoff.md` (or retain the existing identical copy there). Write a short task checklist and identify the first executable verification gate.
6. Create the root `AGENTS.md` using section 15, adapting factual paths/scripts after implementation, not weakening policy.
7. Choose compatible stable dependency versions at implementation time. Verify installed-package documentation and peer requirements; do not guess a version matrix from this document's date.
8. This work authorizes the initial installation/configuration of the listed guardrails and recording a reviewed baseline. It does not authorize silently removing or relaxing them later to get a green run.

## 1. Product philosophy and scope boundaries

Toybox Tanks is a small, playful, readable, single-screen couch-co-op game. Its inspirations are compact toy-tank arenas and accessible cooperative play; all assets, sounds, names, and maps must remain original.

Priority order:

1. Comfortable, reliable two-player local play.
2. Understandable projectiles, cover, and one-bounce bank shots.
3. Correct, forgiving room progression and retry.
4. Clear toy-like visuals at different display sizes.
5. Small, testable systems and easy-to-edit maps/settings.
6. Additional content only after the existing experience remains verified.

Browser delivery is the chosen target. Do not migrate to Godot, Angular, React, Phaser, or another engine/framework for this assignment. Desktop keyboard play is mandatory. Preserve optional two-gamepad support, but distinguish synthetic-input tests from real-controller testing. Do not claim universal device support.

### Explicitly deferred features

Capture these in a short `docs/backlog.md`, not in the migration implementation:

- Moving/tactical enemies beyond the prototype's stationary sentries.
- Temporary tank tracks, sampled by movement distance and faded over time.
- Faster, non-ricocheting rockets.
- Contact-triggered and remotely detonated mines.
- Destructible cork-like block materials.
- Audio and additional rooms.

Likely future design direction: preserve ordinary ricocheting shells; readable enemy states; distinguish material appearance and collision behavior; one authoritative terrain update for movement, projectiles, line of sight, and navigation; no friendly fire across new weapons; bounded explosions/chain reactions. These are planning notes, not implemented or fully finalized rules.

Do not add speculative weapon registries, empty subclasses, navigation services, ECS, networking, procedural generation, progression, inventories, a map editor, or a general-purpose engine in preparation for those features.

## 2. Behavior to preserve

Verify exact defaults against the supplied source. Preserve values during the port rather than retuning them.

### Players and combat

- Shared single-screen arena. Two real player entities in co-op; exactly one in solo.
- Free 2D movement, not realistic tank steering. Normalize diagonal movement.
- Turret rotation independent of movement; retain aim when input is released.
- Keyboard P1: WASD movement, Q/E turret, F fire.
- Keyboard P2: arrows movement, comma/period turret, Enter fire.
- Escape pauses/resumes; R retries after defeat; preserve the debug shortcut/button.
- Player shells hit enemies, never either player. Enemy shells hit players, never enemies.
- Shells do not collide with shells.
- One wall bounce. Next wall contact removes the shell.
- A damaging tank impact consumes the shell. Inspect and preserve the prototype's behavior when an invulnerable tank is contacted.
- Three active shells per player by default; fire cooldown and active count are separate constraints.
- Two health points per player per room, temporary post-hit invulnerability, visible hit feedback.
- Tanks collide with walls but do not block or push other tanks.
- Disabled players remain visibly disabled until room completion.
- Clearing restores both players in the next room; a single survivor can finish.
- If both active players are disabled, defeat. In solo, do not count a nonexistent second player.
- Defeat takes priority over victory in the same simulation tick.
- Commit room outcome once, stop combat, and clear remaining shells.
- Preserve pause, restart, next-room, defeat/retry, completion/replay, menu, and useful map-error UI.
- Restart resets entities, timers, projectiles, effects, held keys, device-neutral gates, and outcome state.

### Enemies and maps

- Stationary sentries track visible living players, rotate gradually, telegraph, and fire with a clear line of sight.
- Preserve targeting, turn rate, cooldown, charge cancellation, and enemy projectile behavior from the source.
- No predictive bank-shot targeting and no shots passing through walls.
- Three original rooms, same loader and simulation code:
  - First Bounce: two enemies.
  - Block Party: three enemies.
  - Together Through: four enemies.
- Keep the original editable text grids and small metadata objects.
- Validate dimensions, allowed symbols, border/spawn requirements, enemy metadata, and existing reachability checks.
- Invalid authored maps at initial startup, not only during later room loading, must show useful errors rather than crash rendering.

### Timing, collision, and display

- Keep fixed-step simulation separate from requestAnimationFrame rendering. Preserve the prototype's logical dimensions, timestep, and gameplay defaults; inspect the actual values.
- Clamp accumulated time after long stalls; bound catch-up work.
- Pause and clear held input on focus loss/tab hiding.
- Prevent game-key browser defaults while the application has the relevant focus, without breaking overlay-button keyboard activation.
- Preserve circle-based tank collision and wall sliding unless a verified defect demands a narrow fix.
- Sweep the whole projectile movement segment. Do not replace collision with final-position overlap checks.
- Select earliest impact; use the surface normal; consume remaining travel after reflection; separate from the surface by a small epsilon; bound iterations; remove ambiguous unsafe contacts.
- Preserve the source's conservative corner policy. Do not silently substitute a new physics algorithm just to simplify types.
- Sweep muzzle travel too; do not spawn a projectile beyond a nearby wall.
- No extra visible gameplay area on wider displays. Preserve aspect ratio, letterboxing, DPR-aware backing size, vector rendering, and fixed logical simulation coordinates.
- Retain warm tabletop appearance, wooden blocks, distinct blue/orange players, enemy silhouettes, turret direction cues, HUD, toy-like effects, and aim/bounce guides.

## 3. Lightweight toolchain

Use npm and commit one `package-lock.json`. Avoid multiple package managers/lockfiles. Pin direct dependency versions and record a supported Node LTS/runtime requirement. If the repository already has a compatible runtime pin, retain it. The user may run OpenCode under nono on Linux; inspect actual capabilities rather than assuming blanket permissions.

Expected development dependencies (use only compatible versions):

- TypeScript.
- Vite.
- Vitest and matching `@vitest/coverage-v8` if coverage is enabled as required below.
- `@playwright/test`.
- ESLint, `@eslint/js`, `typescript-eslint`, and `globals` if needed by the config.
- Prettier and `eslint-config-prettier` to avoid formatting-rule conflicts.
- Husky and lint-staged.
- A small, maintained single-file bundling solution, preferably a compatible `vite-plugin-singlefile`, after checking compatibility and the produced artifact.
- `@types/node` for tooling/tests where needed, not as ambient globals for simulation.

No runtime library is necessary for the current game. Development dependencies do not violate a dependency-free playable release.

Use flat ESLint configuration, not `.eslintrc`. Separate config environments for browser code, DOM-free simulation, Node tooling, unit tests, and Playwright tests. Avoid global lint/parser exceptions that hide missing project membership.

Vite transpilation is not the typecheck gate. Run a separate TypeScript check.

Do not add a dependency merely because it was mentioned in earlier discussion: no Cypress alongside Playwright, no second formatter, no additional test runner, no Nx, no Sheriff unless a concrete unmet boundary requirement has been demonstrated and approved.

## 4. Suggested project shape and dependency direction

This is a starting structure, not a requirement to create dozens of tiny files. Adapt sensibly and document departures.

```text
AGENTS.md
README.md
package.json
package-lock.json
index.html
eslint.config.mjs
.prettierignore
.prettierrc.json
tsconfig.json
# Additional focused tsconfigs as required for sim/browser/tooling tests
vite.config.ts
vitest.config.ts
playwright.config.ts
.husky/pre-commit
.github/workflows/verify.yml       # if this is / will be a GitHub repository
reference/toybox-tanks.original.html
docs/
  baseline.md
  progress.md
  architecture.md
  verification.md
  backlog.md
src/
  main.ts                         # composition/bootstrap
  styles.css
  config.ts                       # immutable, validated gameplay defaults
  sim/
    types.ts
    world.ts
    collision.ts
    combat.ts
    enemies.ts
    maps.ts
    simulation.ts
  input/
    keyboard.ts
    gamepads.ts
  render/
    renderer.ts                   # procedural Canvas drawing
    # split further only when it improves comprehension
  ui/
    ui.ts
  app/
    runtime.ts                    # RAF, pause/focus, resize, orchestration
    test-bridge.ts                # test build only
  shared/
    # only genuinely environment-neutral primitives needed by both sides
    # do not create this directory until it is needed
tests/
  unit/
  architecture/
  e2e/
  visual/
  fixtures/
```

Dependencies:

- `sim/` may depend on itself, environment-neutral configuration, and narrowly justified shared primitives.
- `sim/` must not import `input/`, `render/`, `ui/`, `app/`, browser APIs, or Node APIs.
- Input adapters produce commands; they do not mutate tanks or fire projectiles directly.
- Rendering consumes state and renders it; it must not advance or mutate combat.
- UI invokes application actions; it does not own alternate combat/progression logic.
- The application layer composes adapters and the simulation and owns scheduling/focus.
- Keep shared code small; do not create a `utils` escape hatch for prohibited dependencies.

A dedicated sim TypeScript check must have no DOM libs and no ambient Node types (explicit `types: []`, suitable ECMAScript libs, and no inherited Vite ambient types). Verify that accidental browser or Node globals actually fail. Ensure the import-boundary checks also reject paths reached through aliases, relative imports, and re-exports; do not assume a naive glob catches all spellings.

Use standard `no-restricted-imports`/restricted globals/properties or a focused architecture test where sufficient. Start with existing tooling rather than a custom ESLint plugin. Keep rule assertions separate enough that the architecture tests can validate the actual enforcement mechanism, not merely a duplicate rule list.

## 5. TypeScript and lint policy

### Compiler

Enable at least:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true,
  "noImplicitOverride": true,
  "noFallthroughCasesInSwitch": true,
  "forceConsistentCasingInFileNames": true
}
```

Use an appropriate current module/bundler configuration, type-only import settings where useful, and `noEmit` checks. Include browser source, simulation, tests, and tooling in suitable checks; do not accidentally omit the hard-to-type files. Make ESLint project-service discovery and the tsconfig structure work together. Do not solve coverage gaps by allowing a broad fallback project for the whole repository.

### ESLint

Start with `@eslint/js` recommended plus `typescript-eslint` `strictTypeChecked`. Configure type information with the supported `projectService` setup. Put justified environment-specific differences in narrow config blocks.

Explicitly ensure coverage of:

- Unsafe `any` operations and explicit `any`.
- Unhandled promises and misused promises.
- Exhaustive discriminated-union switches where relevant.
- Unnecessary assertions/non-null assertions and dangerous suppression comments.
- Unused imports/variables using one authoritative TypeScript-aware rule.
- Type-only imports where configured.
- Static dependency boundaries.
- Simulation-only restrictions on wall-clock APIs, ambient randomness, browser/Node APIs, and scheduling.

Named restrictions to consider in `sim/`: `Math.random`, `Date`, `performance`, `setTimeout`, `setInterval`, `requestAnimationFrame`, and browser-global access. Restrict aliased/qualified escape routes or document the limits of the rule and add an appropriate test. Not every restriction is a security boundary.

Set lint failures to errors and run with `--max-warnings 0`. Prevent inline ESLint rule disabling in tracked application/test files; any exception must be narrow, documented, and approved in config. Do not hide type problems with `@ts-ignore`, `@ts-nocheck`, blanket `as` casts, or `any`. A deliberate `@ts-expect-error` in a dedicated type-regression fixture is acceptable when required by the negative-test design and explicitly scoped; ordinary source suppression requires approval.

Do not require clever type-level programming, excessive documentation comments, arbitrary line-count limits, or dozens of opinionated style plugins. Prefer clear plain data, discriminated unions where states benefit, and small functions.

Formatting is Prettier's job. CI checks formatting without rewriting files. Explicit fix commands may rewrite locally; the authoritative verify command must not silently mutate files.

## 6. Simulation and determinism contract

- Simulation owns gameplay state and advances by an explicit fixed timestep.
- Do not read real time, poll devices, draw, access the DOM, or schedule callbacks inside simulation.
- Timers and IDs derive from world/tick state, not timestamps or module-global counters that survive reset.
- If simulation randomness is actually needed, inject a seeded generator and store/reset its state; do not introduce randomness merely to justify infrastructure.
- Separate simulation determinism from cosmetic rendering noise and real-browser timing. Do not claim bitwise cross-platform floating-point determinism.
- Given the same initial fixture, seed if applicable, and command/tick sequence in the supported runtime, gameplay snapshots must agree under the project's explicit comparison policy.
- Use exact assertions for discrete state and tolerances/invariants for geometry. Avoid fragile long-sequence float snapshots as the primary physics tests.
- Preserve bounded loops for collision and any future area effects.
- Expose serializable, stable snapshots with deterministic entity ordering, stable IDs, state, room, ticks/time, HP, positions, aim, shell state, and recent event data. Do not serialize cyclic renderer or DOM objects.
- A renderer call must not mutate gameplay state. Test before/after state, not just a shallow readonly annotation. Use deeply readonly views where practical without overcomplicating hot code; do not deep-freeze every production frame as a workaround.
- Reset input-adapter state as well as simulation state on restart and focus changes.

## 7. Script contract

Implement these npm scripts with actual working commands. Script names are an interface for agents. Use non-watch modes in verification.

| Script | Responsibility |
|---|---|
| `dev` | Local dev server on loopback, documented URL |
| `typecheck` | All intended TypeScript targets, including the DOM-free sim check |
| `lint` | Whole maintained source/config/test tree, no warnings |
| `lint:fix` | Explicit local fixes only |
| `format` | Explicit local Prettier write |
| `format:check` | Non-mutating formatting check |
| `test:unit` | Non-watch simulation/validation/architecture tests; fail on no tests |
| `test:coverage` | Unit coverage with explicit include/exclude and thresholds |
| `test:e2e` | Chromium browser integration suite against current test build |
| `test:visual` | Controlled visual-regression suite with reviewed baselines |
| `test:browsers` | Meaningful Chromium/Firefox/WebKit smoke suite against hosted build |
| `build` | Production hosted release, no test bridge |
| `build:single` | Self-contained production HTML, no test bridge |
| `test:release` | Build/verify current hosted and file:// single-file releases |
| `verify:fast` | Formatting, lint, typecheck, unit tests |
| `verify` | Fast gate + coverage + E2E + approved visual checks + release checks |

`verify` may call overlapping checks only once internally; avoid rerunning the same whole suite unnecessarily. Keep the full browser matrix separate for iteration speed, but require it in CI before migration completion. Never append `|| true`, enable pass-with-no-tests, disable all failures, or make missing browser binaries count as a pass.

No recursive script cycles (`verify` → `test:e2e` → `verify`). Avoid parallel processes writing to the same `dist` directory. Use distinct build/test output directories and reliable server readiness/cleanup. Any cross-platform orchestration script must be simple, terminate on failure, and preserve nonzero exit codes. Do not assume Bash-only commands in npm scripts if avoidable.

## 8. Unit, architecture, and coverage requirements

Port all existing embedded gameplay self-checks into named unit tests. Do not count printed startup messages as test execution. Compare the actual source's checks with this list.

Minimum cases:

1. All three maps validate with correct enemy counts and separate world instances.
2. Invalid dimensions, symbols, borders, spawns, disconnected areas, and enemy metadata reject usefully.
3. Flat-wall reflection flips normal velocity and preserves tangential velocity.
4. Sweeping catches a thin wall crossed in a single step.
5. Remaining movement is consumed after first bounce.
6. Second wall contact removes the shell.
7. Exact/near corners terminate safely and do not loop indefinitely.
8. Player shells ignore both players and can damage enemies.
9. Enemy shells ignore enemies and can damage players.
10. Post-hit invulnerability and contact-consumption semantics match baseline.
11. Per-player active-shell caps and cooldowns are independent.
12. Tank-wall collision blocks penetration; tanks do not block each other.
13. Muzzle travel cannot create a projectile beyond cover.
14. Sentries do not fire through cover, telegraph before firing, cancel appropriately, and use living targets.
15. A surviving player can clear a room; disabled players remain disabled until transition.
16. A same-tick final enemy/player kill commits defeat before victory. Include an actual simultaneous-hit fixture, not only manually setting all entities dead.
17. Terminal outcomes clear shells and freeze combat; outcome commits at most once.
18. Solo has exactly one player and correct defeat evaluation.
19. Third-room victory yields completion; replay starts room one.
20. Restart equivalence: a used/dirty world reset matches a fresh equivalent world for all relevant state, not just HP. No entity/timer/ID/effect/seed leaks.
21. Repeated command sequences produce equivalent gameplay state under the supported determinism contract.
22. Rendering does not mutate gameplay state (browser test acceptable for Canvas dependency).
23. Frame-stall clamp and bounded catch-up do not fast-forward huge accumulated time.
24. Dedicated architecture/config fixtures fail for prohibited imports, globals, unsafe types, and an unhandled state variant.

For architecture/config negative tests, use isolated fixture files/projects that are not accidentally compiled as normal app source. Assert the expected rule/error identity, not merely any nonzero result. Restore temporary modifications with `finally` cleanup. Include a positive fixture so the harness cannot pass by rejecting everything. Do not permanently poison the main project to test a guardrail.

Use coverage with explicit source includes so untouched simulation files cannot disappear from the denominator. Proposed initial aggregate floor for the explicitly selected simulation/map-validation code: 85% statements/lines/functions and 80% branches. Critical collision/outcome edge cases must still have named tests regardless of percentage. These are project policy targets, not proof of correctness. Do not lower thresholds or exclude hard branches to make the migration pass; report a blocker if a legitimate issue needs a decision. Do not impose the same numerical coverage floor on procedural drawing.

Unit suites and browser suites must have disjoint discovery patterns. Unit tests should not accidentally import Playwright specs, and vice versa.

## 9. Browser automation and test bridge

Playwright is the browser tool; do not add Cypress too. Use a dev/test build for deterministic hooks and real production builds for release checks.

### Test-only interface

Implement a small typed interface, for example `window.__TOYBOX_TEST__`, present only in a clearly designated test build. Suggested methods:

- `loadScenario(name, options)` — curated fixtures, validated input.
- `advanceTicks(count, commands)` — bounded synchronous simulation advancement.
- `snapshot()` — stable serializable gameplay state.
- `events()` — significant recent events.
- `render()` — present the current frozen state without simulation advancement.

Choose final names/types and document them. Do not expose arbitrary eval, filesystem access, or a broad private-object mutation escape hatch. Test hooks are not normal game UI.

Test mode MUST have one simulation time owner. Disable automatic RAF-driven simulation advancement while tests explicitly advance ticks. RAF may still render. Prevent real-time and manual stepping from running concurrently. Support keyboard tests by sampling the real input adapter during explicit steps; prove actual key events reach that adapter. Clear test-mode scheduling/input state between scenarios.

Gate the bridge using a dedicated build mode/compile-time condition; release builds must not install it. A `?test=1` query parameter alone must not unlock hooks in the production release. Build tests and production into separate directories so stale artifacts cannot be confused. Verify bridge absence in both production artifacts at runtime, not only with a source-string search.

### Required browser coverage

- Startup and all embedded/replacement checks; no uncaught page errors or unexpected console errors.
- Real Start co-op button creates two players.
- Real keyboard controls move/aim/fire both players independently; released keys retain aim.
- At least one genuine real-time RAF test proves combat advances normally outside test mode. Do not test only manually stepped fixtures.
- Real pause/resume/restart buttons and Escape/R paths.
- Focus loss and tab visibility: pause, clear held input, no stuck movement on resume.
- Outcome overlays, next-room restoration, retry, completion/replay, and solo.
- Invalid map startup and later load produce stable helpful error UI across multiple render frames.
- Actual HUD and device labels match state, not merely a mutable test object.
- DPR-aware canvas backing dimensions and aspect preservation at multiple sizes; no extra world area. Include common laptop and larger viewports, and a small-height case.
- Synthetic gamepad assignment for two players, deadzones, retained aim, firing, Start edge detection, disconnect, neutral gating, and restart. Label these synthetic tests; do not claim physical controller verification.
- No simulation change caused by rendering the same snapshot repeatedly.

Avoid fixed multi-second sleeps as the main synchronization strategy. Use explicit state readiness, manual ticks where applicable, and bounded assertions. Input/focus and real-time tests may require bounded polling. Do not replace all input tests with state mutation.

DOM locators can target buttons/HUD; Canvas tanks are not individual DOM nodes. Read structured snapshots for mechanics and use screenshots for visual evidence. A non-vision agent must not claim to understand aesthetics from test success alone.

### Visual evidence

Capture stable scenes: initial co-op gameplay, at least one active-shot scene, disabled player, pause/defeat/completion overlay, and resized gameplay. Use fixed viewport, DPR, test tick, seed if needed, and explicit rendering readiness. Mask only genuinely irrelevant dynamic text such as measured FPS—not gameplay regions. Stabilize screenshot environment in CI.

On the first run, generated screenshots are candidate baselines requiring human/vision review. Do not call an unreviewed baseline an approved visual regression test. Do not update baselines automatically or hide baseline generation inside `verify`. If approval is unavailable, finish other work, save the candidates and instructions, and mark the visual-approval gate pending. After approval, require comparisons in the normal visual suite.

## 10. Release builds and offline acceptance

Produce both:

1. Hosted production output for an ordinary static HTTPS site.
2. A self-contained HTML release that works by opening `file://...` directly.

The single-file release must embed its code/styles/assets, avoid external fonts/CDNs/imports/fetches, and not require a local server. Choose a compatible single-file build plugin or a small documented packaging step, then verify its actual output. Do not assume the bundler/plugin guarantees file:// operation.

Keep the existing procedural Canvas graphics; do not introduce external asset loading during migration. No routing framework, service worker, PWA, or installation flow in this assignment.

Release verification must:

- Build from current source, not stale outputs.
- Open hosted production output and the generated single HTML in Chromium; verify startup, co-op, both players' movement/firing, pause, and retry or room transition through real UI paths.
- Capture unexpected requests and errors. Verify the single-file build makes no external resource requests; test with network blocked where feasible, allowing the top-level local document.
- Assert test hooks are absent in normal release and remain absent with a test-looking query string.
- Smoke-test hosted release in Chromium, Firefox, and WebKit. Include basic UI/input and fixed-aspect canvas sizing, not just an HTTP 200.
- Report exact browser/environment versions and limitations. Automated WebKit is not a substitute for physical Safari/iOS/controller testing; no universal support claim.

Never run `vite preview` as though it were the offline file acceptance test. They exercise different deployment modes.

## 11. Hooks and CI

### Husky and lint-staged

- Install Husky correctly for the selected version, using current supported hook structure.
- The pre-commit hook runs lint-staged for formatting/linting staged files.
- Run whole-project typechecking there only if acceptably fast; document the decision. Never pass staged TS paths to `tsc` as a substitute for checking the actual project configuration.
- Do not run the full browser matrix on every commit.
- Avoid broad `git add .` from hooks or scripts. Do not stage unrelated user changes.
- Test partial staging behavior and the actual hook in an isolated temporary Git fixture/repository. Do not manufacture commits or rewrite the user's history merely to test hook plumbing.
- Hooks are convenience feedback and can be skipped. They are not the authoritative quality gate.
- CI/install/release workflows must intentionally handle Husky where `.git` or developer tooling is unavailable; avoid fragile hooks that break legitimate non-development installation.

### CI

If hosted on GitHub, create a lean GitHub Actions workflow. Otherwise provide the equivalent CI definition/instructions appropriate to the actual host; do not guess a remote or push changes.

- Clean checkout, pinned/documented Node, `npm ci`.
- Install browser binaries/system prerequisites in the explicit CI preparation step.
- Run full verification and cross-browser smoke tests with correct build ordering.
- Cache only appropriate dependencies/browser downloads, not stale verification results.
- Save reports/traces/screenshots on failure; set bounded timeouts and clean up servers.
- Do not configure retries so a flaky failure silently becomes green. Diagnose flakiness; keep initial retries at zero or explicitly report flaky outcomes as failures.
- Browser installation/network/sandbox failures are environment blockers, never test passes.
- No secrets or deployment are necessary for this migration.
- Document required status checks/branch protection and review of guardrail/baseline changes. Workflow YAML alone does not enable repository protection. Do not claim settings were enabled without permissions and verification; do not alter remote settings without user approval.

Agent instructions must prohibit unapproved weakening of tests/configs. Explain that instructions and hooks are not security boundaries; required checks, reviews, and permissions provide stronger enforcement.

## 12. Implementation stages and checkpoints

Keep `docs/progress.md` concise: current stage, changed responsibilities, exact commands/exit statuses, known failures, next action. Prefer small coherent changes; do not create commits or push unless the user/repository policy authorizes it.

### Stage A — inspect and baseline

- Preserve/hash original input.
- Run it if browser execution is available. Capture startup/menu and actual gameplay, key defaults, existing self-check results, errors, and limitations.
- Inspect actual source organization and note globals, state owners, render side effects, input/focus behavior, collision policy, and reset state.
- Do not merely repeat the earlier chat's reported check counts/results.

Gate: baseline report is reproducible, original remains intact, current gameplay is understood.

### Stage B — tooling, guardrails, and minimal executable skeleton

- Select/install mutually compatible dependencies and commit lockfile as a file change; no implied Git commit permission.
- Add scripts, strict configs, formatter, lint, unit/browser discovery, hooks, and CI.
- Add minimal positive/negative guardrail tests and a real browser-rendering smoke check.
- Create `AGENTS.md` from section 15.

Gate: real type/lint/test/build commands execute; intentional prohibited cases fail for the right reasons. No empty green suites or permanent exclusion of the app.

### Stage C — behavior-preserving extraction

- Extract maps/config/types and pure collision/map validation first.
- Extract world/combat/enemy/simulation functions with explicit state and time ownership.
- Extract keyboard/gamepad adapters, procedural rendering, UI, and runtime composition.
- Migrate DOM handling carefully; preserve keyboard activation/focus semantics.
- Port all prototype self-checks and expand them as specified.
- Keep the game playable throughout. Do not maintain two full mutable runtime implementations indefinitely.

Gate: all three rooms and the full original loop work; relevant unit/integration tests pass; no gameplay retuning hidden in refactor.

### Stage D — deterministic automation and release paths

- Add test-only bridge, explicit stepping, snapshots, scenario fixtures, and event output.
- Add real-input browser tests and production release smoke tests.
- Produce hosted and single-file releases and test both.
- Generate candidate screenshots and request approval for visual baselines when needed.

Gate: current builds verified, bridge absent in production, important real-input/real-time paths tested, no stale outputs substituted.

### Stage E — harden and deliver

- Run clean-install verification and browser matrix; record results honestly.
- Inspect architectural boundaries, unused scaffolding, accidental exclusions, and runtime dependencies.
- Confirm hooks, guardrail negative tests, coverage includes, and fixture isolation.
- Document setup, exact commands, map/config edits, release generation, tests, and environment requirements.
- Summarize behavior parity, justified fixes, checks actually run, pending approvals, and known limitations.

Gate: section 14 completed, or explicitly report remaining blockers without claiming completion.

## 13. Sandbox and failure handling

OpenCode may run with limited free-tier models and inside nono. Keep tasks bounded and diagnostics textual and actionable.

- Inspect Node/npm, browser executables/caches, temp paths, process spawning, and loopback server access.
- Install only project-required dependencies. Browser/system prerequisite installation may require separately approved host setup.
- Use loopback, not public network interfaces, for local test servers unless explicitly required.
- Do not disable nono, browser security, or OS protections just to make a test pass. Identify the minimal missing permission/prerequisite and ask for that specific change.
- Avoid `sudo`, recursive permission changes, global tool installs, or broad filesystem access without approval.
- Preserve a useful failed-run artifact and the exact failing command.
- If a command cannot execute due to environment limits, report it as not run/blocked. Do not say a screenshot was inspected, a controller tested, or a browser passed without evidence.
- Do not send private repository content to extra services. Use the already-authorized agent/tool environment.

## 14. Definition of done

- [ ] Original prototype copied unchanged and hash recorded.
- [ ] Root `AGENTS.md` exists, is concise, and matches actual scripts/paths.
- [ ] TypeScript source is split by responsibilities without a new framework.
- [ ] No hidden gameplay/visual redesign or deferred feature implementation.
- [ ] All original rooms, controls, gamepad behavior, pause/focus handling, debug UI, solo/co-op, outcomes, and restart preserved.
- [ ] Strict typechecks cover app, simulation, tooling, and tests appropriately.
- [ ] Typed lint, formatting, boundaries, and negative guardrail checks work.
- [ ] Named collision/combat/map/outcome/reset/determinism tests exist and pass.
- [ ] Coverage includes untested targeted source files and meets agreed floors.
- [ ] Unit/browser discovery is separate and empty suites fail.
- [ ] Manual test stepping cannot race real-time simulation.
- [ ] Browser tests exercise real input and real RAF mode, not only injected state.
- [ ] No unexpected page errors/console errors in supported tested flows.
- [ ] Production hosted and standalone HTML builds work, without test bridge.
- [ ] Standalone HTML verified through file:// without external asset/network dependencies.
- [ ] Hosted cross-browser smoke results recorded; physical controllers explicitly distinguished from synthetic tests.
- [ ] Visual evidence captured; baselines approved and comparisons passing, or approval clearly pending.
- [ ] Hooks verified safely; CI configured; remote branch-protection status reported honestly.
- [ ] Clean-install verification run, or precise environment blockers documented.
- [ ] README explains prerequisites, installation, launch, commands, config/map editing, release formats, and test limitations.
- [ ] No weakened checks, broad suppressions, placeholder tests, or unrelated changes.
- [ ] Final report includes exact commands/results, relevant screenshots/reports, parity/fix notes, and next bounded task.

## 15. Root AGENTS.md template

Create the actual root file from the following template. Keep this instruction file concise; detailed acceptance cases belong in the handoff and docs/tests. Replace paths only when the implementation really uses different paths. Do not leave aspirational commands that do not work.

````markdown
# Toybox Tanks — agent instructions

## Mission

Maintain a small browser-based couch-co-op tank game. Preserve reliable controls,
readable one-bounce combat, original toy-like presentation, and forgiving local
cooperation. Prefer a finished small game over speculative infrastructure.

The current assignment is a behavior-preserving migration of the supplied HTML
prototype to TypeScript with verified build/test guardrails. See the migration
handoff and `docs/progress.md` for the active stage. Do not implement backlog
features without a separate task.

## Read before editing

- Read this file and any more-specific AGENTS.md affecting files you will change.
- Read `docs/migration-handoff.md`, `docs/architecture.md`, `docs/progress.md`,
  and relevant tests. Create the requested documents during bootstrap if absent.
- Inspect the actual repository and existing user changes; do not overwrite them.
- `reference/toybox-tanks.original.html` is immutable behavioral/visual reference.
- Make the smallest coherent change for the current stage. Update progress notes.

## Product invariants

- Local two-player co-op is primary; solo creates exactly one real player.
- Free 2D movement; independently aimed turret; aim persists after release.
- Player shells hit enemies only; enemy shells hit players only; no shell-shell hits.
- One wall bounce; second contact removes the shell. Use swept collision,
  earliest impact, remaining travel, surface separation, and bounded processing.
- Walls block tanks; tanks do not block or push tanks.
- Three active player shells and two HP per room by default; preserve config.
- Temporary post-hit invulnerability has clear feedback.
- Disabled players remain visible; one survivor can clear; next room restores both.
- Same-tick defeat precedes victory. Commit outcome once and clear combat shells.
- Restart resets all simulation and input-adapter state.
- Preserve the three original maps and the full menu/pause/retry/clear/replay loop.
- Keep fixed logical coordinates, aspect ratio, DPR-aware rendering, and readability.

## Architecture

- `sim/` is DOM/Node-free gameplay code with explicit state, commands, and time.
- No real-time reads, global randomness, device polling, drawing, or scheduling
  inside simulation. Inject seeded randomness only if gameplay needs it.
- Input produces commands; renderer reads state; app/runtime owns orchestration.
- Rendering does not mutate gameplay. No alternate combat rules in UI or tests.
- Keep maps/settings data-driven and validated. Reject invalid startup maps safely.
- Small modules/plain data/functions; no ECS, DI framework, engine rewrite,
  networking, generic plugin architecture, or speculative systems.

## Verification commands

- `npm run verify:fast` — formatting, lint, typecheck, unit/architecture checks.
- `npm run verify` — complete local gate including coverage, browser/visual,
  and release checks; consult package.json for the exact composition.
- `npm run test:browsers` — hosted Chromium/Firefox/WebKit smoke matrix.
- `npm run dev` — development server.
- Use focused tests while iterating; run the required complete gates before
  claiming completion. CI is authoritative, not the local Git hook.

## Guardrails are requirements

- No `any`, broad casts, unchecked non-null assertions, ignored type errors,
  ESLint disables, broad excludes, weakened assertions/coverage, or disabled
  checks to make a task pass. A reviewed, narrowly scoped exception is different.
- Never silently alter validation scripts, CI, guardrail config, or screenshot
  baselines. Explain and obtain approval when a policy change is needed.
- Do not auto-accept visual snapshots. First baselines require review.
- Do not add runtime/development packages without a concrete need; preserve one
  npm lockfile and compatible pinned versions.
- Do not auto-stage unrelated changes, rewrite history, commit, or push unless
  explicitly authorized by user/repository policy.

## Test discipline

- Prefer discrete invariants and geometric tolerances over fragile long float
  snapshots. Tests fail on no tests and produce meaningful failures.
- Deterministic browser hooks exist only in test builds; production must not
  expose them, even with a test-looking URL parameter.
- In test mode, manual ticks are the sole simulation clock. Also test real
  keyboard input and ordinary real-time RAF scheduling.
- A Canvas tank is not a DOM node. Use structured state/events for mechanics,
  screenshots for visual evidence, and human/vision review for aesthetics.
- Mocked gamepads do not prove physical controller compatibility. Automated
  WebKit does not prove physical Safari/iOS/device support.

## Environment and reporting

- Respect sandbox restrictions. Do not weaken security or request broad access
  when a narrow missing permission/prerequisite can be identified.
- Keep browser/server setup bounded, local, and reproducible.
- Record exact commands, exit status, remaining failures, and next task in
  `docs/progress.md`. Never report an unavailable/skipped test as passed.
- Final report: changes, behavior parity, justified fixes, checks actually run,
  artifacts, blockers, pending visual approval, and known limitations.

## Deferred scope

Moving AI, fading tracks, rockets, contact/remote mines, cork destruction, audio,
and new rooms are backlog, not permission to expand this migration. Preserve
clear cooperative play and existing bank shots when implementing future tasks.
````

## 16. Final delivery format from the implementation agent

Do not return only this plan rewritten. Return the implemented repository changes and a concise report:

1. What was created/refactored and where to start.
2. Commands to install, run, verify, and produce both releases.
3. Behavior parity with the supplied prototype and any documented narrow fixes.
4. Exact checks run, results/counts, browser versions, and report/artifact locations.
5. Guardrails demonstrated to fail on intentional violations.
6. Screenshot/baseline approval status and physical-controller limitations.
7. Any blocked requirements, with the exact environmental/user action needed.
8. A suggested next bounded task, normally human co-op validation before new mechanics.

If only part can be completed in one session, leave the repository playable and the current gate honest. Update checkpoint notes so the next agent can resume without reinterpreting the game.
