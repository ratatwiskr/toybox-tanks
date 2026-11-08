# Toybox Tanks — current progress

Updated: 2026-11-08

## Authority and scope

This current checkpoint replaces the accumulated migration/session log. Previous
command transcripts and implementation reports remain in Git history. Historical
Gate D push-pending statements and cork implementation handoffs are not active
assignments. Read actual branch contents and current checks before acting.

The TypeScript migration is implemented. Gate E is not declared complete.
Verification procedure: `docs/verification.md`. Architecture:
`docs/architecture.md`. Cork decision: `docs/adr/0002-destructible-cork.md`.

## Implemented feature scope

- PR #14: author 22 × 11 interior map grids and generate the solid perimeter,
  preserving the original 24 × 13 arena and original three-room geometry.
- PR #15: independent three-hit cork state, movement/shell/sight/aim integration,
  conservative contact handling, procedural damage-state rendering, and Cork Keep
  appended as room four. Completion follows room four; replay starts in room one.
- Cork crack paths stay within the face, and outline widths are independent of
  previously rendered cork damage. Focused regression tests cover these fixes.
- SVG cork integration is not pending. Supplied assets remain reference material;
  broader asset adoption is separate.

## Evidence and its limits

The reviewed implementation revisions had successful GitHub `verify` jobs:

- PR #14: `ba9216d1e6f53d023f4b4a2cb61d038eb68f5629`.
  https://github.com/ratatwiskr/toybox-tanks/actions/runs/42439211315
- PR #15: `4ea53013cfe5a2d632dc3198dd88e0f9cb3e0032`.
  https://github.com/ratatwiskr/toybox-tanks/actions/runs/42470914415

The inspected workflow runs `npm run verify` followed by
`npm run test:browsers`. These job conclusions are historical evidence for the
listed revisions, not passes for documentation changes or a rebased branch.
PR deployment and published-Pages smoke are intentionally skipped; main has
separate deployment and published-site checks.

On 2026-11-08 the owner reported cork playtesting in the VS Code internal browser
worked well. No exact playtested SHA or exhaustive scenario list was supplied.
Do not expand this into claims about all damage states, reset paths, release
formats, browsers, physical controllers, or real Safari/iOS devices.

The documentation-cleanup session used GitHub reads and writes only. No local
formatter, lint, compiler, unit, browser, or release command was executed in it.
Fresh CI is required on the final documentation head.

## Owner decisions and separate work

- Retain procedural cork rendering; ADR 0002 supersedes its original SVG plan.
- Visual regression and comprehensive visual coverage of cork states belong to a
  separate issue. They are not unfinished cork implementation tasks for PR #15.
  No issue number is invented here and no screenshot baseline is approved.
- `test:visual` remains candidate capture. Existing visual policy, tests, and
  coverage thresholds are unchanged. Broader Gate E acceptance remains separate.
- Physical gamepad and real Safari/iOS verification are not established by
  synthetic gamepads or automated WebKit. Local Firefox sandbox launch failures
  remain environment limitations, not passes; consult CI for its tested revision.

## Stack and next repository steps

PR #15 was developed on #14. This cleanup does not merge, rebase, retarget,
change draft status, deploy, or automatically close issues. After #14 merges,
update #15 onto main with owner authorization, inspect the resulting diff,
preserve #14's documentation deletions, and require green CI on the final head.
Do not restore removed issue copies or temporary handoffs during reconciliation.

When README edits overlap during stack reconciliation, retain the consolidated
README with four rooms and cork rules from #15, not the three-room #14 version.
Any further fixes must retain checks, assertions, coverage, and visual policy.
