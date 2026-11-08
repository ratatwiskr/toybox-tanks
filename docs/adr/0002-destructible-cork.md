# ADR 0002: Destructible cork and a fourth campaign room

Date: 2026-11-08
Status: Owner-approved design; implementation and verification pending.

## Authority and branch

Related issues: #3, #5, #6, #7, #8, #9, #10, #11. Enemy research #12
remains separate. This record satisfies the contract-recording deliverable of
#7, but does not assert its verification criteria passed or close any issue.

The owner requested implementation and approved the decisions below in the
2026-11-08 conversation. The owner explicitly replaced the earlier demo-only
restriction in #7 and the roadmap comment with option B: append a dedicated
fourth campaign room using cork. The first three layouts and their order stay
unchanged. Campaign completion follows the fourth room; replay starts at room 1.

Work is stacked on `feature/auto-add-outer-solid-walls-to-maps`, not directly
on `main`. `feature/destructible-cork-blocks` was created at
`f9f736900aabdaf9f388f0ac29772b00cf685ea9`. Do not merge into main as part
of implementation. A stacked PR may target the border branch; retargeting or
rebasing after its merge is a separate operation.

## Gameplay contract

- `C` denotes an interior cork tile. The automatically generated outer border
  stays indestructible solid wall. Each cork cell has independent durability.
- A fresh cork tile requires exactly three qualifying shell contacts to remove.
- Intact cork blocks tanks, shells, and sentry line of sight. Destroyed cork is
  open floor for all three systems; damage does not shrink the collider.
- Player and enemy shells both damage cork and are consumed on qualifying
  contact. No friendly-fire or shell-shell collision rules change.
- Muzzle travel is swept, as before; contact in that 23 px path damages cork.
- A shell that already used its one solid-wall bounce still damages cork, then
  is consumed. Cork never reflects a shell or adds to the bounce count.
- Resolve the earliest swept contact against terrain and eligible tanks. Keep
  conservative ambiguous-corner handling: ambiguous cork/solid-wall contact
  removes the shell without decrementing cork durability.
- Preserve bounded projectile processing and existing deterministic shell order.
  Each qualifying contact decrements once. Destruction is immediate in world
  state; subsequent operations in that fixed step observe cleared floor. Do not
  reorder the simulation or introduce retroactive movement or targeting.
- Visual deterioration and disappearance are the cork-hit feedback. Do not add
  cork-hit events, sparks, particles, sounds, or damage numbers.
- Preserve ordinary solid-wall reflection, remaining travel, tank-hit behavior,
  sentry targeting/telegraph rules, shell caps, cooldowns, and outcome priority.
- Aim guides must stop at intact cork without displaying a reflected
  continuation. Cleared cork no longer blocks the guide.

## Map validation and reset

Keep the auto-border branch's fixed authored interior dimensions and all
existing dimension, symbol, spawn, sentry, and error-reporting checks.

Initial reachability treats intact cork as blocking, but an initially blocked
route is permitted. Post-destruction reachability treats cork as floor and
must reach every non-wall interior tile from player 1. This is a tile-topology
validation policy, not proof that a room is balanced or tactically solvable.

Store cork in explicit resettable world state, separate from permanent walls,
with stable cell identity, position, and remaining durability. Keep any explicit
destroyed flag consistent with zero remaining durability. Room creation, retry,
next-room loading, replay, and full reset must never retain old cork damage.
Pausing or rendering must not advance durability. Simulation stays DOM/Node-free.

The new fourth room uses the same map loader, validator, combat rules, and
progression path as existing rooms. It must let players observe all three
damage states, clear a route or sightline, and retain solid-wall bank-shot
opportunities. Its exact layout/name are implementation choices subject to
validation and playtesting, not preapproved balance or aesthetic acceptance.
Do not add a selector, editor, runtime map import, or a second campaign engine.

## Narrow asset integration decision

Use the crafted cork definitions in `toybox-assets.js` under:

```text
Perplexity-assets-w-rden-perks-und-etwa-cas-angriffe-zum-spiel-passen-aspekte+handoff/
```

Map remaining hits 3, 2, 1 to `block-cork-1`, `block-cork-2`,
`block-cork-3` respectively. Zero hits renders no cork or cork shadow.

The owner approved extracting these three definitions into typed presentation
data and adapting the art to the actual square tile footprint. Preserve the
source artwork's material, crack states, and attribution/provenance. Fit art
to gameplay geometry, never gameplay geometry to art. Damage changes art,
not the collision footprint. Keep the original supplied asset packs untouched.

Implement only the small cork adapter needed here, not the entire asset plan.
Bundle SVG markup as source data; preload/decode once into a bounded static
cache using embedded data URIs. No eval, asset globals, per-frame decoding,
runtime asset-file requests, CDN, or external resource dependency. Required
asset failure must produce a useful stable startup error, not invisible cover
or a silently invented replacement. Rendering reads world state only.

The unrelated floor, wall, vehicle, projectile, palette, and arena-framing
decisions in `docs/asset-integration-plan.md` remain deferred. This is explicit
approval of the cork-only integration approach, not of final screenshots.

## Delivery and evidence

Both the statically hosted build and the self-contained single HTML remain
required. The existing Vite configuration uses relative base paths and enables
`viteSingleFile()` in single mode. Static inspection supports this packaging
approach; only builds and browser execution prove the resulting artifacts work.

The inspected workflow deploys Pages only for main, after verification. Work
on this feature branch must not change deployment policy or publish over the
current game. Do not change workflows, dependencies, the lockfile, guardrails,
visual baselines, immutable HTML references, or repository settings for this task.

Relevant implementation modules are `src/sim/maps.ts`, `types.ts`, `world.ts`,
`collision.ts`, `combat.ts`, `src/render/renderer.ts`, the narrow cork asset
adapter, application startup, and the test bridge where necessary. Tests must
cover map/state, swept and muzzle contact, bounced shells, ambiguous contacts,
same-step ordering, movement, sight, aim guides, art mapping/loading, renderer
read-only behavior, all reset paths, and four-room completion/replay.

Run focused tests, `npm run verify:fast`, `npm run verify`,
`npm run test:browsers`, and the applicable hosted/file:// release checks
sequentially under `docs/verification.md`. Record tested SHA, environment,
commands, exit statuses, artifacts, and unverified criteria in
`docs/progress.md`. Do not report historical results as current results.

At contract preparation, only branch creation and source inspection were
performed. No gameplay or test code was changed and no Node, build, lint,
unit, browser, or release command was executed. The current session has no
Node/Playwright execution tool. All executable checks are NOT RUN; this is
not release evidence. Gate E, human visual acceptance, and physical gamepad
verification remain outstanding.
