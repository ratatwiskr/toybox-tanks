# Gate E handoff — harden and deliver

Updated: 2026-11-07  
Status: **Gate D complete and pushed; Gate E not started.**  
Read with: `docs/progress.md`, `docs/verification.md`, `docs/asset-integration-plan.md`.

This handoff is for the human owner and the next agent. It lists only work that is
actually blocked on a decision, an authorization, or an environment change. Do not mark a
gate complete from this document alone; re-run the commands and record new evidence.

## State at handoff

- Gate D is committed as `2cfbba8 complete gate d` and pushed to `origin/main`.
- Local full gate passed on that commit: 78/78 unit/architecture tests, coverage
  96.07/93.36/100/95.93, Chromium 6/6, WebKit 6/6, candidate capture 1/1, release 4/4.
- Production bundles contain zero `__TOYBOX_TEST__` occurrences; the test build contains
  one.
- Nine visual candidates exist locally in `test-results/visual-candidates/`. They are
  **not** approved baselines and are **not** committed (the directory is ignored).
- Firefox cannot launch locally inside the nono sandbox. It is exercised by CI, not by a
  local pass.
- Drafted visual asset packs are committed under
  `Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte/`.
  Nothing from them is integrated. See `docs/asset-integration-plan.md`.

## Human decisions needed

| #   | Decision                                     | Why it is blocked                                                                                               | What to do                                                                                                                                                       |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Approve or reject the nine visual candidates | Baselines require human/vision review; the agent must not self-approve aesthetics.                              | Open `test-results/visual-candidates/` and review the scenes listed below. Reply with approve/reject per scene and notes.                                        |
| 2   | Adopt a visual-baseline policy               | A comparison suite can only exist after approval.                                                               | Choose **A**: commit reviewed baselines and run `toHaveScreenshot` comparisons, or **B**: keep candidate capture only.                                           |
| 3   | Run clean-install verification               | Prior instructions forbade installs; the agent must not run `npm ci` or download browsers.                      | In a fresh clone run `npm ci`, `npm run verify`, and `npm run test:browsers` (or explicitly authorize the agent and relax the no-install rule for that task).    |
| 4   | Configure branch protection                  | Repository settings need owner access. Unauthenticated API reads return `401`, so the current state is unknown. | In GitHub: Settings → Branches → require the `verify` status check and review before merge. Do not claim it is enabled without checking.                         |
| 5   | Decide the next feature task                 | Gate E delivery and asset integration are alternatives, not one task.                                           | Say either “finish Gate E delivery” or “start asset integration phase X”. The asset plan is already written and needs no further design work to begin phase 0/1. |
| 6   | Optional: run Firefox outside nono           | Local Firefox is blocked before launch by `unshare(CLONE_NEWPID): EPERM`.                                       | Run the browser suite on the host or rely on CI. Never report a local Firefox pass without evidence.                                                             |

## Step-by-step human checklist

### 1. Confirm CI for the Gate D push

The workflow is `.github/workflows/verify.yml`: `npm ci`, install Chromium/Firefox/WebKit,
`npm run verify`, `npm run test:browsers`, then upload artifacts.

1. Open the Actions run for the pushed commit (or
   `https://github.com/ratatwiskr/toybox-tanks/actions`).
2. Expect both `Full verification` and `Cross-browser release smoke` to pass. This is the
   first run that covers the Gate D bridge, gamepad spec, and output-directory changes.
3. If a job fails, download the `playwright-artifacts` artifact and preserve the exact
   failing command and trace. Treat a sandbox/browser-install failure as an environment
   blocker, not a pass.

### 2. Review the visual candidates

Open these files from the repository root:

```text
test-results/visual-candidates/01-menu.png
test-results/visual-candidates/02-gameplay.png
test-results/visual-candidates/03-active-shot.png
test-results/visual-candidates/04-disabled-player.png
test-results/visual-candidates/05-paused.png
test-results/visual-candidates/06-cleared.png
test-results/visual-candidates/07-defeat.png
test-results/visual-candidates/08-completed.png
test-results/visual-candidates/09-resized-gameplay.png
```

For each scene, check at minimum: readable tanks vs. floor/blocks, distinct blue/orange,
clear aim and bounce guide, legible shells and effects, correct overlay copy, no clipping
or unexpected letterboxing, and no visual regressions from the prototype.

Record the outcome in `docs/progress.md` (or a new ADR):

- reviewer and date;
- approved scenes and any conditions;
- rejected scenes with concrete reasons;
- whether the visual gate is now **approved** or still **pending**.

Approval by silence does not count. Do not commit the PNGs as baselines unless that is the
chosen policy.

### 3. Choose the baseline policy after approval

- **Option A (recommended once approved):** add reviewed baselines, switch
  `tests/visual/` from candidate capture to `toHaveScreenshot`, document tolerances and
  the update procedure, and commit the baselines in a dedicated reviewable change.
- **Option B:** keep candidate capture only and leave the visual gate explicitly pending.
  This is honest but not a regression gate.

Either way, update `docs/adr/0001-visual-gate-pending.md` or supersede it with a new ADR.

### 4. Clean-install verification

The current evidence uses the existing `node_modules`. To prove the lockfile is complete:

```sh
git clone https://github.com/ratatwiskr/toybox-tanks.git /tmp/toybox-clean
cd /tmp/toybox-clean
npm ci
npx playwright install --with-deps chromium firefox webkit   # CI already does this
npm run verify
npm run test:browsers
```

If this is run locally outside nono, record the OS, Node/npm versions, and results. If it
cannot be run, record the exact blocker instead of inferring success.

### 5. Branch protection

Required status checks and review rules are remote settings. The workflow file alone does
not enable them. After configuring, verify from the repository settings page and record
the result honestly. The agent must not change remote settings without explicit approval.

### 6. Choose the next task

- **Gate E delivery:** finish the checklist above, then produce the final delivery report
  with exact commands, CI links, screenshots/artifacts, and remaining non-claims.
- **Asset integration:** follow `docs/asset-integration-plan.md`. Phase 0 is an inventory
  and decision pass, not a code change. No asset may be wired into gameplay before the
  plan’s approval gates are met.

## Gate D verification snapshot

All runs were from the repository root with
`PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"` and browser suites run
sequentially.

| Command                         | Result                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run verify`                | Pass: format, lint, typecheck, coverage, Chromium e2e, candidate capture, release. |
| Unit/architecture               | 78/78 pass, 10 files.                                                              |
| Coverage                        | 96.07 statements / 93.36 branches / 100 functions / 95.93 lines.                   |
| Chromium e2e                    | 6/6 pass.                                                                          |
| WebKit e2e                      | 6/6 pass.                                                                          |
| Visual                          | 1/1 candidate capture, nine unapproved PNGs.                                       |
| Release                         | 4/4 pass (hosted + single-file, normal smoke + bridge absence).                    |
| Bridge isolation                | 0 occurrences in `dist/` and `dist-single/`; 1 in `dist-test/`.                    |
| `npm run test:browsers` locally | Not run: Firefox blocked by nono before launch.                                    |

## Known limitations and non-claims

- No local Firefox pass. CI is authoritative for Firefox.
- Automated WebKit is not physical Safari/iOS verification.
- Synthetic gamepad tests are not physical controller verification.
- No visual baseline is approved; candidate capture is not a regression gate.
- No branch protection is claimed; the agent cannot read or change it.
- The visual asset packs are source material only. No asset is loaded or drawn by the
  game today.

## Instructions for the next agent

1. Read `AGENTS.md`, `docs/progress.md`, `docs/verification.md`, and
   `docs/asset-integration-plan.md` before editing.
2. Do not commit, push, change remotes, or alter branch protection without explicit
   authorization. The Gate D push was authorized for that task only.
3. Do not run installs, package updates, or browser downloads unless the owner explicitly
   authorizes that specific check.
4. Do not approve visual baselines, weaken tests, or claim a browser/controller pass
   without evidence.
5. Before any asset work, complete the plan’s phase 0 inventory and report conflicts
   between the asset handoff and the actual source. The asset pack’s own documents warn
   that they were written without inspecting this repository.
6. Start with the smallest presentation-only change and keep `sim/` untouched.

## References

- Migration contract: `docs/handoff.md`
- Authoritative state: `docs/progress.md`
- Verification policy: `docs/verification.md`
- Visual gate ADR: `docs/adr/0001-visual-gate-pending.md`
- Asset integration plan: `docs/asset-integration-plan.md`
- Asset handoff pack:
  `Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte+handoff/`
