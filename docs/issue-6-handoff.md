# Issue 6 continuation: automatic outer border

Prepared: 2026-11-08
PR: #14
Branch: `feature/auto-add-outer-solid-walls-to-maps`
Inspected starting SHA: `02bc4d514bb0a2e444af0c5a76f926f5b751b858`

## Scope

The existing implementation already strips the campaign grids to 22 by 11
interior cells and restores the original border during world loading. Keep that
implementation and its legacy geometry comparison tests intact. This continuation
adds loader-level edge regressions and corrects the README map-authoring contract.
It does not change production rules, configuration, campaign data, reference HTML,
dependencies, CI, or visual baselines. No merge or deployment is authorized by this
change.

## Added evidence to execute

`tests/unit/map-border-loading.test.ts` partially mocks only authored map data in
its own test module. Real validation, border generation, world loading, swept
wall queries, and tank movement are exercised. Synthetic maps are not campaign
content.

- All four corners and all four outermost authored sides load at the correct
  world coordinates.
- An independent perimeter oracle checks every generated wall and its ordering.
- Outward swept paths hit the boundary, and tank movement stays inside it.
- Solo loads exactly player 1 while retaining enemy and wall data.
- Dirtying one world does not contaminate a fresh world or independently loaded
  entity, wall, and event state.
- Border generation does not mutate frozen authored rows or reuse result arrays.
- Reachability cannot escape around an isolated interior corner.

## Evidence already observed

The GitHub check-run response for the starting PR revision reported verify as
success and deploy-pages/pages-smoke as skipped. The observed run was:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42421034986

That result predates these additional tests. It is not evidence that the new
revision passes. Source review and an independent Python grid round-trip check
were performed during preparation; neither executes the TypeScript application.
No npm, formatter, compiler, Vitest, or Playwright command was executed here.

## Local agent / CI handoff

Check out the PR branch and record the exact new SHA. Respect the existing
no-install policy and run browser suites sequentially.

```sh
npx vitest run tests/unit/maps.test.ts tests/unit/map-border-loading.test.ts
npm run verify:fast
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers
```

If formatting fails, apply Prettier only to the affected files and rerun the
gates. Do not disable assertions, lower coverage, update snapshots, or bypass a
browser or sandbox failure. Firefox remains subject to the documented local
sandbox limitation; distinguish that from CI evidence.

Record commands, exit statuses, tested SHA, CI links, and artifacts in
`docs/progress.md` after execution. Before issue closure, complete a keyboard
smoke of the unchanged campaign and both build formats. Visual approval and
physical gamepad verification remain separate. These additions are not marked
passed or merged by this handoff.
