# Toybox Tanks — current progress

Updated: 2026-11-13

## Issue 38 new maps: implementation and test hardening

Branch `feature/38-new-maps`, continuing WIP `e9c4b86` on 2026-11-13. All
results below are from the uncommitted working tree, not a later committed head.

- The campaign now contains the 15 rooms from issue #38, authored as 22 × 11
  interiors in the existing schema.
- Fixed `Spiral`: its inner chamber was fully enclosed by permanent wall and
  failed cleared-reachability validation. The bottom wall now has a two-cell
  opening, so the room loads and the inner sentry is reachable.
- Removed test coupling to authored map content. Exact name/hint/enemy arrays and
  the legacy full-grid copies were dropped. Map-format and loader checks use a
  test-owned interior; cork loading uses two test-owned maps; name lookups guard
  missing rooms; campaign sweeps derive expectations from `MAPS` metadata, so
  adding rooms does not require editing those assertions.
- Refreshed the development visual checkpoint. The campaign scenes are generated
  from `MAPS`, so all 15 room-start scenes are present. Full-frame UI captures
  changed because the HUD/menu now show the 15-room count; this is development
  evidence, not aesthetic approval or a formal regression reference.
- Updated the README room summary and the campaign invariant in `AGENTS.md`.

### Verification

| Command                           | Result                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify:fast`             | passed (format, lint, typecheck, 267 unit tests)                                                                             |
| `npm run capture:visual:baseline` | passed; development checkpoint replaced                                                                                      |
| `npm run test:visual:compare`     | 42 passed, exit 0                                                                                                            |
| `npm run test:visual`             | initially failed on the launcher's missing browser path; passed with `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"` |
| `npm run test:e2e`                | 23 passed (Chromium, same browser-path override)                                                                             |

The owner previously playtested the added maps. Exact tested SHA, browser, and
exhaustive room-by-room scenarios were not supplied. Release/browser-matrix
suites were not run for this update; CI remains authoritative.

## Floor artwork step (issue #24, ADR 0004 step 5)

Branch `feature/24-floor-art`, based on `c31435f` (the adapter-hardening head,
PR #40). Presentation-only: no simulation, collision, muzzle, radius or snapshot
change. The floor is decoded before the first frame; a failure keeps the
procedural floor and reports in the status line instead of leaving a blank arena.

### What changed

- `src/render/floor-data.ts`: `wood-warm` tile (512 px) copied verbatim from the
  pack's `toybox-floors.js`. Both checked-in copies of that file are byte-identical
  (`cmp`), and `src/main.ts` imports the data module rather than fetching.
- `src/render/floor.ts`: `validateFloorDefinition`, `buildFloorSvg`, and
  `prepareFloorImage`, which decodes once and reuses `AssetLoadError`
  (`assetId: 'wood-warm'`, `invalid-asset` / `decode-failed`).
- `src/render/assets.ts`: the SVG decoder is exported as `decodeSvgImage` so the
  floor shares the same decode path.
- `src/render/renderer.ts`: `RenderContext` gains `createPattern`; the renderer
  gains `setFloorPattern(image)`. With a pattern it fills 960×540 under the world
  transform, so the 512 px tile stays anchored to world 0,0. Without one it draws
  the existing procedural planks. Spawn rings and the TOYBOX watermark still draw
  in both cases.
- `src/main.ts`: top-level `await preloadFloorArtwork()` runs before the bridge
  and the first render, so captures and gameplay cannot race the decode. Failure
  writes a non-blocking warning to `#status` with the `.warning` class.
- `src/styles.css`: `.status.warning` styling.
- `tests/unit/floor.test.ts`: tile wrapping, single decode, decode failure, and
  malformed-data rejection (4 tests).
- `tests/unit/renderer.test.ts`: pattern fill replaces the procedural fill, spawn
  rings stay, and a failed `createPattern` keeps the procedural floor (13 tests).

### Commands and observed results

| Command                                                                       | Result                                                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npm run verify:fast`                                                         | pass: format, lint, typecheck, 33 files / 283 unit tests               |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify`        | pass: coverage, 23 e2e tests, 1 visual candidate test, 5 release tests |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers` | pass: 9 hosted tests across Chromium, Firefox and WebKit               |

The `verify` row is from before the owner-requested watermark removal. After that
change the same components were re-run: `verify:fast` (283 tests), 23 e2e tests,
1 candidate capture, 5 release tests and 9 hosted browser tests all passed. A
plain re-run of `npm run verify` reused a developer-run `vite` on port 5173 that
lacks the test bridge, so 18 e2e tests failed with `Test bridge missing`; the
isolated-port rerun above confirms this was the reused server, not the change.

A temporary Playwright probe (not committed) sampled the live canvas after the
`coop` scenario rendered: the dominant colours were the `wood-warm` board shades
(`#d9bc91` / `#ddc298`), 365 of 387 sampled floor points matched exactly one
tile (512 world px) apart, only 97 of 387 matched at a half tile, and `#status`
had no warning. That is evidence for world anchoring and a successful preload,
not an aesthetic approval.

### Candidate screenshots (not baselines)

`test-results/visual-candidates/01-menu.png` through `09-resized-gameplay.png`
were recaptured from this branch. They are unapproved candidates; the menu shot
is covered by the overlay, so `02-gameplay.png` is the first floor view.

Owner review on 2026-11-12: the wood-warm floor is approved. The owner also asked
to remove the TOYBOX watermark (previously kept for the first candidates), so the
watermark and tagline no longer draw. The recaptured images reflect that removal;
the floor tile itself is unchanged.

### Limits and open choices

- The rug stays skipped; that remains a later owner choice.
- The candidate images are not committed reference baselines and no visual
  comparison threshold was added.
- The floor PR should target `feature/24-asset-adapter-hardening` until PR #40
  merges, then retarget to `main`.

## Asset adapter hardening (issue #24, follow-up to PR #36)

Branch `feature/24-asset-adapter-hardening`, based on `30246e5` (the squash
merge of PR #36). This slice is presentation-only. It adds validation, bounded
caching, error reporting and the procedural-fallback contract to
`src/render/assets.ts`. It does not import the adapter from the renderer or
`src/main.ts`, changes no visuals and adds no screenshot baseline.

### What changed

- `src/render/assets.ts`: registered asset IDs (`tank-blue`, `tank-orange`,
  `turret-enemy`), a pure `validateAssetDefinition` check (viewBox, anchor,
  muzzle, shadow, non-empty and unique layer roles), typed `AssetLoadError`
  codes (`unknown-asset`, `invalid-asset`, `decode-failed`,
  `canvas-unavailable`, `invalid-resolution`), an LRU layer cache bounded to 16
  entries by default, in-flight decode deduplication, `preload` that reports
  failures instead of rejecting the batch, an `onError` hook (default
  `console.error`), `reset()` for world changes, and `draw()` that returns
  `false` when the caller must keep drawing procedural art.
- `tests/unit/assets.test.ts`: 13 tests covering the SVG fragment builder,
  checked-in definitions, malformed definitions, unknown IDs, invalid
  definitions, cache reuse, concurrent decode deduplication, LRU eviction,
  decode failure and retry, the draw fallback contract, draw without mutation,
  stale in-flight results after reset, and `preload` failure collection.

### Commands and observed results

| Command                                                                       | Result                                                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npm run verify:fast`                                                         | pass: format, lint, typecheck, 32 files / 277 unit tests               |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify`        | pass: coverage, 23 e2e tests, 1 visual candidate test, 5 release tests |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers` | pass: 9 hosted tests across Chromium, Firefox and WebKit               |

### Limits

- The adapter is not part of the shipped bundle yet. The existing hosted SVG
  probe still proves browser decoding; the adapter's own browser error path is
  exercised when the tank step wires preload and drawing.
- The fallback is a tested contract (`draw` returns `false`), not yet a visible
  in-game message. The visible error surface and procedural drawing switch
  belong to the wiring step.
- No candidate screenshots were captured because this slice has no visual
  change.

## Issue 22 visual comparison workflow: local verification

Branch `test/22-manual-visual-review`, base commit `d69f818`. All results below
are from the uncommitted working tree on 2026-11-12, not from a later committed
head. The development checkpoint in `docs/visual-catalogue/current/` was
recaptured (30 scenes, 74 images) and remains development evidence, not formal
reference or aesthetic approval.

### Corrections made while running the gates

- `tests/visual/catalogue-support.ts`: filter empty NUL-separated paths before
  sorting, so source provenance is typed as `string[]`.
- `tests/visual/development-cli.ts`: add the `isObject` type predicate and stop
  deleting `TOYBOX_REVIEW_SCENES`, so the documented subset comparison actually
  reaches `review.compare.ts`.
- `tsconfig.e2e.json` and `tsconfig.unit.json`: allow importing `.ts` extensions
  for the Node-run visual CLI.
- `src/visual-motion-scenes.ts`: run `shell-head-on-cleared` for 70 ticks so the
  contact poof has expired; update its purpose text.
- `tests/unit/visual-scenes.test.ts`: assert the zero-time rule only for static
  scenes; motion fixtures intentionally advance fixed ticks.
- `playwright.config.ts` and `playwright.review.config.ts`: launch Chromium with
  `--disable-partial-raster`.

### Menu variation diagnosis

Repeated fresh-page captures initially differed by 3-9 pixels at fractional
HUD/button edges (for example x=955/966/967, y=85/86). Tiny RGB/alpha
antialiasing changes appeared around `ui-menu`, `ui-paused` and `ui-cleared`.
Launch-flag experiments showed that text flags alone were insufficient.
`--disable-partial-raster` produced one unique screenshot hash over six repeated
captures for each of menu, paused and cleared. The setting is a deterministic
rendering environment fix, not a sleep, retry, mask, tolerance change or
auto-approval. `ui-menu`'s fresh-page repeat check now passes.

### Intentional-change experiment

A temporary `--ink` colour change from `#303b41` to `#ff0000` in
`src/styles.css` was detected with exact pixel evidence:

```sh
TOYBOX_REVIEW_SCENES=ui-menu npm run test:visual:compare
```

Result: exit 1; `ui-menu.full.png` differed by 8373 pixels and
`ui-menu.arena.png` by 6157 pixels. The colour was reverted byte-for-byte
(`git diff -- src/styles.css` empty) and the same command then passed (exit 0,
2 tests). No reference was changed.

### Commands and observed results

All commands ran from the repository root. Raw browser commands used
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"` because the launcher
sets a non-existent cache path.

| Command                                                                                                              | Result                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npm run verify:fast`                                                                                                | pass: format, lint, typecheck, 31 files / 264 unit tests               |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e`                                             | pass: 23 tests                                                         |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:visual`                                          | pass: 1 candidate-capture test (9 scenes)                              |
| `npm run test:coverage`                                                                                              | pass; statements 96.58%, branches 94.23%, functions 100%, lines 96.45% |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:release`                                         | pass: 4 tests (hosted + single-file, hook exclusion)                   |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers -- --project=chromium --project=webkit` | pass: 4 hosted tests                                                   |
| `npm run capture:visual:baseline`                                                                                    | pass: replaced checkpoint after complete capture                       |
| `npm run test:visual:compare`                                                                                        | pass: 31 tests / 30 scenes, including `ui-menu` repeat                 |
| `TOYBOX_REVIEW_SCENES=touch-landscape-gameplay,touch-portrait-paused npm run visual:compare`                         | pass: 3 tests, confirming subset forwarding                            |

Firefox hosted smoke was not run: the sandbox still blocks profile creation with
`CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM`. That is a blocker, not a
pass. Chromium and WebKit are the observed local browser results.

### Artifacts and limits

- Development gallery: `docs/visual-catalogue/current/index.html`.
- Captured source: revision `d69f818` plus the code/config/fixture modifications
  listed above; the generated manifest records the exact dirty state and local
  environment at capture time.
- Comparison actuals/diffs/traces: `test-results/visual-review/`; HTML report:
  `playwright-report/visual-review/`.
- The checkpoint is overwriteable development documentation. No formal
  references, approval metadata or owner aesthetic approval exist.
- Fullscreen catalogue scenes remain deferred and unregistered; no fullscreen
  capture or environment result is claimed.
- The inactive approval modules remain historical code and are not part of the
  current procedure.
- Image comparison does not replace behavioural, renderer-read-only,
  room-start, pause/reset, production or `file://` hook-exclusion checks; those
  suites passed separately.

## Audio issue 16: current-main port, not verified

Branch `feature/16-audio-on-current-main` continues the clean-current-main port
of the initial audio feature. The implementation adds the audio event model,
semantic sound mapping, browser playback/session/controls, optional simulation
event collectors, per-step structured event batches, application lifecycle
wiring, moved binary assets, and an audio-step integration test.

This port is a working handoff, not a completion claim. No formatter, TypeScript,
unit, browser, release, or audible check has been observed for the branch head.
Asset provenance, creator, generation source, license, and redistribution terms
remain unresolved.

Ported in this commit: `docs/audio.md`, the three audio evidence documents, and
the `audio-events`, `audio-music`, and `audio-session` unit tests. The
mobile-layout e2e audio assertions still need to be merged into the current base
test file. Existing main progress sections are retained.

## Independent tank body rotation (issue #1, PR #31)

Branch feature/1-independent-body-rotation, based on main `f55cca2`. This slice is
presentation-only: the body heading is derived after every fixed step from the
distance a player actually moved and is stored outside `src/sim/**`. `Tank.angle`
stays the only aim angle, and collision, muzzle, sight and gameplay snapshots are
not touched. Replacing the procedural art with the supplied assets is a separate
plan in issue #24.

- Commits: `c9ed001` (heading module and unit tests), `3eca155` (shared
  `advanceWorld` step path in `main.ts` and `test-bridge.ts`, body/turret split in
  `drawTank`, renderer and bridge tests), `c0282ee` (docs) and `6d1b84b` (test-only
  fix, see below).
- Heading rules as implemented: movement below `MIN_BODY_TURN_DISTANCE` (10% of
  the full-speed per-step distance) is ignored; fully blocked moves do not turn
  the body; wall sliding follows the real path; sentries keep a fixed up-facing
  body; disabled players keep their last heading; labels stay upright.
- Local checks: none were run locally for this slice.
- CI, observed through GitHub (job conclusions, not log audits): the first `verify`
  run, started 21:24 UTC, failed one renderer test. The assertion matched a
  sentry's shadow fill instead of the player's, because sentries are drawn first;
  the production code was correct. Commit `6d1b84b` changed only the test helper
  to take the last matching fill, with no assertion weakened. The `verify` job for
  head `6d1b84b` then succeeded, finishing 2026-11-09 21:31 UTC:
  https://github.com/ratatwiskr/toybox-tanks/actions/runs/42702862716/job/129452031059
  The `deploy-pages` and `pages-smoke` jobs were skipped on the PR, not passed.
  Later documentation-only commits need their own CI run.
- Owner playtest: on 2026-11-09 the owner played the branch on Android in the Brave
  browser through the playtest repository's GitHub Pages deployment and reported
  that body rotation worked great. The exact deployed SHA was not supplied. This
  covers touch play on one device and browser. It does not cover desktop keyboard
  diagonals, wall sliding with two players, physical gamepads, real Safari/iOS,
  or the `file://` single-HTML release.
- Decisions: the turn threshold is implemented as proposed and was not separately
  confirmed beyond the owner's request to merge. No screenshot candidates were
  captured and no screenshot baseline is approved. Gate E is not declared complete.

## Merged baseline: borders and cork

PR #14 is squash-merged into main as
`d5aa53f8df4d73210e43d5edb2896f96bca152dc`. It supplies automatic solid borders
for 22 × 11 authored interiors, retaining the original 24 × 13 arena.

The cork feature and fourth room are also merged. PR #19, the clean main-based
replacement for conflicted PR #15, was squash-merged as
`5bec29e3ba4a2779286da406dba0ce113e94dba7` at 2026-11-08 11:18:35 UTC.
PR #15 was closed without merging at 11:18:37 UTC. These states were checked
through GitHub, not inferred from a branch name or an old handoff.

Provenance: reviewed #15 source `c19927abd793f871dd88e0f9cb3e0032`
was reconstructed on feature/destructible-cork-blocks-main; #19's reviewed head
was `872262f7f934d90ea74a816bfea55d3482a2f0b0`. The 13 transferred application/
test blobs were recorded as identical to the pinned source during reconstruction.
This history is not an instruction to repeat reconstruction, rebase #15, open
another replacement, or reopen the closed PR.

Main's border test was retained. Do not restore `.issues/6.md`,
`docs/issue-6-handoff.md`, or `docs/cork-rendering-handoff.md`. Historical migration
and reconstruction/session handoffs are context, not active task queues.

### Merged cork scope

- Three-hit independent cork cells, initial versus cleared reachability, and
  resettable world state separate from permanent walls.
- Shared cork-aware movement, swept/muzzle shell contact, sight, and aim queries.
- Conservative ambiguous contacts, stable same-step destruction, and unchanged
  solid-wall bounce and faction-hit rules.
- Procedural intact/cracked/heavily cracked cork, no destroyed cork/shadow,
  bounded crack paths, and render-order-independent outline widths.
- Original three layouts/order preserved; Cork Keep appended as room four.
  Completion follows room four and replay starts at room one.

Retain procedural cork. SVG integration is not pending work. ADR 0002 records
the durable mechanic/presentation decision; broader assets remain separate.

### Cork evidence and limits

Historical #15 implementation head `4ea53013cfe5a2d632dc3198dd88e0f9cb3e0032`
had a successful verify run:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42470914415

Replacement #19 head `872262f7f934d90ea74a816bfea55d3482a2f0b0` also had
verify success, finishing 2026-11-08 11:16:47 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42474871936/job/128713836960
Its production deployment and pages-smoke jobs were skipped, not passed.

On 2026-11-08 the owner reported successful cork playtesting in the VS Code
internal browser. The exact tested SHA and exhaustive scenarios were not supplied.
Do not extend this to every state, reset, release, browser or physical device.
Visual regression and comprehensive cork-state coverage remain separate work.
No screenshot baseline is approved; Gate E is not declared complete.

## Mobile/tablet feature: PR #17 (merged)

Status correction, checked through GitHub on 2026-11-09: PR #17 is closed and
merged, and main contains the squash commit `dd2ac51` ("Add mobile support (#17)",
2026-11-08 20:29:45 UTC). The local screenshot catalogue (#21) was merged on top
as `f55cca2`. The sections below were written while #17 was still open and are
kept as historical evidence. Post-merge production deployment and published-site
smoke results were not inspected for this update.

Branch: feature/solo-touch-controls, based on the merged cork baseline.
Implemented on this branch: fixed touch pads, tick-only P1 commands, bounded
directional turret aiming, shared input cleanup, landscape compact layout,
portrait pause with explicit Resume, optional whole-app fullscreen, mixed touch
P1/gamepad P2 routing and ordinary two-gamepad routing when touch is disabled.

Gameplay/layout checkpoint `3d04d57aabd3a41f6853d1454a5c76e003e43f87` adds
larger device-edge pads with reserved side space, preserving the complete arena
and reclaiming space when touch is disabled. Earlier f0a970f fixes callback
narrowing in Start handling and authors Start press/hold/release regressions.

### CI evidence before the final input-test batch

The verify job succeeded for layout source
`3d04d57aabd3a41f6853d1454a5c76e003e43f87` at 19:43:35 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42516282744/job/128839896358

Documentation reconciliation head `32e747246ddc90863f837d2cfee6ad1c154632e8`
also passed verify at 2026-11-08 20:13:24 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42518873045/job/128847765341

These are observed job conclusions, not local command runs or detailed log audits.
The verification job includes full verify and cross-browser release smoke.
Production deploy-pages and pages-smoke were skipped on the PR, not passed.
Earlier failures and fixes remain in Git history; no gate was waived.

### Final input-safety tests: authored, not yet verified

This subsequent test/documentation batch adds:

- tests/e2e/input-ownership.spec.ts: app-level movement and projectile ownership
  for mixed and two-controller co-op; ignored extra pads; held-input routing
  transition; pause/restart/cancel cleanup; fresh gesture recovery; unsampled tap
  discarded across pause. Browser inputs are mocked only at navigator/CDP edges.
- tests/unit/touch-shot-limit.test.ts: a shell-cap rejected tap is consumed, does
  not retry when capacity becomes available, and a deliberate fresh tap can fire.
- A direct README link to the latest published testing site, explicitly distinct
  from the latest source commit or production main.

No gameplay source, test bridge, dependencies, thresholds or CI policy are
changed by this batch. Tests assert observable poses, shot counts and owner IDs;
they do not spy on internal adapter calls or add production hooks.

No local formatter, compiler, lint, unit, browser or release command was executed
for this batch. Fresh final-head CI is required; the earlier green result does
not verify these new tests. Fix genuine failures without weakening assertions.

### Physical playtest evidence

The owner first reported mobile play works great and requested device-edge pads.
After that adjustment, the owner explicitly reported the latest mobile state
playtested fine and accepted the layout on 2026-11-08. The exact tested source
SHA, browser and device were not supplied. Treat mobile layout/feel as owner-
accepted, not as proof of all lifecycle cases, tablet/controller combinations
or real Safari/iOS compatibility. No repeated layout acceptance is requested
solely because tests/docs are added without runtime changes.

### Remaining before merge recommendation (historical)

This list was written before the merge. The merge itself is confirmed above; the
final-head CI result for the input-safety batch is not recorded in this file.

- Require fresh green CI on the final test/documentation head and inspect any
  failure. Current tests remain an execution claim only after actual results.
- Reconcile the PR checklist and mobile handoff with final-head evidence. This
  progress section supersedes older descriptions of the input-test gaps above,
  but authored tests must not be described as passing before execution.
- Physical mixed tablet/two-controller verification and fullscreen/browser-
  specific edge cases remain explicitly limited, not certified by synthetic tests.
- Mark ready and merge only with explicit approval after final checks. Then
  inspect main verification, production deployment and published-site smoke.

No merge/deployment, branch deletion, issue closure, screenshot approval or
verification-policy change is performed by this update. Exact procedures:
docs/verification.md. Architecture: docs/architecture.md. Local Firefox sandbox
launch failures are blocked, never passed. Automated WebKit and synthetic
gamepads/pointers do not certify physical devices.
