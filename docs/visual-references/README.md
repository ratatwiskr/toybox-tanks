# Visual references: inactive

This directory is reserved for owner-approved regression references, but the
current development workflow does not use them. Approval scripts were removed
from `package.json`; `tests/visual/review.approve.ts` and
`tests/visual/review-promotion.ts` remain historical code with their unit tests,
but they are not part of the normal procedure. Formal reference governance and a
mandatory visual gate are deferred.

Use the three current commands instead:

```sh
npm run capture:visual:baseline
npm run test:visual:compare
npm run test:visual:report
```

`capture:visual:baseline` replaces the overwriteable development checkpoint in
`docs/visual-catalogue/current/` only after a complete successful capture.
`test:visual:compare` captures fresh actuals and compares them against that
checkpoint without changing it. Neither command creates, replaces or deletes
owner-approved references. See `docs/development-workflow.md` for review,
determinism, failure and recovery details.

No reference PNGs or approval metadata exist here. The 2026-11-12 checkpoint
recapture created development evidence only and did not approve aesthetics.
