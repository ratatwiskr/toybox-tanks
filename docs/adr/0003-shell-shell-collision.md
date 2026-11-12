# ADR 0003: Shell-shell collision neutralizes both projectiles

## Status

Accepted; shell collision was merged in PR 33 at cb50b79. This documentation
correction does not establish fresh verification or visual approval.

## Decision and current implementation

Any two live shells that touch during the current fixed step are neutralized,
regardless of owner or faction, including same-owner pairs. Contact uses the
earliest circle intersection under normalized relative displacement within
that step, not a future closest-approach estimate. The contact radius is
`2 * CONFIG.shellRadius` (6 logical pixels at current defaults).

Both shells are marked dead. One existing puffy `poof` effect is emitted at
the contact midpoint, and the event log records `Shells collided`. The earlier
`spark` wording in this ADR was stale; it is not the current feedback contract.
Wall-bounce sparks remain separate.

Candidate contacts are ordered by contact time and canonical shell IDs, with
each shell resolving at most once. Earlier terrain/tank contact, including
conservative near-ties, takes priority over a later shell-shell contact.

The normal 23-pixel muzzle sweep still handles terrain/tank travel through
advanceShell. The separate muzzle-shell detector was removed after premature
neutralization was observed. Shell-shell detection belongs to
resolveShellCollisions during world stepping; do not describe the removed
muzzle detector as active or restore it through visual-test setup.

## Limits and verification

Reflected path remainders are not chained into the same step's pair-contact
search. Dynamic-terrain event ordering, reflected remainder and muzzle
interaction examples remain separate behavioral verification work; this ADR
does not certify those cases or expand the visual slice into changing them.

Keep shell collision geometry, owner/faction pairings, timing, near-miss and
ordering tests independent of screenshots. The new head-on visual sequence
uses actual shared world stepping and samples before/contact/aged/cleared
states. Its images are candidates until explicit owner review and promotion.

No local formatter, compiler, unit, browser or release check was executed by
this API-authored documentation/fixture change. Record actual final-head
commands, exits, source context, environment and artifacts in progress evidence.
