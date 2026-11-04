# Agent Instructions — Toybox Tanks Asset Integration

## 1. Mission and authority

Integrate the supplied artwork as small, reviewable rendering changes. This is a small browser game, not an engine project.

Authority order for this task:

1. The user's explicit current decisions and existing repository/project instructions.
2. The original HTML prototype for exact existing behavior, constants, visual reference and corner cases.
3. The actual generated asset source for its API and source-art coordinate conventions.
4. This handoff for integration intent and unresolved decisions.
5. Preview images as visual references only, never as authoritative level data.

If sources conflict, report the conflict. Do not guess missing dimensions, silently change rules, or claim compatibility without tests. Do not overwrite an existing AGENTS.md; reference this document from the project's existing instruction mechanism if appropriate.

## 2. Inspect before editing

- Find the original prototype, current renderer, input adapters, map loader, collision code, application orchestration and release build.
- Find all actual package files and read the JavaScript, JSON and package README files.
- Identify the actual library globals and layer schema. A part may use `role` or `rotation` depending on the asset-study revision. Do not infer the version from a filename alone.
- Locate world dimensions, wall geometry, tank radius, muzzle positions, angles, canvas transforms, DPR handling and existing draw order in the real source.
- Record the baseline test results and capture baseline screenshots when the tooling allows it.
- Report what is available, absent, ambiguous, untested or incompatible before implementation.

## 3. Preserve the existing game

A visual integration must not change:

- Fixed logical arena dimensions, map text grids or map-validation rules.
- Existing movement, normalized diagonals, aiming, cooldowns, projectile limits, health or invulnerability.
- Existing collision shapes, earliest-hit handling, one-wall-bounce behavior or conservative corner handling.
- Tank non-blocking behavior and the lack of projectile–projectile collision.
- Team hit rules: player shots hit enemies, enemy shots hit players; no friendly fire.
- Muzzle-path collision checks. Moving the illustrated barrel is not authorization to move the simulation muzzle.
- Defeat priority on simultaneous last-enemy/last-player death, single outcome resolution, room progression or player restoration.
- Keyboard bindings, focus-loss handling, held-input clearing, pause or full reset behavior.

If visual art and authoritative geometry do not align, adapt the render transform or explicitly ask for a gameplay decision. Never fix the mismatch by casually changing collision constants.

## 4. Keep architecture boundaries

- Simulation owns gameplay state and accepts time/commands; it must not import image objects, SVG, DOM, Canvas or loading APIs.
- Renderer reads state without mutating gameplay.
- Static resources and decoded-image caches belong to the presentation/application layer.
- New visual animation state must not decide hits, targeting, cooldowns, outcomes or progression.
- Static caches may survive a retry. Entity-bound visual state must not leak into a new world or attach to reused entity IDs.
- No framework/engine switch, entity framework, generalized material system or new editor unless explicitly requested.

## 5. Scope control

The catapult, moving enemy tank, chick decoy and destructible cork are artwork proposals, not proven existing mechanics. Do not spawn or activate them in normal gameplay merely because art exists.

Use a visual sandbox for unimplemented entities and states. Do not add HP, splash damage, enemy distraction, navigation, terrain destruction, over-wall attacks or new win conditions as part of an asset integration.

Existing player panzer and stationary enemy turrets can be candidates for a rendering-only replacement after visual approval. Floors, block skins and border art are rendering changes only if the underlying geometry and framing remain intact.

## 6. Browser and delivery requirements

Retain both a statically hostable version and a self-contained single-HTML version playable via `file://` without a server, network, external fonts or external assets.

Load/decode graphics before gameplay. Handle loading failure with a stable, useful error state. Do not decode SVG or create image objects every frame. Keep authored SVG self-contained and trusted; no external references or arbitrary user markup.

Use actual tested browser behavior as evidence. Node checks, XML parsing and successful PNG generation are not browser, keyboard, Safari/iOS or gamepad hardware tests.

## 7. Work in small increments

Recommended sequence: inventory → floor → existing wall/block skin → border → existing tank/turret rendering → separate visual sandbox for future entities.

For each increment, report:

- Files changed and why.
- Geometry/behavior preserved or any explicitly authorized change.
- Checks run, results and evidence.
- Manual checks not run, blockers and known limitations.

Do not weaken tests to make the new rendering pass. No unrelated cleanup. Stop at missing consequential design decisions rather than silently implementing assumptions.
