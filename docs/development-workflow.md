# Development screenshots

This is an opt-in development review workflow, not an approved/enforced visual
regression suite. The 2026-11-11 scope clarification supersedes the earlier
hash-selection/promotion workflow in this branch's task and evidence notes.

## Three commands

| Command | Result |
| --- | --- |
| `npm run capture:visual:baseline` | Capture all registered scenes and replace the saved development checkpoint after a complete successful run |
| `npm run test:visual:compare` | Capture current actuals and compare against the checkpoint; fail on differences, missing images, coverage changes or capture errors |
| `npm run test:visual:report` | Serve the most recent comparison report on an automatically selected loopback port |

No environment-variable snippets, hand-written hashes, scene lists, manual
cleanup, snapshot-update flags or remembered ports are needed. All scenes,
including real desktop/touch fullscreen, use the shared registry and renderer.
The capture command prints a clickable file URL for the saved image gallery.

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
to hide differences. A deliberate change/revert/pass demonstration and actual
local verification still need to be recorded; this code commit is not evidence.

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

No screenshot generation, aesthetic inspection, formatting, lint, compilation,
unit/browser execution or local signal/port verification was performed in the
API authoring session. Run the normal verification commands locally and record
actual results before merge. Raw catalogue Playwright invocation now stages
captures only; use capture:visual:baseline for replacement.
