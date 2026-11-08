# Mobile play implementation handoff

Updated 2026-11-08. Read AGENTS.md, architecture, verification and progress first.
The current PR #17 description records the expanded owner-approved scope. This
handoff supersedes earlier solo-only touch restrictions. No migration restart,
reference edits, dependencies, CI-policy changes or visual approval is authorized.

## Checkpoints and evidence

Branch: feature/solo-touch-controls in ratatwiskr/toybox-tanks.
Verified pre-mobile checkpoint: 3788eca60c55e240e3502f1b7346b3ff7dc15aed.
Its verify job passed at 2026-11-08 11:33:05 UTC:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42476097495/job/128717693647
Production deploy/pages-smoke were skipped, not passed.
Historical adapter checkpoint 90587ef3ffff0ac062eab1f36181fe0f3327bc20 passed
verify at 09:41:29 UTC; documentation head 6fd6317ffd81727fc6c3d604eefec36f690238a8
passed at 11:20:55 UTC. Those do not verify later changes.

Bounded directional aiming and the gesture core are implemented. This batch adds
src/input/mobile.ts, src/mobile.css and mobile-routing unit tests. The module
creates fixed pointer-captured pads, a Touch P1 toggle, fullscreen control and
portrait hint. It exposes explicit lifecycle methods and simple gamepad-slot
helpers; it does not read or mutate simulation state.

IMPORTANT: this batch is not yet imported or instantiated by main.ts. The game
is NOT mobile-playable until the following application integration is completed.
No local formatter, lint, typecheck, unit, browser or release command was run by
the remote author. New tests are authored, not verified. Inspect new-head CI.
The owner reports the separate playtest publisher works; this is not feature proof.

## Locked scope

- Solo touch on phones. Explicit co-op on tablets: touch P1 plus first gamepad P2,
  or touch disabled and existing two-gamepad assignments. No touchscreen P2.
- Touch defaults on for touch-capable devices, but disabling it must fully restore
  ordinary two-controller co-op. Never switch modes/spawn players on pad events.
- Left fixed stick moves; right fixed pad drags to bounded aim, release retains
  actual heading without firing, short tap fires once without redirecting aim.
  Keep named thresholds initially. No auto-fire, release-to-fire, delayed queue,
  aim assist, remapping, precision mode or controller framework.
- Landscape-only mobile play; portrait pauses/clears and requires explicit Resume
  after rotation back. Full arena, 16:9, fixed coordinates and DPR preserved.
- Compact useful HUD and reachable short-landscape overlays; hide unused P2 only
  in solo. Whole-app fullscreen is optional, with normal browser viewport fallback.
- No PWA, orientation-lock dependency, wake lock, audio or unrelated content.

## Next application integration batch

1. Read latest main.ts, index.html, gamepad/touch adapters, test bridge and tests.
   Preserve owner changes. Import mobile.css AFTER styles.css and instantiate
   createMobileControls once, after world initialization. Pass app, stage and
   tools plus existing focus/reset/pause callbacks. No per-room listeners.
2. Add viewport-fit=cover to the existing viewport meta without disabling zoom.
3. Extend clearInputs with mobile.clear. In setOverlay, call mobile.sync(mode,
   state) even when the overlay state is unchanged. Portrait play must pause
   before further simulation; resume must reject portrait while compact.
4. Compose P1 touch only at simulation command sampling. Use gamepadMode for
   polling and gamepadSlot for both command reads and HUD assignment. Null slot
   means keyboard fallback only; in mixed co-op first pad therefore controls P2.
   Never send touch to P2. Solo still creates one entity. No render-time sampling.
5. Touch toggle changes clear all inputs, pause active play and refresh menu/UI.
   Geometry/fullscreen changes clear gestures, resize renderer and pause if
   portrait; returning to landscape never auto-resumes. Extend canvas resize
   observation to clear invalidated pad geometry without changing simulation.
6. Compare controller identities across polls. Re-arm on assignment changes and
   pause mobile co-op on lost assigned controller. Reconnect requires neutral
   input and explicit Resume. Do not let a same-poll Start edge undo the pause.
7. Mobile menu prioritizes Solo, retains explicit co-op and explains Touch P1
   versus two controllers. Use solo repair/defeat copy. Keep existing desktop
   button names/keyboard activation and ordinary desktop controls working.
8. Add browser integration cases: genuine pointer capture/outside release; two
   simultaneous touches; drag/hold/release no fire, tap once; cancel/stale release;
   pause, retry, menu, room transition, blur/hidden-tab, portrait/landscape; optional
   fullscreen failure; compact arena/backing dimensions and no page errors.
9. Add app-level synthetic gamepad tests for mixed and two-controller co-op,
   disconnect/reconnect gates and unchanged touch-off behaviour. The new unit
   tests verify routing helpers with the real adapter, NOT app wiring or hardware.
10. Update progress and user controls docs with exact evidence. Keep PR draft.

## Local gates and handback

Check git status, current branch, HEAD and recent history before editing. Stop on
conflicts; no reset/stash/clean/rebase or reconstruction from prose. Source must
be present locally. Owner prepares/fetches outside restricted agents if needed.

Run installed tools only, focused first:

```sh
npm run test:unit -- tests/unit/mobile-routing.test.ts tests/unit/touch.test.ts tests/unit/world.test.ts
npm run format:check
npm run lint
npm run typecheck
npm run verify:fast
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers
```

Format changed files only if needed. Browser suites sequentially. Preserve full
coverage/assertions and production test-bridge absence in hosted and file://
outputs. Node 24.22.2; do not install npm dependencies, browser binaries or OS
packages, change the launcher, bypass sandbox failures or auto-approve images.
Report actual Firefox sandbox failures as blocked, never passed.

Report exact revisions/dirty state, commands/exits, blockers and artifacts. No
local commit, push, merge or deployment without separate authorization. Coordinate
handback before competing remote edits. No historical green claim for new source.

Publish the final verified branch through ratatwiskr/toybox-tanks-playtest, not
production. The current connector lacks workflow dispatch; owner may need to run
Publish playtest with source_branch=feature/solo-touch-controls. Record source SHA,
run and live marker. Request phone ergonomics/readability/background-return tests
then, plus mixed tablet input and two physical controllers where available.
Automated WebKit/synthetic pointers/gamepads are not physical-device certification.
