# Visual asset integration plan

Updated: 2026-11-07  
Status: **Proposed — no asset is integrated and no gameplay change is authorized.**  
Source pack:
`Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte+handoff/`  
Related: `docs/gate-e-handoff.md`, `docs/architecture.md`, `docs/adr/0001-visual-gate-pending.md`.

This plan describes how to adopt the already-drafted background and in-game artwork in
small, reviewable, presentation-only steps. It is not an instruction to start coding. Each
phase ends in a human visual review and a separately authorized commit.

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
`toybox-rand-assets.zip`). Phase 0 should choose one canonical location and remove the
duplicate copies in a separate, approved cleanup; do not delete user-supplied files
without asking.

## 3. Verified technical contract

Checked against the committed JavaScript, not only the handoff prose:

### `ToyboxAssets` (vehicle/prop study, v0.1)

- Exposes **only** `definitions`, `markup(id, options)`, `svg(id, options)`,
  `image(id, options)`.
- The later `prepareLayers` / `drawLayers` API mentioned in the handoff is **not present**
  in this revision. Do not call it.
- Parts use `parts[].rotation` with values `body`, `aim`, `loaded`, `fixed` (not `role`).
- `markup`/`svg` are synchronous string builders. `image` creates a **new `Image` and data
  URI per call**, so the adapter must decode once per asset/pose and cache; never call it
  per frame.
- ViewBox is `-64 -64 128 128`; default forward is +X; angles are degrees, clockwise on
  screen; tank muzzle marker `[54, 0]`; art footprint radius `35` is **visual only**.
- IDs: `tank-blue`, `tank-orange`, `tank-enemy`, `turret-enemy`, `catapult-orange`,
  `catapult-enemy`, `bullet-blue`, `bullet-enemy`, `catapult-ball`, `chick`, `block-wood`,
  `block-blue`, `block-red`, `block-cork-1`/`-2`/`-3`.
- Cork states are `block-cork-1..3` with `damageStage` `0..2` (not `0/1/2` IDs).

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

- Exposes `palette`, `pieces`, `segment`, `borderMarkup`, `svg`, `image`.
- Defaults are `960 × 560` and thickness `36`. The game is `960 × 540`, so every call must
  pass explicit dimensions.
- The assembled image adds padding `thickness * 1.5 + 8` (at `36` that is `62` per side).
  Drawing it at `(0, 0)` shifts the boundary.
- Parts use different viewBoxes; do not normalize them as 128-unit centered squares.
- Inner boundary is the playable edge. Art lives outside it. Seams are not gaps.

## 4. Conflicts with the current game that need an explicit decision

| #   | Conflict                | Current game                                                     | Asset study                                                         | Recommended handling                                                                                                                                   |
| --- | ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Enemy palette           | Pink/magenta hull and shells (`#b86280`, `#f589ac`)              | Charcoal/red                                                        | Keep current enemy colors until a palette change is approved; do not silently switch.                                                                  |
| 2   | Player projectile color | One shared pale-yellow shell for both players                    | Single `bullet-blue` study asset                                    | Keep the shared shell, or add blue/orange variants only with approval.                                                                                 |
| 3   | Tank size               | Collision radius `15`; body drawn about `34 × 30`                | Art footprint radius `35`, muzzle `[54, 0]`                         | Scale art to the existing body/muzzle; never change `tankRadius` or the simulation muzzle.                                                             |
| 4   | Wall cells              | Adjacent `40 × 40` wall cells drawn individually                 | Blocks authored around a 128 viewBox with ~`100 × 58` visual bounds | Choose per-cell inset, merged wall runs, or a parametric skin. Do not add walkable gaps.                                                               |
| 5   | Border framing          | Canvas is exactly the `960 × 540` arena; no presentation padding | Border art extends outside the playable rectangle                   | Skip the border until framing is approved, or overlay it inside the frame without changing collision. Any arena shrink/padding needs conscious review. |
| 6   | Floor watermark         | Procedural “TOYBOX” text and spawn rings                         | Wood/carpet tile, optional rug                                      | Preserve spawn readability; decide whether the watermark stays or moves to the rug.                                                                    |
| 7   | Future content          | Not implemented                                                  | Catapult, chick, cork damage, roofs                                 | Sandbox only. Art does not authorize new mechanics.                                                                                                    |

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

## 6. Proposed shape of the change

Keep the current renderer and add one narrow presentation module, for example
`src/render/assets.ts`:

```text
src/render/assets.ts      validate + load + decode + cache + draw (no world mutation)
src/render/renderer.ts    asks the adapter for floor/wall/tank/shell visuals
src/main.ts               starts preload before the first gameplay frame, surfaces errors
src/assets.d.ts           module declarations only if a wrapper needs them
```

Packaging options, in preference order:

1. **Typed adapter over checked-in data.** Convert the generated `definitions`/`floors`/
   `pieces`/JSON data into typed modules (or import the JSON at build time) and draw with
   our own Canvas code. This avoids `globalThis`, `eval`, and classic-script ordering, and
   works in the single-file build. It is more work but the most testable.
2. **Vendored classic scripts plus a thin loader.** Bundle the four generated scripts so
   their globals exist before the renderer, then call them through a typed wrapper. Smaller
   diff, but adds implicit globals and makes unit testing harder.
3. **Raw import + evaluation.** Rejected: CSP/eval concerns, hard to type, easy to break
   the test boundary.

For rotated entities, option 1 plus per-layer `Image` objects (decoded once from
self-contained SVG data URIs) is the recommended default. Keep the source SVGs/Markdown in
the repository, but do not fetch them at runtime.

## 7. Phased plan

### Phase 0 — Inventory and decision record (no production code)

- Choose the canonical pack location; note duplicate files and the two prose revisions.
- Extract/verify `assets.json`, `blocks.json`, `parts.json`, and the `.svg` files.
- Confirm the adapter choice (typed data vs vendored globals), the drawing surface
  extensions (`drawImage`, `createPattern`), and the exact asset IDs to use.
- Record baseline screenshots and current test results.
- Produce a short report: inventory, conflicts, chosen options, files to add.

**Exit:** written decision record approved by the owner. No visual change yet.

### Phase 1 — Asset adapter and loading failure path

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

- Apply `wood-warm` as a repeating, world-anchored floor pattern.
- Keep the rug optional; if enabled, draw it flat under entities and outside collision
  logic.
- Preserve spawn rings and aim readability; compare with tanks, shells, and warnings
  visible.
- Do not derive terrain from floor pixels.

**Exit:** side-by-side candidate screenshots at small and large viewports; human review.

### Phase 3 — Walls, then border (framing decision)

- Reskin wall cells/rectangular runs with natural wood (`block-wood` or
  `block-{shape}-natural`). Keep authoritative wall rectangles byte-identical.
- Do not use triangular/round/roof shapes as new colliders.
- Treat the border as a separate decision because it needs presentation padding. If
  approved, align its inner rectangle to the existing boundary and apply the correct pad;
  never shrink the playable area silently.
- Preserve the conservative corner and one-bounce behaviour.

**Exit:** collision/simulation snapshots unchanged; screenshots at 960 × 540 and resized;
human review of wall contrast and border framing.

### Phase 4 — Existing tanks, turrets, shells

- Draw hull with body heading and turret with aim heading; keep the shared pivot and
  authoritative muzzle aligned.
- Preserve P1/P2 labels, disabled-player visibility, invulnerability feedback, track
  animation, and hit sparks.
- Fit art to the existing footprint; do not change `tankRadius`, fire origin, or angles.
- Decide the palette/projectile conflicts from section 4 before switching colors.

**Exit:** gameplay regression suite plus visual comparison; physical keyboard test by a
human; synthetic gamepad tests still pass.

### Phase 5 — Sandbox for future content (still no gameplay)

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

- Every phase gets its own candidate screenshots in `test-results/visual-candidates/`
  (or a phase-specific subdirectory) and a human approval note.
- Candidate PNGs are not committed unless the baseline policy allows it; baselines are
  committed only after approval.
- Automated evidence: `npm run verify`, `npm run test:browsers`, bundle grep for
  `__TOYBOX_TEST__`, and a `file://` smoke of `dist-single/index.html`.
- Manual evidence: real keyboard for both players, pause/focus loss, resize, and the
  smallest supported viewport. Gamepad claims require hardware; otherwise mark NOT RUN.
- Report PASS / FAIL / NOT RUN / BLOCKED per the asset pack’s `VALIDATION_CHECKLIST.md`.

## 9. Risks

| Risk                                               | Mitigation                                                                                                        |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| SVG decoding is async and can fail on first start  | Preload before the first frame, cache results, keep a procedural fallback and a visible error.                    |
| `image()` allocates a new `Image` per call         | Cache per asset/pose; assert decode counts in unit tests.                                                         |
| Large generated JS inflates the single-file bundle | Prefer typed data modules and only the assets actually used; check `dist-single` size and load time.              |
| Border padding changes framing                     | Defer border until the padding decision is approved; keep the arena logical size fixed.                           |
| Art hides combat cues                              | Draw order: floor → rug → shadows → walls/border → tanks → shells → aim/feedback → HUD. Review at small viewport. |
| Asset memory grows across rooms/retries            | Static caches are fine; never accumulate per-world/per-entity images.                                             |
| “Art exists” pressure to add mechanics             | Sandbox only; mechanics need a separate spec and approval.                                                        |

## 10. Explicit non-goals

No new enemy AI, movement for the enemy panzer, catapult mechanics, chick decoy
mechanics, destructible cork, new collision shapes, level editor, engine/framework
migration, progression/unlocks, or asset-driven map generation.

## 11. Starting prompt for the next agent

> Read `AGENTS.md`, `docs/asset-integration-plan.md`, `docs/gate-e-handoff.md`, and the
> asset pack’s `README.md` and `ASSET_AGENT_INSTRUCTIONS.md`. Do not modify production
> code yet. Complete phase 0: inventory the actual packages, confirm the API revision
> (`ToyboxAssets` v0.1 has no `prepareLayers`), list conflicts with the current renderer,
> propose the smallest presentation-only adapter and the exact files to add, and identify
> the decisions that need owner approval. Do not change gameplay, collision, world
> dimensions, controls, or tests, and do not commit or push without authorization.
