# Manual visual review (issue 22)

## Status and independent commands

Authored on draft PR 23: shared capture, read-only fresh comparison, local report
and selected hash-bound promotion. No local formatter, compiler, lint, unit,
browser or release command has run in the API authoring session. No references
are supplied or approved. Menu diagnosis and acceptance evidence remain pending.

```sh
npm run capture:visual
npm run compare:visual
TOYBOX_REVIEW_SCENES=ui-menu,ui-coop,cork-atlas npm run compare:visual
npm run report:visual
```

Capture overwrites only docs/visual-catalogue/current/ and remains independent.
Comparison captures fresh actuals using the same registry, fixtures, shared page
helper and production renderer. Omit TOYBOX_REVIEW_SCENES for all catalogue
scenes and full/arena/detail views, including all campaign room starts. Unknown,
duplicate or empty selections fail. Standard --grep can also select tests.
Comparison starts a fresh loopback server on port 5184, with validated
TOYBOX_REVIEW_PORT override, and never reuses another server.

## Review locally

Actual PNGs, per-scene manifests and diagnostics are under
`test-results/visual-review/`. The HTML report is in
`playwright-report/visual-review/`; report:visual serves it locally on loopback
without GitHub access. Reports/results are ignored generated output. A fresh
comparison replaces its previous temporary output: preserve important runs
before rerunning. Do not compare and promote concurrently in one checkout.

A complete scene manifest records source revision/tree hash/dirty status,
environment, image names/hashes, state and render context. Its attachment name
contains SHA-256 of the exact manifest bytes. Complete means capture completed,
not that comparison passed or appearance was approved. Missing references fail
as UNAPPROVED but retain reviewable actuals and a complete candidate manifest.
Interrupted/failed captures without a complete manifest cannot be promoted.

References and per-PNG approval metadata live at stable Git-trackable paths in
`docs/visual-references/chromium-local/`. Ordinary comparisons never create or
replace them: updateSnapshots is none, with runtime/CLI override guards. Do not
use -u, --update-snapshots or --ignore-snapshots. Valid references produce native
Playwright expected/actual/diff evidence for pixel changes, with threshold 0 and
maxDiffPixels 0. Missing, incompatible or hash-modified references fail without
automatic acceptance. Ordinary verify, test:visual and CI remain unchanged.

## Explicit owner approval and promotion

After inspecting the actual images, create a local selection JSON, preferably
inside ignored test-results/ but outside visual-review/ so another comparison
does not erase it. Replace every placeholder below with exact reviewed values:

```json
{
  "schema": 1,
  "ownerApproved": true,
  "candidates": [
    {
      "manifest": "test-results/visual-review/SCENE-OUTPUT/manifest.json",
      "manifestSha256": "EXACT_HASH_FROM_MANIFEST_ATTACHMENT_NAME",
      "images": [
        {
          "file": "ui-coop.full.png",
          "sha256": "EXACT_REVIEWED_PNG_HASH_FROM_MANIFEST"
        }
      ]
    }
  ]
}
```

Use one candidate entry per reviewed scene manifest; enumerate only approved
views, adding arena/detail explicitly if reviewed. There is no approve-all
default. Agents may prepare candidates and selection proposals but must not
assert ownerApproved:true or run promotion without the owner's specific approval.
The boolean records an explicit operator assertion, not authenticated proof of
identity or aesthetic review.

```sh
TOYBOX_APPROVAL_FILE=test-results/visual-approval-selection.json npm run approve:visual
TOYBOX_REVIEW_SCENES=ui-coop npm run compare:visual
npm run report:visual
```

Promotion launches no browser/server and uses a separate output directory, so
it does not delete comparison candidates. It validates all selections before
writing: manifest/PNG hashes, complete canonical scene views, provenance, paths,
regular files, unsupported environments, duplicates and existing reference
integrity. It rejects symlinks, unsafe destination types and hard-linked
destinations. Changed bytes require fresh review and hashes. It copies the
validated buffers, never recaptures, and changes only selected PNGs and their
metadata. Metadata records candidate provenance and approval-request/manifest
hashes. Capture, comparison, retries and missing references never invoke it.

Selected candidates must share an environment matching existing references.
Promotion preserves recorded capture provenance; it does not launch Chromium
or certify the currently installed browser. A subsequent comparison checks the
actual local environment against reference metadata. Validation failures write
nothing. Filesystem failures during the write phase can leave partial output;
inspect Git changes and repair explicitly before treating the set as approved.
This is not a multi-file filesystem transaction or an automatic rollback tool.

After successful comparison, review and stage only the selected reference PNGs
and matching .approval.json records. Keep generated actuals/reports ignored.
Scene rename/removal or environment migration requires explicit owner review;
no automatic reference deletion or bulk refresh occurs.

## Environment, menu investigation and verification

Use the same local headless Chromium/OS/fonts and pinned installed tooling.
Viewport follows the scene registry; DPR 1, light scheme, reduced motion, en-US
and UTC are fixed. Metadata includes actual OS/Chromium/Playwright versions.
Cross-machine identity is not promised. No installs/downloads are authorized.

Menu comparison captures two fresh pages and retains both PNG sets plus focus,
focus-visible state, document focus/visibility, viewport/DPR, canvas bounds,
fonts and copied state. Variation fails before a promotable menu manifest is
written. Diagnose from those actual images; no fix or reliable repeatability is
claimed. No sleeps, retries, masks or relaxed tolerances conceal the variation.

Run formatting, focused safety/promotion tests and verify:fast, then applicable
verify and browser/release gates sequentially per docs/verification.md. Begin
with menu, co-op, one campaign start and cork-atlas. Demonstrate unchanged output,
a temporary intentional visual defect detected, revert it and demonstrate a
pass. Retain renderer read-only, zero-tick room-start, pause/reset and hosted/
file:// hook-exclusion checks. Record actual commands/exits/source/environment
and blockers in docs/progress.md. Authored tests are not passing-test evidence.
Owner review remains the acceptance decision; issue 22 and Gate E stay pending.
