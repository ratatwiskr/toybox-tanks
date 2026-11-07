# Architecture

This document describes the intended shape of the migrated game. It is deliberately
small: plain modules, plain data, explicit time, and one direction of dependency flow.

## Dependency direction

```text
config  ──►  sim  ──►  main (application orchestration)
                 └──►  render / input adapters
```

- `src/config.ts` owns immutable gameplay constants.
- `src/sim/` owns gameplay state and rules. It must not import adapters, rendering, UI,
  or application composition, and it must not touch DOM or Node globals.
- `src/render/` reads world state and draws it. It never mutates gameplay.
- `src/input/` turns real input into commands. It never mutates gameplay directly.
- `src/main.ts` owns the browser lifecycle: menus, pause/retry, the RAF loop, the fixed
  timestep, HUD, and wiring adapters to the simulation.

`tsconfig.sim.json` enforces the DOM-free boundary at compile time. ESLint enforces it
at lint time with restricted globals, restricted imports, and restricted properties.

## Simulation contract

- State is plain data (`World`, `Tank`, `Shell`, `Wall`, `Effect`) with no hidden engine
  objects.
- Time is explicit: `stepWorld(world, dt, commands)` advances the world by `dt` seconds.
  Simulation code must not read wall-clock time, schedule callbacks, or poll devices.
- Input is explicit: each player receives a `Command` describing movement, turret turn,
  aim, and fire intent. The input adapter owns key state; the simulation owns results.
- Collision is swept and earliest-hit: shells travel their full distance per step, bounce
  once off a wall and consume the remaining distance, and are removed on a second contact,
  an ambiguous corner, or leaving the arena. Fresh shots sweep 23 px out of the muzzle so
  they never appear beyond a nearby wall.
- Sentries are deterministic: nearest visible player, line-of-sight gating, bounded turn
  rate, telegraph charge, cancel on lost sight/alignment, and no prediction.
- Feedback is state: spark/poof effects age inside `stepWorld`, and the event log keeps the
  seven most recent entries. Rendering reads them; simulation owns them.
- Randomness is not ambient. If gameplay later needs randomness, inject seeded values.
- The world state machine is `menu → playing ⇄ paused → cleared/defeat → completed`, plus
  `error` for invalid startup maps. `stepWorld` only advances while `playing`.
- Outcomes commit once. A same-tick defeat takes precedence over victory, and committing
  an outcome clears combat shells.
- Repeated command sequences from an identical world must produce equivalent state.

## Modules

| Module                   | Responsibility                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `src/config.ts`          | Logical arena size, fixed step, movement, combat, and timing defaults.                  |
| `src/sim/types.ts`       | Shared plain-data types for factions, commands, tanks, shells, walls, effects, world.   |
| `src/sim/maps.ts`        | Authored map grids, validation, spawn/sentry placement rules.                           |
| `src/sim/collision.ts`   | Ray/AABB and ray/circle tests, earliest wall, reflection, tank movement, line of sight. |
| `src/sim/combat.ts`      | Firing, muzzle sweep, damage, shell bounce/removal, bounded advancement.                |
| `src/sim/enemies.ts`     | Sentry targeting, LOS, turning, telegraph/cancel, and firing.                           |
| `src/sim/feedback.ts`    | Bounded event log and spark/poof effect creation.                                       |
| `src/sim/world.ts`       | Entity creation, room loading, outcome commits, fixed-step orchestration.               |
| `src/render/renderer.ts` | DPR-aware Canvas rendering, aim/first-bounce guide, effects; read-only canvas surface.  |
| `src/input/keyboard.ts`  | Key sets, held-key state, focus/overlay guards, command sampling.                       |
| `src/input/gamepad.ts`   | Optional pad assignment, deadzones, stick/keyboard precedence, fire, Start edges.       |
| `src/test-bridge.ts`     | Test-build-only scenarios, bounded manual ticks, copied snapshots, events, rendering.   |
| `src/main.ts`            | Menus, overlays, HUD, pause/retry, RAF loop, fixed-step accumulator, input composition. |

## Guardrails

Guardrails are requirements, not suggestions:

- Strict TypeScript across focused projects (`app`, `sim`, `tooling`, `unit`, `e2e`,
  `fixtures`), with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and no
  unused code.
- The sim project has `lib: ["ES2023"]` and `types: []`, so DOM and Node types are absent.
- ESLint's type-checked strict config bans `any`, unsafe operations, non-null assertions,
  inline config, and unhandled union variants.
- Sim-specific ESLint rules ban browser/Node globals, adapter/UI imports, and ambient
  `Math.random`/`Date.now`/`performance.now`.
- `tests/architecture/guardrails.test.ts` lints positive and negative fixtures with
  `ignore: false` and asserts exact rule IDs. Negative fixtures are excluded from normal
  linting so they cannot poison the maintained tree.
- The unit test project includes `DOM` types only so `tests/unit/renderer.test.ts` can
  supply a structural fake canvas and prove rendering is read-only. The simulation project
  remains DOM-free.
- Release builds do not install deterministic test hooks. `__TEST_BUILD__` is a
  compile-time constant replaced by Vite; only the `test` mode installs the bridge. Both
  production release suites assert `window.__TOYBOX_TEST__` is absent even with `?test=1`.

## Test boundary

`src/test-bridge.ts` is an application-layer module: it composes simulation helpers,
scenarios, and a narrow host interface supplied by `src/main.ts`. It does not leak the
mutable world, accepts only validated scenario names/options and bounded tick counts, and
returns copied snapshots. Taking the clock disables RAF simulation while leaving rendering
and HUD updates active, so there is exactly one simulation time owner. Scenario changes
reuse the same input/reset discipline as normal room loads.

## Scope

Gates C and D complete the behavior-preserving migration. Simulation parity covers config,
maps/validation, collision, combat, sentry AI, feedback state, and the fixed-step loop.
Gate D adds keyboard/gamepad adapters, rendering parity (aim/bounce guide and effect
visuals), UI/runtime composition, the typed test-only bridge, manual-tick automation, and
release proof that the bridge is absent. Gate E owns hardening, delivery, cross-browser CI
evidence, and visual-baseline approval. Do not add speculative architecture while
implementing it.
