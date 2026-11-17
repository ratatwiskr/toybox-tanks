# Toybox Tanks — backlog (deferred)

Deferred features are not authorized by the current assignment. They stay out of
scope until a separate task explicitly requests them. Current work is in
`docs/progress.md`; completed features and their evidence are in `docs/history/`.

## Deferred features

- Temporary tank tracks, sampled by movement distance and faded over time.
- Faster, non-ricocheting rockets.
- Further enemy kinds or behaviors beyond the implemented sentry, roamer, bruiser,
  lobber, and prankster set.
- Additional destructible materials beyond three-hit cork.
- Further campaign rooms beyond the current 19, or reordering existing rooms.
- Broader artwork adoption beyond the integrated floor art; see
  `docs/asset-integration-plan.md`.

## Durable design direction (not a task list)

- Preserve ordinary ricocheting shells and the one-bounce contract.
- Keep enemy states readable and telegraph wind-ups.
- Distinguish material appearance from collision behavior.
- Keep one authoritative terrain update for movement, projectiles, line of sight,
  and navigation.
- No friendly fire across new weapons.
- Bound explosions and chain reactions.

## Not authorized without a separate assignment

Do not add speculative weapon registries, empty subclasses, navigation services,
ECS, networking, procedural generation, progression, inventories, a map editor, or
a general-purpose engine in preparation for this backlog.
