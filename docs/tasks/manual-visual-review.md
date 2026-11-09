# Issue 22: manual visual comparisons and owner-approved references

## Status and delivery

Task persisted before implementation. Starting main revision:
`f55cca2817a8792ab5afe99778d5cdf95558fce6`.
Branch: `test/22-manual-visual-review`.

Deliver working local tooling and documentation in a draft PR, not just this
handoff. The owner will run captures, inspect screenshots and explicitly
approve selected references. No reference approval or successful verification
is implied by this task. Keep issue 22 open until its acceptance evidence exists.
This document is self-contained; a local implementing agent needs no GitHub access.

## Required context

Read AGENTS.md, applicable nested instructions, docs/architecture.md,
docs/verification.md, docs/progress.md, docs/adr/0001-visual-gate-pending.md,
docs/adr/0002-destructible-cork.md if present (otherwise locate the cork ADR),
docs/visual-catalogue/README.md and docs/tasks/visual-state-review.md.
Inspect package.json, Playwright configs, tests/visual/catalogue-support.ts,
catalogue.capture.ts, catalogue.setup.ts, candidates.spec.ts, src/test-bridge.ts
and src/visual-scenes.ts before coding. Canonical bridge types must be imported,
not redeclared. The old slice-1 task's statement that issue 18 stays open is
historical: issue 18 closed with PR 21; issue 22 is the focused follow-up.

## Required workflow and boundaries

1. Preserve `npm run capture:visual`: explicit capture and overwrite of
   docs/visual-catalogue/current/, independent of comparison and approval.
2. Add an opt-in comparison command, proposed name `npm run compare:visual`,
   capturing fresh actual images through the existing test bridge and production
   renderer. Never silently compare stale catalogue files. Reuse captureScenes(),
   imageKinds(), fixture loading and screenshot preparation; extract shared
   helpers rather than maintaining a second scene registry or renderer.
3. Put approved PNGs at stable Git-trackable paths, proposed
   docs/visual-references/chromium-local/. Store actuals, diffs, diagnostics and
   reports only under ignored namespaced generated directories.
4. Use existing Playwright image comparison and expected/actual/diff attachments
   with an HTML report. Explicitly set snapshot updates to never for ordinary
   comparison, including missing references. Reject attempts to enable updates
   through CLI overrides. Missing references are pending/unapproved failures,
   not accepted snapshots. Do not add comparison to verify or mandatory CI.
5. Produce a candidate manifest with source revision/tree hash/dirty state,
   environment, selected scene/view IDs and SHA-256 hashes of the actual PNG
   bytes available for review. Label incomplete runs and failed scenes. Preserve
   candidates for missing references so initial reference creation is possible.
6. Add a separate explicit promotion command, proposed name
   `npm run approve:visual -- ...`. It must require an owner-selected allowlist
   of scene/view IDs and the exact reviewed candidate hashes or a reviewed
   approval file containing those hashes. No default approve-all or implicit
   agent approval. Validate every selected file, hash, manifest and destination
   before writing; refuse changed/missing bytes, duplicate/unknown IDs, unsafe
   paths and incompatible environment. Promote precisely the validated bytes,
   not new screenshots. Keep a small provenance/approval record. Do not treat
   the command as proof the human actually reviewed appearance.
7. Ordinary capture, comparison, retries and missing-reference handling must
   never create, replace or delete approved references. Promotion must leave
   unselected references unchanged. Scene renames/removals require explicit
   owner review, not automatic pruning. Re-run comparison after promotion.

No new dependencies, installs, gameplay/artwork changes, CI gate changes,
weakened tests/coverage, automatic approval or broad browser matrix. Existing
verify/test:visual semantics remain intact. Make only narrowly scoped additive
npm scripts; explain any necessary visual-policy clarification without declaring
the visual gate complete. No staging unrelated local changes, pushing, merging,
deploying or closing issues without separate authorization.

## Capture control and menu investigation

Use one documented local Chromium environment: existing pinned tooling,
headless Chromium, fixed viewport per scene, DPR 1, light scheme, reduced motion,
en-US locale and UTC timezone. Record actual OS, browser and Playwright versions.
Use isolated loopback test server settings and a validated dedicated port; do
not silently reuse another server or inherit catalogue reset as comparison setup.

Retain simulation clock control, font/render readiness, explicit focus modality,
mouse position, runtime-error checks and renderer read-only checks. Campaign
starts must remain zero ticks, shell/effect free and intact cork.

Earlier unchanged-menu screenshots produced two recurring hashes. This is
unresolved, not fixed merely by removing the old repeat-image gate. Capture
paired menu PNGs plus focused element, focus/visibility state, viewport/DPR,
canvas bounds, fonts and copied game state. Inspect actual image differences
with owner assistance if needed; isolate focus/layout/render causes from that
evidence. Do not conceal variation using sleeps, retries, masks or looser
tolerances. Require owner approval for any masking or tolerance policy change.
Do not claim reliable unchanged comparison until demonstrated. Cross-machine
pixel identity is not required; report incompatible environments honestly.

## Coverage and tests

Begin local verification with menu, co-op, one campaign start and a synthetic
cork scene. The implemented registry must cover all agreed catalogue scenes:
representative UI/gameplay/outcomes, resized gameplay, all campaign room starts
and synthetic cork/feedback fixtures, with full/arena/detail views as applicable.
Record deliberate exclusions explicitly. Support selecting a small subset
without silently changing full-run coverage.

Add focused tests proving missing references never write, ordinary comparisons
never mutate references, selected hash-matched promotion preserves unselected
files, changed hashes and invalid selections are rejected before writes, and
incompatible environments cannot be silently accepted. Ensure compare tests
are isolated from ordinary candidate/capture test discovery. Guard against
CLI snapshot-update overrides.

Verify a temporary intentional visible change generates useful expected/actual/
diff evidence, revert it, then demonstrate unchanged representative scenes pass.
Do not commit the deliberate defect or automatically approve its images.
Preserve behavioral, read-only renderer, room-start, pause/reset and hosted plus
file:// production hook-exclusion checks. Screenshots are not behavioral tests.

## Verification and owner documentation

Use already-installed tools only. Do not run npm install, npm ci, package
updates, browser downloads or OS installs without separate authorization.
Prefix local browser commands with
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"` where required.
Run browser suites sequentially.

Format changed files, run focused tests and npm run verify:fast, then applicable
npm run verify and npm run test:browsers according to docs/verification.md.
Record actual commands, exits, source SHA/working-tree context, environment,
artifacts and blockers. Sandbox or unavailable-browser failures are blocked,
never passed. No claim that API-authored code has been executed locally.

Document exact implemented commands for capture, selected/all comparisons,
opening the local HTML report without GitHub, initial missing-reference review,
explicit hash-bound approval and rerunning comparison. Document reference paths,
environment compatibility, candidate preservation, scene rename/removal policy
and source provenance. Update docs/progress.md with implemented coverage and
actual evidence separately from owner appearance approval. Keep the draft PR
clear about remaining owner-local capture, menu diagnosis and verification.
