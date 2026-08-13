# Baku 2036 — Investment Atlas

Baku 2036 is an interactive investment atlas of Baku and the Absheron peninsula (EN/TR). The map uses MapLibre GL JS and a 9.4 MB PMTiles vector archive cropped to `49.20,39.85,50.75,40.75` (west, south, east, north), covering the atlas zones from Alat through Sumgayit and the Absheron coast.

The site is a static GitHub Pages app. MapLibre, PMTiles, the map style, glyph ranges, and the cropped vector archive are stored locally in the repository. No application server, database, or tracking is used. The original embedded raster remains in `index.html` as a byte-identical fallback and is not modified.

The vector source is Geofabrik's Shortbread extract of OpenStreetMap data. Map data is © OpenStreetMap contributors and © Geofabrik GmbH and is distributed under the Open Database License 1.0. Investment figures are illustrative scenario midpoints, not forecasts or financial advice. Verify title (`çıxarış`), cadastral rayon, zoning, and infrastructure status before any purchase.

## GitHub Pages

1. Push the repository's `main` branch.
2. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
3. The site will be available at `https://qarait.github.io/Baku-2036/`.

Keep the PMTiles archive below GitHub's ordinary 100 MiB repository file limit. Git LFS is not served by GitHub Pages.
## Human release checklist

Before promoting `preview` to `main`, confirm these six things on a phone:

- [ ] Map tiles render.
- [ ] Pinch and drag work on a real iPhone.
- [ ] EN and TR both read correctly.
- [ ] A deep link opens the right zone, year, and language.
- [ ] The one-minute tour reaches its end.
- [ ] The browser console has no errors.

## Local checks

- `npm test` runs the ten Playwright smoke tests.
- `https://qarait.github.io/Baku-2036/preview/` is the review URL for the `preview` branch.
- The live root is published from `main` only after the preview has been checked on a phone.
