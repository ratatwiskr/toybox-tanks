# Toybox Tanks — backlog (deferred)

These items are explicitly out of scope for the behavior-preserving migration. They are
captured here so they are not smuggled into the migration as speculative infrastructure.

## Deferred features

- Moving/tactical enemies beyond the prototype's stationary sentries.
- Temporary tank tracks, sampled by movement distance and faded over time.
- Faster, non-ricocheting rockets.
- Contact-triggered and remotely detonated mines.
- Destructible cork-like block materials.
- Audio.
- Additional rooms.

## Likely future design direction (planning notes, not final rules)

- Preserve ordinary ricocheting shells.
- Keep enemy states readable.
- Distinguish material appearance from collision behavior.
- Use one authoritative terrain update for movement, projectiles, line of sight, and
  navigation.
- No friendly fire across new weapons.
- Bound explosions and chain reactions.

## Explicitly not authorized by the migration

Do not add speculative weapon registries, empty subclasses, navigation services, ECS,
networking, procedural generation, progression, inventories, a map editor, or a
general-purpose engine in preparation for this backlog.
