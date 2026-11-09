# ADR 0003: Shell-shell collision neutralizes both projectiles

## Status

Accepted (pending verification)

## Context

Previously, shells passed through one another. The product invariant explicitly
forbade shell-shell collision. Playtesting showed that mid-air shell duels are
a readable, satisfying interaction that also gives co-op players a way to
clear incoming fire.

## Decision

Any two shells whose swept paths touch within `2 * shellRadius` (6 px) in a
simulation step are both marked dead and a `spark` effect is spawned at the
contact point. This applies regardless of faction: P1 vs P2, player vs enemy,
and enemy vs enemy all collide.

A shell that hits a tank, wall, or cork earlier in the same step is not popped
by a later shell-shell contact; the earlier terrain/tank contact wins.

The 23 px muzzle sweep in `shoot` also tests against existing shells using a
segment-to-point distance check, since other shells have not advanced yet in
that step.

## Consequences

- `AGENTS.md` product invariant updated: "no shell-shell collision" removed,
  replaced with the all-faction collision rule.
- Co-op players can now deliberately trade shots to clear incoming fire.
- Reflected paths after a bounce are not chained in the same step's collision
  test; the residual miss window after a bounce is sub-step and bounded.
- Contact radius (6 px) is a starting point, subject to playtest tuning.

## Verification

- Unit tests in `tests/unit/shell-collision.test.ts` cover head-on, crossing,
  near-miss, same-faction, order independence, terrain-priority, muzzle sweep,
  and post-bounce cases.
- Local verification (`npm run verify:fast`, `npm run verify`) and browser
  smoke are pending; this PR is a draft until those pass.
