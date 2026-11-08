# Toybox Tanks — current progress

Updated: 2026-11-08

## Merged baseline: borders and cork

PR #14 is squash-merged into main as
`d5aa53f8df4d73210e43d5edb2896f96bca152dc`. It supplies automatic solid borders
for 22 × 11 authored interiors, retaining the original 24 × 13 arena.

The cork feature and fourth room are also merged. PR #19, the clean main-based
replacement for conflicted PR #15, was squash-merged as
`5bec29e3ba4a2779286da406dba0ce113e94dba7` at 2026-11-08 11:18:35 UTC.
PR #15 was closed without merging at 11:18:37 UTC. These states were checked
through GitHub, not inferred from a branch name or an old handoff.

Provenance: reviewed #15 source `c19927abd793f871dd9c6212f87ab85fa9f48e00`
was reconstructed on feature/destructible-cork-blocks-main; #19's reviewed head
was `872262f7f934d90ea74a816bfea55d3482a2f0b0`. The 13 transferred application/
test blobs were recorded as identical to the pinned source during reconstruction.
This history is not an instruction to repeat reconstruction, rebase #15, open
another replacement, or reopen the closed PR.

Main's border test was retained. Do not restore `.issues/6.md`,
`docs/issue-6-handoff.md`, or `docs/cork-rendering-handoff.md`. Historical migration
and reconstruction/session handoffs are context, not active task queues.

### Merged cork scope

- Three-hit independent cork cells, initial versus cleared reachability, and
  resettable world state separate from permanent walls.
- Shared cork-aware movement, swept/muzzle shell contact, sight, and aim queries.
- Conservative ambiguous contacts, stable same-step destruction, and unchanged
  solid-wall bounce and faction-hit rules.
- Procedural intact/cracked/heavily cracked cork, no destroyed cork/shadow,
  bounded crack paths, and render-order-independent outline widths.
- Original three layouts/order preserved; Cork Keep appended as room four.
  Completion follows room four and replay starts at room one.

Retain procedural cork. SVG integration is not pending work. ADR 0002 records
the durable mechanic/presentation decision; broader assets remain separate.

### Cork evidence and limits

Historical #15 implementation head `4ea53013cfe5a2d632dc3198dd88e0f9cb3e0032`
had a successful verify run:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42470914415

Replacement #19 head `872262f7f934d90ea74a816bfea55d3482a2f0b0` also had
verify success, finishing 2026-11-08 11:16:47 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42474871936/job/128713836960
Its production deployment and pages-smoke jobs were skipped, not passed.

On 2026-11-08 the owner reported successful cork playtesting in the VS Code
internal browser. The exact tested SHA and exhaustive scenarios were not supplied.
Do not extend this to every state, reset, release, browser or physical device.
Visual regression and comprehensive cork-state coverage remain separate work.
No screenshot baseline is approved; Gate E is not declared complete.

## Mobile/tablet feature: PR #17, not merged by this update

Branch: feature/solo-touch-controls, based on the merged cork baseline.
Implemented on this branch: fixed touch pads, tick-only P1 commands, bounded
directional turret aiming, shared input cleanup, landscape compact layout,
portrait pause with explicit Resume, optional whole-app fullscreen, mixed touch
P1/gamepad P2 routing and ordinary two-gamepad routing when touch is disabled.

The latest gameplay/layout checkpoint inspected is
`3d04d57aabd3a41f6853d1454a5c76e003e43f87`: larger device-edge pads with
reserved side space, preserving the complete arena and reclaiming space when
touch is disabled. Earlier `f0a970f` fixes callback narrowing in Start handling
and authors Start press/hold/release regressions.

### Current CI evidence

The verify job succeeded for `3d04d57aabd3a41f6853d1454a5c76e003e43f87`,
finishing 2026-11-08 19:43:35 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42516282744/job/128839896358

This is an observed job conclusion, not a local command run or detailed log
audit. The workflow's verification gate includes full verify and cross-browser
release smoke. Production deploy-pages and pages-smoke were skipped on the PR,
not passed. Earlier failures and fixes remain in Git history; no gate was waived.

This documentation update is later than that source checkpoint. Inspect its
fresh CI rather than claiming the earlier result verifies every subsequent head.
No local formatter, compiler, lint, unit, browser or release command was executed
while preparing this documentation reconciliation.

### Physical playtest evidence

The owner reported that mobile play works great, then requested larger controls
closer to the device edges. That feedback predates the `3d04d57` layout change.
The exact tested source SHA, browser and device were not supplied. Do not infer
physical verification of the new pad layout, every lifecycle case, mixed tablet
co-op, two physical controllers or Safari/iOS from that report.

### Remaining before merge recommendation

- Finish critical browser input-cleanup cases recorded in the mobile handoff:
  cancellation/capture loss and stale release across pause/reset; add shell-cap
  rejected-tap coverage beside cooldown coverage. Keep existing checks intact.
- Republish the final verified branch through toybox-tanks-playtest and perform
  a short device check of the new pad positions, arena size and action reachability.
- Reconcile the PR checklist and mobile handoff with actual final-head evidence.
  Record physical tablet/controller limitations explicitly, not as certified.
- Mark ready and merge only with explicit approval after final checks. Then
  inspect main verification, production deployment and published-site smoke.

No production merge/deployment, branch deletion, issue closure, screenshot
approval or change to verification policy is performed by this documentation
cleanup. Exact procedures: docs/verification.md. Architecture: docs/architecture.md.
Local Firefox sandbox launch failures are blocked, never passed. Automated
WebKit and synthetic gamepads/pointers do not certify physical devices.
