# Developer command guide

Scripts are ordered by workflow: run the app, review visuals, verify changes,
run focused checks, build releases, then compatibility aliases and lifecycle.
Use `npm run` to list commands. No fake separator scripts or automatic approval
is hidden inside convenience commands.

## Daily development

- `dev`: normal application. `dev:test`: application with the test-only bridge.
- `preview`: serve an existing production build.
- `verify:fast`: existing non-browser verification. `verify`: existing full gate.
- `format`, `format:check`, `lint`, `lint:fix`, `typecheck`: focused quality tools.
  Format only intended files when preserving unrelated edits.

## Visual workflow

| Command             | Purpose                                               | Changes references?  |
| ------------------- | ----------------------------------------------------- | -------------------- |
| `visual:capture`    | Overwrite current Git-trackable catalogue             | No                   |
| `visual:compare`    | Capture fresh actuals and compare approved references | No                   |
| `visual:report`     | Open local comparison report                          | No                   |
| `visual:approve`    | Promote explicitly reviewed hashes                    | Selected images only |
| `visual:candidates` | Older nine-scene candidate-only capture               | No                   |

```sh
TOYBOX_REVIEW_SCENES=ui-menu,ui-coop,cork-atlas npm run visual:compare
npm run visual:report
```

Open the report separately even if comparison returns nonzero; opening a report
does not convert failure into success. Omit scene selection for every scene.
Playwright arguments are forwarded: `npm run visual:compare -- --grep ui-cleared`.

Missing references fail unapproved. After reviewing actual PNGs, create the
selection JSON documented in docs/visual-references/README.md, then:

```sh
TOYBOX_APPROVAL_FILE=test-results/visual-approval-selection.json npm run visual:approve
npm run visual:compare
npm run visual:report
```

Comparison uses explicit path segments for lookup and matching, preserving
`ui-cleared.full.png` and `ui-cleared.full.png.approval.json` instead of looking
for a hyphen-normalized filename. A path-contract test covers every scene/view.
No reference rename, refresh, tolerance change or approval is implied. Preserve
important generated diagnostics before another comparison clears its output.

## Tests, builds and compatibility

Existing test commands and build/build:single/build:test retain their meanings.
`test:visual` is still the candidate-only suite used by verify, not reference
comparison. Browser suites run sequentially per docs/verification.md.

`capture:visual`, `compare:visual`, `report:visual` and `approve:visual` remain
argument-forwarding aliases. Existing instructions and CI continue to work.
Dependencies, lockfiles and verification gates are unchanged.

This API-authored change has not been formatted, linted, compiled or executed
in this session. No references or screenshots are approved. New coverage work
is specified in docs/tasks/visual-coverage-continuation.md.
