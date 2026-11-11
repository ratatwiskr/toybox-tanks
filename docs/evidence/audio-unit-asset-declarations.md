# Unit-project audio asset declarations

Date: 2026-11-09
Inspected branch head: 42e4158f6f71709eea3cf3ad1900da0b373e8597.
The exact failed CI SHA was not supplied with the compiler excerpt.

## Failure and source inspection

The owner supplied TS2307 errors for all twelve MP3/WAV ?url imports in
src/audio/assets.ts during the chained typecheck command. The excerpt does
not identify which individual tsc invocation failed. Source inspection shows
the newly added audio-music unit test imports the browser playback adapter,
which imports the asset mapping. The unit project includes only test roots,
whereas the application project includes src/**/*.ts. The existing ambient
*?url declaration lives in src/assets.d.ts and is not imported by that chain.
Consequently it is in the application project but absent from the unit project.
This new test dependency exposed the unit project's missing declaration scope;
the compiler error alone is not evidence of missing or renamed audio files.

## Narrow fix

Explicitly include the existing src/assets.d.ts in tsconfig.unit.json. Keep
its existing test roots, DOM/ES2023 libraries and node types unchanged. Do not
broaden the source include, add skipLibCheck, change module resolution, weaken
strictness, suppress TS2307, or change the simulation project's DOM-free scope.
No asset, gameplay, playback, dependency, CI or coverage setting is changed.
The existing browser-audio unit test provides the transitive-import regression
case for the normal tsc -p tsconfig.unit.json verification step.

## Verification limits

No formatter, lint, TypeScript, unit, browser or release command was run by the
remote author for this fix. Run the unit-project typecheck, then the complete
existing typecheck and verify:fast gates, followed by full verification. This
configuration repair does not establish that music playback is audible or that
the separate compact-layout candidate passed its browser tests.
