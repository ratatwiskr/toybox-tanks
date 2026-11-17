# Historical records

These files hold frozen evidence for completed, merged, closed, or superseded
work. They are **not** current instructions and are not read by default.

Authority, in order:

1. GitHub issues, pull requests, and check runs — live PR/CI/deployment state.
2. `docs/progress.md` — local branch snapshot, verification, blockers, next action.
3. `docs/architecture.md`, `AGENTS.md`, and `docs/adr/` — durable behavior and
   settled decisions.
4. This directory — why a past choice was made, its exact commands/CI result, and
   whether a closed proposal was already rejected.

Do not treat a historical record as an assignment, an open PR, or permission to
repeat completed work. If a decision here conflicts with `AGENTS.md`, an ADR, or
current code, the current authority wins; report the conflict instead of guessing.

## Retrieval

Git retains every earlier revision of the progress notes:

```sh
git log --follow -- docs/progress.md   # how the current-state file evolved
git show <sha>:docs/progress.md        # a specific past snapshot
git log --oneline --all -- <path>      # when a file changed
git show <sha> --stat                  # what a historical milestone contained
```

The archive below keeps the useful narrative in one place. It is not the only
copy, so do not add new work here: update `docs/progress.md` while work is active,
then move its detailed evidence here when the work merges or is superseded.

## Index

| File                                                                             | Covers                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [enemy-variety-2026-11.md](enemy-variety-2026-11.md)                             | Enemy kinds, mines, secondary weapon, touch secondary button, issue #38 campaign rooms 1–15 (PR #42). |
| [assets-and-audio-2026-11.md](assets-and-audio-2026-11.md)                       | Issue #24 adapter hardening and floor art (PR #40), audio port (PR #37).                              |
| [visual-and-presentation-2026-11.md](visual-and-presentation-2026-11.md)         | Issue #22 visual comparison workflow, independent tank body rotation (PR #31).                        |
| [merged-baselines-and-mobile-2026-11.md](merged-baselines-and-mobile-2026-11.md) | Map borders (PR #14), cork and Cork Keep (PR #19, not #15), mobile/tablet input (PR #17).             |
