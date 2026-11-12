# Issue 22: visual coverage after body rotation and shell collision

Persisted before implementing the new scenes. Continue on PR 23's rebased
branch test/22-manual-visual-review, initially inspected at f1d5ade with main
cb50b79. Preserve owner edits and check the current head before writing.
Owner-approved scope is recorded in issue 22 comment 6769861985.

## Read before editing

Read AGENTS.md, applicable nested instructions, docs/architecture.md,
docs/verification.md, docs/progress.md, docs/tasks/manual-visual-review.md and
docs/visual-references/README.md. Inspect the existing capture registry/helper,
src/visual-scenes.ts, canonical src/test-bridge.ts types,
src/presentation/body-heading.ts, src/sim/combat.ts, shell-contact/world code,
and mobile layout/orientation tests before authoring fixtures.

## Required implementation

- Add body-aim-independent, body-diagonal and body-wall-slide scenes. Establish
  initial state through curated test-only fixtures, then advance through the
  real application/bridge advanceWorld path. Observe movement-derived body
  heading, independent turret aim and upright labels. Body heading is not in
  ordinary simulation snapshots; do not pretend static tank placement proves it.
- Add deterministic shell head-on before/contact/later-effect captures. Generate
  contact through real stepping, assert both shells disappear, exactly one poof
  appears at contact and later expires. Do not seed a cloud as a substitute.
- Add compact landscape touch gameplay and portrait orientation pause. Reuse
  actual touch detection/UI and orientation flow from browser tests, not fake
  HTML overlays. Assert arena/pad separation, readable controls and pause state;
  retain pause/resume behavioral checks.
- Register each scene once for both capture and comparison. Preserve all current
  UI/outcome, campaign-start and cork/feedback views and stable filenames. Retain
  full/arena/detail views where useful; touch layouts need full-app context.
- Add focused fixture, renderer/heading and browser assertions; no second renderer
  or copied collision/progression implementation. Preserve read-only rendering,
  zero-tick campaign starts and production/file:// hook exclusion.
- Reconcile ADR 0003: actual shell contact uses poof, not spark; the removed
  shell-specific muzzle detector is not active. Change documentation, not game
  mechanics, to resolve this stale wording.
- Update usage and actual progress evidence. Reconcile stale PR status with
  implemented coverage, unrun checks and owner approval separately.

## Verification and boundaries

Use only installed tools; no installs/downloads or new dependencies. Format
intended files, run focused checks and verify:fast, then required full/browser/
release gates sequentially. Record source context, environment, commands, exits,
artifacts and blockers. An authored test is not passing evidence.

Capture the new scenes locally, demonstrate unchanged representative comparisons
and a temporary intentional visible defect detected followed by revert/pass.
Investigate unresolved menu variation from PNG/context evidence. No sleeps,
retries, masks, relaxed tolerances or weakened tests to conceal differences.

No automatic reference refresh, screenshot approval, mandatory CI gate, gameplay/
artwork change, merge, deployment or issue closure. Owner reviews candidate bytes
and selects hashes; rerun comparison after explicit promotion. Keep issue 22 open
until acceptance evidence exists. Blocked/disabled body retention, shell crossing/
near-miss images and further touch layouts are later coverage, not this batch.

Status: task only. New scenes and successful execution are not claimed here.
