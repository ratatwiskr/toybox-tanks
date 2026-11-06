# Toybox Tanks — Stage A baseline report

Prepared: 2026-11-06  
Gate: A — inspect and baseline  
Status: complete; awaiting owner review before Gate B

This report records what was actually observed in the supplied prototype. It does not
claim more than the evidence below supports. No application source, toolchain config,
launcher, or lockfile was changed during Gate A.

## 1. Input preservation

The source prototype is `reference/toybox-tanks.html` (44,336 bytes, 464 lines).

The immutable reference copy was created on 2026-11-06:

```bash
cp --preserve=timestamps reference/toybox-tanks.html reference/toybox-tanks.original.html
cmp reference/toybox-tanks.html reference/toybox-tanks.original.html
sha256sum reference/toybox-tanks.original.html
```

Result: `cmp` reported no differences (byte-identical), and the hash is:

```text
99e5435b02a9185b26631c734f53d4e9d4680afca281e7bc13d901f73849b4b5  reference/toybox-tanks.original.html
```

Handoff hashes verified in the same session:

```text
f112712bff7cb048df0134181bfeaaf697a64f033afaafcb7fbf459c1c03daf6  docs/handoff.md
f112712bff7cb048df0134181bfeaaf697a64f033afaafcb7fbf459c1c03daf6  toybox-tanks-opencode-handoff.md
```

`reference/toybox-tanks.original.html` is immutable behavioral/visual reference. It is
not the runtime and must not be reformatted, overwritten, or built from.

## 2. Environment used

| Item          | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| OS            | Linux (nono sandbox session)                                      |
| Node          | `24.22.2`                                                         |
| npm           | `11.19.1`                                                         |
| Playwright    | `1.64.1`                                                          |
| Chromium      | `156.0.8078.4`                                                    |
| Browser cache | `$HOME/.cache/ms-playwright`                                      |
| Viewport      | `1440 × 1000`, device scale factor `2`                            |
| Page URL      | `file:///home/toast/dev/toybox-tanks/reference/toybox-tanks.html` |

The launcher `_start_opencode_with_nono.sh` sets
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/toybox-tanks-playwright"`, which does not
exist. Per the owner decision, the launcher was not modified. Local runs used the
override:

```bash
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" <command>
```

Firefox was not used in this baseline. A separate launch check previously failed
locally before page launch with:

```text
Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM
Could not find profile folder.
```

Chromium and WebKit are reported to launch; only Chromium was exercised for this
baseline. The Firefox failure is an environment blocker to escalate, not a test pass.

## 3. Reproduction command

The baseline driver is the local, gitignored diagnostic
`.tmp/gate-a-baseline.mjs` (not project source). It opens the prototype through
`file://`, exercises the real menu button, real keyboard input, and real
pause/resume UI, then writes evidence.

```bash
cd /home/toast/dev/toybox-tanks
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" node .tmp/gate-a-baseline.mjs
# exit status: 0
```

Evidence written this run:

```text
docs/evidence/gate-a/01-menu.png         2880×2000
docs/evidence/gate-a/02-menu-stage.png   2552×1438
docs/evidence/gate-a/03-gameplay.png     2552×1438
docs/evidence/gate-a/04-paused.png       2880×2000
docs/evidence/gate-a/baseline-run.json
```

Screenshot bytes are evidence of the captured frame, not an aesthetic approval.
The implementation model cannot consume images, so no visual-quality claim is made.
A human/vision review is still required for any later visual baseline.

## 4. Observed startup and checks

- Page title: `Toybox Tanks — tabletop co-op`
- Status line: `Built-in checks: 18/18 passed · Keyboard-first · Gamepads optional / hardware untested · No audio`
- All 18 embedded self-checks passed when re-run through `window.ToyboxTanks.runSelfChecks()`.
- Page errors: none.
- Console errors: none.
- Console messages: none.
- Initial world: room `0`, mode `coop`, state `menu`, 2 players, 2 enemies, 0 shells.
- Player spawns: P1 `(180, 430)`, P2 `(780, 430)`; both at HP 2, turret angle `-π/2`.
- Enemy sentries: `s0 (180, 150)`, `s1 (780, 150)`, HP 1 each.

The 18 check names, in order:

1. All three maps validate
2. Invalid dimensions, symbols and spawns rejected
3. Flat-wall reflection preserves tangential velocity
4. Swept contact catches a wall crossed in one step
5. Remaining distance travels after a bounce
6. Second wall contact removes shell
7. Ambiguous corner safely removes shell
8. Player shell ignores both players, hits enemy
9. Enemy shell ignores enemies, hits player
10. Invulnerability prevents repeated damage
11. Three active shells cap each player independently
12. Walls block tanks but tanks never block tanks
13. Sentries cannot shoot through cover
14. Defeat wins a simultaneous terminal state
15. Either survivor can win; clear removes all shells
16. Third room commits completion and freezes combat
17. Solo has one real player and correct defeat count
18. Fresh room resets combat, health, timers and outcomes

## 5. Observed interaction through real UI paths

After clicking the real `Start two-player co-op` button:

- State became `playing`, mode `coop`, 2 players, 2 enemies.
- Holding real keyboard `D` + `E` + `F` for ~500 ms:
  - P1 moved from `(180, 430)` to about `(294.1, 430)`.
  - P1 turret angle changed from `-π/2` to about `0.0625 rad`.
  - `shots` rose from 0 to 2; 2 live shells remained.
- Holding real keyboard `ArrowLeft` for ~300 ms moved P2 from `x=780` to about `x=721.4`.
- Real `Escape` set state to `paused`.
- Clicking the real `Resume` overlay button returned state to `playing`.

These are synthetic OS-level key events delivered through Playwright, not physical
hardware certification. Gamepads were not connected or tested physically.

## 6. Observed source organization

The prototype is one HTML file with one inline `'use strict'` script:

| Area           | Prototype location                                                                            | Notes                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Configuration  | `CONFIG` object                                                                               | One mutable-by-convention object; all gameplay constants.                                      |
| Maps           | `MAPS` array                                                                                  | Three metadata objects with 13-line, 24-column text grids.                                     |
| Validation     | `validateMap`                                                                                 | Dimensions, symbols, borders, spawn counts, enemy count, reachability.                         |
| Entities/world | `tank`, `makeWorld`                                                                           | `world` object owns room/mode/state/time/walls/players/enemies/shells/effects/events/counters. |
| Collision      | `rayBox`, `firstWall`, `rayCircle`, `reflect`, `advanceShell`, `moveTank`, `hasLOS`           | Swept shell segment; shell-radius-expanded AABBs; circle tanks; axis-separated wall sliding.   |
| Combat         | `damage`, `activeShells`, `shoot`                                                             | Shell ownership/faction gate; per-player live-shell cap; cooldown; muzzle sweeping.            |
| Enemies        | `updateEnemy`, `turnToward`, `angleDelta`                                                     | Stationary sentries, line-of-sight target selection, gradual turn, telegraph, fire.            |
| Simulation     | `stepWorld`, `evaluateOutcome`, `commitOutcome`                                               | Explicit fixed-step function; terminal-state commit and shell clearing.                        |
| Input          | `held`, `KEYSETS`, `CONTROL_KEYS`, `clearInputs`, `pollPads`, `readCommand`                   | Module-global held-key set and gamepad assignments; adapters produce command objects.          |
| Rendering      | `canvas`, `ctx`, `resizeCanvas`, `draw*`, `render`                                            | Procedural Canvas drawing; reads world; writes only canvas/backing-size state.                 |
| UI/state       | `world`, `setOverlay`, `loadRoom`, `restartRoom`, `pauseGame`, `showMenu`, `act`, `updateHUD` | DOM overlay/HUD; owns room transitions and menu state.                                         |
| Self-checks    | `runSelfChecks`                                                                               | 18 invariant checks on isolated fixtures/worlds.                                               |
| Main loop      | `frame`, `requestAnimationFrame`                                                              | RAF render plus fixed-step accumulator; pause/focus handling; HUD refresh.                     |

The prototype intentionally exposes `window.ToyboxTanks` for inspection/automation.
This is **not** the production test bridge. The production test bridge must exist only
in a designated test build.

## 7. Behavior and quirks to preserve

These are observations from the source, recorded before refactoring so parity can be
checked later:

- Fixed simulation step is `1/120 s`; `maxFrameTime` is `0.10 s`; `maxSteps` is 16.
  When 16 steps are hit, the accumulator is discarded rather than fast-forwarded.
- Logical arena is `960 × 540`, 24 × 13 tiles of 40 px, grid `y` offset `10`.
  Canvas CSS aspect is 16:9; backing size scales with DPR. At the tested viewport the
  canvas backing was `2552 × 1436` for a CSS size of `1276 × 717.75`.
- Tanks move freely in 2D and normalize diagonals. Tanks use radius-15 circles and
  slide against walls via axis-separated movement in ≤5 px pieces with 3 correction
  iterations. Tanks neither collide with nor push other tanks.
- Aim is independent of movement. Releasing turret input retains the angle.
- Player command indexing follows player array order (`p1`, `p2`).
- Keyboard P1: `KeyW/KeyA/KeyS/KeyD`, `KeyQ`/`KeyE`, `KeyF`.
  Keyboard P2: arrows, `Comma`/`Period`, `Enter`.
- `Escape` toggles pause; `KeyR` retries only in `defeat`; `Backquote` toggles debug.
- Key handling requires focus inside `#app`; `Escape`/`KeyR`/`Backquote` are
  non-repeating. Game keys are prevented from browser defaults while focused.
  `Enter` on a focused button is not prevented when the game is not playing, preserving
  keyboard activation of overlay buttons.
- Window `blur`, tab hide, and focus leaving `#app` clear held input and pause if
  playing, each with a distinct pause reason.
- Shells are swept over their whole movement segment. Earliest impact wins.
  One wall bounce is allowed; the next wall contact removes the shell. Ambiguous
  corner/equal-time contacts are deliberately treated as unsafe and remove the shell.
  Remaining travel after a bounce is consumed. Processing is bounded by
  `maxProjectileContacts = 4`.
- Muzzle travel is swept 23 logical px so a shell cannot spawn beyond a nearby wall.
- Player shells can damage enemies only; enemy shells can damage players only.
  Shells never collide with shells.
- A shell that contacts a damageable tank is consumed. If the contacted tank is
  currently invulnerable, `damage` returns false but the shell is still marked dead.
  This quirk is observable baseline behavior and must be preserved unless a documented
  fix is approved.
- `damage` applies post-hit invulnerability only when the target survives the hit
  (`hp > 0`). A lethal hit leaves `invuln` at 0 and sets `alive = false`.
- Player shells are capped by live-shell count (3) independently of the 0.28 s
  cooldown. Enemy shells are limited by the 2.7 s interval rather than the player cap.
- Sentries only consider living players with clear line of sight, pick the nearest,
  turn gradually at 1.9 rad/s, require alignment within 0.09 rad, telegraph for 0.5 s,
  re-check line of sight at firing, and cancel charge when the target is lost.
- Defeat is evaluated before victory in `evaluateOutcome`; a same-tick loss of the
  last player and last enemy commits `defeat`. Outcome commits at most once and clears
  all shells; terminal states stop `stepWorld` immediately.
- Solo (`mode === 'solo'`) creates only the `1` spawn, so exactly one real player
  exists. Defeat means that single player is disabled.
- Room clear (`cleared`) keeps the world in place for the overlay; `next` loads the
  next room fresh, restoring both players. Final-room clear commits `completed`;
  replay returns to room 0.
- `restartRoom` replaces the world via `makeWorld`, clears held input and the
  accumulator, resets the overlay cache, and clears the pause reason. All IDs, timers,
  shells, effects, events, cooldowns, invulnerability, and outcome state are fresh.
- `nextShell` is world-scoped. Effect seeds derive from world time and effect count,
  not wall-clock randomness. No `Math.random` or real-time read exists in simulation.
- The prototype validates all maps at initial startup and catches failures into an
  `error` world state. `loadRoom` also catches later failures. The error overlay shows
  the validation text with preserved whitespace.
- The menu is a real world (`First Bounce`, coop) forced to `state = 'menu'`; overlay
  cache prevents rebuilding the dialog every frame. Starting co-op loads room 0 fresh.
- Rendering draws floor, spawn markers, aim/bounce guides, walls, enemies, players,
  shells, effects, and optional debug geometry. It reads gameplay state; the only
  writes are canvas backing dimensions and local drawing state. `p.track` and
  `p.charge` are gameplay/cosmetic state advanced by simulation, not renderer.
- No audio, no external assets, no network requests, no frameworks, no service worker.

## 8. Configuration values observed

```text
width 960, height 540, tile 40, gridY 10, columns 24, rows 13
fixedStep 1/120, maxFrameTime 0.10, maxSteps 16
playerSpeed 185, turretRotationSpeed 2.8, shellSpeed 330
firingCooldown 0.28, activeShellLimit 3, enemyFiringInterval 2.7
playerHealth 2, postHitInvulnerability 1.25
tankRadius 15, shellRadius 3, enemyShellSpeedFactor 0.72
enemyTurnSpeed 1.9, enemyTelegraph 0.50, stickDeadzone 0.22
maxProjectileContacts 4, separationEpsilon 0.025
```

## 9. Maps observed

| Room | Name             | Sentries | Grid    |
| ---- | ---------------- | -------- | ------- |
| 1    | First Bounce     | 2        | 24 × 13 |
| 2    | Block Party      | 3        | 24 × 13 |
| 3    | Together Through | 4        | 24 × 13 |

All three validated with matching `expectedEnemies` values `2, 3, 4`.

## 10. Limitations and non-claims

- Chromium only for this baseline run. WebKit was not exercised here; Firefox is
  blocked locally by the nono user-namespace/profile failure above.
- Keyboard input was synthetic Playwright input, not a physical keyboard study.
  Gamepad behavior was not physically tested; the status line already labels gamepads
  as optional/hardware-untested.
- No audio is present, matching the status line.
- The implementing model cannot view images. Screenshots are saved as evidence, but
  aesthetics and pixel-level presentation are **not** reviewed or approved.
- The baseline driver lives in gitignored `.tmp/`; it is a local diagnostic, not part
  of the future verification suite.
- Float behavior was not asserted bitwise across platforms, and no such claim is made.

## 11. Gate A criteria

| Criterion                                                                                   | Status                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Original prototype preserved unchanged with hash recorded                                   | Met                                                                |
| Prototype reproduced in a real browser                                                      | Met (Chromium `156.0.8078.4`, `file://`)                           |
| 18/18 embedded checks and menu state recorded                                               | Met                                                                |
| Page/console errors recorded                                                                | Met (none)                                                         |
| Source organization, state owners, render effects, input/focus, collision, reset understood | Met (section 6–7)                                                  |
| `docs/baseline.md`, `docs/progress.md`, `docs/backlog.md`, `AGENTS.md` created              | Met                                                                |
| No application source changed                                                               | Met (only reference copy, docs, evidence, gitignored local script) |

Next gate: **Gate B — toolchain, guardrails, and minimal executable skeleton**.
Do not begin Gate B until Gate A is reported and reviewed.
