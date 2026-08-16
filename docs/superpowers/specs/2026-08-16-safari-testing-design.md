# Safari Testing Design

## Goal

Catch WebKit/Safari-specific regressions before preview promotion and define the remaining real-iPhone release check.

## Automated coverage

- Add a focused Playwright WebKit project rather than duplicating the full Chromium suite.
- Smoke the map/data load and browser-error path.
- Smoke the bilingual selected-drawer flow: collapse, reopen, language switch, and close.
- Smoke the 390px mobile layout for safe-area CSS, layer menu, 44px control geometry, and one-page drawer flow.
- Install WebKit in both CI workflows so the preview deployment gate includes it.

## Real-device boundary

Playwright WebKit is an early-warning engine check, not branded iOS Safari. One real iPhone check remains required for promotion and covers portrait, landscape, Safari browser chrome, Dynamic Island/home-indicator behavior, touch scrolling, map gestures, keyboard/search, and the deployed preview URL.

## Verification

- Run focused WebKit tests locally after installing the browser binary.
- Run the existing Chromium suite and all static contracts.
- Run CI workflow checks before preview promotion.
- Record that real-iPhone verification is pending until a physical device is exercised.
