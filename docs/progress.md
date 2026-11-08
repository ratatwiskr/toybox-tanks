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

Gameplay/layout checkpoint `3d04d57aabd3a41f6853d1454a5c76e003e43f87` adds
larger device-edge pads with reserved side space, preserving the complete arena
and reclaiming space when touch is disabled. Earlier f0a970f fixes callback
narrowing in Start handling and authors Start press/hold/release regressions.

### CI evidence before the final input-test batch

The verify job succeeded for layout source
`3d04d57aabd3a41f6853d1454a5c76e003e43f87` at 19:43:35 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42516282744/job/128839896358

Documentation reconciliation head `32e747246ddc90863f837d2cfee6ad1c154632e8`
also passed verify at 2026-11-08 20:13:24 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42518873045/job/128847765341

These are observed job conclusions, not local command runs or detailed log audits.
The verification job includes full verify and cross-browser release smoke.
Production deploy-pages and pages-smoke were skipped on the PR, not passed.
Earlier failures and fixes remain in Git history; no gate was waived.

### Final input-safety tests: authored, not yet verified

This subsequent test/documentation batch adds:

- tests/e2e/input-ownership.spec.ts: app-level movement and projectile ownership
  for mixed and two-controller co-op; ignored extra pads; held-input routing
  transition; pause/restart/cancel cleanup; fresh gesture recovery; unsampled tap
  discarded across pause. Browser inputs are mocked only at navigator/CDP edges.
- tests/unit/touch-shot-limit.test.ts: a shell-cap rejected tap is consumed, does
  not retry when capacity becomes available, and a deliberate fresh tap can fire.
- A direct README link to the latest published testing site, explicitly distinct
  from the latest source commit or production main.

No gameplay source, test bridge, dependencies, thresholds or CI policy are
changed by this batch. Tests assert observable poses, shot counts and owner IDs;
they do not spy on internal adapter calls or add production hooks.

No local formatter, compiler, lint, unit, browser or release command was executed
for this batch. Fresh final-head CI is required; the earlier green result does
not verify these new tests. Fix genuine failures without weakening assertions.

### Physical playtest evidence

The owner first reported mobile play works great and requested device-edge pads.
After that adjustment, the owner explicitly reported the latest mobile state
playtested fine and accepted the layout on 2026-11-08. The exact tested source
SHA, browser and device were not supplied. Treat mobile layout/feel as owner-
accepted, not as proof of all lifecycle cases, tablet/controller combinations
or real Safari/iOS compatibility. No repeated layout acceptance is requested
solely because tests/docs are added without runtime changes.

### Remaining before merge recommendation

- Require fresh green CI on the final test/documentation head and inspect any
  failure. Current tests remain an execution claim only after actual results.
- Reconcile the PR checklist and mobile handoff with final-head evidence. This
  progress section supersedes older descriptions of the input-test gaps above,
  but authored tests must not be described as passing before execution.
- Physical mixed tablet/two-controller verification and fullscreen/browser-
  specific edge cases remain explicitly limited, not certified by synthetic tests.
- Mark ready and merge only with explicit approval after final checks. Then
  inspect main verification, production deployment and published-site smoke.

No merge/deployment, branch deletion, issue closure, screenshot approval or
verification-policy change is performed by this update. Exact procedures:
docs/verification.md. Architecture: docs/architecture.md. Local Firefox sandbox
launch failures are blocked, never passed. Automated WebKit and synthetic
gamepads/pointers do not certify physical devices.
