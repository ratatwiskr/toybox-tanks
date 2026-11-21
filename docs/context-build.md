# Model-context build

Build a readable, silent, self-contained review artifact:

```sh
npm exec vite -- build --mode context
```

Output: `dist-context/index.html`. This mode uses the existing single-file plugin, disables JavaScript and CSS minification, and replaces the browser playback module before bundling. The replacement imports no sound or music assets and initializes neither HTML audio nor Web Audio. Existing audio controls remain present but cannot enable playback.

Normal hosted, single-file, and test build modes retain their existing configuration. No gameplay or simulation code is changed.

## Agent review workspace

Open the context artifact with `?review=1`, or select **Agent review** in its lower-right corner.

The workspace embeds:

- A compact product brief and non-negotiables.
- An architecture summary.
- Focused prompts for menu/onboarding, performance/scaling, enemies/maps, and reset/recovery.
- A build-time snapshot of selected TypeScript sources.
- Runtime diagnostics: FPS, recent frame time, worst recent frame, simulation steps, canvas size, DPR, room, state, shells, and enemies.
- Fields for observation, evidence, proposed minimal change, risks, validation plan, and confidence.
- Markdown and JSON report export.

The embedded sources are a snapshot, not live repository state. They do not prove current branch, pull-request, CI, or deployment state. For source-level review, use the embedded excerpts; for interaction and pacing, use the running game.

The review panel is included only in the context build. It observes gameplay state and cannot mutate the world, input adapters, simulation, or rendering.

## Validation required

This change has not been executed or browser-tested by the authoring assistant.

- Run formatting, lint, typecheck, and unit tests.
- Run the context build and inspect its bundle/module graph for excluded `audio/browser.ts`, `audio/assets.ts`, and sound/music files.
- Confirm the output contains one self-contained HTML file and no sound/music payloads.
- Open the HTML through `file://`; check solo/co-op, pause/resume, reset, retry, and room progression.
- Confirm audio controls cannot create media playback or issue audio requests.
- Confirm `?review=1` opens the review workspace and report export works offline.
- Confirm normal hosted and single-file builds do not include the review panel.
- Run existing release tests to check normal hosted and single-file builds.
