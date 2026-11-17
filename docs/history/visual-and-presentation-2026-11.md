# Visual workflow and presentation — 2026-11

> **Historical record.** Frozen 2026-11-17; not current instructions.
> Current state: [../progress.md](../progress.md) · Index: [README.md](README.md).
>
> Extracted from the former `docs/progress.md`; Git history keeps the original.

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
