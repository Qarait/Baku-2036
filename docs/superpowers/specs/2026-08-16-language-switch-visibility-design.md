# Language Switch Visibility Design

## Goal

Make English/Turkish switching available immediately on the shared page, regardless of whether the visitor has engaged with the map.

## Design

- Keep the language switch outside the quiet-controls visibility gate.
- Keep search, year, map toolbar, and legend behavior unchanged.
- Clicking either language still engages the page and updates the current URL hash, content, map labels, and document language.
- Preserve the active-language styling and both language directions.

## Verification

- Add an initial-state browser regression that switches EN → TR → EN before any other interaction.
- Run the combined Chromium/WebKit suite and the existing mobile contracts.
