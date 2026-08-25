# Optional 3D Baku Map Design

## Goal

Add an optional, polished 3D view to the Baku/Absheron investment map without changing the default 2D analysis view or weakening the accuracy and readability of geographic investment overlays.

## User experience

- The map opens in the existing top-down 2D mode.
- A compact bilingual toggle switches between `3D view` / `2D view` in English and `3B görünüm` / `2B görünüm` in Turkish.
- 3D mode uses the existing local vector-tile `buildings` layer, a moderate camera pitch, and a small bearing adjustment to create depth without turning the investment map into a game-like scene.
- 2D mode restores zero pitch and zero bearing.
- Zone circles, labels, heat, metro lines/stations, event diamonds, spotlight lines/chips, accessible zone buttons, and the information panel remain available in both modes.
- The 3D state is included in the existing hash deep link as `view=3d` or `view=2d`; absent or malformed values fall back to 2D.
- The toggle uses `aria-pressed`, has a visible focus state, and respects the existing English/Turkish language switch.
- Reduced-motion users receive immediate camera changes and no animated extrusion transition.

## MapLibre implementation

- Add a `fill-extrusion` layer immediately after the existing flat `buildings` layer, using `source-layer: 'buildings'` from `pmtiles://assets/baku-absheron.pmtiles`.
- Derive height from `height` when present, otherwise from `levels * 3.2`, otherwise use a conservative 6m fallback. Derive the base from `min_height` when present, otherwise 0.
- Keep extrusion visibility limited to closer zoom levels where building geometry is legible; the 3D camera uses the same Baku/Absheron bounds and max zoom.
- Use a warm neutral extrusion palette with enough transparency that the investment overlays remain visually dominant.
- Add camera helpers with one responsibility: set 3D camera, set 2D camera, and update the mode button.
- Keep all geographic overlay source data and `updateSources()` behavior unchanged except for the new view state and layer visibility.

## State and integration

- Expose `view3d` through `window.BakuAtlas` so the MapLibre controller and inline page state share one source of truth.
- Add `VIEW3D` and `setMapView(is3d)` to the existing state/deep-link flow.
- Apply deep-link state in the established order: language, year, heat/metro, view, then zone selection.
- Switching language changes only labels and button copy; it must not reopen or reselect the current zone panel beyond the existing generic panel-state behavior.
- The 3D toggle must not change zone selection, spotlight state, year, heat, metro, shortlist, planner, deal checker, or tour state.
- The embedded base64 image in `index.html` must remain byte-identical.

## Failure and fallback behavior

- If the MapLibre map cannot initialize, the existing raster fallback remains available and the 3D control is hidden or inert.
- If the vector-tile building source or extrusion layer is unavailable, the map remains usable in 2D and the toggle returns to 2D without throwing.
- Unknown hash values are ignored silently.

## Verification

- Static contract test verifies the bilingual 3D control, `aria-pressed`, deep-link `view` handling, building extrusion layer, and camera helpers.
- JavaScript syntax checks cover the MapLibre controller and inline scripts.
- Existing map migration and zone language-switch regression contracts continue to pass.
- The embedded base64 payload is compared against `HEAD` by SHA-256.
- The live Pages URL is checked for HTTP 200 and the deployed 3D contract after publishing.
- Manual visual verification should cover default 2D, 3D toggle on/off, mobile layout, Bilgah and Hovsan selections, heat/metro overlays, spotlight, tour, language switching, and reduced-motion behavior.
