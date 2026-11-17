# Enemy kinds, mines & secondary weapon — OpenCode implementation handoff

Prepared: 2026-11-15
Branch: `feature/improve-enemy-variety` (originally proposed as `feature/add-enemy-types`)
Source checkpoint: `25b3c1c` (clean tree except untracked `reference/toybox-tanks-enemy-prototype{,_v2,_v3}.html`)
Status: implemented through Scope E on 2026-11-17; see `docs/progress.md` for
verification and known limitations. Existing campaign rooms 1–15 also had
sentry placements varied and hints updated in `bc1e5a8`; their order is
unchanged.

Purpose: port the additions from `reference/toybox-tanks-enemy-prototype_v3.html`
into the shipped TypeScript game without re-investigating the repo.

---

## 0. How to use this document (read this first, then stop reading)

The whole point of this file is to avoid re-reading the repository. Rules:

- Do **not** read the full repo, all tests, or all docs "to get oriented".
- Read this document, then read **only** the files in the `Read` line of the
  scope you are working on. Nothing else is required.
- Do not read `reference/toybox-tanks-enemy-prototype*.html` unless a specific
  question is not answered here; the needed prototype values are copied below.
- Each scope is independently resumable and independently verifiable.

Scope map (each scope is one session's worth of work):

| Scope | Deliverable                                                | Read (only these) |
| ----- | ---------------------------------------------------------- | ----------------- |
| **A** | Sim framework + Roamer kind, deterministic world RNG       | §2, §3            |
| **B** | Bruiser + bank-shot ballistics                             | §4                |
| **C** | Lobber + poms                                              | §5                |
| **D** | Mines + Prankster + player secondary weapon                | §6                |
| **E** | 4 campaign rooms, HUD wording, renderer art, visuals, docs | §7                |
| **T** | Test strategy + verification reference (consult per scope) | §8, §9            |

Scopes A–D are sim-only and must land in order (B/C/D depend on A's types).
Scope E depends on A–D. Tests for a scope land in that scope, not at the end.

---

## 1. Goal

Ship the prototype v3 feature set in the real game:

1. An **enemy-kind framework** replacing the single hard-coded sentry brain.
   Kinds: `sentry` (existing behavior, unchanged), `roamer`, `bruiser`,
   `lobber`, `prankster`.
2. **Bruiser bank shots** — line-of-sight ballistics search for a one-bounce
   path to a player, with a visible red telegraph trace.
3. **Lobber poms** — arcing projectiles that ignore walls, land on a marked
   ring, ground blast blocked by walls/corks, chips corks.
4. **Mines** ("jack-in-the-box"): enemy Prankster mines + a player secondary
   weapon (lay one mine, press again to remote-detonate). Chains, cork chips,
   no friendly fire.
5. **Co-op scaling** via lowercase map symbols; 4 new campaign rooms 16–19.

Source: `reference/toybox-tanks-enemy-prototype_v3.html`, itself built from
`dist-single/index.html`, so it maps cleanly onto current modules.

---

## 2. Settled decisions (do not renegotiate in a later session)

These were decided against the real codebase. Re-litigating them wastes a session.

### 2.1 Determinism / RNG

- The world stores a **numeric** `rngState`, not a function. `world.test.ts`
  asserts `toEqual` between two worlds (`world.test.ts:319`,
  `map-border-loading.test.ts:125`, `visual-motion-scenes.test.ts:83`,
  `visual-scenes.test.ts:17`); a stored closure breaks deep equality.
- `src/sim/rng.ts` exports `nextRandom(world): number` — mulberry32 advanced
  in place, seed `1234 + roomIndex`. Replace every prototype `L.rnd()`.
- No `Math.random`/`Date.now`/`performance.now` anywhere in `src/sim/**`
  (ESLint restricts them).

### 2.2 Kinds module

- `src/sim/kinds.ts` exports `EnemyKindSpec`, `KINDS`, `MINE`.
- Every `EnemyKindSpec` field is **required**; unused kinds set `0`. This avoids
  optional-field handling under `exactOptionalPropertyTypes`.
- `sentry` mirrors existing `CONFIG` numbers exactly (`enemyFiringInterval` 2.7,
  `enemyShellSpeedFactor` .72, `enemyTurnSpeed` 1.9, `enemyTelegraph` .5) and
  keeps its colors `#b86280` / `#78384e`. Other kinds use prototype colors.

Prototype tuning table, port verbatim (`speed` px/s, `cd` s, `tele` s):

```text
sentry:    hp1 r15 speed0  hullTurn0 turn1.9 shell.72 cd2.7 tele.5  vision1e9 hunt0    color #b86280 dark #78384e
roamer:    hp1 r15 speed68 hullTurn4 turn2.2 shell.72 cd2.2 tele.5  vision420 hunt.35   color #e8a33d dark #7a4a0e
bruiser:   hp5 r18 speed52 hullTurn3 turn2.4 shell.95 cd1.7 tele.55 teleBank.85 vision520 hunt.6 color #7a2f57 dark #3d1230
lobber:    hp2 r15 speed34 hullTurn3 turn1.6 shell0  cd3.4 tele.7  vision480 hunt0    minRange150 flight1.1 blast46 color #46b3a4 dark #1d5a52
prankster: hp2 r15 speed58 hullTurn4 turn2   shell0  cd0   tele0  vision420 hunt.5   minRange130 mineCd3 mineCdSeen1.5 maxMines4 color #8e5bd1 dark #432a73
MINE = { r:9, blast:52, arm:.9, armPlayer:.4 }
```

Derived modifiers to keep:

- Bruiser rage: at `hp <= 2`, `speed *= 1.3` and fire cadence `* 0.8`.
- Co-op: bruiser fire cadence `* 0.85`; lobber `cd * 0.85`. HP unchanged.

### 2.3 Types & ids

- `createTank(id, faction, x, y, kind = faction === 'enemy' ? 'sentry' : null)`
  keeps backward compatibility.
- Enemy ids follow the prototype: `` `${lowercasedSymbol}${index}` `` (e.g. `s0`).
  `map-border-loading.test.ts:71` expects `['s0']`.
- `Tank.heading` is sim-owned **enemy** body heading (init `-Math.PI/2`).
  Player body heading stays presentation-only in
  `src/presentation/body-heading.ts` (WeakMap). **Never** store player body
  heading in the sim. `altWeapon` uses `player.angle` to place the mine.

### 2.4 Behavior preservation

- Sentry dispatch must be its own unchanged branch (`targetId` nearest-target
  semantics, `CONFIG.enemyTurnSpeed`, `enemyTelegraph`, `enemyFiringInterval`).
  Add a generic chaser branch for roamer/bruiser; lobber/prankster get their own.
- Keep `resolveShellCollisions` (swept shell-vs-shell). Do **not** port the
  prototype's simple distance check.
- Omit the prototype's tank-tank soft separation (existing invariant: no
  tank-tank blocking/pushing; tracked separately as issue #34).
- Player aim-guide rendering is unchanged; use `trace`/`ghosts` only for the
  Bruiser telegraph.
- Audio: no changes. `src/audio/events.ts` already maps non-lethal enemy
  `damage` → `enemyHit` and death → `enemyDestroyed`.
- `damage()` on a non-lethal **enemy** hit sets `invuln = .2; stun = .3;
charge = 0` (plus `hurt = .25` for all tanks). Players keep
  `postHitInvulnerability`.

### 2.5 Step order & world fields

- Step order: players → enemies → mines → shell collisions → shell advance →
  poms → filter → effects → outcome. Clear mines and poms when the room ends.
- `World` gains `mines: Mine[]`, `poms: Pom[]`, `rngState: number`,
  `nextMine: number`.
- `Mine` has `id`, `owner` (a `Tank` reference), and `fuse?: number` set only
  when needed.

### 2.6 Modules & cycles

- New: `src/sim/kinds.ts`, `src/sim/rng.ts`, `src/sim/nav.ts`,
  `src/sim/ballistics.ts`, `src/sim/poms.ts`.
- Mines + player secondary weapon live in `src/sim/combat.ts` to avoid an import
  cycle (`poms` imports `damage` from `combat`).
- `passable` is implemented structurally against `world.walls`/`world.corks`
  tile-aligned rects; no stored grid or `corkAt` needed.
- `rayCircle` signature broadens to a structural `{x,y,r}`. Add
  `hasLineOfSight(world, ax, ay, bx, by)`; `hasLOS` delegates to it.

### 2.7 Coop spawn rules & validation

- `expectedEnemies` = total enemy count across all enemy symbols.
- Solo spawns **uppercase symbols only**; lowercase spawns are coop-only.
- Validator counts all enemy symbols `#C.12SRBLMrblm`, requires ≥ 1, messages:
  `Expected N enemies; found M.` and `At least one enemy is required.`
  Update `maps.test.ts:113,121`, `cork-state.test.ts:93`.
- `maps.test.ts` "loads every campaign room in both modes" currently asserts
  `solo.enemies.length === expectedEnemies`; change to the uppercase-only count
  (rooms 17–19 have lowercase spawns).

### 2.8 Enemy init (exact)

- cooldown init: `({bruiser:2, lobber:2.5}[kind] || 1.2) + index * 0.38`
- `angle = heading = Math.PI / 2`; `mineCd = 1.5`;
  `phase = rng() * 6`, then `ai.wait = rng() * 0.8`
- `ai = { mode:'patrol', path:[], wait:0, last:null, lost:99, scan:.1,
plan:null, srch:null, stuck:0 }`

### 2.9 Effects & feedback

- `EffectType` gains `'confetti'` and `'jack'`.
- `feedback.poof` life: spark `.22`, confetti `.7`, jack `.6`, else `.52`.

### 2.10 Input

- Alt input: keyboard `KeyG` + `Slash`, gamepad `buttons[2]`.
- `Command.alt?: boolean`; the sim edge-detects via `Tank.altPrev`.
- Touch: **no** mine control. Document this as a known limitation (do not
  silently claim parity).

---

## 3. Scope A — sim framework + Roamer + world RNG

**Read:** `src/sim/types.ts`, `src/sim/world.ts`, `src/sim/enemies.ts`,
`src/sim/combat.ts`, `src/sim/collision.ts`, `src/sim/feedback.ts`,
`src/config.ts`, `src/sim/maps.ts`, `tests/unit/enemies.test.ts`,
`tests/unit/world.test.ts`.

### Edits

1. New `src/sim/rng.ts`: `nextRandom(world)` (mulberry32).
2. New `src/sim/kinds.ts`: `EnemyKindSpec`, `KINDS`, `MINE` per §2.2.
3. `src/sim/types.ts`:
   - add `EnemyKind`, `EnemyAi`, `Mine`, `Pom`, `BankPlan`/`BankSolution`,
     `TraceSegment`, `TraceTarget`, `Point`.
   - `Tank` gains `kind`, `maxHp`, `heading`, `hurt`, `stun`, `phase`, `vx`,
     `vy`, `mineCooldown`, `altPrev`, `ai`.
   - `Command.alt?: boolean`; `EffectType` += `'confetti' | 'jack'`.
   - `World` gains `mines`, `poms`, `rngState`, `nextMine`.
4. New `src/sim/nav.ts`: `cellOf`/`centerOf`/`passable`/`bfs`/`pathTo`/
   `planPatrol`/`fleePath` (structural, per §2.6).
5. New `src/sim/ballistics.ts`: `trace`/`ghosts`/`solveBankAt`/`solveBank`.
   Broaden `collision.rayCircle` to `{x,y,r}`; add `hasLineOfSight`.
6. Rewrite `src/sim/enemies.ts` to dispatch by kind; keep `angleDelta`/
   `turnToward`, add `followPath`. Sentry branch byte-for-byte behavior.
7. `src/sim/combat.ts`: kind-based shell speed/cooldown; `damage()` enemy
   invuln/stun/charge/hurt per §2.4.
8. `src/sim/world.ts`: new symbols, coop scaling, player `vx`/`vy` smoothing,
   step order per §2.5, deterministic `rngState` init.
9. `src/sim/feedback.ts`: `confetti`/`jack` life per §2.9.

### Acceptance

- `enemies.test.ts` sentry timing still exact (4 × 0.1 s telegraph → charge 0.4,
  5th fires; turn rate; LOS cancel; `targetId` switch).
- `map-border-loading.test.ts` `toEqual(clean)` still passes (deterministic
  world; `createWorld(index,'coop')` deep-equals).
- New unit test: Roamer chases within `vision`, fires on LOS, uses `hunt`
  lead, patrols via `planPatrol` when idle.
- New unit test: `nextRandom` is deterministic for a fixed seed and mutates
  `rngState`.

---

## 4. Scope B — Bruiser + bank shots

**Read:** `src/sim/kinds.ts`, `src/sim/ballistics.ts`, `src/sim/enemies.ts`,
`src/sim/types.ts`, `tests/unit/enemies.test.ts`. (Scope A output.)

### Edits

1. Bruiser brain: scan 360°, keep angles whose path bounces once then hits a
   player; group them; aim at the centre of the widest/shortest group. Use
   `ghosts(world, lead)` (lead from target `vx`/`vy`) and `solveBank`/`solveBankAt`.
2. Telegraph: store `ai.plan` (`BankPlan`); draw the red trace from
   `TraceSegment[]` for `teleBank` seconds before firing.
3. Cadence: `cd` from `KINDS.bruiser`, `* 0.8` when `hp <= 2`, `* 0.85` in coop;
   `speed * 1.3` when `hp <= 2`.
4. Falls back to direct LOS fire when no bank solution exists.

### Acceptance

- New unit test: a Bruiser inside a corner chamber with a player around the
  corner finds a one-bounce solution and the solution's segment count is 2.
- New unit test: with no bank solution and no LOS, the Bruiser does not fire.
- Rage test: at `hp <= 2`, measured inter-shot interval shrinks ~20%.

---

## 5. Scope C — Lobber + poms

**Read:** `src/sim/kinds.ts`, `src/sim/poms.ts`, `src/sim/enemies.ts`,
`src/sim/world.ts`, `src/sim/types.ts`, `src/sim/combat.ts`,
`tests/unit/enemies.test.ts`, `tests/unit/world.test.ts`. (Scope A output.)

### Edits

1. New `src/sim/poms.ts`: spawn a pom with `flight` seconds, landing point at
   the target's predicted position; `updatePoms` advances, lands, applies
   `damage` inside `blast`, blocked by walls/corks, chips corks, spawns a
   `confetti` effect.
2. Lobber brain: keep range ≥ `minRange` (150), lead the target, fire a pom on
   `cd` (`* 0.85` in coop); no shell. `tele` 0.7 s landing-ring telegraph.
3. `World` step order: poms advance after shell advance; poms cleared on room end.

### Acceptance

- New unit test: a pom lands at the predicted point and damages a stationary
  player inside `blast`, but a wall between landing point and player blocks it.
- New unit test: a pom landing on a cork chips it (cork `hits` decrements).
- Lobber never fires inside `minRange`.

---

## 6. Scope D — Mines + Prankster + player secondary weapon

**Read:** `src/sim/kinds.ts`, `src/sim/combat.ts`, `src/sim/enemies.ts`,
`src/sim/world.ts`, `src/sim/types.ts`, `src/input/keyboard.ts`,
`src/input/gamepad.ts`, `src/input/mobile.ts`, `src/input/touch.ts`,
`src/main.ts`, `src/test-bridge.ts`, `tests/unit/enemies.test.ts`,
`tests/unit/world.test.ts`. (Scope A output; C optional.)

### Edits

1. `src/sim/combat.ts`:
   - `layMine(world, tank)` / `altWeapon(world, player)` — place one mine at
     `player.angle` distance; second press remote-detonates.
   - `updateMines`: arm timers (`arm` for enemies, `armPlayer` for the player),
     contact detonation, chain detonation within `blast` with a `0.12 s` fuse,
     wall/cork-blocked ground blast, cork chips, no friendly fire.
   - `boom(world, mine)` shared detonation; `advanceShell` gains mine contacts
     (`rayCircle` vs `{x,y,r:9}`, detonate via `boom`).
   - 1.2 s recharge after a mine pops.
2. Prankster brain: no gun; lays up to `maxMines` mines while patrolling/fleeing;
   never within 80 px of a player; `mineCd` 3 s, `mineCdSeen` 1.5 s; flees when
   seen. Uses `fleePath`.
3. Input adapters: `KeyG`/`Slash` (keyboard), `buttons[2]` (gamepad) →
   `Command.alt`; sim edge-detects via `Tank.altPrev`.
4. `main.ts`: wire alt command; note touch limitation in the menu tiny text
   (line ~212) and docs.
5. `src/test-bridge.ts`: expose mine/pom counts and an `alt` command for tests.

### Acceptance

- New unit test: mine arms after `armPlayer`, then a player contact detonates it.
- New unit test: an opposing shell detonates a mine; a same-faction shell does not.
- New unit test: chain detonation within `blast`; a wall blocks the blast.
- New unit test: player lay → press again → detonate → 1.2 s recharge gate.
- New unit test: Prankster stops at `maxMines` and never mines within 80 px.
- Input test: `KeyG`/`Slash` and synthetic gamepad `buttons[2]` set `alt`.

---

## 7. Scope E — rooms, wording, art, visuals, docs

**Read:** `src/sim/maps.ts`, `src/main.ts`, `src/render/renderer.ts`,
`src/presentation/level-select.ts`, `src/visual-scenes.ts`,
`src/visual-motion-scenes.ts`, `tests/unit/maps.test.ts`,
`tests/unit/renderer.test.ts`, `tests/unit/level-select.test.ts`,
`docs/progress.md`. (Scopes A–D output.)

### Edits

1. Append 4 rooms as campaign rooms **16–19**, preserving all 15 existing rooms
   and their order. Grids (22 × 11 interiors, exact):

```text
16 Roaming Patrol   hint: Roamers drive around and shoot on sight. Sentries hold their spot.
......................
..R...####....####....
..........C...........
......##........##....
......................
...C......S.......C...
......................
......##........##..R.
..........C...........
...1..............2...
......................
expectedEnemies: 3

17 Corner Shark     hint: The Bruiser banks shells around corners. Watch the red line, then move! 5 hits to kill.
......................
..........##..........
..B.......##.......R..
..........##..........
....####......####....
....#..........#......
....#....C..C...#..b..
....####......####....
......................
...1..............2...
......................
expectedEnemies: 3

18 Confetti Cannons hint: Lobbers ignore walls: a red ring shows where the pom lands. Keep moving, then rush them!
......................
..L.......##.......L..
..........##..........
...C......##......C...
...........l..........
.....####....####.....
.....#..........#.....
.....####....####.....
..R..............R....
...1..............2...
......................
expectedEnemies: 5

19 Prank Alley      hint: Pranksters lay jack-in-the-box mines. Shoot them from afar. Your own mine: G / Slash, press again to detonate.
......................
..M....##......##..M..
.......##......##.....
......................
...C....C....C....C...
......................
.....##..........##...
.....##....R.....##...
......................
...1..............2...
..........m...........
expectedEnemies: 4
```

2. `main.ts`: replace `sentry`/`sentries` HUD wording with `enemy`/`enemies`
   (lines 528 and 531) and update the menu tiny text (line 212) to mention
   Roamers/Bruisers/Lobbers/Pranksters, mines, and the alt button.
3. `src/render/renderer.ts`: per-kind tank art, HP pips (`maxHp`), Bruiser red
   telegraph trace, Lobber landing ring, mines (armed vs unarmed), poms.
   **Keep player geometry identical** (`HULL`/`BARREL`/`SHADOW`/`WRECK` rects,
   `#378ebb` etc.). `renderer.test.ts` spreads tanks (`{...tank}`), so new Tank
   fields must be render-read-only; `fillOf` picks the LAST matching
   rect+style, so enemies drawn before players keep player assertions valid.
4. `src/presentation/level-select.ts`: preview colors for new symbols.
5. Add 3 static visual scenes: `enemy-kinds`, `mines-armed`, `lobber-pom`
   (register in `src/visual-scenes.ts`; honour
   `tests/visual/catalogue-support.ts` and the `visual-*-scenes.test.ts`
   registration constraints).
6. `docs/progress.md`: record the change, exact commands, results, evidence, and
   the touch-input limitation.

### Acceptance

- `maps.test.ts` campaign sweep passes in both modes (solo = uppercase only).
- `renderer.test.ts` snapshots updated intentionally (no player-geometry drift).
- `level-select.test.ts` passes with new preview colors.
- `npm run capture:visual:baseline` regenerates the dev catalogue; note that
  `docs/visual-catalogue/current/*.png` are **development evidence, not approved
  baselines** — never call them approved.

---

## 8. Test strategy map (which file proves what)

| Concern                                    | Test file                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Sentry timing/turn/LOS/`targetId`          | `tests/unit/enemies.test.ts`                                                  |
| Roamer/Bruiser/Lobber/Prankster brains     | `tests/unit/enemies.test.ts`                                                  |
| Determinism, step order, room end clears   | `tests/unit/world.test.ts`                                                    |
| Border/passability oracle, coop deep-equal | `tests/unit/map-border-loading.test.ts`                                       |
| Symbol counts, expected-enemy messages     | `tests/unit/maps.test.ts`, `tests/unit/cork-state.test.ts`                    |
| Bridge surface for new state               | `tests/unit/test-bridge.test.ts`                                              |
| Tank art/pips/telegraphs/mines/poms        | `tests/unit/renderer.test.ts`                                                 |
| Preview colors                             | `tests/unit/level-select.test.ts`                                             |
| Scene registration                         | `tests/unit/visual-scenes.test.ts`, `tests/unit/visual-motion-scenes.test.ts` |

Add per-module unit tests alongside: `nav`, `ballistics`, `poms`, `rng`, mines
in `combat`. No `any`, no ESLint disables, no weakened assertions.

---

## 9. Verification commands & environment

```bash
npm run verify:fast          # format, lint, typecheck, unit tests
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:visual
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e
npm run capture:visual:baseline
```

- Browser commands **require** the `PLAYWRIGHT_BROWSERS_PATH` override; the
  launcher's default path does not exist.
- Firefox fails locally (`unshare(CLONE_NEWPID): EPERM`) — a nono sandbox
  limitation. Report it; never claim it passed locally, never weaken the sandbox.
- Run `verify:fast` at the end of every scope, not only at the end.

---

## 10. Do not

- Do not install/update packages or change the lockfile.
- Do not commit, push, or alter remote/branch settings without explicit approval.
- Do not port tank-tank soft separation (issue #34).
- Do not replace `resolveShellCollisions` with a distance check.
- Do not store player body heading in the sim.
- Do not store RNG as a function on `World`.
- Do not weaken/disable assertions, lint rules, or tests to get green.
- Do not describe development visual captures as approved baselines.
- Do not add touch mine controls and claim parity — document the gap.

---

## 11. Fresh-session prompts

Copy the relevant line to start a session:

- **Scope A:** "Read `docs/enemy-kinds-opencode-handoff.md` §2 and §3, then
  implement Scope A. Read only the files listed in Scope A's `Read` line.
  Run `npm run verify:fast` and report."
- **Scope B:** "Read `docs/enemy-kinds-opencode-handoff.md` §4, then implement
  Scope B on top of Scope A. Read only the files listed in Scope B's `Read` line."
- **Scope C:** "Read `docs/enemy-kinds-opencode-handoff.md` §5, then implement
  Scope C. Read only Scope C's `Read` files."
- **Scope D:** "Read `docs/enemy-kinds-opencode-handoff.md` §6, then implement
  Scope D. Read only Scope D's `Read` files."
- **Scope E:** "Read `docs/enemy-kinds-opencode-handoff.md` §7, then implement
  Scope E. Read only Scope E's `Read` files."
