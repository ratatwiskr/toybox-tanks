# ADR 0004: Asset integration approach (Phase 0 decision record)

Date: 2026-11-10
Status: Proposed. The owner asked on 2026-11-10 to proceed with the recommendations below; they become accepted when this record is approved in review. This record authorizes no production code, gameplay change, screenshot baseline or CI change.

Related: issue #24, issue #1 (merged as PR #31), `docs/asset-integration-plan.md` (not replaced), ADR 0002 (procedural cork), ADR 0003 (shell-shell collision).

## Context

Issue #24 plans replacing the procedural Canvas look with the supplied toy artwork in small, reviewable, presentation-only steps. Phase 0 of the asset plan asks for an inventory, the conflicts with the current game, chosen options and the decisions that need owner approval. This record is that deliverable. Facts below were read through the GitHub contents API on 2026-11-10 from main `4c926b7` (before PR #33 merged as `cb50b79`). They are file reads, not browser or build runs.

## Inventory

### Pack location and duplicates

The repository holds two directories (`Perplexity-assets-...aspekte/` and `...aspekte+handoff/`) and two matching zip files. File names and sizes are identical between the two directories. Contents were not compared byte for byte. Nothing is deleted by this record.

### Two revisions of the vehicle script

`toybox-assets.js` (20,080 bytes) and `toybox-assets (2).js` (20,461 bytes) are different revisions with the same global name `ToyboxAssets`.

- `toybox-assets.js` (v0.1 study): exports `definitions`, `markup`, `svg`, `image`. Parts carry a `rotation` field (`body`, `aim`, `loaded`, `fixed`). Metadata includes `bodyForward`, `aimPivot`, `footprint` (circle radius 35, visual only) and `suggestedDisplaySize`. Cork assets are `block-cork-1..3` with `damageStage` 0..2. There is no `prepareLayers` or `drawLayers`.
- `toybox-assets (2).js`: exports the same four functions plus `prepareLayers(id, resolution = 256)` and `drawLayers(ctx, layers, x, y, size, options)`. Parts carry a `role` field with the same four values. Shadows are `[rx, ry]` arrays, and there is no `footprint`, `aimPivot` or `bodyForward`. Cork assets are `block-cork-0..2`. Colors and corner radii differ slightly (for example the blue hull is `#458fc5` here and `#458ec3` in v0.1; the sentry hull is `#3c424b` here and `#383d45` in v0.1).
- Both: viewBox -64..64, forward is +X, angles are degrees, tank muzzle `[54, 0]`, sentry assets `turret-enemy` (fixed base plus aim layer) and `tank-enemy`.
- The handoff prose describes the `prepareLayers` API, so it matches the `(2)` file. Which file is the newest delivery is not provable from the repository; the owner is asked to confirm.

### Other scripts

`toybox-blocks.js` (49,217 bytes), `toybox-floors.js` (124,386 bytes) and `toybox-border.js` (8,888 bytes) were not re-verified here. Their APIs are as recorded in `docs/asset-integration-plan.md` section 3 and must be re-checked when the step that uses them starts.

### State of the game this builds on

- Arena 960 × 540, 24 × 13 cells of 40 px, borders generated from 22 × 11 interiors, four rooms, cork procedural (ADR 0002).
- Body heading is presentation state in `src/presentation/body-heading.ts` (PR #31); the renderer already draws body and turret with separate angles.
- Shells now collide with each other (ADR 0003); shell collision radius stays 3 px.
- The local screenshot catalogue (`npm run capture:visual`, `docs/visual-catalogue/`) captures candidates. No baseline is approved and Gate E is not complete.

## Decisions

D1. Source revision. Extract the typed data from `toybox-assets (2).js`, provided the owner confirms it is the newest delivery; otherwise from `toybox-assets.js`. The adapter reads checked-in typed data and never calls the pack's globals, so a different revision later only means regenerating that data. Status: owner confirmation open.

D2. Rendering approach. Layers as data, rasterized once, drawn with `drawImage` (option C in issue #24), with the procedural drawing kept as fallback. No runtime fetch, CDN, script evaluation or external resource. Cork stays procedural.

D3. Sentry palette. Players keep blue and orange. Sentries move to the art's charcoal and red only after candidate screenshots are compared and approved; until then the current pink stays.

D4. Shells. Unchanged until the sentry palette is decided. Player shells keep the shared pale yellow unless the owner approves blue and orange variants; no orange bullet is invented, because the pack only has a blue one. The art's suggested bullet display size (12) is larger than the collision diameter (6) and is decided in the shell step; the collision radius never changes.

D5. Walls. Decided at the start of the wall step with candidate images. Options to compare: a per-cell skin in the art palette, merged horizontal and vertical runs of long blocks, or a uniformly scaled `block-wood` with inset. The art blocks are 100 × 58, the cells 40 × 40. Wall rectangles and collision stay byte-identical, with no walkable gaps.

D6. Border. No separate border artwork. The outer ring is ordinary generated wall cells inside the fixed 24 × 13 grid and gets the same skin as interior walls. The original padding conflict no longer exists.

D7. Floor. `wood-warm` as a world-anchored repeating pattern. Spawn rings stay. The TOYBOX watermark is decided with the first floor screenshots. The rug is skipped.

D8. Raster size and browser check. 256 px per layer, which matches the pack's own `prepareLayers` default; memory is about 256 KB per layer. No separate browser spike is run now. The adapter step's CI browser tests must show that SVG decoding works in Chromium, Firefox and WebKit, with the procedural fallback proven by a test.

D9. Scale. Art is fitted to the existing body and authoritative muzzle, never the reverse. Candidate scale factors: about 0.43 from the footprint (radius 35 to collision radius 15), about 0.47 from hull width, about 0.5 by eye. With the 54 px art muzzle these give roughly 23, 25 and 27 logical px against today's barrel tip near 25. Candidate images pick the value.

D10. Duplicates. Left untouched. A separate cleanup PR needs explicit owner approval.

## Planned steps (each its own PR)

1. Adapter: `src/render/assets.ts` (validate, preload, decode once, bounded cache, draw) and a typed data module such as `src/render/asset-data.ts`, with unit tests using a fake canvas (missing ID, decode failure, cache reuse, no world mutation, no stale state after reset). The `RenderContext` type grows only by the calls it needs.
2. Floor.
3. Walls.
4. Player and sentry tanks, using body and aim layers with the existing headings.
5. Shells, only after the palette decision.

Every step ends with candidate screenshots and explicit owner approval. Candidates are not baselines.

## Not done by this record

- No browser run, screenshot capture or build-size measurement.
- The blocks, floors and border scripts were not re-verified.
- Duplicate pack copies were not byte-compared.
- The newest-revision question (D1) is unresolved.
