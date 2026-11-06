# Toybox Tanks — progress

Updated: 2026-11-06  
Current gate: **A — inspect and baseline (complete; awaiting review)**  
Next gate: **B — toolchain, guardrails, and minimal executable skeleton (not started)**

## Task checklist

- [x] Read `docs/handoff.md`, `docs/kickoff.md`, `docs/session-handoff.md` completely.
- [x] Inspect the existing repository and preserve existing user changes.
- [x] Copy the source prototype byte-for-byte to `reference/toybox-tanks.original.html`.
- [x] Record and re-verify SHA-256 hashes.
- [x] Reproduce the prototype in Chromium through `file://` and record checks/state/errors.
- [x] Capture startup/menu, gameplay, and pause evidence.
- [x] Write `docs/baseline.md`.
- [x] Write `docs/backlog.md`.
- [x] Write root `AGENTS.md` from the handoff template, adapted to this repository.
- [x] Confirm no application source was changed.
- [ ] Gate A owner review.
- [ ] Gate B: toolchain, guardrails, minimal skeleton.
- [ ] Gate C: behavior-preserving simulation extraction.
- [ ] Gate D: adapters, rendering, UI, runtime, automation, releases.
- [ ] Gate E: harden and deliver.

## Changed files in this session

```text
new:      reference/toybox-tanks.original.html   (byte-identical copy of source prototype)
new:      docs/baseline.md
new:      docs/progress.md                       (this file)
new:      docs/backlog.md
new:      AGENTS.md
new:      docs/evidence/gate-a/01-menu.png
new:      docs/evidence/gate-a/02-menu-stage.png
new:      docs/evidence/gate-a/03-gameplay.png
new:      docs/evidence/gate-a/04-paused.png
new:      docs/evidence/gate-a/baseline-run.json
ignored:  .tmp/gate-a-baseline.mjs               (local diagnostic; not project source)
```

No changes were made to `package.json`, `package-lock.json`, `_start_opencode_with_nono.sh`,
`docs/handoff.md`, `docs/kickoff.md`, `docs/session-handoff.md`, the source prototype
`reference/toybox-tanks.html`, or any application/tooling source (none exists yet).
Document contents were only added; no existing document was rewritten.

`docs/session-handoff.md` was already untracked at the start of this session and its
contents were left untouched.

### External commit observed (not made by the agent)

During Gate A, at `2026-11-06 10:54:59 +0100`, commit `f2e81c2` ("Handoff to start
with opencode") appeared on `main`. The agent did not run `git add` or `git commit`.
The commit adds exactly:

```text
docs/session-handoff.md
reference/toybox-tanks.original.html
```

The branch moved from "ahead 1" to "ahead 2". `git show` and `git reflog` confirm the
commit author is `toast <29013910+ratatwiskr@users.noreply.github.com>` and the reflog
entry is a normal `commit:` entry. No auto-commit plugin was found under the OpenCode
config. The agent left the commit and history untouched, per the no-history-rewrite
rule. All Gate A documents created after that commit remain untracked and uncommitted.

## Commands run and exit statuses

| Command | Exit | Result |
|---|---|---|
| `git status --short --branch` | 0 | `main...origin/main [ahead 1]`; only `?? docs/session-handoff.md` before Gate A writes |
| `nono why --self --path .../docs/session-handoff.md --op read` | 0 | `ALLOWED` — harness denial notice was a known false positive |
| `sha256sum reference/toybox-tanks.html docs/handoff.md toybox-tanks-opencode-handoff.md` | 0 | Hashes matched the recorded baseline |
| `cp --preserve=timestamps ...` + `cmp` + `sha256sum` | 0 | Immutable copy created; byte-identical; hash unchanged |
| `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" node .tmp/gate-a-baseline.mjs` | 0 | 18/18 checks, no page/console errors, real input and pause paths verified |
| `nono why --self --path .../docs/evidence/gate-a/03-gameplay.png --op read` | 0 | `ALLOWED` — second harness denial notice was a false positive |
| `nono why --self --path /etc/magic --op read` | 0 | `DENIED` (irrelevant libmagic probe by `file`; evidence files were readable) |
| `git log --oneline --decorate -6` + `git reflog -8` | 0 | Confirmed external commit `f2e81c2`; no agent commit exists |

Gate A did not run typecheck, lint, unit tests, builds, or browser suites because no
project source or toolchain scripts exist yet. These are Gate B deliverables and are
not reported as passed.

## Known blockers and limitations

1. **Firefox locally blocked.** Launch fails before page launch with
   `Sandbox: CanCreateUserNamespace() unshare(CLONE_NEWPID): EPERM` /
   `Could not find profile folder.` This is a nono process-isolation limitation.
   Chromium works; WebKit is reported working but was not part of this baseline.
   Owner-side action is needed if local Firefox is required.
2. **Launcher browser path mismatch.** `_start_opencode_with_nono.sh` points
   `PLAYWRIGHT_BROWSERS_PATH` at a non-existent directory. Per owner decision the
   launcher stays unchanged; use
   `PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"` for local runs.
3. **No installs allowed.** Dependencies and browsers are owner-installed. Do not run
   `npm install`/`npm ci`, change the lockfile, or download browsers.
4. **Visual review pending.** Screenshots were captured, but this model cannot view
   images. No aesthetic or baseline approval is claimed.
5. **Physical input untested.** Keyboard tests are synthetic Playwright events; no
   physical controller or cross-device certification is claimed.

## Documented discrepancies

- `docs/kickoff.md` refers to `docs/migration-handoff.md`. Per the owner decision, the
  canonical handoff remains `docs/handoff.md`; `docs/migration-handoff.md` must not be
  created. The root `toybox-tanks-opencode-handoff.md` is the byte-identical archive.
- The session handoff recorded a clean tree with one local commit ahead; at Gate A start
  `docs/session-handoff.md` was untracked. It was preserved untouched.

## Next action

Report Gate A to the owner with the evidence above. Wait for review/approval before
starting Gate B. Gate B must add the toolchain, strict configs, positive/negative
guardrail fixtures, a real browser smoke check, scripts, hooks, and CI without
installing or upgrading packages and without committing.
