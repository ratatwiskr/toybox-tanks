# Fullscreen visual coverage: deferred

Fullscreen catalogue scenes are currently deferred and are not registered in the
shared registry. Entering real fullscreen triggers the application's
focus/pause behaviour in the capture environment, and landscape-only touch
fullscreen needs a separate behaviour decision. The existing capture helper and
`#fullscreenBtn` remain available for when that decision is made; no windowed
substitute or CSS-only fake is used.

The application still exposes a real `#fullscreenBtn` and requests the Fullscreen
API. Any future fullscreen scene must click that real button and require
`document.fullscreenElement` to equal `#app`; it must not use CSS-only fullscreen,
viewport resizing, or windowed captures mislabeled as fullscreen.

Headless Chromium may deny the browser-level fullscreen request. In that case,
`capture:visual:baseline` exits with code 2 and reports `FULLSCREEN_UNSUPPORTED`,
while preserving the existing development checkpoint. This is an explicit
environment limitation, not a passing capture or automatic skip. A headed browser
environment may be needed for genuine fullscreen capture; do not weaken the
Fullscreen API assertion to make headless capture pass.

No fullscreen screenshots were generated or accepted. Re-enabling this coverage
requires an explicit behaviour decision and owner review.
