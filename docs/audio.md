# Initial audio pass — issue 16

## Assets and replacement

Audio lives in `src/assets/audio/music/` and `src/assets/audio/sfx/`.
`src/audio/assets.ts` imports the supplied MP3/WAV files directly through Vite.
Do not replace these imports with root-relative runtime URLs. Existing build
configuration uses relative hosted paths and a high inline limit in single mode.
Production artifact inclusion and file:// playback still require release tests.

Stable sound IDs are mapped centrally. To replace a clip, replace its asset or
change its import. To add a sound, extend the ID union, asset mapping/list and
semantic mapping, then test the authoritative trigger. No generic event bus.

| Event                                                            | File                         |
| ---------------------------------------------------------------- | ---------------------------- |
| Player shot emitted                                              | 15_cannon_fire_player_v1.wav |
| Sentry shot emitted                                              | 16_cannon_fire_enemy_v1.wav  |
| Successful wall reflection                                       | 18_wall_bounce_v1.wav        |
| Cork shell contact, including conservative ambiguous termination | 05_wall_hit_soft.wav         |
| Non-reflecting permanent-wall shell contact                      | 06_wall_hit_hard.wav         |
| Nonlethal player damage                                          | 08_player_hit_v1.wav         |
| Player disabled                                                  | 09_player_disabled.wav       |
| Nonlethal enemy damage, if applicable                            | 20_enemy_hit_v1.wav          |
| Enemy destroyed                                                  | 21_enemy_destroyed_v1.wav    |
| Non-final room cleared                                           | room_clear.wav               |
| Final completion only                                            | game_complete.wav            |
| Active gameplay music                                            | gameplay.mp3                 |

The owner approved the initial mappings and separate copies of the respawn clip
for happy events. `room_clear.wav` and `game_complete.wav` are intentional,
independently replaceable temporary cues. The original respawn clip is retained
but not separately triggered at room start, avoiding a duplicate transition cue.
Defeat has no dedicated cue: no suitable clip supplied; explicitly deferred with
owner agreement. The original issue's defeat-sound acceptance item is not met.
Lethal damage emits one destruction cue rather than stacking hit and destruction.
No sound plays merely for charging, rejected fire or invulnerable damage.

## Provenance

Owner-supplied assets. Creator, generation tool/source, licensing and attribution
terms have not been provided. No attribution or redistribution rights are inferred.
Resolve provenance before declaring redistribution/licensing complete.

## Playback and controls

Audio is application-owned and optional; failure never blocks gameplay. Eligible
keyboard/pointer interactions try activation; Enable audio provides an explicit
keyboard-accessible retry path for controller-only play or blocked activation.
Mute plus separate music/effects sliders are session-local. Audio-control keys
are isolated from gameplay input. Default levels (design choices, pending audible
mixing): music 20%, effects 70%, at most 16 concurrent effect voices.

Effects are decoded once on activation; cues before readiness are discarded,
never queued for later. Finished voices disconnect; oldest voices are stopped
when the cap is reached. Asset/playback diagnostics are bounded by distinct key.
Music loops only during active gameplay, pauses on pause/focus loss, and stops
on outcomes/menu/errors. Pause stops active effects; resume does not queue cues.
Room loads/retry/replay stop old voices and restart music. Outcome cues fire from
committed outcomes, with defeat priority and no final-room double jingle.

`stepWorld` returns fresh structured events for that call; callers consume each
batch once after every fixed step. No history polling or render-time inference.
The existing seven-entry textual debug/test-bridge history is unchanged. Direct
combat helpers accept an optional event collector for focused tests; they do not
call audio. The test bridge forwards per-step batches through an optional host
callback without changing its public events() snapshot contract.

## Verification status

Implementation authored remotely against ca6940073b7a946a354efd563c39109aaef89a03.
No Node, formatter, compiler, lint, unit, browser, release or audible check has
been run by the author in this environment. Tests are authored, not passes.

Owner feedback on 2026-11-08: the initial local format check passed, then lint
reported six errors (the temporary helper script, async lifecycle narrowing and
an async mock without await). Commit f1c1994a54c4fb3106cd85da83ed90f1b8028f9f
adds the playback/simulation batch with source/test lint fixes and excludes the
helper script. The owner subsequently reported no remaining local formatting or
lint fixes. No fresh full verification log, exact locally tested revision or
audible result was supplied; do not infer those checks passed for this commit.
This follow-up adds the uploaded application/test-bridge wiring and audio docs.

Required next checks: format changed files; verify:fast; full verify and browser
suites per docs/verification.md. Verify hosted subpath asset resolution and the
single HTML through file://, with no required sibling files or external requests.
Record dist/dist-single size impact against the asset-intake baseline. Perform
real audible solo/co-op play including overlapping fire, cork, first/second wall
contacts, lethal/nonlethal hits, pause/focus loss, mute/sliders, room clear,
completion, defeat, retry and replay. Test failed activation/assets and lifecycle
races. Browser voice cleanup/cap and production packaging need additional tests;
current unit tests do not certify audible mixing, hardware, Safari or iOS.
