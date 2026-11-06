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

- State is plain data (`World`, `Tank`, `Shell`, `Wall`) with no hidden engine objects.
- Time is explicit: `stepWorld(world, dt, commands)` advances the world by `dt` seconds.
  Simulation code must not read wall-clock time, schedule callbacks, or poll devices.
- Input is explicit: each player receives a `Command` describing movement, turret turn,
  aim, and fire intent. The input adapter owns key state; the simulation owns results.
- Randomness is not ambient. If gameplay later needs randomness, inject seeded values.
- The world state machine is `menu → playing ⇄ paused → cleared/defeat → completed`, plus
  `error` for invalid startup maps. `stepWorld` only advances while `playing`.
- Outcomes commit once. A same-tick defeat takes precedence over victory, and committing
  an outcome clears combat shells.
- Repeated command sequences from an identical world must produce equivalent state.

## Modules

| Module                   | Responsibility                                                               |
| ------------------------ | ---------------------------------------------------------------------------- |
| `src/config.ts`          | Logical arena size, fixed step, movement, combat, and timing defaults.       |
| `src/sim/types.ts`       | Shared plain-data types for factions, commands, tanks, shells, walls, world. |
| `src/sim/maps.ts`        | Authored map grids, validation, spawn/sentry placement rules.                |
| `src/sim/world.ts`       | World creation, movement, firing, swept hits, damage, outcome commits.       |
| `src/render/renderer.ts` | DPR-aware Canvas rendering of floor, walls, tanks, shells, debug overlay.    |
| `src/input/keyboard.ts`  | Key sets, held-key state, focus/overlay guards, command sampling.            |
| `src/main.ts`            | Menus, overlays, HUD, pause/retry, RAF loop, fixed-step accumulator.         |

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
- Release builds do not install deterministic test hooks. Browser tests currently use
  real UI and real keyboard input; the typed test bridge arrives in Gate D.

## Scope

Gate B provides a minimal executable skeleton: movement, wall blocking, aiming/firing,
swept shell hits, damage/invulnerability, and outcome commits. Enemy AI, shell bounce,
muzzle sweep, effects, the test bridge, and full prototype parity are Gate C/D work.
Do not add speculative architecture while implementing them.
