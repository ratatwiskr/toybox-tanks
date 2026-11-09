# Local revision render catalogue

First slice of #18: reproducible screenshots for human revision review, not
approved automated-test baselines. This document and the generated `current/`
PNG, HTML and JSON files are intended for Git tracking. No PNGs have been
captured or approved by the implementation commit.

## Explicit local capture

Use the existing owner-installed dependencies and Chromium. From the repository
root, with port 5173 free:

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" \
  ./node_modules/.bin/playwright test --config=playwright.catalogue.config.ts
```

This does not install anything or need GitHub access. The local configuration
reuses the existing Playwright visual project and test-mode app, starts a fresh
loopback server, and does not reuse an unrelated running checkout. Ordinary
`verify`, `test:visual`, commits and CI do not refresh this catalogue.

Open `docs/visual-catalogue/current/index.html` directly in a browser. Its assets
are relative and work offline. Inspect and explicitly stage the generated
catalogue files when you want to preserve this revision's render in Git. The
capture command never stages, commits, pushes or approves screenshots.

## Coverage and semantics

- Existing menu, co-op, active-shot, disabled-player, pause, cleared, defeat,
  completed and resized views.
- Every current campaign map, discovered from `MAPS`, initialized through the
  existing room bridge with co-op defaults and zero simulation ticks. Stable IDs
  derive from map names rather than campaign positions. Renaming maps is an
  intentional catalogue-path change requiring review.
- Curated synthetic cork atlas (3/2/1/0 hits), isolated damage, adjacent mixed
  stages, reversed iteration, blocked/cleared/reflected aiming, and combat feedback.
- Every scene has full-viewport and arena crops. Synthetic scenes also have a
  fixed logical detail crop. Labels/purposes are in the gallery, not painted over
  gameplay. The destroyed atlas slot is the fourth slot and intentionally empty.
- Arena captures are screen-space crops of the normal application, including any
  overlay covering the arena. They are not alternate rendering or enlarged game
  geometry. All crops use the production renderer at actual playing scale.

Two independent page loads must produce identical PNG bytes and copied state
within the same capture environment. Simulation is owned by the test bridge;
fonts and rendering frames are awaited without sleeps. Actual gamepads are
neutralized for capture. Rendering/capture must not change copied gameplay state.
These checks establish capture repeatability, not aesthetic correctness or
behavioral transitions. Existing gameplay and renderer tests remain separate.

## Provenance and review

`manifest.json` records source HEAD, dirty source status, a fingerprint of tracked
and nonignored untracked source files, browser/tool/runtime/OS settings, each
scene's purpose/state/viewport and image SHA-256 hashes. The catalogue directory
is excluded from source provenance to avoid captures making themselves dirty.
There is no volatile capture timestamp. A dirty capture describes the recorded
working tree, not an unqualified claim about HEAD. Ignored files and environment
remain outside the source-tree hash; use normal repository inputs.

New captures overwrite stable PNG paths. Compare them with the committed version
using your Git-aware image viewer; ordinary textual `git diff` only reports PNGs
as binary. Commit the manifest with the images. The HTML gallery is current-state
review, not a custom before/after/diff engine. Git history is the revision archive.

All scenes are captured and checked in ignored staging output before publication.
A capture/stability failure leaves the previous catalogue untouched. A filesystem
failure during publication leaves no complete manifest; rerun before reviewing.
Unexpected stale PNGs cause failure instead of silently deleting old scene evidence.
Review removals/renames, remove the stale files explicitly, then rerun capture.

Use the same local environment when comparing revisions. Different OS/browser/font
settings can cause pixel differences and must be disclosed, not hidden with broad
tolerances. No cross-machine identity or successful local run is claimed yet.

## Deferred

Automated comparison against approved images, baseline promotion/approval policy,
visual failure thresholds, mutation demonstrations and broader device coverage
remain later slices of #18. Committing this revision catalogue approves none of
those images as baselines and does not complete the existing visual gate.
