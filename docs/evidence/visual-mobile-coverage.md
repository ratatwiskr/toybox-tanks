# Mobile visual coverage: authored, pending execution

Adds the remaining two agreed issue-22 scenes after body/shell fixture commit
8d9bb35. The registry is shared by current catalogue capture and manual
comparison; no second renderer, fake UI or separately maintained scene list.

- touch-landscape-gameplay: 640 x 300, real solo room, controlled zero-tick
  state, detected touch capability and actual enabled pads. Full-app and arena
  images; checks cover pad/arena separation and viewport containment.
- touch-portrait-paused: start the same controlled game in landscape, then
  resize to 390 x 844 and wait on actual orientation/UI state. Capture the real
  full-screen rotate-to-landscape guard. Full-app only: arena/detail crops
  would omit the UI being reviewed and are intentionally excluded.

Navigator touch capability is controlled at the browser boundary, as in the
existing mobile-layout tests. This does not certify a physical touch device.
Metadata records viewport, maxTouchPoints and layout/guard bounds. Fonts and
render frames are awaited without sleeps, snapshot retries or masking.

Browser tests exercise both scenes through the shared capture helper and check
that portrait keeps simulation frozen and landscape does not auto-resume.
The user must click the real Resume button after rotating back. No gameplay,
UI styling, production hooks, dependencies, CI gates or tolerances change.

```sh
./node_modules/.bin/vitest run tests/unit/visual-mobile-registry.test.ts
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" ./node_modules/.bin/playwright test --project=chromium tests/e2e/mobile-visual-catalogue.spec.ts
TOYBOX_REVIEW_SCENES=touch-landscape-gameplay,touch-portrait-paused npm run visual:compare
npm run visual:report
```

Run browser commands sequentially. Capture with visual:capture remains
independent of references. Missing references fail unapproved; only explicit
owner-selected reviewed hashes may be promoted, followed by another comparison.

These commands have not been executed in this API session. Formatting, lint,
typechecking, focused tests, full gates, local captures and review remain
pending. Preserve current behavioral/renderer/room-start and production/file://
exclusion checks. Menu variation and intentional-change/revert evidence remain
required before issue completion. No screenshots/references were generated or
approved, and no merge, deployment or issue closure is performed.
