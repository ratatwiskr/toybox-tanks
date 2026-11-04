# Validation Checklist

Use PASS / FAIL / NOT RUN / BLOCKED with environment, revision and evidence. Never infer a PASS from a different test category.

## Source and startup

- [ ] Actual IDs, schemas, cork numbering and helper functions verified.
- [ ] Self-contained SVGs have valid XML and explicit dimensions/viewBoxes.
- [ ] No required external references, scripts or remote resources.
- [ ] Required assets preload once; no per-frame image allocation/decode.
- [ ] Unknown asset/missing asset/decode failures produce stable useful errors, including first startup.

## Transform and rendering

- [ ] Correct origin and visible scale, not just matching source viewBox size.
- [ ] Representative cardinal/diagonal body and aim angles checked.
- [ ] Hull/weapon independence and fixed-base behavior correct.
- [ ] Radian/degree, axis and sign conventions explicitly verified.
- [ ] Canvas transforms/styles/alpha restored after draws.
- [ ] Illustrated muzzle aligns with authoritative firing origin at multiple angles.
- [ ] Projectile centers align with simulated positions.
- [ ] Shadow layer does not rotate incorrectly or stack repeatedly.
- [ ] Retry/room changes do not leak entity-bound visual state or grow caches indefinitely.

## Environment

- [ ] Floor seams and repetition acceptable at actual gameplay scale.
- [ ] Texture stays world-anchored through resize/redraw.
- [ ] Rug remains visually flat and non-colliding.
- [ ] Wall geometry and map dimensions unchanged.
- [ ] Cork distinguishable from fixed wood without labels.
- [ ] Border aligns to all original edges/corners with correct image-padding offset.
- [ ] Border joints are not apparent gaps; towers stay outside combat.
- [ ] No unapproved arena resizing, added playable area or framing change.
- [ ] Aspect ratio, letterboxing and DPR behavior preserved.

## Gameplay regressions

- [ ] Movement, diagonal normalization, wall sliding and tank non-blocking unchanged.
- [ ] Normal shot bounces once; next wall contact removes it.
- [ ] Near-wall muzzle path prevents shots behind cover.
- [ ] Earliest-hit/rest-path and conservative corner behavior unchanged.
- [ ] Team hit rules unchanged; no friendly fire or shot–shot collision.
- [ ] Original invulnerability-contact behavior preserved.
- [ ] Active-shot limit and cooldown independent and unchanged.
- [ ] Health, disabled-player appearance and room restoration unchanged.
- [ ] Simultaneous last-player/last-enemy death still prioritizes defeat.
- [ ] Result resolves once, combat stops and projectiles clear.
- [ ] Pause/focus loss clears inputs correctly; no stuck controls.
- [ ] Full retry/replay/reset remains correct.
- [ ] Valid and invalid maps still load or fail stably, including first startup.

Where possible compare simulation snapshots before/after with identical initial state and commands. Do not normalize away gameplay differences to conceal a regression.

## Visual and real-input review

- [ ] Actual running game inspected at the smallest intended supported viewport and larger sizes.
- [ ] Available DPR settings reviewed without extrapolating unsupported-device claims.
- [ ] Blue/orange players distinguishable against blocks, floor and rug.
- [ ] Enemy accents, bullets, aim directions, warning marks and hit feedback clear.
- [ ] Both keyboard players tested simultaneously in real time.
- [ ] Pause, tab hide/show and focus loss tested with real input.
- [ ] Any gamepad support claim backed by actual hardware evidence; otherwise NOT RUN.
- [ ] Any browser/platform claim backed by that environment; automated WebKit is not real Safari/iOS validation.

## Releases

- [ ] Static-hosted build plays correctly.
- [ ] Single HTML opens via file:// without a server.
- [ ] Required resources work offline with network unavailable.
- [ ] Console and failure behavior inspected in actual tested environments.
- [ ] Future mechanics remain sandbox-only unless authorized.

## Evidence log

| Check | Status | Environment / revision | Evidence | Limitation / next action |
| --- | --- | --- | --- | --- |
| Example: border alignment | NOT RUN | Not inspected | None | Run actual browser comparison |

Generation-time checks reported for the assets were limited to SVG/XML checks, PNG rendering/integrity and Node syntax/generator checks. They do not satisfy browser, real-input, gameplay, file:// or hardware acceptance.
