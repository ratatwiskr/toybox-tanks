# Issue 18, slice 1: explicit local revision render catalogue

## Owner-approved scope

Provide stable-path, Git-trackable screenshots for human comparison of game
revisions before introducing automated visual-baseline checks. Keep existing
verification and baseline policy intact. Related issue: #18; do not close it with
this slice. Branch starts from main dd2ac51c4eee1d9d92dbbb43c4a0d816b1be3a9e.

Full application and arena crop for every campaign starting state, the existing
representative UI/combat/outcome views, and focused synthetic cork/feedback
fixtures. Use normal room initialization for campaign views; curated object
placement through the existing test-only bridge for focused views. No new
campaign content, editor, renderer, dependency, install or remote access.

## Implementation and owner execution

The opt-in entry point is `playwright.catalogue.config.ts`. Exact local command,
outputs, provenance, gallery and Git review are documented in
`docs/visual-catalogue/README.md`. The owner triggers captures with already-installed
tooling. Capture must not run implicitly during ordinary verification or commits.
The local agent does not need GitHub access; the owner pushes and relays CI.

## Checklist

- [ ] Run formatter on changed files, then focused fixture/bridge/renderer tests.
- [ ] Run `npm run verify:fast`; preserve all strict checks.
- [ ] Run applicable full/browser/release gates sequentially per docs/verification.md.
- [ ] In particular, verify test-only fixture strings/hooks are absent from hosted
      and single-HTML production artifacts, and runtime bridge remains absent.
- [ ] Owner runs the explicit local capture with installed Chromium.
- [ ] Repeated independent captures match; every campaign room has zero-tick
      starting state; full/arena/detail crops and purposes are sensible.
- [ ] Open the offline gallery and inspect all images, especially empty destroyed
      slot, isolated cracks, intact-after-damaged outlines and reflected aim.
- [ ] Review/stage PNGs and matching manifest explicitly, not as approved baselines.
- [ ] Record exact revision/dirty tree, environment, commands, exits, artifacts and
      limitations in docs/progress.md after actual execution.

## Evidence at implementation preparation

The branch and source files were inspected through GitHub. No Node, formatter,
linter, compiler, Vitest, Playwright, browser, capture or release command was run
in this API session. No installation, screenshot capture, aesthetic acceptance,
baseline approval or merge is claimed. CI feedback and owner-local captures are
pending. Existing historical green results do not verify this new implementation.

## Stop conditions

Report missing dependencies/browser, port conflicts, sandbox restrictions,
nonrepeatable captures, stale scene paths or incompatible capture environments.
Do not install, weaken assertions, change CI, add tolerances, auto-approve PNGs or
alter release/gameplay behavior to make capture work. This first slice does not
implement all of the original issue's automated-regression acceptance criteria.
