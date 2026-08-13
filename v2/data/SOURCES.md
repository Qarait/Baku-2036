# Baku 2036 v2 data sources

- `admin-absheron.geojson` is a filtered derivative of the official IDDA open-data GeoJSON “Regions of Azerbaijan”, created in April 2025 and updated in July 2025. It contains Baku city rayons plus Absheron, Khizi and Sumqayit context polygons.
- `metro.json` uses built station and route geometry retrieved from OpenStreetMap via Overpass on 2026-08-13. Planned extensions are explicitly labeled as the Baku 2036 scenario layer and should be verified against official project documents before a purchase.
- `places.json` is an offline gazetteer assembled from official Azerbaijan local-place points and OpenStreetMap place-name nodes retrieved on 2026-08-13, plus clearly labeled Baku 2036 atlas anchors. It is deliberately not a live geocoder.
- `zones.json` and `content.json` are structured exports of the existing v1 atlas's zone briefs, due-diligence prompts, scenario labels, buyer profiles, and EN/TR interface copy. The export preserves the illustrative nature of the figures and does not alter the root v1 artifact.
- The basemap is the existing local Absheron PMTiles asset. Its publisher attribution remains visible in the v2 interface.

OpenStreetMap data is © OpenStreetMap contributors and is used under the [ODbL](https://www.openstreetmap.org/copyright).

- Zone evidence entries were checked on 2026-08-13 against the supplied official planning, transport, railway, market, industrial, and developer sources. Statuses distinguish operational, contracted, programmed, private-plan, and concept claims; investment meaning remains analytical.
