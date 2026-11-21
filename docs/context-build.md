# Model-context build

Build a readable, silent, standalone HTML artifact:

```sh
npm exec vite -- build --mode context
```

Output: `dist-context/index.html`. This mode uses the existing single-file plugin, disables JavaScript and CSS minification, and replaces the browser playback module before bundling. The replacement imports no sound or music assets and initializes neither HTML audio nor Web Audio. Existing audio controls remain present but cannot enable playback.

Normal hosted, single-file, and test build modes retain their existing configuration. No gameplay or simulation code is changed.

Source maps remain disabled to avoid duplicating source content in the model-facing artifact. Bundled JavaScript is not a substitute for the original TypeScript: comments, types, and module boundaries may be lost. Supply relevant sources and project instructions alongside the HTML when source-level review is needed. Visual assets remain embedded and may still dominate file size.

## Validation required

This change has not been executed or browser-tested by the authoring assistant.

- Run formatting, lint, typecheck, and unit tests.
- Run the context build and inspect its bundle/module graph for excluded `audio/browser.ts`, `audio/assets.ts`, and sound/music files.
- Confirm the output contains one self-contained HTML file and no sound/music payloads.
- Open the HTML through `file://`; check solo/co-op, pause/resume, reset, retry, and room progression.
- Confirm audio controls cannot create media playback or issue audio requests.
- Run existing release tests to check normal hosted and single-file builds.
