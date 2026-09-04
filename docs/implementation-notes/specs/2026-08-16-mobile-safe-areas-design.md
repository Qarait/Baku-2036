# Mobile Safe Areas Design

## Goal

Keep the map and its controls clear of iPhone system cutouts, rounded corners, and the home indicator in portrait and landscape layouts.

## Scope

- Preserve the existing `viewport-fit=cover` declaration.
- Apply `env(safe-area-inset-top)` to the top bar and `env(safe-area-inset-left/right)` to edge-positioned map controls and cards.
- Apply `env(safe-area-inset-bottom)` consistently to map status, freshness/attribution content, story controls, and the mobile drawer.
- Use `max()` fallbacks so ordinary browsers and desktop layouts retain their current spacing.
- Keep the 360px toolbar and one-page mobile drawer behavior unchanged.

## Verification

- Extend the mobile contract to require top, left, right, and bottom safe-area references.
- Run the full Playwright suite, headed mobile checks, all static contracts, and whitespace validation.
- Publish only to preview; main/live remains unchanged.
