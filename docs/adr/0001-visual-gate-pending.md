# ADR 0001: Keep the visual regression gate pending

Date: 2026-11-06

## Context

`npm run verify` must include visual checks, but the first visual baselines require
human/vision review. The implementing agent cannot view images and must not approve
aesthetics or auto-accept snapshots. Gate B needs a browser spec that captures stable
candidate scenes without pretending they are approved baselines.

## Decision

- `tests/visual/candidates.spec.ts` captures deterministic candidate screenshots to
  `test-results/visual-candidates/` using `page.screenshot()`.
- It does not use `toHaveScreenshot()`, does not create or compare committed snapshots,
  and does not update baselines automatically.
- `npm run test:visual` and `npm run verify` may pass because candidate capture
  succeeded, but the visual regression gate is reported as **pending**, not passed.
- Once a human approves candidates, a later change may introduce reviewed baselines and
  turn `test:visual` into a comparison suite.

## Consequences

- CI stays green on the parts that are actually verified while keeping the visual gate
  visibly open.
- No generated screenshots are treated as approved evidence.
- The candidate capture step adds artifacts to `test-results/`, which CI uploads.
- A future ADR or progress update must record the approval and the switch to baseline
  comparison.
