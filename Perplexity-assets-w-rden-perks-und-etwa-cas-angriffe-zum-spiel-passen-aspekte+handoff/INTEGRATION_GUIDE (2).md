# Integration Guide

## 1. Baseline and inventory

Inspect the actual source before changes. Identify world bounds, map cell sizes, wall rectangles, tank radius, muzzle origin, heading units, draw order, world-to-screen transforms, DPR/resize behavior, pause/reset lifecycle and both release builds.

Capture baseline tests and screenshots. Check exact asset schemas and API availability. Report conflicts rather than selecting convenient constants from preview code.

Confirm whether SVG-backed rendering is accepted or the paths should be ported to the existing procedural Canvas approach. The asset study does not authorize replacing the game's visual style wholesale.

## 2. Minimal resource adapter

Use a small presentation-only adapter to validate required IDs, preload/decode resources, cache them, convert coordinates/angles and draw them. Keep errors stable and visible before gameplay starts.

For rotating vehicles, cache independent source layers and rotate via Canvas transforms. Do not generate whole-pose SVGs every frame. Raster source resolution and logical display size are separate: increasing resolution for DPR must not enlarge the tank.

Convert radians to degrees at the adapter boundary if the actual simulation uses radians. Do not assume this conversion alone resolves a different forward-axis/sign convention; inspect the renderer first.

## 3. Floor

Start with warm wood; compare against the baseline. Draw it under obstacles and entities using existing world transforms. Keep the texture origin fixed in world coordinates. Rug remains optional, flat decoration.

Do not turn road markings into boundaries or terrain effects. Review with live bullets, aiming aids and damage feedback, not just an empty-floor PNG.

## 4. Existing wall skins

Use rectangular-compatible block art on existing wall cells/rectangles. Preserve all authoritative dimensions. A decorative line is not a crack through which a projectile can pass.

Use parametric/repeated art if stretching would make edge widths inconsistent. Do not add rounded, triangular or crenellated collision surfaces without approval.

## 5. Border and viewport

Align the border's inner rectangle exactly to existing world boundaries; draw it outward. Start with natural wood and plain corners. Add accents/roofs only after clarity review. Cosmetic joints never become separate physics contacts.

An outward border needs presentation space. If the original canvas shows only the arena, report the conflict and propose the smallest reviewed framing change. Do not silently shrink the arena, add playable world space or break fixed aspect/letterboxing rules. Wider displays must not reveal additional play area.

Respect the assembled image's padding offset. Test all four sides and corners.

## 6. Existing tanks and turrets

Rotate hull and weapon independently, keep fixed bases fixed, and keep labels/HUD unrotated. Preserve disabled-player appearance and hit/invulnerability feedback.

Fit art to physics. The source muzzle at [54,0] is not authority to move the simulated muzzle. If one uniform scale cannot align both hull and barrel, adjust weapon art or its render transform deliberately. Preserve the muzzle-path collision check.

## 7. Future-content sandbox

Preview catapults, the chick, cork damage frames and unused enemy artwork outside normal progression. Selecting a frame is not implementing a mechanic. Do not add new entities to production room spawns without authorization.

Catapult body/arm separation is an art capability, not a finalized independent-aim rule. A loaded ball should not remain duplicated in a future airborne-ball animation. Ground shadow and airborne ball should be independently placeable.

## 8. Suggested draw order

1. Floor.
2. Flat rug/printed decoration.
3. Ground contact shadows.
4. Solid cover and border.
5. Vehicle bodies, turrets and characters.
6. Projectiles/airborne art.
7. Readable targeting/warning and hit feedback.
8. HUD/overlays.

Adapt this to existing rendering. Do not let roofs or decoration hide combat or collision edges.

## 9. Offline release

Keep editable sources in the repository. Embed required code and art into the single-HTML release through the existing build. Avoid runtime fetch, external fonts/images/styles and assumptions about a server. Verify actual file:// behavior separately from static hosting.

The generated inspector HTML is a reference packaging approach, not proof of browser compatibility.

## 10. Completion report

List package/source revisions, changed files, preserved contracts, tests and evidence, browser/manual checks, untested targets, blockers and deferred decisions. Distinguish successful rendering from completed gameplay or good visual quality.
