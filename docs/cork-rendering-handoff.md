# Cork rendering handoff — OpenCode agent

## Context

PR #15 (`feature/destructible-cork-blocks`) implements destructible cork and
the fourth campaign room. The owner has decided to retain the existing
procedural canvas rendering of cork for the near future.

The crafted `block-cork-1..3` SVG definitions in
`Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte+handoff/toybox-assets.js`
remain unintegrated reference material. Do not implement an SVG asset adapter,
embed SVG data URIs, add `drawImage` support, or change the cork visual
approach in this task.

## Your access model

You have no GitHub access. Work only from the repository checkout and local
commands. Do not push, create PRs, comment on PRs, or change remotes. The owner
pushes and reviews CI.

## Immediate priority

CI for PR #15 has reported `verify: failure`. The latest observed run was:

https://github.com/ratatwiskr/toybox-tanks/actions/runs/42458393507/job/128662195305

You may not be able to read the GitHub job log. If the owner provides a log
excerpt, fix the first concrete failing command. If no log is available, run
the local gates in the order CI uses and fix the first failure you can
reproduce.

Do not guess the failure cause. Do not weaken checks, assertions, coverage,
visual baselines, or CI configuration to obtain a green run.

## Verification order

`npm run verify` runs, in order:

1. `npm run format:check`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:coverage`
5. `npm run test:e2e`
6. `npm run test:visual`
7. `npm run test:release`

Start with focused checks:

```sh
npx prettier --check .
npx eslint . --max-warnings 0
npm run typecheck
npx vitest run tests/unit/maps.test.ts tests/unit/cork-combat.test.ts tests/unit/cork-state.test.ts tests/unit/renderer.test.ts
```

Then run:

```sh
npm run verify:fast
```

Before claiming completion, run the applicable full gates from
`docs/verification.md`, including:

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run verify
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:browsers
```

Run browser suites sequentially. Do not report a command as passed unless it
was actually executed in the current revision.

## Cork rendering contract

Preserve the following:

- Cork is rendered procedurally in `src/render/renderer.ts`.
- `hitsRemaining: 3` renders intact cork.
- `hitsRemaining: 2` renders cracked cork.
- `hitsRemaining: 1` renders heavily cracked cork.
- `hitsRemaining: 0` or `destroyed: true` renders no cork and no cork shadow.
- The aim guide uses `firstTerrain`, stops at intact cork, and does not draw a
  reflected continuation through cork.
- Destroyed cork no longer blocks the aim guide.
- Rendering remains read-only.

Do not change cork gameplay, collision, shell, enemy, reset, or map-validation
behavior while fixing presentation or CI issues.

## Required follow-up tests

After the current CI failure is understood and fixed, add focused renderer
coverage:

1. Render cork at each damage stage without mutating the world.
2. Render destroyed cork without mutating the world and ensure it is skipped.
3. Verify the aim guide uses terrain-aware collision and does not draw a
   reflected continuation for a cork hit.

Do not add screenshot baselines or claim visual approval. Visual acceptance and
physical gamepad verification remain separate human tasks.

## Documentation

After executing checks, update `docs/progress.md` with:

- Tested commit SHA.
- Environment.
- Exact commands.
- Exit statuses.
- CI run links or owner-provided log excerpts.
- Artifacts or failure excerpts.
- Remaining unverified criteria.

Never present historical CI results as current results. Never claim that an
unexecuted command passed.

## Stop conditions

Stop and ask the owner before:

- Changing the cork gameplay contract.
- Replacing procedural cork rendering with SVG assets.
- Changing CI, deployment policy, dependencies, or the lockfile.
- Weakening a test, assertion, coverage requirement, or visual baseline.
- Merging, deploying, retargeting, or rebasing either stacked PR.
- Adding rooms, enemies, weapons, audio, or unrelated asset work.
