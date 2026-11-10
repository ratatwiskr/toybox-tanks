# Fullscreen visual coverage: authored, pending execution

Adds desktop-fullscreen-gameplay and touch-fullscreen-gameplay to the shared
registry after owner push 2f28fc0. Both current catalogue capture and manual
comparison discover them. Each produces one full-application PNG: the toolbar,
HUD, compact layout and touch-pad arrangement are the subject. Arena/detail
crops are deliberately omitted because existing scenes cover those subjects.

Entry clicks the real Fullscreen button and requires document.fullscreenElement
to equal #app plus the Exit fullscreen button label. It does not fake the DOM
API, toggle a CSS class or resize the viewport as a fullscreen substitute.
Unsupported/denied fullscreen raises an explicit FULLSCREEN_UNSUPPORTED error
and does not produce a windowed image labeled fullscreen.

Desktop starts with touch capability disabled, co-op and the ordinary desktop
viewport; real fullscreen activates the application's compact HUD without
touch pads. Touch starts in landscape solo with real touch UI enabled.
Checks cover actual fullscreen viewport dimensions, app/HUD/button containment,
16:9 arena geometry and touch-pad separation/containment. Metadata retains
actual inner/screen dimensions and fullscreen element, not just the requested
windowed viewport. Fonts/render frames are awaited without fixed sleeps.

Browser tests cover both capture paths and real Exit fullscreen clicks. Exit
must restore the button, compact/noncompact mode, touch visibility and original
arena dimensions. A held keyboard movement command is sampled before entry
and exit, and must not remain active across either transition. Clock-controlled
simulation snapshots must not change while entering or exiting fullscreen.

```sh
PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright" ./node_modules/.bin/playwright test --project=chromium tests/e2e/fullscreen-visual-catalogue.spec.ts
TOYBOX_REVIEW_SCENES=desktop-fullscreen-gameplay,touch-fullscreen-gameplay npm run visual:compare
npm run visual:report -- --port 9324
```

Use installed tooling only and run browser suites sequentially. If the local
browser cannot enter genuine fullscreen, record that limitation and its error;
do not skip silently, weaken assertions or approve substitute screenshots.
Headed local Chromium can be investigated explicitly if headless fullscreen is
blocked, but its different capture environment must not be mislabeled.

No formatting, lint, compiler, browser or capture command has run in this API
session. Actual local execution and final-head verification remain pending.
No screenshots, references or appearance approval are supplied by this commit.
No gameplay/style/dependency/CI-policy change, merge or deployment is performed.
The existing menu-repeat investigation, reviewed reference promotion and
intentional-change/revert evidence remain separate acceptance requirements.
