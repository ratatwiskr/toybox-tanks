# Integration Guide

## Phase 0 — Establish actual contracts

Create a brief inventory before modifying production code:

- Which package revision is present? Which IDs and helper functions exist?
- What are the original logical world bounds and wall-cell dimensions?
- Is the existing wall system tile-based, rectangle-based, or both?
- What units/sign convention do body and aim angles use?
- What transform maps world coordinates into the visible canvas?
- How are resize, DPR, aspect ratio, letterboxing and startup failures handled?
- How does the single-HTML release embed code/resources today?
- What is the existing baseline visual style? Is an SVG-backed rendering change explicitly acceptable, or must the art be ported to procedural Canvas?

Do not invent an answer when source inspection is required.

## Phase 1 — Add a small presentation-only asset adapter

Responsibilities:

1. Validate required source IDs and helper availability.
2. Load/decode required resources once before gameplay.
3. Cache by actual asset ID, palette, source resolution and any genuinely baked pose/state.
4. Convert world position/angles and intended visual scale to the source-art contract.
5. Draw without writing to the world state.
6. Surface resource errors through existing application UI, including first-start failure.

Do not introduce a general asset engine. Do not poll input, advance timers or schedule simulation inside the adapter. Keep renderer types out of the simulation.

For dynamically rotated entities, prefer preloaded independent layers. Do not cache thousands of arbitrary rotated whole-pose images. If higher raster resolution is needed for DPR, retain the original logical drawing size; resolution and gameplay scale are separate decisions.

## Phase 2 — Floor first

Use the warm wood as the proposed initial floor. Preserve the original framing unless a visual change is explicitly approved.

- Fill the arena using a repeating source tile under the existing world transform.
- Keep wood grain and seams low contrast.
- Use a persistent world-origin pattern; no texture swimming when entities move.
- Keep the rug optional, flat and non-colliding.
- Do not derive terrain data from floor pixels or road graphics.

Compare with the baseline while tanks, bullets, aiming helpers and warning marks are visible. A floor-only image is insufficient evidence of readability.

## Phase 3 — Existing walls, then the outer border

Map existing wall rectangles/cells to rectangular-compatible source art. Keep authoritative bounds exactly unchanged. Do not create new walkable gaps to match decorative seams.

Do not stretch a source asset arbitrarily if this makes its edge/texture thickness inconsistent; either use the parametric rectangular art or a simple repeated skin. Decorative grooves stay decorative.

For the border:

- Align its inner rectangle to the original collision boundary.
- Draw the physical border outside that rectangle.
- Start with natural wood, plain corners and no towers; add optional accents after comparison.
- Preserve original collision corner handling. Cosmetic seams must not become separate collision surfaces.

### Presentation-space issue to resolve explicitly

The current canvas may display only the logical arena. An outward border then needs visible non-playable presentation space or will be clipped. Do not silently add world area or shrink the arena to make it fit.

Report the current viewport contract and propose the smallest framing adjustment. Any changed on-screen arena size, aspect framing or letterbox behavior requires conscious review. Keep shared-screen rules intact: wide displays must not reveal additional playable area.

## Phase 4 — Existing tank and turret visuals

- Draw hull/frame using body heading.
- Draw turret/weapon using aim heading.
- Keep shared pivots aligned after scaling and translation.
- Keep P1/P2 labels and HUD orientation independent of vehicle rotation.
- Preserve disabled-player visibility, hit feedback and temporary-invulnerability indication.
- Distinguish enemy silhouettes and charcoal/red accents from blue/orange players.

### Fit art to geometry, not geometry to art

Source tank muzzle `[54,0]` is an art-space point. Scaling the complete sprite must not silently move the simulation firing origin. Inspect whether one scale can align both hull and muzzle. If not, adjust the barrel layer/art or propose a specific visual correction; keep physics authoritative.

Likewise, an art viewBox of 128 units is not the collision diameter. A render footprint reference is not an instruction to change tank radius.

## Phase 5 — Future content only in a sandbox

Provide a small presentation sandbox for:

- Catapult loaded/unloaded states and body/weapon orientation.
- Catapult ball and its separate ground shadow.
- Chick scale and outline.
- Cork intact/damaged/heavily damaged artwork.
- Decorative roofs and crenellated shapes.

No automatic addition to regular room spawns or progression. A sandbox that manually selects a damage state is not destructible-terrain implementation.

## Layering proposal

Adapt to the existing renderer rather than replacing it wholesale:

1. Floor.
2. Flat rug/printed decoration.
3. Ground contact shadows.
4. Existing solid cover and border.
5. Tank bodies, turrets and other entities.
6. Projectiles; any future airborne art with explicit display ordering.
7. Important aiming/warning indicators and hit feedback where they remain legible.
8. HUD and overlays.

Do not add overlapping roofs that hide combat. Ensure foreground effects do not conceal collision edges or bullets.

## Packaging

Retain editable source assets in the repository, but embed required markup/images/code into the single-HTML release through the existing build process.

- Do not fetch JSON/SVG files at runtime in the self-contained release.
- Do not rely on a server, CDN, remote font, external stylesheet, worker URL or remote image.
- Preserve explicit SVG dimensions/viewBoxes and self-contained authored content.
- Preload before combat and display stable errors when loading fails.
- Keep normal static hosting and direct local-file startup as separate acceptance checks.

The inspectable HTML studies demonstrate intended packaging, not proof of target-browser compatibility.

## Completion report

List changes, preserved geometry, checked package revisions, build outputs, automated tests, manual input/visual checks, untested targets and any decisions intentionally deferred. Do not declare catapult, decoy, destructible terrain, Safari or gamepad support complete based on artwork or synthetic tests.
