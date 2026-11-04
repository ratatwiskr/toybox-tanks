# Validation Checklist and Evidence Log

Use PASS / FAIL / NOT RUN / BLOCKED. Record the build revision, package revision, environment and evidence. Never convert NOT RUN into PASS by inference.

## A. Package and source contracts

- [ ] Inventory all packages without overwriting existing project documentation.
- [ ] Verify IDs, cork-state numbering and actual `role`/`rotation` schema.
- [ ] Verify public helpers before calling them.
- [ ] Check XML validity and explicit dimensions/viewBoxes for used SVGs.
- [ ] Confirm authored SVGs have no external resources or scripts.
- [ ] Test unknown/missing asset handling and an intentional image-decode failure.
- [ ] Verify required startup failure UI also works on first launch.

## B. Render-transform tests

- [ ] Correct origin and intended visible footprint, not merely matching viewBox size.
- [ ] Body and aim at representative cardinal and diagonal angles.
- [ ] Independent hull/turret rotation; fixed turret base remains fixed.
- [ ] Radian-to-degree conversion matches existing heading convention.
- [ ] Layer helpers preserve Canvas state (`save`/`restore`) and do not leak transforms/alpha.
- [ ] Illustrated barrel and authoritative muzzle align at representative angles.
- [ ] Projectile art is centered on simulated projectile position.
- [ ] Catapult loaded layer can be hidden in the sandbox without duplicating the airborne ball.
- [ ] Static image decoding occurs once per resource variant, not per frame.
- [ ] Repeated restart/room changes do not grow entity-bound caches or retain stale animations.

## C. Environment and border

- [ ] Floor repeats without conspicuous seams at actual render scale.
- [ ] Floor pattern remains world-anchored during resize/redraw.
- [ ] Rug is flat decoration only and does not imply walls or speed zones.
- [ ] Existing map cells/rectangles and authoritative collision geometry are unchanged.
- [ ] Solid wood and future-destructible cork are visually distinguishable.
- [ ] Border inner edge aligns on all four sides and at all four corners.
- [ ] Border source image padding offset is correctly applied.
- [ ] Decorative joints are not visible holes or newly created collision edges.
- [ ] Turrets/roofs on external corners do not protrude into or obscure combat.
- [ ] Border is visible without extra playable area, unintended cropping, or an unapproved framing change.
- [ ] Existing fixed logical arena, aspect ratio, letterboxing and DPR behavior remain correct.

## D. Gameplay regression checks

Use existing authoritative values; do not substitute the asset preview defaults.

- [ ] Movement speed and normalized diagonals unchanged.
- [ ] Wall blocking and wall sliding unchanged; tanks still do not block/push one another.
- [ ] A normal shot reflects once; its next wall contact removes it.
- [ ] Near-wall muzzle checks prevent spawning projectiles behind cover.
- [ ] Conservative corner cases and earliest-impact/rest-path behavior unchanged.
- [ ] Player/enemy hit assignment unchanged; no friendly fire or projectile–projectile collision.
- [ ] Original temporary-invulnerability contact behavior retained.
- [ ] Active-shot limit and fire cooldown remain independent and unchanged.
- [ ] Pause and focus loss halt combat, clear held inputs as required, and resume without stuck input.
- [ ] Disabled players remain visibly disabled; room completion restores players according to original rules.
- [ ] Simultaneous last-player/last-enemy death still resolves to defeat.
- [ ] Outcome resolves once; combat stops and remaining projectiles clear as originally required.
- [ ] Retry/replay/reset clear gameplay state and entity-linked visual state; static resource reuse is safe.
- [ ] Maps and stable map-error screens still work, including invalid data at first startup.

Where possible compare controlled simulation state snapshots before and after the rendering-only change with the same initial state and commands. Account only for explicitly presentation-only differences; do not normalize away gameplay regressions.

## E. Visual and real-input review

- [ ] Existing content reviewed in an actual running browser, not just PNGs.
- [ ] Smallest intended supported viewport and a larger viewport inspected.
- [ ] Multiple available DPR settings inspected; no unsupported device claim inferred.
- [ ] Blue/orange players remain distinct against colored blocks and rug.
- [ ] Enemy charcoal/red palette, bullets, aim directions and hit feedback remain readable.
- [ ] Real keyboard input tested for both local players, including simultaneous play.
- [ ] Pause, tab hide/show and focus loss tested in real time.
- [ ] Any gamepad claim backed by actual hardware tests; otherwise marked NOT RUN.
- [ ] No browser/platform claim extrapolated from a different environment.

## F. Deliverables

- [ ] Static-hosted build launches and plays.
- [ ] Embedded single-HTML release opens directly via `file://` without a server.
- [ ] Network unavailable test confirms no required external resources.
- [ ] Console and stable error handling reviewed on each tested launch path.
- [ ] Test and screenshot evidence identifies actual environment and revision.
- [ ] New gameplay proposals remain sandbox-only unless separately authorized.

## Evidence template

| Check | Status | Environment / build | Evidence | Limitation or next action |
| --- | --- | --- | --- | --- |
| Example: border alignment | NOT RUN | Not inspected | None | Run actual browser comparison |

Generation-time checks reported in the conversation were limited to source/XML checks, PNG rendering/integrity and Node syntax/SVG-generator tests. They do not satisfy real-browser, real-input, gameplay or local-file acceptance.
