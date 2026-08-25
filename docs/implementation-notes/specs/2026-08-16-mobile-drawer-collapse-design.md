# Mobile Map Identification Drawer Collapse Design

## Goal

Make the selected-place “Map identification” drawer optional on iPhone without losing the current selection or language state.

## Approved behavior

- When a place is selected, the drawer shows localized Collapse and Close actions.
- Collapse hides the detailed metrics and evidence content while preserving the selected place, year, and map state.
- The collapsed drawer remains as a compact bar with the selected place name and a localized Show details action.
- Show details restores the full drawer without re-identifying the place or changing the year.
- Close clears the selection and restores the existing empty “Map identification” panel.
- English and Turkish labels come from the existing language copy path.
- Desktop keeps the current expanded drawer layout; the same actions remain available for consistent keyboard behavior.

## Accessibility and mobile constraints

- The collapsed and expanded controls are real buttons with localized visible labels.
- The drawer remains reachable by keyboard and keeps its existing `aria-labelledby` relationship.
- Mobile uses normal page flow for the drawer; no nested scroll container is added.
- The compact state must not cover the map’s Layers control or prevent map interaction outside the compact bar.

## Verification

- Add a browser regression test that selects a deep-linked zone, collapses the drawer, verifies the compact state and preserved selection, expands it, then closes it.
- Run the focused regression, the full Playwright suite, the four static contracts, and `git diff --check`.
