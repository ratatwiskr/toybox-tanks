# Toybox Tanks — current progress

Updated: 2026-11-17

This file records **current state only**. Do not append a new historical section for
completed work. When work merges or is superseded, leave one line here and move its
detailed evidence to `docs/history/<topic>-<year>-<month>.md` (index:
`docs/history/README.md`). Git retains earlier revisions:
`git log --follow -- docs/progress.md`.

Live PR, CI and deployment state is authoritative on GitHub. The snapshot below is
a convenience, not permission to infer merge state.

## Active work

PR [#47 "Add enemy variety"](https://github.com/ratatwiskr/toybox-tanks/pull/47)
is open against `main` with head `c4e56fe` ("Add touch secondary mine button"),
eight commits, and `mergeable_state: clean`. CI `verify` and `artifact` succeeded;
`deploy-pages` and `pages-smoke` were skipped on the PR. The owner planned to
squash-merge manually.

A local documentation refactor is uncommitted: `AGENTS.md`, this file,
`docs/backlog.md`, and `docs/asset-integration-plan.md` were trimmed or reconciled with
implemented features, and merged-work evidence was moved to `docs/history/`. No source or
test files changed.

## Feature summary

The branch adds the deterministic enemy-kind framework (roamer, bruiser, lobber,
prankster), bank-shot telegraphs, poms, Prankster and player mines, the player
secondary weapon, campaign rooms 16–19, enemy-symbol validation, HUD wording,
per-kind art with HP pips, level-select preview colors, and a touch P1 secondary
button above the aim pad. Rooms 1–15 keep their order; `bc1e5a8` varies sentry
placements and updates their hints.

Touch P1 lays a mine on one press and detonates it on the next, matching keyboard
`G` / `/`. The button is a separate circular control with a 16 px gap above the aim
pad. `TouchAdapter` keeps a held flag plus a one-tick pending flag so sub-step taps
still produce one rising-edge command.

Scope detail and settled decisions live in
`docs/enemy-kinds-opencode-handoff.md`. Historical evidence:
`docs/history/enemy-variety-2026-11.md`.

## Verification

Recorded on `c4e56fe` with a clean tree unless noted.

| Command                           | Result                                                                     |
| --------------------------------- | -------------------------------------------------------------------------- |
| `npm run verify:fast`             | passed: format, lint, typecheck, 38 files / 345 unit tests                 |
| `npm run test:coverage`           | passed: 89.81% statements, 82.79% branches, 95.37% functions, 90.71% lines |
| `npm run capture:visual:baseline` | passed; development checkpoint replaced with 49 captured scenes            |
| `npm run test:visual:compare`     | 50 passed, exit 0                                                          |
| `npm run test:e2e`                | 28 passed (Chromium)                                                       |
| `npm run test:release`            | 5 passed (hosted and single-file releases)                                 |
| `npm run test:browsers`           | 9 passed (Chromium, Firefox, WebKit hosted release smoke)                  |
| CI `verify` / `artifact`          | success on `c4e56fe`                                                       |

`npm run test:visual:report` is not a pass/fail check: it serves a report until
stopped. The last run was terminated by timeout (exit 143/SIGTERM).

Visual captures are development evidence only. The implementing model cannot view
images, so no aesthetic approval is claimed. The development checkpoint in
`docs/visual-catalogue/current/` is overwriteable, not an approved regression
baseline. See `docs/development-workflow.md` and ADR 0001.

## Open items

- Owner: squash-merge PR #47 (or request changes), then inspect post-merge `main`
  verification and deployment.
- The touch secondary button has automated Chromium touch coverage and desktop-size
  layout checks, but no real touch-device review.
- Gate E is not declared complete; formal visual regression/approval remains
  deferred.

## Environment

Node `24.22.2`, npm `11.19.1` (Volta). Raw Playwright commands need
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`; the three visual workflow
commands handle this internally. Local Firefox is blocked by the nono sandbox
(`unshare(CLONE_NEWPID): EPERM`) and is never reported as a pass. Details:
`docs/verification.md` and `AGENTS.md`.
