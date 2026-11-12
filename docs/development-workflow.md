# Development screenshots

This is an opt-in development review workflow, not an approved/enforced visual
regression suite. The 2026-11-11 scope clarification supersedes the earlier
hash-selection/promotion workflow in this branch's task and evidence notes.

## Three commands

| Command                           | Result                                                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run capture:visual:baseline` | Capture all registered scenes and replace the saved development checkpoint after a complete successful run                          |
| `npm run test:visual:compare`     | Capture current actuals and compare against the checkpoint; fail on differences, missing images, coverage changes or capture errors |
| `npm run test:visual:report`      | Serve the most recent comparison report on an automatically selected loopback port                                                  |

No environment-variable snippets, hand-written hashes, scene lists, manual
cleanup, snapshot-update flags or remembered ports are needed. All currently
registered scenes use the shared registry and production renderer. The capture
command prints a clickable file URL for the saved image gallery.

## First capture

Run capture:visual:baseline. It stages captures under
`test-results/visual-baseline-staging/`, including a manifest and gallery.
Only a successful complete capture replaces `docs/visual-catalogue/current/`.
Review those images and their Git diff; commit the checkpoint when appropriate.
Recording images does not assert owner acceptance of their aesthetics.

A failed capture keeps the old checkpoint intact. Its partial staging gallery
and manifest remain available for diagnosis until the next capture. Successful
replacement removes obsolete owned PNGs while preserving unrelated owner files.
The wrapper restores the old directory if publication fails. A process crash
can leave a lock/recovery copy; inspect the named paths and running processes
before recovering. Do not delete an active lock. Capture and compare are
serialized in one checkout; browser suites should also run sequentially.

## Review later changes

1. Run test:visual:compare. It finishes with a meaningful exit code and never
   changes the saved checkpoint. Actuals and diffs are ignored output.
2. Run test:visual:report, even when comparison failed. Inspect expected/actual/
   diff images, capture errors and metadata. Stop the report with Ctrl+C.
3. Fix unintended changes and compare again. If you deliberately want the
   current state to replace the checkpoint, run capture:visual:baseline again.

The report command opens an existing report; it does not recapture. If a runner
fails before producing a report, inspect its terminal error and report timestamps
rather than treating an older report as evidence of the failed attempt.
New comparison runs replace temporary comparison output. Preserve diagnostics
before rerunning. Keep an existing checkpoint while reviewing against it; do
not capture first if your goal is to inspect changes relative to that checkpoint.

Exact pixel comparisons remain strict. Environment/provenance metadata and the
menu fresh-page repeat check remain diagnostic safeguards; do not loosen them
to hide differences. Both visual configs launch Chromium with
`--disable-partial-raster` because intermittent partial re-rasterization of
fractional HUD/button edges produced one-pixel differences between otherwise
identical captures. This is a deterministic rendering setting, not a tolerance,
mask, retry or sleep; do not remove it or relax the comparison to compensate.
A deliberate change/revert/pass demonstration and actual local verification
still need to be recorded; this code commit is not evidence.

## Fullscreen limitation

Fullscreen catalogue coverage is currently deferred, so no fullscreen scene is
registered. The application still exposes a real `#fullscreenBtn` and requests
the Fullscreen API; when fullscreen coverage is re-enabled it must use that real
control. Do not substitute CSS-only fullscreen, viewport resizing, or windowed
captures mislabeled as fullscreen.

Headless Chromium may deny the browser-level fullscreen request. In that case,
`capture:visual:baseline` exits with code 2 and a `FULLSCREEN_UNSUPPORTED`
message, while preserving the existing checkpoint. This is an explicit
environment limitation, not a passing capture or an automatic skip. A headed
browser environment may be needed for genuine fullscreen capture; do not weaken
the Fullscreen API assertion to make headless capture pass.

## Agent responsibilities

For assigned changes with visible effects, consider and extend screenshot
coverage as part of the task: new states, damage stages, effects, interactions,
map situations, orientation and responsive/fullscreen layouts. Reuse stable
scene IDs, production rendering and deterministic test-bridge setup. Do not
create unrelated artwork or infrastructure to manufacture screenshots.

Compare before replacing a useful checkpoint. Preserve uncommitted owner
captures. Agents may refresh this development catalogue as explicitly documented
feature evidence when the task authorizes it; they must not claim aesthetic
approval or overwrite a checkpoint merely to hide unexpected changes. List
added/changed scenes and actual capture/check results in the handoff.

## Compatibility and boundaries

Older capture:visual/visual:capture and compare:visual/visual:compare/report:visual/
visual:report aliases point to the three commands above. Approval scripts are
removed from package.json. The old approval implementation/configuration files
remain inactive historical code, not part of this slice's procedure. Formal
reference governance and any mandatory regression/CI gate are deferred.

The existing test:visual remains a compatibility alias for test:visual:candidates:
the older candidate-only suite used by verify, not reference diffing. Existing
verify/verify:fast/test:browsers semantics, dependencies, lockfile and CI gates
are unchanged. Installed Node 24 runs the small typed CLI directly. The wrapper
handles the owner's installed Chromium cache and strict, temporary dev-server
ports without reusing an arbitrary existing server. No installations occur.

The workflow was exercised locally on 2026-11-12: the checkpoint was recaptured,
the full comparison passed, and formatting, lint, typecheck, unit, coverage,
e2e, candidate-capture, release and Chromium/WebKit hosted smoke checks ran.
Actual commands, exits and limitations are recorded in `docs/progress.md`.
Raw catalogue Playwright invocation still stages captures only; use
capture:visual:baseline for replacement.
