# Design Direction, Decisions and Open Questions

## Established visual direction

- Shared-screen, local two-player browser game; solo also exists.
- Independent toy designs in a real nursery/children's-room setting.
- Orthographic top-down, not isometric, not a photographed miniature diorama.
- Restrained shape-based art suitable for the existing Canvas renderer.
- Warm floor, wooden cover, strong silhouettes and readable trajectories.
- Blue/orange players, charcoal/red enemies in the generated art study.
- Toys and materials explain the world; do not merely rename military support systems.
- No tiny attached upgrade parts are required for player readability. Pre-game playstyle selection is a direction for future design, not a completed loadout system.

## Environment direction

Warm wooden floor is the proposed first option. Light wood and muted carpet are alternatives. The play rug is optional flat decoration.

The block expansion offers natural wood plus red, blue, yellow, green and orange. Availability of all colors is not a requirement to use them all in one room. Keep the arena calmer than combat indicators.

The preferred border is a closed natural-wood rail built from long blocks. Interior faces are straight and visually precise. Decorative corner towers/roof caps stay outside the playable rectangle. Seams never create gaps. The border is fixed and non-destructible.

## Existing behavior versus proposed content

| Element | Status for this handoff | Integration instruction |
| --- | --- | --- |
| Original player panzer | Existing gameplay | Fit approved art to existing behavior |
| Original stationary enemy turret | Existing gameplay | Fit approved art to existing behavior |
| Floor/block/border art | New visual study | Integrate incrementally with geometry preserved |
| Mobile enemy panzer artwork | Asset only | Do not infer movement AI exists |
| Player/enemy catapult artwork | Asset only; mechanics proposed | Sandbox until rules are approved |
| Chick artwork | Asset only; decoy idea supported | No targeting changes yet |
| Cork damage artwork | Visual states only | No HP, destruction or terrain updates yet |
| Roofs and non-rectangular blocks | Visual library | Avoid new collision rules without approval |

## Questions requiring explicit decisions before gameplay work

### Catapult

The discussion proposed an accessible rolling toy catapult, possibly using a fixed-distance landing point in the aim direction and throwing over cover. None of the following should be assumed final:

- Movement/aim relationship and whether the arm rotates independently.
- Range, trajectory, flight time and input behavior.
- Whether it crosses walls and what counts as a legal landing position.
- Single-target versus area damage, shot limit and cooldown.
- Interaction with simultaneous deaths, room completion, pause and full reset.

A neutral ball asset and a visible loaded state do not define these rules.

### Chick decoy

The intended fantasy is a wind-up toy that creates a cooperative repositioning opportunity, not a damaging summon. Open details include movement/termination, eligible enemy targeting, line-of-sight behavior, lifetime and activation resource.

The earlier proposal favored no damage, no projectile shielding and no redirection of already committed catapult impacts. These are candidate constraints, not implemented guarantees.

### Destructible cork

Open details: HP, damage sources, destruction timing, required terrain updates and debris presentation. Any approved destruction must affect movement, projectiles and line of sight consistently. Keep all current visual damage states on the same footprint until an actual destruction rule is specified.

### Visual integration

- Are SVG-backed images accepted in the production renderer, or should paths be ported to procedural Canvas?
- Which package revision is authoritative where the vehicle kit differs?
- What arena presentation padding is acceptable for an outward border?
- Which actual supported viewport sizes must pass visual review?
- How should orange-player projectiles be represented if existing visuals differ from the single blue study asset?

## Explicit non-goals of this handoff

No new enemy AI, class/loadout system, unlock progression, killstreak system, airstrike, realistic military aesthetic, engine migration, level-editor migration or asset-driven collision generation.
