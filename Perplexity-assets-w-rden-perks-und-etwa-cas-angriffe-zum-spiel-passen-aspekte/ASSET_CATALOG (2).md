# Asset Catalog and API Contracts

## Package entry points

| Package | Source | Browser global | Inspector |
| --- | --- | --- | --- |
| Vehicles and basic props | toybox-assets.js | ToyboxAssets | toybox-asset-pruefstand.html |
| Block expansion | toybox-blocks.js | ToyboxBlocks | toybox-baukasten-pruefstand.html |
| Floor | toybox-floors.js | ToyboxFloors | toybox-fussboden-pruefstand.html |
| Arena border | toybox-border.js | ToyboxBorder | toybox-rand-pruefstand.html |

These generated files use classic-script globals, not guaranteed ES-module exports. Confirm actual files and exported helpers. A thin build-time adapter is acceptable; an engine migration is not.

## Vehicles and basic props

Recorded IDs:

- tank-blue, tank-orange, tank-enemy
- turret-enemy
- catapult-orange, catapult-enemy
- bullet-blue, bullet-enemy, catapult-ball
- chick
- block-wood, block-blue, block-red
- block-cork-* in three damage states

### Revision warning

An earlier kit used parts[].rotation and cork suffixes 1/2/3. A later kit used parts[].role and suffixes 0/1/2. Layer helpers and shadow metadata also differ. Read the source and create an explicit semantic mapping; never assume the filename identifies the revision.

### Coordinates

- Source viewBox: -64 -64 128 128.
- Origin/pivots: (0,0).
- Forward: positive X/right.
- Public art API angles: degrees, clockwise in screen coordinates.
- Tank art muzzle marker: [54,0].
- Catapult art release marker: [30,0].
- These markers are art coordinates, not approved gameplay muzzle/range values.
- size scales the whole source viewBox, including transparent margins; it is not collision diameter.

Layers: body rotates by body heading; aim by weapon heading; loaded follows aim and may be hidden; fixed stays unrotated.

Later recorded API:

```js
const svg = ToyboxAssets.svg('tank-blue', {
  bodyAngle: 20, aimAngle: -35, size: 128,
  shadow: true, anchors: false, loaded: true
});
const layers = await ToyboxAssets.prepareLayers('tank-blue', 256);
ToyboxAssets.drawLayers(ctx, layers, x, y, 128, {
  bodyAngle: 20, aimAngle: -35
});
```

Also recorded: definitions, markup(id, options), image(id, options). Verify prepareLayers/drawLayers exist before using them. The layer helper excludes contact shadows/debug anchors. Whole-pose image() is a preload convenience, not a per-frame animation method.

The blue projectile study asset is not a decision to recolor every player's existing shots blue. Preserve existing ownership cues or request a palette decision.

## Expanded blocks

60 variants: ten shapes × six colors.

Shapes: square, brick, long, triangle, round, half-round, wall, tower, roof-round, roof-square.

Colors: natural, red, blue, yellow, green, orange.

ID pattern: block-{shape}-{color}, e.g. block-brick-natural or block-roof-round-red.

```js
ToyboxBlocks.svg('block-roof-square-yellow', {
  size: 128, angle: 0, shadow: false
});
```

Recorded API: definitions, markup, svg, installInto. Same centered 128-unit source convention as vehicles.

installInto(ToyboxAssets) copies definitions only. It does not validate receiving-library layer/shadow compatibility. Check schemas first; do not blindly merge different revisions. A separate preload path can be safer.

Roofs and supports are separate pieces. Avoid double contact shadows in compositions. Roofs should not conceal traversable combat space. Crenellations, curved blocks and triangles are artwork, not permission to replace current rectangular collision geometry. visualBounds and material metadata are descriptive, not authoritative physics.

The new painted blocks are fixed; cork destruction remains a separate proposal.

## Floor

IDs: wood-warm, wood-light, carpet-neutral.

Tiles: 512×512 art units, repeatable. This is a visual-study scale, not a mandated world dimension. Rug: separate transparent 480×320 source. Printed roads are flat decoration with no collision or movement modifier.

```js
const floor = await ToyboxFloors.prepare(ctx, 'wood-warm');
const rugImage = await ToyboxFloors.prepareRug();
// Under the existing world-to-screen transform:
ToyboxFloors.draw(ctx, floor, 0, 0, worldWidth, worldHeight);
ctx.drawImage(rugImage, rugX, rugY);
```

Also recorded: floors, rug, tileSVG(id), backgroundSVG(id, width, height, withRug).

Keep patterns world-anchored. Preview rug positions are not map metadata. Do not stretch preview PNGs into production backgrounds.

## Border

IDs: rail-natural, rail-blue, rail-red, corner-plain, corner-tower, roof-cone-red, roof-cone-blue, roof-pyramid-red, roof-pyramid-blue.

Border parts have individual viewBoxes; do not treat them as centered vehicle-sized sprites.

Top rail: local origin (0,0), length along positive X, inner edge y=0, material at negative Y. Default corner occupies negative X/Y. Rotate around the corresponding arena corner for other sides.

```js
const options = {
  width: worldWidth, height: worldHeight,
  thickness: approvedVisualThickness,
  towers: false, accents: false, guides: false
};
const image = await ToyboxBorder.image(options);
const pad = options.thickness * 1.5 + 8;
ctx.drawImage(image, -pad, -pad);
```

Also recorded: palette, pieces, segment(length, thickness, color), borderMarkup(options), svg(options).

The assembled image contains outer padding; drawing at (0,0) would offset the arena origin. Use actual world dimensions, not preview defaults. Physical material lies outside the playable rectangle; a subpixel anti-aliased outline may straddle its edge. Visual seams are not holes. Towers do not change corner collision. Border is not destructible.
