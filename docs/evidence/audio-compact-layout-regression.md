# Audio compact-layout regression

Date: 2026-11-08
Inspected branch head: 5b54b5ad8acd85466009ef7e4f789a1cd4ba7427.
The failed CI SHA was not included in the supplied log.

## Supplied verification evidence

The owner supplied a verify log with passing formatting, lint, all TypeScript
projects, and 18 unit/architecture files (164 tests). Simulation/config coverage
was 96.77% statements, 95.16% branches, 100% functions and 96.66% lines.
Those percentages do not cover the browser audio adapter.
Chromium E2E had 19 passing tests and one failure at 640x300. The normal
uncheck of #touchToggle timed out because the canvas and later the outcome
overlay intercepted the pointer. The 900x440 and 1280x800 cases passed.
The subsequent visual/release commands were not reached in that verify chain.
The audio-device and D-Bus warnings are not evidence of the checkbox failure's
cause. The log also does not diagnose the separately reported missing music.

## Candidate fix and verification limits

Source inspection found the new normal-flow audio fieldset appended directly
to the app, while compact layout defines only header, HUD and arena grid rows.
Working diagnosis: this implicit extra grid row steals arena height, allowing
the centered arena to overflow its allocated row and cover header controls.
This diagnosis has not been reproduced in a browser by the remote author.

Move audio settings into a native details disclosure in the existing toolbar.
Its fieldset panel is absolutely positioned, scrollable and viewport-width
bounded, so it does not allocate another app grid row. Keep the existing
.audio-controls ancestor for gameplay-input isolation, including the summary.
The summary and Escape/close actions provide keyboard access. An open settings
panel can overlay the arena; the collapsed settings do not reserve arena space.
No new weapon, gameplay timing, touch geometry or simulation rule is changed.

Retain the original normal checkbox interaction and all geometry assertions.
Add ordinary pointer and keyboard access, mute, volume, close/reopen/Escape and
panel viewport-bounds checks at all three existing viewports. No forced clicks,
longer timeout, retries, hidden controls, skipped tests or weakened assertions.

This candidate has not been formatted, linted, compiled or browser-tested here.
Run focused Chromium mobile-layout tests, then the full existing gates. A green
run and visual inspection are still required; this document is not a pass claim.
Music activation/loading remains a separate unresolved defect.