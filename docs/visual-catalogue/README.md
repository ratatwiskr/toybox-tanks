# Local screenshot catalogue: capture, overwrite, review

This is the capture-only first slice of #18. Images document what the game
rendered; they are not approved visual-regression references. No repeat-image
comparison, reference comparison, pixel tolerance or automatic approval runs.

## One command

From the repository root, using already-installed dependencies and Chromium:

```sh
npm run capture:visual
```

The command is isolated to the catalogue project. It starts a fresh test-mode
server on loopback port 5183 and does not reuse another running checkout.
Override an occupied capture port explicitly:

```sh
TOYBOX_CAPTURE_PORT=5193 npm run capture:visual
```

No installation, GitHub access, manual cleanup, staging or commit is performed.
Ordinary verification, CI and commits do not refresh these images.

## Fresh output and partial failures

Once global setup starts, it removes only directly contained generated scene PNGs,
gallery and manifest files from `docs/visual-catalogue/current/`. It never recursively
deletes that directory, other reports, source files or future reference images.
Commit or back up any uncommitted captures you need before starting another run.
Git history remains the archive of committed captures. Do not run two captures
concurrently in the same checkout.

A fresh gallery and manifest initially mark all expected scenes pending. Each
scene is captured once. Its PNGs and status are written immediately, and capture
continues after an individual scene failure. Partial images remain available
under a FAILED scene, never mislabeled as a complete capture.

Open `docs/visual-catalogue/current/index.html` directly in a browser. It shows
CAPTURED, FAILED and PENDING scenes with errors and available images. The manifest
lists expected filenames, actual image hashes, copied world state and source/
environment provenance. A successful run has `finished: true` and `complete: true`.
Scene/runtime failures return a nonzero exit after attempting the other scenes.
If interrupted, the last persisted status remains incomplete. A configuration or
server failure before global setup may leave the previous catalogue untouched;
a CLI failure is never proof of a fresh complete capture.

Playwright's own output cleanup applies to temporary test artifacts, not this
Git-tracked catalogue. No `git clean` is necessary.

## Coverage and capture controls

The catalogue retains the nine representative application views, every campaign
map's real co-op starting state, and synthetic cork/feedback fixtures. Campaign
views use normal initialization with zero ticks. Cork fixtures cover all four
stages including an empty destroyed slot, isolated damage, mixed adjacency,
reversed draw order, blocked/cleared/reflected aiming and frozen combat feedback.

Every scene has full-view and arena PNGs; synthetic fixtures also have a detail
crop. Labels stay in the gallery, outside gameplay. Arena crops include overlays
where normally visible. Stable map paths derive from map names, not room indices.

Simulation time, placements and effects remain controlled through the existing
test-only bridge and production renderer. Viewport, DPR and browser preferences
are fixed; fonts/render frames are awaited without sleeps. Keyboard-focus modality
is established explicitly. Actual gamepads are neutralized. Rendering/capture
read-only checks, room-start invariants and runtime-error checks remain active.

These controls do not establish pixel-identical repeated output. The earlier
menu mismatch remains undiagnosed; removing its comparison is an intentional
capture-only scope change, not a claim to have fixed it.

## Git tracking

Keep the images in their generated location and review before committing:

```sh
git status --short -- docs/visual-catalogue/current/
git add -- docs/visual-catalogue/current/
git diff --cached --stat
```

Stage the matching manifest and gallery with the PNGs. An incomplete run can
show deleted/missing images because old captures are intentionally removed.
Do not commit it as a complete catalogue. Inspect deletions from scene renames
or removals deliberately. Do not track `test-results/` or `playwright-report/`.

The source fingerprint includes tracked and nonignored untracked files but
excludes this catalogue directory to avoid self-dirtying. Dirty source status
is recorded; HEAD alone does not identify a dirty capture. No volatile capture
timestamp is added. Use the same OS/browser/fonts for meaningful human comparison.

## Later iteration

Automated visual regression will use a separate, explicitly reviewed reference
set. This command never deletes or updates such references. Baseline approval,
promotion, image-diff guards and exact-pixel stability investigation remain
separate work. Existing gameplay tests and visual approval policy are unchanged.
