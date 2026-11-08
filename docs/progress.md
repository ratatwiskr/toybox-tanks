# Toybox Tanks — current progress

Updated: 2026-11-08

## Current checkpoint

PR #14 is squash-merged into main as
`d5aa53f8df4d73210e43d5edb2896f96bca152dc`. It supplies automatic solid borders
for 22 × 11 authored interiors, retaining the original 24 × 13 arena.

The reviewed cork feature from PR #15 source
`c19927abd793f871dd9c6212f87ab85fa9f48e00` is reconstructed on
`feature/destructible-cork-blocks-main`, created from that main revision. This
avoids replaying the inherited #14 history after its squash merge. The original
feature branch and PR #15 are preserved; inspect GitHub before assuming either
has been closed or the replacement has merged.

Application and test files are copied from the pinned source without intentional
behavior changes. Reconciled documentation is carried forward with branch-status
updates. Main's border test remains unchanged. Do not restore `.issues/6.md`,
`docs/issue-6-handoff.md`, or `docs/cork-rendering-handoff.md`.

## Implemented scope

- Three-hit independent cork cells, initial versus cleared reachability, and
  resettable world state separate from permanent walls.
- Shared cork-aware movement, swept/muzzle shell contact, sight, and aim queries.
- Conservative ambiguous contacts, stable same-step destruction, and unchanged
  solid-wall bounce and faction-hit rules.
- Procedural intact/cracked/heavily cracked cork, no destroyed cork/shadow,
  bounded crack paths, and render-order-independent outline widths.
- Original three layouts/order preserved; Cork Keep appended as room four.
  Completion follows room four and replay starts at room one.

## Decisions and acceptance

Retain procedural cork. SVG integration is not pending work. ADR 0002 records
the durable mechanic and presentation decision. Broader assets remain separate.

On 2026-11-08 the owner reported successful cork playtesting in the VS Code
internal browser. The exact tested SHA and exhaustive scenario list were not
specified. Do not extend this evidence to every state, reset, browser, release
format, physical controller, or real Safari/iOS device.

Visual regression and comprehensive visual coverage of cork states belong to a
separate issue, not unfinished cork implementation. No issue number or approved
screenshot baseline is invented here. Candidate capture is not visual regression.
Gate E is not declared complete.

## Verification

Historical PR #15 implementation head
`4ea53013cfe5a2d632dc3198dd88e0f9cb3e0032` had a successful `verify` job:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42470914415

That does not prove the reconstructed branch passes. Reconstruction used GitHub
reads and writes; no local formatter, lint, compiler, unit, browser, or release
commands were executed. Verify copied blob identities and the final PR diff,
then require fresh green CI on the replacement head. The workflow runs
`npm run verify` and `npm run test:browsers`; deployment and published-Pages
smoke run separately on main. Do not weaken checks to obtain green CI.

Exact procedures: `docs/verification.md`. Architecture: `docs/architecture.md`.
Local Firefox sandbox launch failures are not passes. Automated WebKit and
synthetic gamepads do not establish physical-device compatibility.

## Next repository steps

Open the replacement PR against main and inspect its full diff and current CI.
Do not merge or deploy as part of reconstruction. Close the original PR only
with explicit approval after the replacement is established. Historical session
reports remain in Git history; old push/rebase handoffs are not active tasks.
