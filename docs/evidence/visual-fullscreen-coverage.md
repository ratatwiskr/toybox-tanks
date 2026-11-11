# Fullscreen visual coverage: real control, environment-dependent capture

The application exposes a real `#fullscreenBtn` and requests the Fullscreen API.
The desktop and touch fullscreen scenes remain registered. They click that real
button and require `document.fullscreenElement` to equal `#app`; they do not use
CSS-only fullscreen, viewport resizing, or windowed captures mislabeled as
fullscreen.

Headless Chromium may deny the browser-level fullscreen request. In that case,
`capture:visual:baseline` exits with code 2 and reports `FULLSCREEN_UNSUPPORTED`,
while preserving the existing development checkpoint. This is an explicit
environment limitation, not a passing capture or automatic skip. A headed browser
environment may be needed for genuine fullscreen capture; do not weaken the
Fullscreen API assertion to make headless capture pass.

No screenshots were generated or accepted by this correction. Actual local
verification remains pending.
