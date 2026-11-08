# Perplexity ↔ OpenCode handoff convention

Owner preference recorded on 2026-11-08: persist self-contained handoffs in the repository on the relevant working branch. A chat attachment or PR description alone is not the handoff. The owner should be able to tell OpenCode: “Read `docs/<task>-opencode-handoff.md` and implement it.”

## Default workflow

1. Inspect the actual branch and relevant repository guidance. Distinguish agreed requirements, implemented code, tested evidence, and open decisions.
2. Write a task-specific `docs/<task>-opencode-handoff.md` on that branch. Do not overwrite canonical migration contracts or unrelated historical handoffs.
3. Include the goal, scope exclusions, settled behaviour, integration points, exact source checkpoint, existing work, local commands, acceptance cases, environment restrictions, and completion/handback requirements. Keep enough context that the agent does not need the chat or GitHub.
4. Record CI evidence against its exact source checkpoint; separate authored tests, local results, CI results, visual approval, and physical-device testing. A documentation commit or later source edit does not inherit an unqualified verification claim.
5. Persist the handoff through the normal reviewed/confirmed repository write process, then give the owner its branch and repository-relative path plus a short invocation prompt. Do not claim it is committed before the write succeeds.
6. If OpenCode cannot reach GitHub, the owner fetches/prepares the branch, worktree, or bundle. The agent checks local state and preserves changes; it does not repair credentials, bypass sandbox restrictions, or reconstruct missing source from prose.
7. During the local-agent implementation interval, avoid competing remote source edits. Resume remote work only after coordinating the handback.
8. OpenCode iterates locally and records exact commands, results, blockers, and remaining human checks. The handoff itself does not authorize installs, commits, pushes, merges, or changes to repository policy. Obtain any additional permission explicitly.

Update a task handoff when decisions materially change, without silently rewriting historical test evidence. Prefer one useful task document and existing progress notes over a chain of overlapping planning files.
