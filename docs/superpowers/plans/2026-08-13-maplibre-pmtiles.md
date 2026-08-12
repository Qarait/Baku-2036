# MapLibre + PMTiles implementation plan

> **For the implementing agent:** REQUIRED SUB-SKILL: Use test-driven development. Run each verification step after the smallest implementation slice.

**Goal:** Build a compact Baku/Absheron PMTiles basemap and migrate the atlas map to MapLibre while retaining all existing geographic overlays and interaction behavior.

**Architecture:** Geofabrik Shortbread source → PMTiles conversion → bbox extraction → local static asset. MapLibre renders a local Shortbread-compatible style. Existing `Z`, `METRO`, `SPOT`, `EVENTS`, time-machine, selection, language, tour, and deep-link state feed GeoJSON sources/layers rather than SVG pixel coordinates.

**Tools:** official `go-pmtiles` CLI, MapLibre GL JS, `pmtiles` browser protocol, PowerShell asset checks, existing single-page HTML.

### Step 1: Prepare the asset

- Write a failing contract check for the required asset/style/MapLibre hooks.
- Convert the downloaded Shortbread MBTiles to PMTiles.
- Extract `49.20,39.85,50.75,40.75` and verify the cropped file plus metadata.
- Copy only the verified crop, a local style, and vendored JS/CSS into the repository.

### Step 2: Integrate the renderer

- Add a MapLibre canvas container and local PMTiles protocol/style bootstrap.
- Keep the embedded raster payload unchanged as a hidden initialization fallback.
- Replace custom transform zoom/pan ownership with MapLibre navigation while preserving the existing buttons, zoom status, reduced-motion behavior, and keyboard guard.

### Step 3: Reattach overlays

- Add GeoJSON sources/layers for the 16 geographic zone circles and labels.
- Port metro segments/stations, heat circles, spotlight callouts, and time-machine events to geographic sources.
- Wire layer clicks and keyboard activation back to `select(id, {spot:true})` and keep panel/tray behavior intact.

### Step 4: Verify and publish

- Run static contract checks, PMTiles verify/header checks, and a local HTTP smoke test.
- Exercise language, deep links, zone selection, year, toggles, tour, and accessibility hooks.
- Push only after the cropped asset is under the repository limit; verify the deployed site and PMTiles range loading.
