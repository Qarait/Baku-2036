# MapLibre + PMTiles basemap design

## Goal

Replace the hand-placed raster basemap with a local, zoomable vector basemap for Baku and the Absheron peninsula while preserving the atlas interaction model.

## Decisions

- Source: Geofabrik's Azerbaijan Shortbread vector tiles, derived from OpenStreetMap and licensed under ODbL.
- Extent: `49.20,39.85,50.75,40.75` (west, south, east, north), broad enough for every current zone, including Sumgayit and Alat.
- Delivery: crop to PMTiles and keep the cropped file in the Pages repository only if it is below GitHub's ordinary 100 MiB file limit. The full Azerbaijan package is never committed.
- Renderer: MapLibre GL JS with a local PMTiles protocol source and a local, minimal Shortbread-compatible style.
- Overlays: use GeoJSON sources and MapLibre layers for zone circles/labels, metro lines/stations, heat, spotlight markers, and time-machine events. Keep the existing side panel and data objects as the source of truth.
- Navigation: MapLibre owns drag, wheel, double-click, pinch, keyboard, and zoom controls. Existing deep-link state remains unchanged.
- Fallback: retain the current embedded raster payload in the document as a hidden fallback while the vector map initializes; do not alter its base64 bytes.

## Non-goals

- No property-boundary precision or cadastral data.
- No live OSM tile scraping or bulk raster download.
- No change to investment assumptions, zone scoring, or panel copy.

## Acceptance criteria

1. `assets/baku-absheron.pmtiles` verifies with the PMTiles CLI and contains only the cropped extent.
2. The map renders from MapLibre + PMTiles, with no dependency on the previous raster for the normal path.
3. All 16 zones select the existing panels from geographic coordinates.
4. Heat, metro, spotlight, year animation, tour, deep links, EN/TR, and map controls continue to work.
5. Keyboard map navigation and accessible controls remain available.
6. The site passes static checks, local HTTP loading, and a deployed HTTP check before claiming completion.
