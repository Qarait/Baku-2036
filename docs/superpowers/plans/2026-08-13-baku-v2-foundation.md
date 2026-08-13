# Baku 2036 v2 — foundation implementation plan

> **Execution note:** Work through this plan in order. The root v1 site and its embedded image must remain byte-identical.

## Plan

1. **Lock the data contract and provenance**
   - Add a contract test for `/v2/`, distinct geographic sources, local search data, click identification, and distance calculations.
   - Validate the official rayon source and generate a filtered Baku/Absheron polygon file with source notes.
   - Add local metro and gazetteer data with stable ids and EN/TR labels.

2. **Build the separate v2 map shell**
   - Add `v2/index.html` and `v2/v2.js` using MapLibre, the existing PMTiles asset, and accessible controls.
   - Render the basemap, official rayon fills/outlines, distinct investment areas, metro lines/stations, and distance rings.

3. **Add map-first identification and local search**
   - Identify a rayon and nearby investment context on any map click.
   - Search the local gazetteer and fly to a selected result.
   - Show nearest-station, central-Baku, airport, and coordinate distances in the result panel.

4. **Verify and publish the isolated entry point**
   - Run the static contract test, source-data validation, and root-image byte-hash check.
   - Run a local HTTP smoke test for `/v2/` and verify the deployed `/Baku-2036/v2/` URL when GitHub Pages is updated.
   - Keep later analytical porting (time machine, heat, scenarios, planner, deal checker, shortlist, EN/TR deep links) as follow-on v2 work, without modifying v1.

