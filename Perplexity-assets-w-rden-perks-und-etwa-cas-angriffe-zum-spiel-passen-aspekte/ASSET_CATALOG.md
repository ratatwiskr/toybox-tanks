# Asset Catalog and Render Contracts

## 1. Package inventory

The following names and APIs were recorded in the generation conversation. Confirm them against the actual archive contents; the vehicle kit was generated in more than one revision.

| Package | JavaScript source | Global | Standalone inspector |
| --- | --- | --- | --- |
| Vehicle study | `toybox-assets.js` | `ToyboxAssets` | `toybox-asset-pruefstand.html` |
| Block expansion | `toybox-blocks.js` | `ToyboxBlocks` | `toybox-baukasten-pruefstand.html` |
| Floors | `toybox-floors.js` | `ToyboxFloors` | `toybox-fussboden-pruefstand.html` |
| Border | `toybox-border.js` | `ToyboxBorder` | `toybox-rand-pruefstand.html` |

These are dependency-free classic-script/global libraries in the generated studies, not guaranteed ES-module packages. A build-time wrapper or small adapter is acceptable. Do not assume named `import` exports exist.

## 2. Vehicle and basic-prop study

### Recorded asset IDs

- `tank-blue`, `tank-orange`, `tank-enemy`
- `turret-enemy`
- `catapult-orange`, `catapult-enemy`
- `bullet-blue`, `bullet-enemy`, `catapult-ball`
- `chick`
- `block-wood`, `block-blue`, `block-red`
- Three `block-cork-*` states. One recorded revision uses `0`, `1`, `2`; an earlier revision uses `1`, `2`, `3`. Resolve actual IDs from the source and map semantic states explicitly. Do not hard-code assumed numbering.

Player color is blue/orange. Enemy bodies are charcoal with red accents. The current single blue player-projectile asset is not a newly approved rule that every player's shot must be blue; preserve the existing player/team visual convention or request approval for a palette change.

### Source coordinates

- Vehicle/prop source viewBox: `-64 -64 128 128`.
- Local origin and illustrated pivots: `(0, 0)`.
- Default forward direction: positive X/right.
- Recorded API angles: degrees, positive clockwise on the SVG/Canvas screen plane.
- Source tank muzzle marker: `[54, 0]`.
- Source catapult release marker: `[30, 0]`.
- These are art-space markers, not authoritative gameplay distances.
- `size` scales the entire 128-unit source viewBox, including transparent margins. It is not tank diameter or collision radius.

### Layers

- `body`: hull/frame; rotated by body heading.
- `aim`: turret/weapon; rotated by aim heading.
- `loaded`: visible loaded catapult ball; follows aim; can be hidden.
- `fixed`: unrotated component such as turret base.

Inspect the actual schema: later definitions use `parts[].role`; earlier definitions used `parts[].rotation`. The earlier convenience API does not necessarily include layer-loading helpers. Shadow metadata also varies; never assume identical shapes across revisions.

### Recorded later API

```js
ToyboxAssets.svg(id, {
  bodyAngle: 20, aimAngle: -35, size: 128,
  loaded: true, shadow: true, anchors: false
});

const layers = await ToyboxAssets.prepareLayers(id, 256);
ToyboxAssets.drawLayers(ctx, layers, x, y, 128, {
  bodyAngle: 20, aimAngle: -35, loaded: true
});
```

Also recorded: `definitions`, `markup(id, options)`, `image(id, options)`.

`prepareLayers` decodes source layers once. `drawLayers` handles rotations and draws around a shared center; it does not draw contact shadows or debug anchor overlays. Confirm helper availability before using it. If missing, implement only the required adapter rather than replacing the renderer.

Static images returned by `image` represent a whole pose; do not generate one on every animation frame.

## 3. Block expansion

60 variants: ten shapes × six colors.

Shape IDs:

`square`, `brick`, `long`, `triangle`, `round`, `half-round`, `wall`, `tower`, `roof-round`, `roof-square`.

Color IDs:

`natural`, `red`, `blue`, `yellow`, `green`, `orange`.

Full ID pattern: `block-{shape}-{color}`, for example:

- `block-brick-natural`
- `block-tower-blue`
- `block-roof-round-red`
- `block-roof-square-yellow`

Common viewBox/origin: `-64 -64 128 128`, `(0, 0)`.

```js
ToyboxBlocks.svg('block-roof-round-red', {
  size: 128, angle: 0, shadow: false
});
```

Recorded API: `definitions`, `markup`, `svg`, `installInto`.

`installInto(ToyboxAssets)` copies definitions; it does not prove schema compatibility. Verify the actual receiving library's layer and shadow assumptions first. Prefer a narrow renderer adapter or separate preload path when revisions differ. Do not merge source dictionaries blindly.

Roofs are separate decorative pieces. Place them on solid supports, preferably outside the playable boundary. Do not imply a traversable passage underneath a roof. Avoid stacking multiple full contact shadows when composing tower + roof.

`visualBounds`, `category`, `material` and `destructible` are art metadata, not authoritative physics or permission to add a mechanic. Triangles, curves and crenellations require an explicit geometry decision before use as new gameplay shapes. Use rectangular-compatible shapes for the initial wall reskin.

## 4. Floors and rug

Floor IDs: `wood-warm`, `wood-light`, `carpet-neutral`.

- Repeating source tiles: 512 × 512 art units.
- The tile size is a visual-study starting point, not a required game-world scale.
- Floor fills are separate from border, obstacles and entity shadows.
- The rug is a separate transparent 480 × 320 image.
- Rug roads are printed decoration only, not collision or terrain modifiers.

```js
const floor = await ToyboxFloors.prepare(ctx, 'wood-warm');
const rugImage = await ToyboxFloors.prepareRug();
// During rendering, under the existing world-to-screen transform:
ToyboxFloors.draw(ctx, floor, 0, 0, worldWidth, worldHeight);
ctx.drawImage(rugImage, rugX, rugY);
```

Recorded API also includes `floors`, `rug`, `tileSVG(id)` and `backgroundSVG(id, width, height, withRug)`.

Keep pattern origin world-anchored. The background helper's rug location is a preview composition, not level metadata. Do not stretch a complete preview PNG into the production arena.

## 5. Border kit

Nine source-part IDs:

- `rail-natural`, `rail-blue`, `rail-red`
- `corner-plain`, `corner-tower`
- `roof-cone-red`, `roof-cone-blue`
- `roof-pyramid-red`, `roof-pyramid-blue`

Unlike vehicle art, border parts have different viewBoxes and must not be normalized by assuming every piece is a centered 128-unit square.

A top rail starts at `(0,0)`, extends along positive X, has its inner edge at `y = 0`, and occupies negative Y. A default corner occupies negative X and negative Y. Rotate around the relevant arena corner for other sides.

```js
const options = {
  width: worldWidth, height: worldHeight,
  thickness: approvedVisualThickness,
  towers: false, accents: false, guides: false
};
const borderImage = await ToyboxBorder.image(options);
const pad = options.thickness * 1.5 + 8;
// During rendering, in logical world coordinates:
ctx.drawImage(borderImage, -pad, -pad);
```

Recorded API: `palette`, `pieces`, `segment(length, thickness, color)`, `borderMarkup(options)`, `svg(options)`, `image(options)`.

The assembled image includes outer padding. Drawing it at `(0,0)` would offset the boundary; use the correct pad offset or an equivalent explicit transform. Use the supplied width/height from the actual game, not the preview's 960 × 560 defaults.

The art lies outside the playable rectangle, with a subpixel antialiased outline at the inner edge. It does not create physics. Material seams are not gaps. Tower decoration does not change original corner collision behavior. Border pieces are not destructible.
