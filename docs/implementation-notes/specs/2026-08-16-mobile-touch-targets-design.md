# Mobile Touch Targets Design

## Goal

Make the interactive controls in the Baku 2036 map reliably tappable on iPhone-sized screens without changing the desktop visual language or enlarging map artwork unnecessarily.

## Scope

- On touch-sized layouts through 760px, interactive controls expose at least a 44px rendered width and height where practical.
- Apply the target to search, language, map, layer, drawer, tool, story, and search-result controls.
- Preserve compact desktop controls and the existing 360px one-row map toolbar behavior.
- Add spacing so adjacent controls do not become one ambiguous hit region.
- Keep the visible map circles visually unchanged; this pass does not add a new marker interaction model.

## Interaction and accessibility

- Increase hit areas through padding/minimum dimensions, not larger text or icons.
- Keep visible focus outlines and keyboard activation intact.
- Keep controls inside the existing safe-area-aware mobile layout.
- Allow wrapped action groups where a 44px target would otherwise overflow a narrow viewport.

## Verification

- Add a Playwright regression at 390px that measures visible control bounding boxes and requires each selected control to be at least 44px in both dimensions.
- Exercise the layer menu so its hidden buttons are measured when open.
- Preserve existing 360px toolbar and one-page-scroll tests.
- Run the full browser suite, static mobile contracts, and whitespace checks before publishing.
