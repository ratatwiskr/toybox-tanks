# Visual motion coverage: implemented and captured locally

Continuation of issue 22 on PR 23, after workflow/path foundation 37713ed and
main shell/body features cb50b79 and 4c926b7. The scenes below are registered in
the shared catalogue and were captured and compared locally on 2026-11-12. That
is development evidence, not aesthetic approval or formal reference approval.

## Added shared-registry scenes

- body-aim-independent, body-diagonal, body-wall-slide: curated worlds advance
  through the same presentation advanceWorld path used by the app/bridge.
  Twelve movement ticks plus one neutral tick establish and retain headings.
- shell-head-on-before: tick 6, both shells present, no collision effect.
- shell-head-on-contact: tick 7, both absent, one actual collision poof.
- shell-head-on-aged: tick 19, fixed later effect age.
- shell-head-on-cleared: tick 70, collision effect expired.

No cloud is manually injected for this sequence. No body heading is injected
into simulation state. The loaded world retains its real tank objects and
presentation WeakMap headings. Existing cork/combat fixtures are unchanged.
The shared catalogue discovers all seven fixtures automatically, with full,
arena and detail PNGs for both current capture and manual comparison.

Unit tests assert heading/aim separation, displacement during wall sliding,
stationary heading retention, contact timing, shell counts, poof count/type/
position/age, cleanup, repeatable world state and shared registration. Existing
renderer tests and human image review remain responsible for label/artwork
readability; these fixture tests do not assert aesthetic approval.

## Suggested focused commands

```sh
./node_modules/.bin/vitest run tests/unit/visual-motion-scenes.test.ts
TOYBOX_REVIEW_SCENES=body-aim-independent,body-diagonal,body-wall-slide,shell-head-on-before,shell-head-on-contact,shell-head-on-aged,shell-head-on-cleared npm run visual:compare
npm run visual:report
```

Comparison runs against the saved development checkpoint; it does not use formal
approved references or implicitly update snapshots. A deliberate scene change
requires an explicit `capture:visual:baseline` refresh after review.

## Verification status

The full comparison passed locally, including the paired `ui-menu` repeat check.
The earlier menu variation was traced to intermittent partial rasterization of
fractional HUD/button edges and resolved with Chromium's
`--disable-partial-raster` launch flag, not with sleeps, retries, masks or looser
tolerances. Actual commands, exits and the deliberate-change experiment are
recorded in `docs/progress.md`.

Compact landscape touch and portrait pause coverage is now implemented and
registered. No screenshots or references were approved, and no aesthetic
acceptance is claimed.
