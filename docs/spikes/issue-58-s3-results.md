# Issue #58 slice S3 — build spike results

Date: 2026-11-27. Branch: `spike/58-s3-svg-build` (PR #63). Probe commit: `e771b6b`.
This is branch-local evidence for owner review, not a production contract or an
approved visual baseline. The committed tree leaves `svg-build-spike.ts`
unreferenced; all runtime checks below used a temporary local one-line import in
`src/main.ts`, which was removed before the verification runs and is not committed.

## Setup

- Environment: Node `24.22.2`, npm `11.19.1`, Vite `8.3.5`, Playwright `1.64.1`,
  bundled Chromium `1248`. Browser commands used
  `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`.
- Temporary wiring: `import './render/svg-build-spike';` in `src/main.ts`. The probe
  reads `/src/assets/svg/spike-58.svg` (180 B) via `import.meta.glob(..., { query: '?raw', import: 'default', eager: true })`,
  checks the `id="toybox-s3-probe"` marker, calls the existing `decodeSvgImage`,
  and sets `document.documentElement.dataset.svgBuildSpike` to `pass` or `fail`.
- The throwaway harness `.tmp/spike58/probe.mjs` built both releases, started dev
  and preview servers, opened a fresh browser context per target, captured every
  request from before navigation through probe completion and a short gameplay
  smoke (start co-op, launch a room, Escape to pause), and wrote
  `.tmp/spike58/results.json`.

## Question 1 — raw SVG text in dev, hosted build, and single-file build

**Yes.** All three targets reported `svgBuildSpike: pass` with no pageerror or
console error, and all completed the smoke steps:

| Target         | URL                                | Requests observed                                                                      |
| -------------- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| Dev            | `http://127.0.0.1:5173/`           | 68 loopback requests, including `src/assets/svg/spike-58.svg?import&raw`               |
| Hosted preview | `http://127.0.0.1:4173/`           | 15 loopback requests: HTML, JS/CSS, audio assets; SVG text is inlined in the JS bundle |
| Single file    | `file:///…/dist-single/index.html` | 1 request: the HTML itself                                                             |

In dev the Vite module request is expected. In the hosted and single-file builds
the eager glob becomes inlined string data, not a separate SVG request.

## Question 2 — offline single-file decode with zero network requests

**Yes.** In a fresh Chromium context, request capture was active before
`page.goto(file://…/dist-single/index.html)` and continued through probe
completion and the gameplay smoke. Result: 0 `http:`/`https:` requests, 0
non-document `file:` requests, 0 failed requests, 0 page/console errors,
`svgBuildSpike: pass`, and the pause dialog appeared after Escape. Decoding went
through `decodeSvgImage`'s `data:image/svg+xml;charset=utf-8,…` URI and produced
the expected 16 × 16 image.

## Question 3 — size cost

Measured with the same toolchain and the probe wiring described above; gzip is
level 9 over the whole HTML file.

| `dist-single/index.html`                      |                     Raw bytes |                  Gzip bytes |
| --------------------------------------------- | ----------------------------: | --------------------------: |
| Baseline, probe unreferenced                  |                     4,981,376 |                   3,603,528 |
| Probe wired, 180 B fixture inlined            |              4,982,089 (+713) |            3,604,105 (+577) |
| Same plus one 1,695 B representative tank SVG | 4,983,838 (+1,749 over wired) | 3,604,708 (+603 over wired) |

The representative SVG was generated from the checked-in tank body and turret
fragments in `src/render/asset-data.ts` (1,108 B + 446 B plus an SVG wrapper and
two group tags). It was a temporary fixture and was removed after measurement.
The per-asset delta is approximately the SVG byte count plus ~54 B of glob-key
and module glue. For 25 assets of that size the estimate is ~43.7 KB raw and
~15.1 KB gzip added to the single-file HTML, taking it to about 5.02 MB raw.
That is under 1% raw growth; the file is already dominated by the ~2.87 MB
inlined music asset. Assets larger than the representative example, such as the
6,642 B floor tile fragment, cost proportionally more. The fixed probe code
overhead is roughly 0.5 KB and will differ in A1's real loader.

## Question 4 — DOM availability in unit tests

**No DOM.** `vitest.config.ts` sets `environment: 'node'`; neither `jsdom` nor
`happy-dom` is installed, and `typeof DOMParser` is `undefined` in Node
`24.22.2`. The existing renderer unit test uses a structural fake canvas.

Consequence for A1: `validateSvg`'s string rules can be covered by ordinary
Vitest unit tests. `splitTank`, which uses `DOMParser` and `XMLSerializer`, needs
either Playwright coverage or an explicit owner-approved test-environment change
and dependency addition. Neither dependency was changed for this spike.

## Question 5 — TypeScript typing

**A per-file `/// <reference types="vite/client" />` works.** The app tsconfig
sets `"types": []`, so `import.meta.glob` is not declared by default. With the
reference in `svg-build-spike.ts`, `import.meta.glob<string>(...)` passes the
full `npm run typecheck`. Removing only that line makes
`npx tsc -p tsconfig.app.json` fail with
`TS2339: Property 'glob' does not exist on type 'ImportMeta'` (exit 2). The line
was restored immediately. Adding `vite/client` to the shared app tsconfig would
also work but is a broader change than the scoped reference.

## Verification actually run

| Command                                                         | Result                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run typecheck` (probe wired)                               | passed, all six projects                                                               |
| `npx tsc -p tsconfig.app.json` (reference deliberately removed) | exit 2, expected TS2339; line restored                                                 |
| `PLAYWRIGHT_BROWSERS_PATH=… node .tmp/spike58/probe.mjs`        | dev, hosted-preview, single-file all `pass`; 0 HTTP(S) requests from `file://`         |
| `npm run verify:fast`                                           | passed: 42 files, 364 tests                                                            |
| `PLAYWRIGHT_BROWSERS_PATH=… npm run verify`                     | passed: format, lint, typecheck, coverage, 28 e2e, 1 visual candidate, 7 release tests |
| `PLAYWRIGHT_BROWSERS_PATH=… npm run test:browsers`              | 9 passed: Chromium, Firefox, WebKit hosted-release smoke                               |

Coverage on the final tree: 89.81% statements, 82.79% branches, 95.37%
functions, 90.71% lines. Visual capture produced only unapproved candidates; no
aesthetic approval is claimed. Firefox passed in this session, although it has
previously been blocked by the sandbox.

## Limitations and next step

- The probe is not connected in the committed tree, so CI staying green does not
  prove S3; the local wiring and harness evidence above do.
- Network capture is Chromium only. Dev and preview module/asset requests are
  expected and are not the offline gate. The `file://` check is a real browser
  load of the production artifact, not a source inspection.
- No production entry point, renderer, simulation, dependency, build config, or
  formal visual reference changed. A1–A4 were not started; they belong to
  separate PRs from clean `main`.
- GitHub writes are unavailable in this sandbox, so the proposed issue comment
  and updated PR text are drafted under `.tmp/github/` for the owner to apply.
