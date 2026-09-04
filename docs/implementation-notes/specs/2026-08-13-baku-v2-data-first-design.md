# Baku 2036 v2 — data-first map design

## Goal

Create a separate `/v2/` map application in the existing `Baku-2036` repository. The current root site remains the stable, self-contained v1 artifact and is not edited as part of this work.

## Product direction

The v2 map should feel familiar enough to orient quickly, but its value is the investment intelligence layered on top of the geography. The first milestone therefore fixes the map foundation before adding toolbar chrome:

- MapLibre renders the existing Absheron PMTiles basemap.
- Official Azerbaijan rayon polygons are filtered to Baku, Absheron and nearby context and shown as administrative boundaries.
- Investment areas remain a separate, explicitly approximate layer; they are not used as property boundaries.
- Metro lines and stations are a separate geographic dataset with built/planned status.
- Clicking anywhere identifies the rendered rayon, nearby investment area and nearest metro station when available.
- Distance rings and numeric distances use geodesic calculations from the clicked point to central Baku, Heydar Aliyev International Airport and the nearest station.
- Search uses a local gazetteer JSON file, with no geocoding service or rate-limited dependency.
- Existing EN/TR analytical features are added on top of this foundation in subsequent v2 milestones.

## Explicit non-goals for the first v2 foundation

- No 3D building extrusion as a decision-making feature.
- No Street View or Mapillary promise.
- No full routing engine.
- No satellite imagery dependency.
- No edits to the root `index.html`, including its embedded base64 image.

## Data integrity and provenance

Administrative polygons are derived from the official IDDA open-data “Regions of Azerbaijan” GeoJSON. The source file is retained outside the browser bundle only as a provenance artifact; the app receives a filtered Baku/Absheron GeoJSON. Every geographic layer has a distinct source and layer id so a circle cannot be mistaken for a legal boundary.

## Interaction model

The map is the primary surface. Search, layer toggles, map controls, and the result panel remain lightweight. A click on a polygon or blank map location updates the result panel without navigating away. The URL hash stores the selected investment zone, year, language, heat/metro state and map view so a location can be shared without server routing.

