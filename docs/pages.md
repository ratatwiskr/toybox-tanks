# GitHub Pages deployment

Target: https://ratatwiskr.github.io/toybox-tanks/

The owner reports that Pages is enabled with GitHub Actions as its publishing
source. A successful deployment and live smoke are still required before the
site is considered verified.

## Workflow

`.github/workflows/verify.yml` retains `npm run verify` and
`npm run test:browsers`. On main, it uploads only the verified `dist/` output
using the official Pages artifact action. The deployment job requires the
verification job and uses the `github-pages` environment. Pull requests never
deploy. The workflow can also be dispatched manually on main.

Main workflows are serialized without cancelling an active deployment; a newer
pending run may replace an older pending run. Immediately before deploying, the
workflow checks that its SHA still matches main. An obsolete revision skips the
deployment and live smoke. This publishes the latest verified development
version, not every commit as a retained release.

The only additional file in the published output is `deployed-commit.txt`,
containing the public source commit SHA. No repository files outside dist are
uploaded. The existing relative Vite base is preserved. No custom domain,
service worker, runtime dependency, or downloadable release is added.

## Live verification

After deployment, a separate read-only job installs the existing locked
dependencies and Chromium on the GitHub runner, then runs `npm run test:pages`.
It uses the actual URL emitted by deploy-pages. There is no local preview
server. Both PAGES_BASE_URL and PAGES_EXPECTED_SHA are required.

The smoke waits up to 120 seconds for the expected deployed commit marker, then
checks the real project URL, resource and JavaScript errors, the menu and canvas,
co-op start, pause/resume, reload, solo start, and production bridge absence even
with a test-looking query. Requests use relative paths that retain the project
subdirectory. Test retries remain zero. A readiness poll is not a test retry.

`tests/release/pages.smoke.ts` is selected explicitly by
`playwright.pages.config.ts`; its name intentionally keeps it out of the default
local release spec discovery. The test remains included by the existing release
TypeScript and ESLint globs. The new configuration is included in the focused
tooling typecheck.

To run against a known deployed revision in an execution-capable environment:

```sh
PAGES_BASE_URL=https://ratatwiskr.github.io/toybox-tanks/ \
PAGES_EXPECTED_SHA=<full-40-character-commit-sha> npm run test:pages
```

Replace the SHA placeholder with the actual commit. Failure artifacts are uploaded
as `pages-smoke-artifacts`. A failed live smoke makes the workflow fail but does
not automatically roll back an already published deployment.

## Owner setup and acceptance

- Pages source: GitHub Actions. No gh-pages branch or personal token is needed.
- Restrict the github-pages environment deployment branches to main. This remote
  protection setting is not configured or verified by these repository files.
- Inspect the first Actions run for the tested SHA: verify, deploy-pages, and
  pages-smoke must succeed; retain the run URL and artifacts on failure.
- Perform a short real-keyboard solo/co-op test on the published URL.
- Physical gamepads, Safari/iOS compatibility, and visual approval remain
  separate evidence. This deployment does not complete Gate E.

## Preparation evidence

Prepared on 2026-11-07 through authenticated repository reads and source review.
No npm, TypeScript, ESLint, Prettier, build, or Playwright process was executed in
the preparation session. The connector does not expose Actions logs or run
controls. No successful CI or live-site result is claimed.

Downloadable GitHub Releases are explicitly deferred.
