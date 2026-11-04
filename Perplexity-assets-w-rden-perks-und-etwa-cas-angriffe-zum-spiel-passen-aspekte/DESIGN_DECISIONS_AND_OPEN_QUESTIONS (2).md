# Design Direction and Open Questions

## Visual direction

- Independent toy world on a real children's-room floor.
- Orthographic top-down with restrained shadows, not isometric or photographic miniatures.
- Warm floor, wooden cover, strong silhouettes and readable trajectories.
- Blue/orange players; charcoal/red enemies in the asset studies.
- Toys/materials explain the world, rather than merely renaming military mechanics.
- No tiny attached upgrades required. Pre-game playstyle selection is a future direction, not an implemented loadout system.

## Environment

Warm wood is the proposed first floor; light wood and muted carpet are alternatives. The printed-road rug is optional decoration.

The block library has natural wood and red/blue/yellow/green/orange. This does not mean every room should use all colors. Keep the environment calmer than important gameplay cues.

The preferred border uses long natural-wood blocks with a straight continuous inner edge. Corners/roof caps stay outside the arena. Fugues are decorative seams, not openings. Border is fixed and non-destructible.

## Existing versus proposed

| Element | Status | Task boundary |
| --- | --- | --- |
| Player panzer | Existing gameplay | Fit approved art to existing rules |
| Stationary enemy turret | Existing gameplay | Fit approved art to existing rules |
| Floors/block skins/border | Visual proposals | Integrate with authoritative geometry preserved |
| Enemy mobile tank | Art available | Do not infer movement AI exists |
| Catapults | Art and gameplay ideas | Sandbox until mechanics approved |
| Chick | Art and decoy concept | Do not change enemy targeting yet |
| Cork damage frames | Visual states | No automatic HP or terrain destruction |
| Roofs/curved blocks | Visual library | No automatic new collision rules |

## Catapult decisions still needed

Earlier discussion proposed a rolling toy catapult with a visible landing point, possibly a fixed-distance throw over cover. This is not a finalized specification. Resolve movement/aim relationship, inputs, range, flight time, cover interaction, legal landing points, damage, shot limit and cooldown before combat implementation.

Also define pause, room transition, simultaneous outcomes and reset behavior. A ball image and loaded frame do not settle these questions.

## Chick decisions still needed

The intent is a non-damaging wind-up helper that creates a cooperative repositioning opportunity. Movement, stopping, lifetime, activation resource and eligible enemy attention rules remain open.

Candidate constraints discussed: no damage, no projectile shielding, no redirection of already committed catapult impacts. Treat these as proposed rules, not implemented guarantees.

## Cork decisions still needed

Define HP, damage sources, timing and destruction behavior. Any approved destruction must consistently affect movement, shots and sight lines. Damage artwork currently keeps the same footprint. No debris collision is implied.

## Integration decisions still needed

- Actual authoritative package revision when vehicle APIs differ.
- SVG-backed rendering versus preserving a strictly procedural path.
- Acceptable presentation padding for the outward border.
- Supported viewport sizes for acceptance.
- Orange-player shot palette if the single blue projectile asset conflicts with existing ownership cues.

## Non-goals

No class/loadout system, unlock grind, killstreaks, airstrikes, new navigation, enemy AI, engine change, map-editor migration or collision generation from SVG paths as part of this handoff.
