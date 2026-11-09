# Issue 18, slice 1: capture-only revision catalogue

## Revised owner direction

Capture and overwrite current-state screenshots locally with one command. Do
not block bulk capture on repeated-image equality or reference comparison.
Automated visual regression belongs to a later iteration with a separate
reviewed reference set. #18 stays open.

## Implemented approach, pending execution

- `npm run capture:visual` selects only the catalogue project.
- Port 5183 by default; validated `TOYBOX_CAPTURE_PORT` override.
- Global setup removes only owned generated files in the dedicated catalogue
  directory and writes an initial pending manifest/gallery.
- Capture each scene once, retain its images/status and continue after failures.
- Report expected/actual files and captured/failed/pending scenes; return nonzero
  for incomplete captures or source changes during capture.
- Retain controlled fixtures, production renderer, fixed environment, read-only
  rendering checks, zero-tick campaign starts and runtime-error detection.
- Preserve full/arena/detail coverage, metadata/hashes and stable Git paths.
- Never stage, commit, install, change approved references or refresh implicitly.

Full usage and cleanup semantics: `docs/visual-catalogue/README.md`. The local
agent needs no GitHub access; the owner pushes and relays CI results.

## Evidence and limitations

Owner logs show that the dedicated-port server starts and the isolated project
runs. The previous implementation failed on differing menu PNG hashes. This
rework removes that repeat-image gate at the owner's explicit request; it does
not diagnose or claim to repair the underlying pixel variation. The remote
branch did not contain the owner's local diagnostic-loop edits when inspected.
Preserve that local diff before integrating this replacement.

No formatter, Node, TypeScript, lint, unit, browser, capture or release command
was executed in this API session. Fresh CI and owner-local capture are required.
No successful bulk capture, aesthetic approval or regression gate is claimed.

## Verification checklist

- [ ] Format changed files and run `npm run verify:fast`.
- [ ] Run applicable full/browser/release gates sequentially, preserving all checks.
- [ ] Verify only catalogue tests are discovered by the local capture config.
- [ ] Owner captures all current scenes with one command.
- [ ] Confirm a failed scene is reported without hiding other scene captures.
- [ ] Confirm a subsequent run removes stale owned PNGs, not unrelated files.
- [ ] Confirm production/file:// releases contain no test hooks or fixtures.
- [ ] Review generated images and matching manifest; keep reference approval separate.
- [ ] Record source context, environment, commands, exits, artifacts and limits in
      docs/progress.md after actual verification.

Do not alter gameplay, artwork, dependencies, CI, thresholds or existing tests
to make capture pass. Report missing tools, port/sandbox failures and partial
captures honestly. No automatic baseline approval or issue closure.
