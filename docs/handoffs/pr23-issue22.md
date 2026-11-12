## Purpose and relationship

Follow-up to #18 and merged PR #21. The first slice delivered an explicitly invoked, overwriteable current-state screenshot catalogue. It did not deliver approved regression references, expected/actual/diff review, or establish pixel-identical repeatability. Issue #18 was closed with that merge; this issue tracks the remaining focused second slice.

Owner direction: fully manual invocation and human approval are sufficient. Use Playwright to compute comparisons and present differences; do not build a visual-testing platform or make this a mandatory CI gate.

## Workflow

1. Keep `npm run capture:visual` as the capture-and-overwrite workflow for the current catalogue. It must never update or delete approved references.
2. Add a separate, explicitly invoked local comparison command using the existing Playwright visual tooling, test-only fixtures and production renderer. Capture fresh actual images from the selected source; do not silently compare stale catalogue files.
3. Store owner-approved PNG references at stable, Git-trackable paths separate from `docs/visual-catalogue/current/`. Keep actual/diff images, traces and reports in ignored generated output.
4. Use Playwright's expected/actual/diff attachments and HTML report first. Document how to review the report locally without GitHub access. Reuse scene IDs and capture logic where practical; avoid another independently maintained fixture registry or renderer.
5. Reference creation/replacement is a separate explicit operation after owner review. Ordinary comparison, missing references, retries and capture must never silently create or update approved images. Configure comparison accordingly; do not rely on screenshot assertion defaults to enforce this.
6. Owner approval identifies selected scene IDs and the exact reviewed candidate bytes, using the existing manifest hashes where practical. Keep any approval record small. Agents may prepare candidates and diffs, but must not approve appearance or bulk-promote unrelated images. Re-run the comparison after promotion.

## Initial scope

Reuse the existing representative UI/gameplay/outcome scenes, campaign starting views and synthetic cork/feedback coverage. Begin verification with a small representative subset, then cover the agreed catalogue scenes; record any deliberately excluded scenes rather than silently dropping them. Include full/arena/detail views where relevant, with useful failure labels.

Before treating image differences as reliable regressions, investigate the earlier unchanged-menu capture variation. Retain controlled simulation state, fonts/render readiness, viewport/DPR and capture settings. Diagnose focus, layout or rendering variation from actual evidence rather than adding sleeps, retries, masks or broad tolerances to conceal it. Cross-machine pixel identity is not a requirement. Document one supported local Chromium environment and report incompatible environments honestly.

Manual review is the acceptance decision: Playwright may automatically calculate image differences and return a nonzero comparison result, but it must not automatically decide that changed artwork is acceptable.

## Acceptance criteria

- [ ] Current catalogue capture still works independently and never touches references.
- [ ] Owner can explicitly run local comparison and open useful expected/actual/diff evidence without GitHub access or new remote services.
- [ ] Missing references are clearly unapproved/pending or failed and are never silently accepted or written by comparison.
- [ ] A changed image produces clear review evidence; no ordinary run modifies references.
- [ ] Explicit promotion updates only the owner-approved selected images, tied to the exact reviewed candidate bytes; changed bytes require fresh review.
- [ ] Unchanged representative scenes compare reliably in the documented local environment. Explain and resolve the earlier menu variation before claiming this.
- [ ] Demonstrate a temporary intentional visual change is detected, revert it, and demonstrate the unchanged scene passes. Record actual commands/results.
- [ ] Maintain gameplay, renderer read-only, room-start, pause/reset and production/file:// hook-exclusion checks. Screenshots do not substitute for behavioral tests.
- [ ] Document commands, reference locations, environment, failure review, promotion and scene rename/removal policy. Record source provenance and verification limits.

## Boundaries

No automatic aesthetic approval, automatic reference refresh, mandatory CI/deployment gate, SaaS service, new dependencies, scene editor, broad browser matrix, gameplay/balance change or artwork redesign. No weakening existing tests, coverage or approved visual policy. Any required policy change, masking or tolerance change needs explicit explanation and owner approval. Existing behavioral/renderer regressions remain separate; do not expand this slice into every unfinished workstream in the original #18.

## Implementation handoff

Inspect AGENTS.md, docs/verification.md, docs/progress.md, current visual policy, canonical test-bridge types and the merged catalogue before coding. Persist a self-contained local-agent task in the repository before implementation; the local agent does not require GitHub access. Use already-installed tooling, respect no-install policies, and run browser suites sequentially. Keep approval, implemented coverage and actual verification evidence distinct. No implementation or successful comparison is claimed by creating this issue.

---

Comment:

## Agreed continuation: developer workflow and coverage after the rebase

Owner requested implementation on 2026-11-10 following inspection of latest main and force-pushed draft PR #23. Main inspected at cb50b79; PR head inspected at f1d5ade. Check actual head again before edits and preserve owner changes. This comment extends the implementation scope; it does not claim the work below is implemented, tested or visually approved. Original issue acceptance criteria and boundaries remain in force.

### Fix and clarify the local developer workflow

- [ ] Group package scripts by development workflow and add consistent visual:capture, visual:compare, visual:report, visual:approve and visual:candidates names. Preserve existing capture:visual/compare:visual/report:visual/approve:visual commands as argument-forwarding aliases. Keep verify, CI, existing test semantics, dependencies and lockfile unchanged. Explain that test:visual/visual:candidates are candidate capture, not approved-reference regression checks.
- [ ] Fix the observed reference-path mismatch: promotion uses ui-cleared.full.png.approval.json while string snapshot-name normalization makes comparison look for ui-cleared-full.png.approval.json. Use explicit Playwright path segments consistently for reference lookup and snapshot assertion; preserve dotted canonical filenames. Add a regression check over all scene/view paths. Do not rename or regenerate references as an implicit repair. Missing references must still fail unapproved.

### Extend the shared catalogue and comparison coverage

Reuse the existing registry, production renderer, test-only bridge and shared capture helper. Add scenes once so both current-catalogue capture and manual comparisons see the same coverage. Proposed IDs may be adjusted to the existing implementation conventions, with the mapping documented.

- [ ] body-aim-independent: move horizontally while aiming vertically, then stop. Check body heading follows actual movement, turret aim remains independent and labels stay upright.
- [ ] body-diagonal: actual diagonal movement while aiming elsewhere. Check the body follows the resulting path rather than the turret.
- [ ] body-wall-slide: diagonal requested movement against a wall yields axis-aligned sliding. Check heading follows actual displacement, not blocked input.
- [ ] Shell head-on encounter sequence: deterministic before-contact, first post-contact tick and fixed later-effect-age captures. Check two shells before contact, neither surviving after contact, one poof at the contact midpoint and eventual effect cleanup. Generate the result through real stepWorld/application bridge stepping, not a manually planted cloud. Use controlled ticks, not sleeps. Include useful arena/detail crops and full context.
- [ ] Compact landscape touch gameplay: enable the real touch UI in a supported test context; preserve the whole arena and show touch pads outside it. Use full-application screenshots and layout assertions.
- [ ] Portrait orientation pause: exercise the actual orientation flow, showing readable pause messaging and a clear resume path. Keep behavioral pause/resume assertions separate from aesthetic acceptance.

Body heading is presentation state outside ordinary simulation snapshots. Drive the real shared application/test-bridge stepping path so the heading tracker runs; merely setting tank positions is not evidence of movement-derived rotation. Preserve rendering-read-only and zero-tick campaign-start checks.

### Contracts and documentation

- [ ] Reconcile ADR 0003 with current main: shell-shell contact currently produces a poof, not the stale spark wording; the removed shell-specific muzzle detector must not be described as active. Do not change mechanics to match stale documentation.
- [ ] Preserve existing UI/outcome, campaign-start and cork/feedback scenes. Record any deliberate exclusions. Do not turn this into an exhaustive device/faction screenshot matrix.
- [ ] Update the repository-local implementation task, usage guide, progress evidence and stale PR status as applicable. Keep planned scope, authored code, executed tests and owner visual approval distinct.

### Verification before completion

- [ ] Run formatting, focused new safety/fixture/behavior tests and verify:fast with installed tooling; run applicable full/browser/release gates sequentially. Record source context, commands, exits, environment, artifacts and blockers.
- [ ] Demonstrate fresh captures of the added scenes, unchanged representative comparisons, and intentional visible-change detection followed by revert and passing comparison.
- [ ] Investigate the earlier menu variation from retained PNG/context evidence. No retries, masks, sleeps or broad tolerances to conceal differences.
- [ ] Owner reviews exact candidate bytes and explicitly promotes selected hashes; rerun comparison afterward. No references are approved by this request or comment.

Blocked-heading retention, disabled-heading retention, shell crossing/near-miss visual controls and additional touch layouts remain useful subsequent additions, not required in this first agreed coverage batch. Owner/faction collision permutations remain behavioral-test responsibilities even when separate screenshots would be redundant.

No automatic screenshot approval, reference refresh, mandatory CI gate, new dependencies, installation, gameplay/artwork change, history rewrite, merge, deployment or issue closure is authorized by this issue update. Keep #22 open until its actual acceptance evidence exists.
