# Gate B handoff — toolchain, guardrails, minimal skeleton

Updated: 2026-11-06  
Next session focus: **finish Gate B**  
Canonical contract: `docs/handoff.md` (especially sections 4–11 and 13)  
Earlier context: `docs/session-handoff.md`, `docs/baseline.md`  
Authoritative checkpoint: `docs/progress.md`

This document records only the **new** Gate B work and the exact state at handoff. It
does not repeat the migration contract, product invariants, or Gate A baseline.

## Working tree at handoff

Do not commit or push. Current state:

```text
 M package.json
?? .prettierignore
?? .prettierrc.json
?? eslint.config.mjs
?? index.html
?? playwright.config.ts
?? playwright.release.config.ts
?? src/
?? tests/
?? tsconfig.app.json
?? tsconfig.base.json
?? tsconfig.e2e.json
?? tsconfig.fixtures.json
?? tsconfig.json
?? tsconfig.sim.json
?? tsconfig.tooling.json
?? tsconfig.unit.json
?? vite.config.ts
?? vitest.config.ts
```

Gate A is committed as `25296e7` (`complete gate a`). `dist/` exists from a successful
build and is ignored. `package-lock.json` and `node_modules/` were not changed by this
session; no installs were run.

## Gate B work completed

Application skeleton (intentionally simplified; **not** Gate C parity):

- `index.html`, `src/main.ts`, `src/styles.css`
- `src/config.ts`
- `src/sim/types.ts`, `src/sim/maps.ts`, `src/sim/world.ts`
- `src/render/renderer.ts`, `src/input/keyboard.ts`, `src/assets.d.ts`

Toolchain and config:

- `tsconfig.base.json` plus focused `app`, `sim`, `tooling`, `unit`, `e2e`, and
  `fixtures` projects. `tsconfig.sim.json` is DOM-free (`lib: ["ES2023"]`, `types: []`).
- `eslint.config.mjs`: flat config, strict type-checked rules, sim import/global/property
  restrictions, negative fixtures globally ignored, inline config disabled.
- `.prettierrc.json`, `.prettierignore`.
- `vite.config.ts` (hosted + `--mode single` via `vite-plugin-singlefile`),
  `vitest.config.ts` (explicit coverage includes/thresholds), `playwright.config.ts`
  (dev + visual projects), `playwright.release.config.ts` (hosted/single release checks).
- `package.json` now has the full script contract from `docs/handoff.md` section 7 and
  a `lint-staged` block. `package-lock.json` was not modified.
- Unit tests exist: `tests/unit/config.test.ts`, `tests/unit/maps.test.ts`,
  `tests/unit/world.test.ts` (17 tests total).

The world skeleton currently supports movement, wall blocking, aiming/firing, swept
shell hits, damage/invulnerability, and outcome commits. It does **not** yet implement
enemy AI, shell bounce, muzzle sweep, effects, or the test bridge. That is Gate C/D.

## Current verification results (actually run)

| Command                                                               | Exit    | Result                                                                                                                           |
| --------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                   | 2       | `TS18003` in `tsconfig.e2e.json` (no e2e/visual/release files yet). `tsconfig.fixtures.json` will fail next for the same reason. |
| `npm run lint`                                                        | 1       | 4 errors, listed below.                                                                                                          |
| `npm run test:unit`                                                   | 1       | 16 passed, 1 failed (`tests/unit/maps.test.ts`).                                                                                 |
| `npm run build`                                                       | 0       | Hosted build succeeds.                                                                                                           |
| `npm run format:check`                                                | not run | Files were formatted with `prettier --write`.                                                                                    |
| `npm run test:coverage`                                               | not run | Blocked by the unit failure.                                                                                                     |
| `npm run test:e2e` / `test:visual` / `test:release` / `test:browsers` | not run | Specs do not exist yet.                                                                                                          |

No Gate B command is claimed as passing. Visual baselines are **not** approved.

### Exact lint failures

```text
eslint.config.mjs
  0:0  Parsing error: not found by the project service

src/input/keyboard.ts
  43:3   Unsafe spread of an `any` value in an array  @typescript-eslint/no-unsafe-assignment
  43:32  Unsafe return of a value of type `any[]`     @typescript-eslint/no-unsafe-return

src/main.ts
  421:7  Unnecessary conditional, comparison is always true  @typescript-eslint/no-unnecessary-condition
```

Likely fixes (verify, do not assume):

- `eslint.config.mjs`: it is outside every tsconfig. Add it to `projectService`
  `allowDefaultProject`, or give `*.mjs` config files a non-type-checked override. Do
  not add a blanket ignore.
- `src/input/keyboard.ts:43`: `Object.values(keys)` is inferred as `any[]`. Enumerate
  the `KeySet` fields explicitly, or type `KeySet` so `Object.values` is `string[]`.
- `src/main.ts:421`: TypeScript narrows `world.state` after the outer `if` and does not
  see `stepWorld` mutating it. Read the state through a small function/helper (or a
  mutable local) instead of disabling the rule.

### Exact unit failure

`tests/unit/maps.test.ts:41` expects a border mutation to be rejected:

```ts
expect(validateMap({ grid: replaceCell(first.grid, 1, 1, '.') }).ok).toBe(false);
```

`(1, 1)` is interior, not border; the validator is correct. This is a test bug. Use a
real border coordinate such as `replaceCell(first.grid, 0, 0, '.')` or `(0, 5)`.

## Remaining Gate B work (in order)

1. Fix the three lint issues and the map test coordinate above.
2. Create guardrail fixtures and tests:
   - `tests/fixtures/guardrails/sim/positive/*.ts` — clean sim code.
   - `tests/fixtures/guardrails/sim/negative/*.ts` — one violation per file:
     prohibited import, restricted global, `any`, and an unhandled union variant.
   - `tests/architecture/guardrails.test.ts` — run ESLint programmatically against
     positive and negative fixtures with `ignore: false`; assert the **exact rule ID**
     (and TypeScript error code where relevant), not merely a nonzero exit.
   - Keep fixtures out of normal app compilation and out of normal lint (already
     ignored in `eslint.config.mjs`); the fixture tsconfig is `tsconfig.fixtures.json`.
3. Create browser specs:
   - `tests/e2e/smoke.spec.ts` — real page load, canvas render, real keyboard input,
     menu/start, pause, retry. Chromium project.
   - `tests/visual/candidates.spec.ts` — stable candidate screenshots only; label them
     unapproved. Do not call this an approved regression suite.
   - `tests/release/hosted.spec.ts` — smoke the built `dist/` via preview.
   - `tests/release/single.spec.ts` — open `dist-single/index.html` via `file://` and
     smoke it.
4. Run in this order and fix failures:
   - `npm run format:check`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:unit`
   - `npm run test:coverage` (thresholds: 85% statements/lines/functions, 80% branches)
   - `npm run build`
   - `npm run build:single`
   - `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:e2e`
   - `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:visual`
   - `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" npm run test:release`
5. Verify WebKit separately. Report Firefox with the exact local blocker; do not
   weaken the sandbox or claim it passed.
6. Add and verify:
   - `.husky/pre-commit` (Husky 9 style; run lint-staged).
   - `.github/workflows/verify.yml` (install, Playwright browser preparation, full
     verification and cross-browser smoke with correct build ordering).
   - `README.md` (setup, commands, map/config editing, releases, browser path override,
     Firefox limitation).
   - `docs/architecture.md` and `docs/verification.md`.
   - Update `docs/progress.md` and the stage text in `AGENTS.md`.
7. Run `npm run verify` end to end and report Gate B results without committing.

## Open decision before CI is final

`npm run verify` currently includes `test:visual`. First baselines require human/vision
approval, so a CI workflow that runs `verify` will fail until that approval exists. Do
not auto-approve snapshots. Choose one and document it:

- keep `verify` as-is and let CI fail on visual until approval (accurate but red), or
- have CI run the approved parts plus candidate capture, and report the visual gate as
  pending.

Either way, do not hide the visual suite or call candidates approved.

## Constraints and environment

- No `npm install`/`npm ci`, lockfile changes, package updates, or browser downloads.
- Prefix local Playwright commands with
  `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"`; the launcher path is wrong
  and must stay unchanged.
- Firefox fails locally before page launch with
  `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
  `Could not find profile folder.` Report it.
- Use `/tmp/toybox-tanks.ACD5RI09/opencode/` for scratch logs. `/tmp` root writes are
  sandbox-restricted.
- Harness nono denial notices on allowed repo paths are known false positives; confirm
  with `nono why --self --path <path> --op read` if needed.
- No commits, pushes, history edits, or remote/branch-protection changes.

## Suggested skills for the next session

- `opencode` — only if ESLint flat-config, Playwright, Husky, or Vite behavior needs
  checking against current OpenCode/tooling docs.
- `grill-with-docs` — when finalizing `docs/architecture.md` and recording any
  guardrail or visual-baseline decision that deserves an ADR.
- `handoff` — if context fills again before Gate B is complete.
- `report` — if a reproducible toolchain bug blocks Gate B and needs an issue.
