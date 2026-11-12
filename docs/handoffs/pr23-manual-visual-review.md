## Purpose

Follow-up to #22 and the merged capture-only PR #21. Deliver explicitly invoked local Playwright image comparisons and separately owner-approved references, without a mandatory CI gate or automatic screenshot approval.

## Current status

Draft opened early as the delivery container. Commit 912c306 persists the required self-contained implementation task in `docs/tasks/manual-visual-review.md` before coding. Comparison and promotion tooling are NOT implemented yet. This PR currently provides the implementation contract, not a working comparison feature.

## Implementation plan

- Preserve `npm run capture:visual` and its overwriteable `docs/visual-catalogue/current/` output independently of references.
- Reuse the existing scene registry, controlled test-only fixtures, capture preparation and production renderer. Cover representative UI/gameplay/outcomes, resized gameplay, every campaign room start and synthetic cork/feedback scenes, retaining full/arena/detail views where applicable.
- Add an opt-in comparison command that captures fresh actual images and exposes Playwright expected/actual/diff evidence and a local HTML report. Keep generated artifacts ignored and approved references at separate stable Git-trackable paths.
- Explicitly disable snapshot updates during comparison, including missing references and CLI override attempts. Missing references remain unapproved failures with reviewable candidates.
- Add a separate explicit promotion operation requiring selected scene/view IDs and exact reviewed candidate hashes. Validate all selections before writing; preserve unselected references and small source/environment approval records. Agents do not approve appearance.
- Retain paired menu screenshots and focus/layout/render diagnostics to investigate the earlier unchanged-menu variation. Do not hide it with sleeps, retries, masks or relaxed tolerances.
- Add focused safety tests and document capture, comparison, report review, initial approval, promotion, rerun and rename/removal procedures.

## Verification and acceptance

- [ ] Implement comparison and hash-bound selected promotion.
- [ ] Verify missing references and ordinary comparisons never modify references.
- [ ] Verify changed candidate hashes/invalid selections are refused and unselected references are preserved.
- [ ] Diagnose menu variation from actual image evidence; demonstrate reliable unchanged representative comparisons in the documented local Chromium environment.
- [ ] Demonstrate a temporary intentional visual change is detected, revert it and demonstrate unchanged output passes.
- [ ] Preserve renderer read-only, room-start, pause/reset and production/file:// test-hook exclusion checks.
- [ ] Run formatting, focused tests, verify:fast and applicable full/browser/release checks sequentially; record actual commands, source context, exits, artifacts and blockers.
- [ ] Owner captures and reviews candidates, explicitly approves selected references, then reruns comparison.

No formatter, compiler, lint, unit, browser, capture or release checks have been executed in this API session. No screenshot references have been created or approved. No stability, aesthetic approval or completed visual gate is claimed.

## Boundaries

No new dependencies or installs, gameplay/artwork changes, mandatory CI gate, automatic baseline refresh, weakened assertions/coverage, merge or deployment. Keep #22 open until implementation and acceptance evidence exist; this description intentionally uses no automatic issue-closing keyword. The local task requires no GitHub access.
