# Visual asset integration plan

Updated: 2026-11-17  
Status: **Partially implemented.** Phase 0 recorded its decisions in ADR 0004. Phase 1
(asset adapter hardening) and Phase 2 (`wood-warm` floor art) are merged through PR #40.
Walls, tanks, turrets, shells, and the future-content sandbox remain proposed. This plan
authorizes no gameplay change and no further implementation by itself.

Source pack:
`Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte+handoff/`  
Related: `docs/adr/0004-asset-integration-approach.md`,
`docs/development-workflow.md`, `docs/architecture.md`,
`docs/adr/0001-visual-gate-pending.md`, and
`docs/history/assets-and-audio-2026-11.md`.

This plan describes how to adopt the already-drafted background and in-game artwork in
small, reviewable, presentation-only steps. It is not an instruction to start coding.
Phases 0–2 are complete; each remaining phase needs human visual review and a separately
authorized change.

## 1. Goal

Replace or augment the current procedural Canvas look with the drafted toy/nursery art
without changing:

- logical arena size (`960 × 540`), map grids (`24 × 13` cells of `40` px, `gridY = 10`),
  wall colliders, spawns, or sentries;
- movement, aiming, cooldowns, shell counts, bounce rules, damage, invulnerability,
  outcomes, or room progression;
- keyboard/gamepad bindings, pause/focus/reset behavior, or the test bridge;
- the two release formats (`dist/` hosted and `dist-single/index.html` self-contained)
  or their lack of a test bridge.

The asset pack’s own rules apply: _fit art to geometry, never geometry to art._

## 2. What is already in the repository

Two identical copies of the pack are committed (86 files, about 8 MB):

```text
Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte/
Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte+handoff/
Perplexity-assets-...aspekte.zip
Perplexity-assets-...aspekte+handoff.zip
```

Inside each directory:

| File                                                                                      | Role                                                                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `toybox-assets.js`                                                                        | Vehicle/prop study, browser global `ToyboxAssets`.                                                       |
| `toybox-blocks.js`                                                                        | 60 block variants, global `ToyboxBlocks`.                                                                |
| `toybox-floors.js`                                                                        | Floor tiles and rug, global `ToyboxFloors`.                                                              |
| `toybox-border.js`                                                                        | Arena border kit, global `ToyboxBorder`.                                                                 |
| `toybox-*-pruefstand.html`                                                                | Standalone inspectors, not integration evidence.                                                         |
| `assets.json`, `blocks.json`, `parts.json`, `*.svg`                                       | Source data (inside the zip packages; note the loose directory does not contain every extracted `.svg`). |
| `README.md`, `ASSET_*`, `INTEGRATION_GUIDE`, `VALIDATION_CHECKLIST`, `DESIGN_DECISIONS_*` | Handoff prose. A longer and a condensed revision exist (the `(2)` files).                                |

The zip packages are the most complete source (`toybox-assets-kit.zip`,
`toybox-baukasten-erweiterung.zip`, `toybox-fussboden-kit.zip`,
`toybox-rand-assets.zip`). ADR 0004 (D10) leaves the duplicate copies untouched; a
canonical-location cleanup needs a separate approved change. Do not delete user-supplied
files without asking.

## 3. Verified technical contract

Checked against the committed JavaScript, not only the handoff prose:

### `ToyboxAssets` (vehicle/prop study)

Phase 0 (ADR 0004, D1) selected the `toybox-assets (2).js` revision. The checked-in
`src/render/asset-data.ts` is extracted from it, so the implemented adapter never calls
the pack's globals.

- The `(2)` revision exposes `definitions`, `markup`, `svg`, `image`, plus
  `prepareLayers(id, resolution = 256)` and `drawLayers(ctx, layers, x, y, size, options)`.
- Parts use `parts[].role` with values `body`, `aim`, `loaded`, `fixed`; shadows are
  `[rx, ry]` arrays. It has no `footprint`, `aimPivot` or `bodyForward` metadata.
- The earlier `toybox-assets.js` (v0.1 study) used `parts[].rotation`, carried
  `footprint`/`aimPivot`/`bodyForward`, and had no layer-preparation API. That schema is
  historical; do not mix it into new data.
- `markup`/`svg` are synchronous string builders. `image` creates a **new `Image` and data
  URI per call**, so decode once per asset/pose and cache; never call it per frame.
- ViewBox is `-64 -64 128 128`; forward is +X; angles are degrees, clockwise on screen;
  tank muzzle marker `[54, 0]` is visual metadata only.
- IDs: `tank-blue`, `tank-orange`, `tank-enemy`, `turret-enemy`, `catapult-orange`,
  `catapult-enemy`, `bullet-blue`, `bullet-enemy`, `catapult-ball`, `chick`, `block-wood`,
  `block-blue`, `block-red`, `block-cork-0`/`-1`/`-2`.
- Cork states are `block-cork-0..2` with `damageStage` `0..2` (not `1..3`).

### `ToyboxBlocks` (block expansion)

- 60 variants: ten shapes × six colors, IDs `block-{shape}-{color}`.
- Shapes: `square`, `brick`, `long`, `triangle`, `round`, `half-round`, `wall`, `tower`,
  `roof-round`, `roof-square`; colors: `natural`, `red`, `blue`, `yellow`, `green`,
  `orange`.
- Exposes `definitions`, `markup`, `svg`, `installInto`.
- `installInto(ToyboxAssets)` copies definitions only; it does not prove schema
  compatibility. Prefer a separate adapter.

### `ToyboxFloors`

- Floors: `wood-warm`, `wood-light`, `carpet-neutral`; source tiles `512 × 512`.
- Exposes `floors`, `rug`, `tileSVG`, `backgroundSVG`, `prepare(ctx, id)`,
  `draw(ctx, prepared, x, y, w, h)`, `prepareRug`.
- `prepare` uses `ctx.createPattern(..., 'repeat')`; the pattern origin must stay
  world-anchored so the floor does not swim during resize or camera-free redraw.
- Rug is a separate `480 × 320` transparent decoration; roads are printed, not terrain.

### `ToyboxBorder`

ADR 0004 (D6) chose **not** to use separate border artwork; the generated outer wall ring
gets the wall skin. This contract is reference only.

- Exposes `palette`, `pieces`, `segment`, `borderMarkup`, `svg`, `image`.
- Defaults are `960 × 560` and thickness `36`. The game is `960 × 540`, so every call must
  pass explicit dimensions.
- The assembled image adds padding `thickness * 1.5 + 8` (at `36` that is `62` per side).
  Drawing it at `(0, 0)` shifts the boundary.
- Parts use different viewBoxes; do not normalize them as 128-unit centered squares.
- Inner boundary is the playable edge. Art lives outside it. Seams are not gaps.

## 4. Conflicts with the current game

| #   | Conflict                | Current game                                                     | Asset study                                                         | Recommended handling                                                                                                             |
| --- | ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Enemy palette           | Pink/magenta hull and shells (`#b86280`, `#f589ac`)              | Charcoal/red                                                        | Keep current enemy colors until a palette change is approved; do not silently switch.                                            |
| 2   | Player projectile color | One shared pale-yellow shell for both players                    | Single `bullet-blue` study asset                                    | Keep the shared shell, or add blue/orange variants only with approval.                                                           |
| 3   | Tank size               | Collision radius `15`; body drawn about `34 × 30`                | Muzzle `[54, 0]`; v0.1 footprint radius `35`                        | Scale art to the existing body/muzzle; never change `tankRadius` or the simulation muzzle. See D9.                               |
| 4   | Wall cells              | Adjacent `40 × 40` wall cells drawn individually                 | Blocks authored around a 128 viewBox with ~`100 × 58` visual bounds | Choose per-cell inset, merged wall runs, or a parametric skin. Do not add walkable gaps.                                         |
| 5   | Border framing          | Canvas is exactly the `960 × 540` arena; no presentation padding | Border art extends outside the playable rectangle                   | Resolved in ADR 0004 (D6): no separate border art. The generated outer wall ring uses the same wall skin; the arena stays fixed. |
| 6   | Floor watermark         | Procedural “TOYBOX” text and spawn rings                         | Wood/carpet tile, optional rug                                      | Resolved in PR #40: `wood-warm` floor integrated, watermark/tagline removed, spawn rings preserved, rug skipped.                 |
| 7   | Future content          | Not implemented                                                  | Catapult, chick, roof props, asset-based cork states                | Sandbox only. Art does not authorize new mechanics.                                                                              |

## 5. Non-negotiable invariants

- `src/sim/**` imports no DOM, Canvas, image, or asset code. Keep the `tsconfig.sim.json`
  boundary green.
- Rendering only reads `World`. Asset animation state never decides hits, targeting,
  cooldowns, outcomes, or progression.
- Asset caches are presentation-owned. Static resources may survive retry; entity-bound
  visual state must not leak into a new world or reuse stale entity IDs.
- Decode/preload before combat; show a stable, useful error if a required resource fails,
  including on first startup.
- No runtime fetch of SVG/JSON, no CDN, no external fonts, no worker URL, no network
  dependency. The single-file build must remain playable through `file://`.
- Do not decode images every frame and do not cache arbitrary rotated whole-pose images.
  For rotating entities, decode independent layers once and transform at draw time.
- Do not weaken tests or guardrails; add presentation tests rather than widening the
  simulation coverage include set.

## 6. Shape of the change

The renderer stays in charge; presentation modules sit beside it and never mutate the
world. Phase 1 added `src/render/assets.ts` with typed data from
`src/render/asset-data.ts`; Phase 2 added `src/render/floor.ts` and
`src/render/floor-data.ts`. The adapter is not yet wired into tank, turret, or shell
drawing:

```text
src/render/assets.ts      validate + load + decode + cache + draw (no world mutation)
src/render/asset-data.ts  typed tank/turret layer data extracted from the pack
src/render/floor.ts       floor validation, SVG decode, pattern preparation
src/render/floor-data.ts  wood-warm tile data
src/render/renderer.ts    reads the adapter; no gameplay mutation
src/main.ts               preloads before the first gameplay frame, surfaces errors
```

ADR 0004 (D1/D2) chose a typed adapter over checked-in data: extract the pack's
definitions into typed modules, rasterize layers once, draw with `drawImage`, and keep
procedural drawing as the fallback. Vendored classic scripts plus a loader were considered
but not chosen; raw import/evaluation is rejected for CSP, typing and test-boundary
reasons. No runtime fetch, CDN, `eval`, or external resource is allowed.

## 7. Phased plan

### Phase 0 — Inventory and decision record (no production code)

**Status: done — ADR 0004.** Duplicate pack copies stay untouched (D10).

- Choose the canonical pack location; note duplicate files and the two prose revisions.
- Extract/verify `assets.json`, `blocks.json`, `parts.json`, and the `.svg` files.
- Confirm the adapter choice (typed data vs vendored globals), the drawing surface
  extensions (`drawImage`, `createPattern`), and the exact asset IDs to use.
- Record baseline screenshots and current test results.
- Produce a short report: inventory, conflicts, chosen options, files to add.

**Exit:** written decision record approved by the owner. No visual change yet.

### Phase 1 — Asset adapter and loading failure path

**Status: done — `src/render/assets.ts` and `src/render/asset-data.ts` merged via PR #40;
not yet wired into tank/shell drawing.**

- Add the presentation-only adapter with validation, preload, decode-once caching, and
  bounded caches.
- Extend the narrow `RenderCanvas`/`RenderContext` surface only where needed.
- Add unit tests with a fake canvas: no world mutation, cache reuse, missing-ID error,
  decode-failure error, no stale entity state after room reset.
- Keep the current procedural rendering as a fallback if loading fails; never crash the
  game into a blank screen.

**Exit:** `npm run verify:fast` green, plus a browser smoke proving startup failure is
visible and recoverable.

### Phase 2 — Background first (lowest gameplay risk)

**Status: done — `wood-warm` floor and preload/fallback path merged via PR #40. The
watermark and tagline were removed after owner review; spawn rings remain; the rug is
skipped.**

- Apply `wood-warm` as a repeating, world-anchored floor pattern.
- Keep the rug optional; if enabled, draw it flat under entities and outside collision
  logic.
- Preserve spawn rings and aim readability; compare with tanks, shells, and warnings
  visible.
- Do not derive terrain from floor pixels.

**Exit:** side-by-side candidate screenshots at small and large viewports; human review.

### Phase 3 — Walls (border decision resolved)

**Status: proposed.**

- Reskin wall cells/rectangular runs with natural wood (`block-wood` or
  `block-{shape}-natural`). Keep authoritative wall rectangles byte-identical.
- Do not use triangular/round/roof shapes as new colliders.
- ADR 0004 (D6) removed the separate border artwork: the generated outer wall ring uses
  the same skin as interior walls. Never shrink or pad the playable area silently.
- Preserve the conservative corner and one-bounce behaviour.

**Exit:** collision/simulation snapshots unchanged; screenshots at 960 × 540 and resized;
human review of wall contrast.

### Phase 4 — Existing tanks, turrets, shells

**Status: proposed.**

- Draw hull with body heading and turret with aim heading; keep the shared pivot and
  authoritative muzzle aligned.
- Preserve P1/P2 labels, disabled-player visibility, invulnerability feedback, track
  animation, and hit sparks.
- Fit art to the existing footprint; do not change `tankRadius`, fire origin, or angles.
- Decide the palette/projectile conflicts from section 4 before switching colors.

**Exit:** gameplay regression suite plus visual comparison; physical keyboard test by a
human; synthetic gamepad tests still pass.

### Phase 5 — Sandbox for future content (still no gameplay)

**Status: proposed.** The existing development visual catalogue is not this sandbox.

Add a presentation sandbox (test-only or a separate dev route) that can show:

- catapult loaded/unloaded states and body/aim layers;
- catapult ball and ground shadow;
- chick scale and outline;
- cork intact/damaged/heavily damaged states;
- decorative roofs and non-rectangular blocks.

The sandbox may select a damage state manually. That is not destructible terrain. Do not
add HP, splash damage, distraction AI, movement AI, terrain destruction, or new win
conditions.

**Exit:** screenshots and a clear statement that nothing is wired into room spawns.

## 8. Review and evidence workflow

- Use the current development procedure in `docs/development-workflow.md`. Add or extend
  deterministic scenes in the shared catalogue; do not create a parallel renderer.
- `npm run capture:visual:baseline` refreshes the overwriteable checkpoint in
  `docs/visual-catalogue/current/`; `npm run test:visual:compare` checks against it;
  `npm run test:visual:report` serves the comparison report. Candidates are ignored
  output, not committed baselines.
- A saved screenshot is not owner aesthetic approval. Formal reference approval and
  mandatory visual regression remain deferred (ADR 0001).
- Automated evidence: `npm run verify`, `npm run test:browsers`, a bundle grep for
  `__TOYBOX_TEST__`, and a `file://` smoke of `dist-single/index.html`.
- Manual evidence: real keyboard for both players, pause/focus loss, resize, and the
  smallest supported viewport. Gamepad claims require hardware; otherwise mark NOT RUN.
- Report PASS / FAIL / NOT RUN / BLOCKED; distinguish authored tests, local runs, CI, and
  physical-device checks.

## 9. Risks

| Risk                                               | Mitigation                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| SVG decoding is async and can fail on first start  | Preload before the first frame, cache results, keep a procedural fallback and a visible error.       |
| `image()` allocates a new `Image` per call         | Cache per asset/pose; assert decode counts in unit tests.                                            |
| Large generated JS inflates the single-file bundle | Prefer typed data modules and only the assets actually used; check `dist-single` size and load time. |
| Border padding changes framing                     | Resolved by ADR 0004 D6: no separate border art; keep the arena logical size fixed.                  |
| Art hides combat cues                              | Draw order: floor → shadows → walls → tanks → shells → aim/feedback → HUD. Review at small viewport. |
| Asset memory grows across rooms/retries            | Static caches are fine; never accumulate per-world/per-entity images.                                |
| “Art exists” pressure to add mechanics             | Sandbox only; mechanics need a separate spec and approval.                                           |

## 10. Explicit non-goals

This asset plan authorizes no new mechanics. It does not add catapult mechanics, chick
decoy mechanics, movement for the enemy panzer, new collision shapes, a level editor,
engine/framework migration, progression/unlocks, or asset-driven map generation. Cork
destruction and the current enemy kinds are implemented elsewhere; their existence does
not authorize asset-driven gameplay changes.

## 11. Starting prompt for the next agent

> Read `AGENTS.md`, `docs/asset-integration-plan.md`,
> `docs/adr/0004-asset-integration-approach.md`, and
> `docs/development-workflow.md`. Confirm the actual branch, PR, and current state first.
> Phases 0–2 are implemented; do not repeat them. Do not modify production code without a
> specific assignment for a remaining phase (walls, tanks/turrets/shells, or the future
> sandbox). Keep `src/sim/**` and all collision geometry untouched, fit art to the existing
> body and muzzle, do not change gameplay or tests, and do not commit or push without
> authorization.
