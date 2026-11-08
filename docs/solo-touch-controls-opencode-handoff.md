# Mobile play integration handoff

Updated 2026-11-08. Read AGENTS.md, architecture, verification and progress first.
PR #17 records the owner-approved landscape/mobile/tablet scope and supersedes
old solo-only touch restrictions. No migration restart, reference edits, new
dependencies, CI-policy changes or automatic visual approval is authorized.

## Source and evidence

Repository ratatwiskr/toybox-tanks; branch feature/solo-touch-controls.
Verified pre-mobile source: 3788eca60c55e240e3502f1b7346b3ff7dc15aed.
verify passed at 2026-11-08 11:33:05 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42476097495/job/128717693647
Production deploy/pages-smoke were skipped, not passed. Historical adapter
90587ef3ffff0ac062eab1f36181fe0f3327bc20 and documentation head
6fd6317ffd81727fc6c3d604eefec36f690238a8 also passed their own verify runs, not
this implementation.

Mobile surfaces/styles/routing foundation: 3b229d712afa8955199f6964bba5cda8b553a21f.
Its verify was in progress when inspected:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42500983805/job/128793464303

This subsequent batch imports/instantiates mobile controls once in main.ts,
connects tick-only P1 composition and shared resets, maps first pad to P2 in mixed
co-op, preserves ordinary two-pad routing with touch off, adds controller-loss
pause/re-arm handling, portrait pause/resume guard, compact menu instructions,
solo result copy and safe-area viewport metadata. It adds tests/e2e/mobile.spec.ts.

No local formatter, lint, compiler, unit, browser or release commands were run by
the remote author. New tests are authored, not verified. No mobile playability,
physical-controller, fullscreen or visual approval is claimed. Require fresh CI
for the actual new head and record its exact SHA. PR stays draft.

## Locked behaviour

- Solo has one real player. Touch P1 enabled co-op reserves P1 for touch/keyboard
  and gives first gamepad to P2. Touch off preserves normal two-gamepad co-op,
  including tablets. No touchscreen P2 or automatic mode changes on pad events.
- Left pad moves; right pad drag aims with bounded shortest-path rotation. Lift
  retains actual heading without firing. Short stationary tap fires once without
  redirecting aim. No held auto-fire, release shot, queue or alignment wait.
- Keep provisional named thresholds. Simultaneous pointers and ownership/capture
  cleanup must work; old moves/releases cannot reactivate after clear.
- Landscape-only compact play preserves the full 960 x 540 arena, 16:9 and DPR.
  Portrait pauses/clears; rotate back then explicitly Resume. Fullscreen covers
  the whole app and is optional, not a prerequisite.
- Touch disabled means the two controllers retain both slots. No remapping,
  precision modes, device framework, PWA, wake lock, audio or unrelated content.

## Immediate verification and finishing work

1. Inspect current git status/branch/HEAD/log and preserve newer owner work. Stop
   on conflicts; do not reset, stash, clean, rebase or reconstruct missing source.
2. Run installed formatter/lint/typecheck and targeted tests first. Correct real
   failures narrowly without suppressions, broad casts, weakened tests, changed
   coverage/CI or automatic screenshot acceptance. Format changed files only.
3. Run the mobile Chromium E2E cases. CDP touch delivery is browser automation,
   not a physical phone. Synthetic pad cases are not hardware verification.
   Inspect timing, pointer capture and ResizeObserver interactions rather than
   weakening assertions to eventual movement or arbitrary large waits.
4. Extend browser cases still pending: pointercancel/lost capture, outside drag,
   stale release across pause/clear, retry/menu/room transition, blur/hidden tab,
   short overlay reachability, fullscreen unsupported/rejection and renderer
   backing dimensions. Add shell-cap blocked-tap coverage beside cooldown tests.
5. Inspect the controller-loss path: a same-poll Start edge must not undo pause;
   reconnect with held controls must stay gated until neutral. Ensure mode/toggle
   changes do not leak controller intent into another player.
6. Preserve existing desktop keyboard/gamepad checks, deterministic combat and
   original room progression. Run hosted and file:// single-HTML releases with
   production test bridge absent, plus cross-browser hosted smoke.
7. Update docs/progress.md and user controls documentation with final source SHA,
   actual commands, exits and limits. Reconcile the PR checklist after evidence,
   not because a source file exists. Do not claim human aesthetic approval.

```sh
npm run test:unit -- tests/unit/mobile-routing.test.ts tests/unit/touch.test.ts tests/unit/world.test.ts
npm run format:check
npm run lint
npm run typecheck
npm run verify:fast
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e -- tests/e2e/mobile.spec.ts
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers
```

Browser suites sequentially. Use installed Node 24.22.2/tools only. No local
npm install/ci, browser/OS installs, launcher edits or sandbox bypass. Actual
Firefox namespace/profile sandbox failures are blocked, never passed.

## Publication and human feedback

After the actual implementation head passes, publish feature/solo-touch-controls
through ratatwiskr/toybox-tanks-playtest, not production. Owner reports the
publisher/main site works. Connector lacks workflow dispatch; owner may need to
click Publish playtest with that source_branch. Record run, source SHA and live
deployed-commit marker. A publishing workflow failure is not permission to
bypass source verification.

Then request a short phone check: simultaneous move/aim, deliberate tap, control
obstruction/readability, browser-bar and fullscreen layouts, rotate/background
return, pause/retry. Tablet mixed input and two physical gamepads remain separate
checks where hardware is available. Automated WebKit is not Safari/iOS proof.

Report exact revisions/dirty state, commands/exits, failures and artifacts. No
commit/push/merge/deployment without separate authorization; coordinate handback
before competing remote edits. No production merge or deployment is requested.
