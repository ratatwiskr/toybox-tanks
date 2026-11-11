# Music activation candidate fix

Date: 2026-11-08
Inspected source: fd3f8f1873f8a12ba985d073f3105f330437ceb7.

## Report and diagnosis boundary

The owner reported successful general playtesting with audible sound effects,
but no music. No browser, precise playtested SHA, launch mode or media-element
error was supplied. This does not prove an MP3 asset/codec problem or prove that
autoplay was the cause in that browser. The compact-layout CI failure is separate.

Source inspection found that session music startup was gated on effect readiness.
That readiness awaited AudioContext resume plus all effect fetch/decode work.
The explicit unlock path also retried the media element only after those awaits.
This is an avoidable activation-order defect: the music element is independent
of the Web Audio context, and startup should not wait for SFX decoding or rely
on effect permission implying media-element permission.

## Changes

- Request gameplay music immediately on the synchronous playing-state transition.
- Retry desired music at the start of unlock, before its first await.
- Do not initiate another music attempt when effect decoding later completes.
- Keep readiness gating for one-shot effects and discard pre-ready cues.
- Preserve mute, pause/resume, outcomes, retry/reset and disposal policies.
- Keep the supplied MP3, asset imports, single-element music lifetime and SFX path.
- Say Audio context ready rather than Audio enabled on a successful context
  activation; that result alone does not establish successful music playback.
- Preserve bounded media playback/asset warnings. No autoplay-policy bypass.

The controlled regressions cover immediate music despite unready effects, pause
while activating, muted activation/unmute, a rejected play followed by immediate
retry before a deliberately unresolved context resume, menu silence, duplicate
play prevention and independent effects failure. The startup-order expectations
are designed to fail on the previous source, but neither old nor new tests were
executed here. Mocked media/context globals are not real browser permission tests.

## Remaining verification

No formatter, lint, compiler, unit, browser, release or audible checks were run
by the remote author. Run the focused audio tests plus existing full gates.
Then perform an audible test with the actual MP3: Start, pause/resume, next room,
retry/replay, mute/unmute and explicit Audio/Enable audio retry. Test hosted
subpath and standalone file:// delivery. If music is still silent, capture the
music playback rejection/asset warning and the failed request/media error;
do not claim that an activation patch has ruled out asset or environment causes.
No dependency, CI, coverage threshold, gameplay or audio-file changes are made.