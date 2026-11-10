# Visual motion coverage: authored, pending execution

Continuation of issue 22 on PR 23, after workflow/path foundation 37713ed and
main shell/body features cb50b79 and 4c926b7. This records authored coverage,
not local execution or appearance approval.

## Added shared-registry scenes

- body-aim-independent, body-diagonal, body-wall-slide: curated worlds advance
  through the same presentation advanceWorld path used by the app/bridge.
  Twelve movement ticks plus one neutral tick establish and retain headings.
- shell-head-on-before: tick 6, both shells present, no collision effect.
- shell-head-on-contact: tick 7, both absent, one actual collision poof.
- shell-head-on-aged: tick 19, fixed later effect age.
- shell-head-on-cleared: tick 67, collision effect expired.

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

Missing references are expected to fail unapproved until owner review and
selected hash-bound promotion. Do not update snapshots implicitly.

## Remaining

Compact landscape touch and portrait pause captures are not implemented in
this commit. Run formatting, focused tests, verify:fast and applicable full/
browser/release gates sequentially, preserving production hook exclusion.
Diagnose unresolved menu variation and demonstrate intentional-change detection
plus revert/pass before completing issue 22. No local commands above have been
run in this API session. No screenshots or references were generated/approved.
