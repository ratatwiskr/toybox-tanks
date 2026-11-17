# Assets and audio — 2026-11

> **Historical record.** Frozen 2026-11-17; not current instructions.
> Current state: [../progress.md](../progress.md) · Index: [README.md](README.md).
>
> Extracted from the former `docs/progress.md`; Git history keeps the original.

## Floor artwork step (issue #24, ADR 0004 step 5)

PR #41 (`Feature/24 floor art`) was squash-merged into
`feature/24-asset-adapter-hardening` on 2026-11-12 as `5c3f569`; the combined
branch is PR #40 against `main`. Commit `19a9865` then refreshed the committed
development visual catalogue for these visuals. Presentation-only: no
simulation, collision, muzzle, radius or snapshot change. The floor is decoded
before the first frame; a failure keeps the procedural floor and reports in the
status line instead of leaving a blank arena.

### What changed

- `src/render/floor-data.ts`: `wood-warm` tile (512 px) copied verbatim from the
  pack's `toybox-floors.js`. Both checked-in copies of that file are byte-identical
  (`cmp`), and `src/main.ts` imports the data module rather than fetching.
- `src/render/floor.ts`: `validateFloorDefinition`, `buildFloorSvg`, and
  `prepareFloorImage`, which decodes once and reuses `AssetLoadError`
  (`assetId: 'wood-warm'`, `invalid-asset` / `decode-failed`).
- `src/render/assets.ts`: the SVG decoder is exported as `decodeSvgImage` so the
  floor shares the same decode path.
- `src/render/renderer.ts`: `RenderContext` gains `createPattern`; the renderer
  gains `setFloorPattern(image)`. With a pattern it fills 960×540 under the world
  transform, so the 512 px tile stays anchored to world 0,0. Without one it draws
  the existing procedural planks. Spawn rings draw in both cases; the watermark
  and tagline were removed after the owner review below.
- `src/main.ts`: top-level `await preloadFloorArtwork()` runs before the bridge
  and the first render, so captures and gameplay cannot race the decode. Failure
  writes a non-blocking warning to `#status` with the `.warning` class.
- `src/styles.css`: `.status.warning` styling.
- `tests/unit/floor.test.ts`: tile wrapping, single decode, decode failure, and
  malformed-data rejection (4 tests).
- `tests/unit/renderer.test.ts`: pattern fill replaces the procedural fill, spawn
  rings stay, and a failed `createPattern` keeps the procedural floor (13 tests).

### Commands and observed results

| Command                                            | Result                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `npm run verify:fast` (head `19a9865`, 2026-11-13) | pass: format, lint, typecheck, 33 files / 285 unit tests           |
| CI `verify` (run 43404245823, head `19a9865`)      | pass: full `npm run verify` and `test:browsers`                    |
| Local floor-slice `verify` / `test:browsers`       | pass before the #42 rebase; historical, not evidence for `19a9865` |

The floor-slice runs were made before the owner-requested watermark removal and
before the branch was rebased onto `f0ce3d4`; the same components were re-run
after watermark removal. A plain `npm run verify` re-used a developer-run `vite`
on port 5173 that lacks the test bridge, so 18 e2e tests failed with
`Test bridge missing`; an isolated-port rerun passed. CI remains authoritative.
The `verify` job for `19a9865` finished successfully; `deploy-pages` and
`pages-smoke` were skipped on the PR, not passed.

A temporary Playwright probe (not committed) sampled the live canvas after the
`coop` scenario rendered: the dominant colours were the `wood-warm` board shades
(`#d9bc91` / `#ddc298`), 365 of 387 sampled floor points matched exactly one
tile (512 world px) apart, only 97 of 387 matched at a half tile, and `#status`
had no warning. That is evidence for world anchoring and a successful preload,
not an aesthetic approval.

### Candidate screenshots (not baselines)

`test-results/visual-candidates/01-menu.png` through `09-resized-gameplay.png`
were recaptured from this branch. They are unapproved candidates; the menu shot
is covered by the overlay, so `02-gameplay.png` is the first floor view.

Owner review on 2026-11-12: the wood-warm floor is approved. The owner also asked
to remove the TOYBOX watermark (previously kept for the first candidates), so the
watermark and tagline no longer draw. The recaptured images reflect that removal;
the floor tile itself is unchanged. The committed development checkpoint in
`docs/visual-catalogue/current/` was refreshed in `19a9865`; it is overwriteable
development evidence, not a formal baseline or aesthetic approval.

### Limits and open choices

- The rug stays skipped; that remains a later owner choice.
- The candidate images are not committed reference baselines and no visual
  comparison threshold was added.
- PR #40 is the combined adapter-hardening and floor-art PR. Its title and body
  must describe both slices; walls, tanks and shells remain separate PRs per
  ADR 0004.

## Asset adapter hardening (issue #24, follow-up to PR #36)

Branch `feature/24-asset-adapter-hardening`, based on `30246e5` (the squash
merge of PR #36). This slice is presentation-only. It adds validation, bounded
caching, error reporting and the procedural-fallback contract to
`src/render/assets.ts`. It does not import the adapter from the renderer or
`src/main.ts`, changes no visuals and adds no screenshot baseline.

### What changed

- `src/render/assets.ts`: registered asset IDs (`tank-blue`, `tank-orange`,
  `turret-enemy`), a pure `validateAssetDefinition` check (viewBox, anchor,
  muzzle, shadow, non-empty and unique layer roles), typed `AssetLoadError`
  codes (`unknown-asset`, `invalid-asset`, `decode-failed`,
  `canvas-unavailable`, `invalid-resolution`), an LRU layer cache bounded to 16
  entries by default, in-flight decode deduplication, `preload` that reports
  failures instead of rejecting the batch, an `onError` hook (default
  `console.error`), `reset()` for world changes, and `draw()` that returns
  `false` when the caller must keep drawing procedural art.
- `tests/unit/assets.test.ts`: 13 tests covering the SVG fragment builder,
  checked-in definitions, malformed definitions, unknown IDs, invalid
  definitions, cache reuse, concurrent decode deduplication, LRU eviction,
  decode failure and retry, the draw fallback contract, draw without mutation,
  stale in-flight results after reset, and `preload` failure collection.

### Commands and observed results

| Command                                                                       | Result                                                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `npm run verify:fast`                                                         | pass: format, lint, typecheck, 32 files / 277 unit tests               |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify`        | pass: coverage, 23 e2e tests, 1 visual candidate test, 5 release tests |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers` | pass: 9 hosted tests across Chromium, Firefox and WebKit               |

### Limits

- The adapter is not part of the shipped bundle yet. The existing hosted SVG
  probe still proves browser decoding; the adapter's own browser error path is
  exercised when the tank step wires preload and drawing.
- The fallback is a tested contract (`draw` returns `false`), not yet a visible
  in-game message. The visible error surface and procedural drawing switch
  belong to the wiring step.
- No candidate screenshots were captured because this slice has no visual
  change.

## Audio issue 16: current-main port, not verified

Branch `feature/16-audio-on-current-main` continues the clean-current-main port
of the initial audio feature. The implementation adds the audio event model,
semantic sound mapping, browser playback/session/controls, optional simulation
event collectors, per-step structured event batches, application lifecycle
wiring, moved binary assets, and an audio-step integration test.

This port is a working handoff, not a completion claim. No formatter, TypeScript,
unit, browser, release, or audible check has been observed for the branch head.
Asset provenance, creator, generation source, license, and redistribution terms
remain unresolved.

Ported in this commit: `docs/audio.md`, the three audio evidence documents, and
the `audio-events`, `audio-music`, and `audio-session` unit tests. The
mobile-layout e2e audio assertions still need to be merged into the current base
test file. Existing main progress sections are retained.
