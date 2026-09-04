# Baku atlas mobile scrolling design

## Goal

Make the selected district and investment-spot details comfortable to read and scroll on an iPhone. The map should remain easy to use, the page should have one natural scroll, and Safari's bottom toolbar must not hide the end of the checklist.

## Problem

The mobile layout currently keeps the map at `100vh` and pins the selected detail panel to the map bottom with its own `max-height` and `overflow: auto`. This creates nested scrolling. iOS Safari's changing browser chrome can also place the panel's lower edge below the visible viewport, producing the dead-looking space and incomplete bottom scroll shown in the supplied screenshots.

## Chosen design

- Keep the desktop overlay layout unchanged.
- Put the map, toolbar, legend, status, attribution, and freshness note in a bounded map stage.
- Keep the selected detail panel as a sibling of that stage inside the map section.
- On mobile, give the map stage a stable, bounded height using the small viewport unit with a safe fallback.
- On mobile, make the detail panel part of normal document flow with no inner height limit or inner scrollbar.
- Add bottom padding using the device safe-area inset so the final checklist and actions remain reachable above Safari controls.
- Preserve all existing map interactions, translations, JSON content, deep links, and desktop styling.

## Alternatives considered

1. Adjust only `100vh` and panel padding. This is small, but keeps nested scrolling and can still feel awkward.
2. Replace the panel with a full-screen modal. This could feel polished, but hides the map context and adds interaction complexity.
3. Use one normal page scroll below a bounded map stage. This is the chosen option because it matches how non-technical phone users already expect a long page to behave.

## Verification

- Add a mobile Playwright regression that selects a zone at a 360px viewport and confirms the detail panel is in the page flow, the document has one usable scroll path, and the bottom checklist/actions can be reached.
- Preserve the existing 12-test suite and run it in full.
- Inspect the preview at iPhone-sized dimensions for map controls, circle taps, language switching, deep links, and the final checklist.
- Real iPhone Safari confirmation remains a human check: pinch/drag, toolbar overlap, and the feel of one-finger scrolling.
