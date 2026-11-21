export const REVIEW_BRIEF = `# Toybox Tanks — agent review context

Toybox Tanks is a small browser-based couch-co-op tank game. Local two-player
cooperation is primary; solo practice is also supported. The game favors
readable one-bounce combat, forgiving recovery, toy-like presentation, and
small testable systems over extra complexity.

## Non-negotiables

- Preserve local two-player co-op; solo has exactly one actual player.
- Preserve free 2D movement, normalized diagonals, and independent turret aim.
- Player shells hit enemies only; enemy shells hit players only. No friendly fire.
- Ordinary shells receive one permanent-wall bounce; the next contact removes them.
- Preserve fixed-step simulation, explicit world state, and bounded catch-up work.
- Preserve pause, focus-loss handling, retry, room transitions, and complete reset.
- Preserve map validation and safe error handling.
- Do not propose an engine, framework, ECS, DI, networking, or speculative
  infrastructure migration.
- Treat gameplay-feel changes as explicit design decisions, not incidental fixes.

## Architecture

- Simulation is DOM-free and receives time and player commands as input.
- Input adapters emit commands; rendering reads state; application code orchestrates.
- UI must not contain a second combat or progression implementation.
- Maps and configuration are data-driven and validated.
- IDs, timers, effects, and randomness belong to resettable world state.

## Embedded source policy

The source files embedded in this artifact are a build-time snapshot. They are
useful for implementation review, but they do not prove current repository,
branch, pull-request, CI, or deployment state.

Bundled JavaScript is not a substitute for the original TypeScript. Prefer the
embedded source excerpts for architecture and implementation review; use the
running game for interaction, readability, pacing, and recovery observations.
`;

export const REVIEW_PROMPTS: Record<string, string> = {
  menu: `Review menu, level selection, onboarding, HUD, pause, defeat, completion,
and replay flows. Identify only issues that reduce comprehension, accessibility,
or recovery from mistakes. Propose the smallest change for each issue. Do not
propose a visual redesign without explaining the readability problem it solves.`,
  performance: `Review performance and scaling using the runtime diagnostics and embedded
sources. Distinguish measured bottlenecks from speculative scaling concerns.
For each proposal, identify the affected code path, expected effect, risk to
deterministic simulation or visuals, and a concrete regression test. Do not
recommend caching, workers, or architectural changes without a measured need.`,
  enemies: `Review enemy behavior, encounter pacing, map readability, cover use, and
cooperation. Existing turrets track visible living players, rotate gradually,
telegraph shots, fire only with line of sight, and do not predict bounce shots
or shoot through walls. For each enemy proposal, specify its visible telegraph,
player counterplay, cooperative decision, effect on one-bounce shells, map
requirements, and validation plan.`,
  recovery: `Review pause, focus loss, hidden tabs, retry, room transition, completion,
replay, and full reset. Identify only issues that can leave stale input, stale
effects, incorrect outcomes, or confusing recovery. Preserve the requirement
that a restart resets world and input-adapter state completely.`,
};

export const REVIEW_SCOPES = [
  'Menu and onboarding',
  'Performance and scaling',
  'Enemies and maps',
  'Reset and recovery',
  'Other',
] as const;

export type ReviewScope = (typeof REVIEW_SCOPES)[number];
