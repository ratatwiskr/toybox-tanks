# Audio on current main — continuation handoff

Updated: 2026-11-11
Branch: `feature/16-audio-on-current-main`
Branch head at handoff: `7a74a59802e8bfee0eb25a487d99f6b5978cbcf7`
Original audio branch: `feature/16-enable-initial-game-audio`
Original PR: #20 (`Feature/16 enable initial game audio`)

## Purpose

This handoff continues the clean-current-main port of the initial audio feature.
It is a working handoff, not a completion claim. No formatter, TypeScript, unit,
browser, release, or audible check has been observed for the branch head.

## Completed on this branch

- Audio event model in `src/sim/types.ts`, including `shellCollision`.
- Semantic sound mapping in `src/audio/events.ts`; shell-shell collisions use
  `softImpact`, the same sound as cork contact.
- Browser playback, session, controls, and audio controls CSS in `src/audio/`.
- Optional event collectors in `src/sim/combat.ts`, `src/sim/enemies.ts`, and
  `src/sim/world.ts`.
- `stepWorld` returns a fresh `SimulationEvent[]` per fixed step.
- `advanceWorld` returns that batch after deriving presentation-only body heading.
- `resolveShellCollisions` remains before shell advancement and emits one
  `shellCollision` event per resolved pair.
- Sentry behavior was restored to current main: nearest visible player, target
  change charge reset, 0.09-radian alignment gate, `enemyTelegraph`, and final
  line-of-sight recheck. The only change is the optional event collector passed
  to the existing `shoot` call.
- `src/main.ts` creates the audio session, adds controls, isolates gameplay
  input while audio controls have focus, resets audio on room/error/menu/world
  replacement, consumes `advanceWorld` event batches, and disposes on pagehide.
- `src/test-bridge.ts` adds optional `afterStep(events)` and forwards one batch
  per bridge tick.
- `tsconfig.unit.json` includes `src/assets.d.ts` for `?url` declarations.
- Binary audio assets are present under `src/assets/audio/`, including the two
  replaceable outcome cues `room_clear.wav` and `game_complete.wav`.
- `tests/unit/audio-step-integration.test.ts` covers event batches, body-heading
  preservation, shell-collision soft-impact mapping, and paused behavior.

## Asset provenance and placement

The binary assets were cherry-picked from original audio branch commit
`ca6940073b7a946a354efd563c39109aaef89a03`, then moved from `assets/audio/` to
`src/assets/audio/` in `7a74a59`.

The owner supplied the assets. Creator, generation source, license, and
redistribution terms remain unresolved. Do not infer attribution or licensing.

## Remaining implementation

Copy these files from `feature/16-enable-initial-game-audio` at
`0e67cdeaa7b20c059bd4468a4300bf9df0d82344`, without copying its older
`src/main.ts`, `src/test-bridge.ts`, `src/sim/*`, or
`src/presentation/body-heading.ts`:

- `tests/unit/audio-events.test.ts`
- `tests/unit/audio-music.test.ts`
- `tests/unit/audio-session.test.ts`
- `tests/e2e/mobile-layout.spec.ts`
- `docs/audio.md`
- `docs/evidence/audio-compact-layout-regression.md`
- `docs/evidence/audio-music-activation.md`
- `docs/evidence/audio-unit-asset-declarations.md`

Then reconcile `docs/progress.md`: retain current main's existing progress
sections and add an audio section that distinguishes implemented work from
unverified checks.

## Required verification

Run from the repository root after the remaining files are added:

```sh
npm run format
npm run verify:fast
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e
npm run verify
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers
```

CI is authoritative. Do not weaken assertions, skip checks, or treat a green CI
run as audible playback proof.

## Playtest checklist

After CI is green, perform real audible solo and co-op play:

- Start, pause, resume, retry, next room, replay, and return to menu.
- Player and sentry shots; first bounce; second wall contact; cork contact.
- Nonlethal and lethal player damage; enemy damage and destruction.
- Shell-shell collision soft impact.
- Room clear and final completion cues; no final-room double jingle.
- Mute, music/effects sliders, focus loss, hidden tab, and pagehide.
- Hosted subpath and standalone `file://` release behavior.

Do not claim Safari/iOS or physical-gamepad compatibility from automated tests.

## Next actions

1. Add the remaining tests and documentation listed above.
2. Run formatting and focused checks locally if available.
3. Push the branch.
4. Open a draft PR from `feature/16-audio-on-current-main` to `main`.
5. Inspect CI failures and repair them with the smallest evidence-backed change.
6. Perform audible playtesting only after a green verification run.
7. Do not merge, close PR #20, or alter branch protection without explicit
   owner approval.
