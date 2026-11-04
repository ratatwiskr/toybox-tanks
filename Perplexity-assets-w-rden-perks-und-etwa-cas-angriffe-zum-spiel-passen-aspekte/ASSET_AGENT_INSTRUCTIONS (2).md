# Agent Instructions — Toybox Tanks Assets

## Mission

Perform small, reviewable visual changes to a small browser game. Do not build a new engine, framework, editor or generalized asset system.

## Authority and inspection

1. Follow explicit current user decisions and existing repository instructions.
2. Use the original HTML prototype for exact existing behavior, constants and collision corner cases.
3. Use the actual supplied asset source for its APIs, schemas and art coordinates.
4. Use this handoff for integration intent and open decisions.
5. Treat preview pictures as illustrations, never authoritative map or collision data.

Inspect the original renderer, simulation, map loader, input adapters, application lifecycle and build outputs. Read actual JavaScript/JSON and package README files. The vehicle study was generated in different revisions; filenames alone do not identify its schema. Record missing files and uncertainties instead of guessing.

Before editing, report baseline checks and a minimal plan. Do not claim to have inspected or tested anything you have not actually inspected or tested.

## Preserve existing behavior

A rendering-only integration must preserve:

- Fixed logical arena and map dimensions, existing text-grid loading and validation.
- Movement, normalized diagonals, independent turret aiming, cooldowns and active-shot limits.
- Circle-based tank collision, wall sliding, and tanks not blocking or pushing one another.
- Player shots hitting enemies only; enemy shots hitting players only; no friendly fire and no projectile–projectile collision.
- Normal shots having exactly one wall bounce, then removal on the next wall contact.
- Earliest impact, remaining travel after reflection, muzzle-path checks and original conservative corner handling.
- Original contact behavior for temporarily invulnerable tanks.
- Health, disabled-player visibility, room restoration, defeat/retry and completion/replay.
- Defeat priority when the last player and last enemy die simultaneously.
- Single outcome resolution, combat termination and projectile clearing.
- Pause, focus/tab-loss behavior, held-input clearing and complete gameplay reset.
- Existing keyboard controls and any already supported input adapters.

Art must fit authoritative geometry. Do not change tank radius, wall bounds, muzzle distance or arena size just to make an SVG look correct. Report mismatches and adapt rendering or request a deliberate design decision.

## Architecture

Simulation contains no image objects, SVG strings, DOM, Canvas, device polling or loading APIs. Rendering reads gameplay state and must not advance it. Resource caches belong to presentation/application code.

Load/decode assets before gameplay. Do not decode SVG, allocate images or rasterize a new whole-pose sprite every frame. Prefer cached body/weapon layers for rotation. Keep adapters small and explicit.

Static image caches may survive retries. Entity-linked visual state must not leak across worlds or reused IDs. New animation state must not decide hits, targeting, cooldowns or outcomes.

## Scope gates

Available art does not prove available gameplay. Keep catapults, moving enemy tanks, chick decoys and cork destruction in a visual sandbox unless implementation is separately authorized. Selecting a damage frame is not implementing destructible terrain.

Do not add a loadout system, progression, new AI, physics, navigation or damage rules as part of an artwork integration.

## Platform and packaging

Retain both static hosting and a self-contained single-HTML build playable through file:// without external resources. Preserve existing logical coordinates, aspect ratio, letterboxing and DPR handling. Wide screens must not expose extra playable area.

Keep SVGs authored, trusted and self-contained: no external fonts, linked images, remote styles or scripts. Missing/decode failures need stable startup errors, including first launch. Do not rely on runtime fetch calls in the single-HTML build.

## Evidence

Use the validation checklist. Distinguish PASS, FAIL, NOT RUN and BLOCKED. XML parsing, Node tests and PNG rendering are not browser, real-input, gamepad-hardware or Safari/iOS compatibility tests.

Do not weaken checks to make changes pass. Avoid unrelated cleanup. At each step report changed files, preserved contracts, evidence, limitations and decisions deferred.
