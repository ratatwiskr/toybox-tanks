# ADR 0002: Destructible cork and a fourth campaign room

Date: 2026-11-08
Status: Accepted; procedural rendering decision supersedes the original SVG plan.

## Decision and scope

Add destructible cork and append Cork Keep as the fourth campaign room. Preserve
the original three room layouts and order. Campaign completion follows the fourth
room; replay starts at the first. This is an intentional gameplay extension, not
a behavior-preserving change to the original prototype.

Related issues: #3, #5, #6, #7, #8, #9, #10, #11. Enemy research #12 remains
separate. This record does not automatically close any issue.

## Gameplay contract

- `C` denotes an interior cork tile. The automatic outer border remains solid,
  indestructible wall. Each cork cell has independent three-hit durability.
- Intact cork blocks tanks, shells, sentry sight, and aim guides. Damage does not
  shrink its collider. Destroyed cork is open floor for all of these systems.
- Player and enemy shells both damage cork and are consumed on qualifying
  contact. Cork never reflects shells. Already-bounced shells still damage cork.
- Sweep muzzle travel and the complete projectile path. Resolve earliest terrain
  or eligible tank contact; preserve terrain priority at exact tank/terrain ties.
- Preserve conservative ambiguous-contact termination. Ambiguous cork contacts
  consume the shell without damage. Coplanar cork seams retain stable cell order.
- Each qualifying contact decrements durability once. Destruction is immediate;
  subsequent operations in that simulation step observe the cleared terrain.
  Preserve bounded processing and deterministic operation order.
- Cork deterioration and disappearance provide hit feedback. No new cork-hit
  particles, sound, damage numbers, or feedback events are required.
- Preserve solid-wall reflection, remaining travel, tank-hit behavior, targeting
  and telegraph rules, shell limits, cooldowns, no friendly fire, and defeat
  priority. Aim guides stop at intact cork without a reflected continuation.

## Map validation and reset

Keep fixed interior dimensions and existing symbol, spawn, enemy-count, and
helpful error checks. Initial reachability treats intact cork as blocking and is
informational: destruction may be required. Acceptance requires every non-wall
interior tile to be reachable when cork is treated as cleared floor. This is
tile-topology validation, not proof of balance or tactical solvability.

Cork belongs to explicit world state, separate from permanent walls, with stable
cell identity, position, remaining durability, and a consistent destroyed flag.
Room creation, retry, room transitions, replay, and full reset must not retain
previous cork damage. Pause and rendering must not advance durability.

## Presentation decision

Retain procedural Canvas cork rendering in `src/render/renderer.ts`. The owner
chose this approach after the original SVG integration proposal. This section
supersedes that proposal; agents must not implement an SVG adapter as unfinished
work for this feature.

- Three remaining hits: intact cork. Two: cracked. One: heavily cracked.
- Zero remaining hits or destroyed cork: no cork and no cork shadow.
- Rendering reads world state only. Damage artwork does not change collision
  geometry. Keep crack/chip paths within the cork face and initialize outline
  widths independently of previously rendered tiles.
- The supplied `block-cork-1..3` artwork remains unintegrated reference material.
  Keep original asset packs untouched. Broader asset integration remains a
  separate decision under `docs/asset-integration-plan.md`.

## Acceptance and evidence

On 2026-11-08 the owner reported that cork playtesting in the VS Code internal
browser worked well. This is owner-reported playtest evidence, not a claim that
all damage states, transitions, release formats, browsers, or devices were tested.

The owner explicitly deferred visual regression and comprehensive visual
coverage of cork states to a separate issue. Those are not unfinished
implementation tasks for the cork feature. Do not invent an issue number or
automatically approve screenshot baselines.

At inspected PR #15 head `4ea53013cfe5a2d632dc3198dd88e0f9cb3e0032`, GitHub reported
the `verify` job successful:
https://github.com/ratatwiskr/toybox-tanks/actions/runs/42470914415

This is historical evidence for that revision, not a pass for later documentation
changes or the reconstructed branch. Require fresh CI for the final revision.
Current checks and evidence belong in `docs/progress.md`; this ADR records the
decision, not an active implementation handoff or a declaration of Gate E completion.

## Delivery constraints

Preserve static hosting and the self-contained single-HTML `file://` release.
Keep simulation DOM/Node-free. Do not change CI, dependencies, the lockfile,
immutable prototype references, visual-baseline policy, or deployment settings
as part of branch reconstruction.

PR #15 was developed on PR #14. After #14's squash merge as `d5aa53f`, the owner
approved reconstruction of the reviewed cork changes on a new main-based branch.
The original feature branch is preserved. This record does not authorize merging
or deployment. Physical gamepad and real Safari/iOS compatibility remain separate
from synthetic gamepad and automated WebKit evidence.
