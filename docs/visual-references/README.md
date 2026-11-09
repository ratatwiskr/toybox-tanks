# Manual visual review (issue 22)

## Implementation status

The first implementation chunk adds read-only fresh-image comparison and menu
repeat diagnostics. Selected hash-bound promotion is still pending. No approved
PNGs are supplied by this commit. Do not manually copy candidates into the
reference directory as a substitute for the pending approval operation.
No local formatter, compiler, lint, unit, browser or release command has run
in the API authoring session. This is authored tooling, not verified results.

## Independent operations

`npm run capture:visual` remains the overwriteable current catalogue command.
It never compares or changes references. Its existing scenes, screenshots,
room-start checks and renderer read-only checks now use a shared page helper.

Run fresh comparisons explicitly, using already-installed tooling:

```sh
npm run compare:visual
TOYBOX_REVIEW_SCENES=ui-menu,ui-coop,cork-atlas npm run compare:visual
npm run report:visual
```

Omit TOYBOX_REVIEW_SCENES for every existing catalogue scene and applicable
full/arena/detail view, including all campaign starts. Unknown, duplicate or
empty selections fail. Standard Playwright --grep can also select tests.
The command starts a new loopback test server on port 5184; override with
TOYBOX_REVIEW_PORT if occupied. It never reuses another server.

## Reports, candidates and references

Fresh actuals, per-scene manifests and diagnostics are generated beneath
`test-results/visual-review/`. The local HTML report is in
`playwright-report/visual-review/`; report:visual serves it on loopback without
GitHub access. Existing references live at stable paths beneath
`docs/visual-references/chromium-local/`. All generated results/reports remain
ignored. A new comparison replaces the previous run's temporary output: preserve
a reviewed run outside that output before another run if needed. Do not run
comparison and promotion concurrently in one checkout.

Every successful scene capture writes a schema-1 visual-review-candidate
manifest with complete:true, scene ID, source revision/tree hash/dirty status,
environment, images and their SHA-256 hashes, copied state and render context.
Its attachment name contains the hash of the exact manifest bytes. A complete
candidate capture does not mean comparison passed or appearance was approved.
An interrupted/failed scene without such a manifest is not promotable.

Missing references/approval metadata fail as UNAPPROVED; environment/hash
mismatches fail without silently refreshing anything. Approved metadata must
identify schema:1, file, sha256 and environment; provenance will be supplied
by the separate promotion operation. Once references exist, Playwright reports
expected/actual/diff images for pixel changes. The comparison uses threshold 0
and maxDiffPixels 0. Snapshot updates are none, with runtime and CLI override
guards. Never use -u, --update-snapshots or --ignore-snapshots. Ordinary verify,
test:visual and CI remain candidate-only and do not run this comparison.

## Environment and menu diagnosis

Use the same local headless Chromium/OS/fonts and pinned Node/Playwright tools.
Viewport follows the existing scene registry; DPR 1, light color scheme, reduced
motion, en-US and UTC are fixed. Reference metadata must match the recorded
capture environment, including actual Chromium/Playwright/OS versions.
Cross-machine pixel identity is not promised. Do not install or download tools
without separate authorization.

Menu verification captures two fresh pages, retaining both PNG sets plus focus,
focus-visible status, document focus/visibility, viewport/DPR, canvas bounds,
font readiness and copied game state. A difference fails before writing a
promotable menu manifest. Inspect that evidence to diagnose the earlier menu
variation; this code does not claim to resolve it. No sleeps, retries, masks or
tolerance changes were introduced.

## Remaining acceptance work

Implement selected, exact-hash promotion and its tests. Then run formatting,
verify:fast and applicable full/browser/release gates sequentially. Begin with
menu, co-op, a campaign start and cork-atlas; prove unchanged output, demonstrate
a temporary intentional visual change is detected, revert it and prove passing
output again. Record exact commands/results/source/environment in progress.
Owner review is the acceptance decision. Capture success is not approval.
Scene renames/removals require explicit review of both the catalogue and
references; no automated reference pruning is permitted. Gate E remains pending.
