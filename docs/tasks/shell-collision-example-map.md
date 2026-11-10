# Projectile neutralization: example map

## Status

Regression-first plan for issue #28 and draft PR #33. New tests have not been executed in the remote API environment. No passing checks or red/green cycle are claimed. Existing tests and guardrails are not changed by this commit.

## Rules and examples

| Rule                                         | Examples                                                                                              | Layer                                    | Status                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| Only contact inside the current step counts  | 100 px separation, real shell speeds, horizontal/vertical/diagonal/reflected orientation              | Resolver unit                            | Added in shell-timing-regression.test.ts                               |
| Ownership never exempts a pair               | Same owner in the timing and contact fixtures; existing different-owner/faction cases                 | Resolver unit                            | Added/existing; execution pending                                      |
| One existing puffy cloud at first contact    | 8 px head-on separation; cloud midpoint x=104; no shot/bounce increment                               | Resolver unit                            | Added; execution pending                                               |
| Player firing does not cancel enemy charging | Facing tanks 600 px apart; 1, 2, 10 ticks before firing; actual stepWorld                             | Simulation integration                   | Added; execution pending                                               |
| Earliest contact wins                        | Shell before/after tank, wall, cork; exact ties; corner ambiguity                                     | Resolver + simulation                    | Pending expanded tests                                                 |
| Reflection preserves collision detection     | Shell contact before bounce and during reflected remainder; second wall termination                   | Simulation integration                   | Pending                                                                |
| Temporal crossing is not geometric crossing  | Crossing at different times; parallel and separating paths; catch-up                                  | Resolver unit                            | Initial different-time example added; expansion pending                |
| Radius boundary is explicit                  | Tangent; 6 px minus/plus tolerance; overlap at t=0; zero relative velocity                            | Geometry unit                            | Pending                                                                |
| Pair selection is stable                     | Three-way ties; canonical pair IDs; permutations of arrays; independent repeated worlds               | Resolver + simulation                    | Pending expanded tests                                                 |
| Cork updates remain visible within a tick    | Four non-overlapping lanes across one cork face: first three consumed, fourth passes                  | Simulation integration                   | Restore same-tick coverage; do not substitute sequential-only coverage |
| Muzzle cannot skip earlier contacts          | Existing projectile near muzzle; terrain before/after projectile; close tank contact; order of firing | Simulation integration                   | Pending; removal of muzzle checks is not proof of correctness          |
| Lifecycle remains safe                       | Paused step; reset/retry; room outcome; simultaneous final deaths                                     | Simulation + browser                     | Existing tests plus targeted additions pending                         |
| Puffy cloud is actually readable             | Capture contact, middle and expiry; keyboard/realtime smoke                                           | Renderer + browser + human visual review | Pending; no baseline approval                                          |

## Implementation constraints

Use normalized relative displacement over dt and solve earliest circle-circle time of impact, not closest approach. Compare all event times in the same units. Keep processing bounded, retain conservative terrain corner handling, and recompute after terrain changes. Do not claim full array-order independence for legacy same-normal terrain tie rules. Define projectile pair ties by canonical IDs. Preserve same-owner collision and no tank friendly fire.

Integration tests must call stepWorld, not copy the projectile update loop. Fixtures must keep tanks outside unintended muzzle-hit range and use unique shell IDs. Record charge, cooldown, alive/HP, shots, nextShell, projectile state, effects and events when reducing a telegraph reproduction.

## Verification gates

Run focused tests first and record actual failures before implementation. Then run verify:fast, verify and test:browsers per docs/verification.md. API commits do not execute local Husky hooks. Do not weaken lint, formatting, types, coverage, dependencies, CI or screenshots. Browser suites run sequentially; hardware and aesthetic approval remain separate.
