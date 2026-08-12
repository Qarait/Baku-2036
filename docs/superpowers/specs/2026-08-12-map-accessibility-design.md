# Baku-2036 Map Accessibility and Mobile Controls Design

## Goal

Improve the map experience on small touch screens and make the interactive map usable by keyboard and assistive technology without changing the investment data, visual language, or embedded base64 image.

## Approved scope

- Keep only zoom in, zoom out, and reset visible; do not add permanent directional pan buttons.
- Increase mobile zoom-control targets to at least 44 by 44 CSS pixels and keep them clear of the map content.
- Add arrow-key panning for the map when the map or one of its zones has focus.
- Make every investment-zone SVG group keyboard-focusable with `role="button"`, an accessible name, visible focus styling, and Enter/Space activation that calls the same `select(id,{spot:true})` path as a click.
- Keep proof badges out of the long main tab run unless they are explicitly made keyboard-accessible; the main requirement is that the 16 zones are usable.
- Add a skip link before the map that moves focus to the content after the map.
- Treat the zone detail bottom sheet as a dialog: move focus into it on open, trap focus while open, close with Escape, and return focus to the zone that opened it.
- Add `aria-pressed` to the heat and metro toggle chips and keep the values synchronized with their state.
- Prevent document-level `+`, `−`, and `0` shortcuts from firing while focus is inside an input, select, textarea, or contenteditable element. New keyboard handlers must respect `TOURING`.
- Add a debounced live-region announcement for discrete zoom actions only; wheel/pinch deltas must not announce continuously.
- Respect `prefers-reduced-motion` by removing or shortening map, tour, time-machine, spotlight, drawer, and focus-motion animations.
- Preserve drag, pinch, existing map behaviors, all data, and the embedded base64 image bytes exactly.

## Architecture

Use the existing single-file structure. Add semantic attributes during SVG zone construction, centralize keyboard target filtering and focus return around the existing panel functions, and expose arrow-key panning through the existing `VIEW` state and `applyView()` function. Keep the live region and skip link as small static DOM additions. Use CSS media queries and `prefers-reduced-motion` rather than introducing a framework or dependency.

## Verification

Use a failing static behavior test before editing, then run it after implementation. Use Playwright CLI for keyboard and mobile viewport checks, including zone focus/activation, input-safe shortcuts, 44px controls, dialog focus return, toggles, and no horizontal overflow. Verify the deployed HTML and the existing feature controls. Real iOS Safari verification remains a manual user check after deployment because no physical iOS Safari environment is available here.