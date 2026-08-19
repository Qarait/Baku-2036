# Map Startup Performance Measurement Specification

## Goal

Make Baku 2036's startup sequence measurable at the browser level so we can distinguish network wait, JSON hydration, admin-label preprocessing, MapLibre construction, and map load before deciding whether to change boot ordering.

## Scope

- Instrument the existing v3 boot path without changing user-visible behavior.
- Record browser Performance API marks for the named boot phases.
- Expose a read-only diagnostics snapshot for the measurement runner.
- Capture resource timing for runtime data, PMTiles, glyphs, JavaScript, and CSS.
- Extend the existing measurement runner with deterministic median and p90 summaries.
- Run cold and warm samples against Chromium and WebKit.
- Do not implement a two-phase map boot unless the measured data-wait/preprocessing interval is materially responsible for startup latency.

## Required marks

The application must emit both a performance mark entry named "baku:<name>" and a matching record in window.__bakuPerformance.marks for each of these names:

| Mark | Boundary |
| --- | --- |
| boot-start | First operation in boot() before data loading begins |
| data-fetch-start | Immediately before the five data fetches start |
| data-fetch-end | After all five response bodies have been parsed |
| data-hydrated | After state.data and the normalized zone list are ready |
| admin-centroids-start | Immediately before admin label centroid calculation |
| admin-centroids-end | Immediately after admin label centroid calculation |
| style-build-start | Immediately before style object construction |
| style-build-end | Immediately after style object construction |
| map-constructor-start | Immediately before new maplibregl.Map(...) |
| map-constructor-end | Immediately after the MapLibre constructor returns |
| map-load | First line of the MapLibre load handler |
| boot-ready | After the ready status is rendered and the initial layers/panel are updated |

Mark records may include small numeric details or counts, but must not duplicate the large GeoJSON payload.

## Resource timing contract

The runner must collect each available resource entry with URL, initiator type, start time, response start, response end, duration, transfer size, encoded body size, and decoded body size. Each entry must have one category:

- data: /data/ resources
- pmtiles: URLs ending in .pmtiles or containing the PMTiles asset name
- glyph: /glyphs/ or .pbf resources
- script: JavaScript resources or initiatorType equal to script
- stylesheet: CSS resources or initiatorType equal to link with a .css URL
- other: everything else

The raw resource list remains per-run. Aggregates may sum byte fields and count entries, but must not discard the raw entries needed to identify the bottleneck.

## Summary contract

For every numeric metric, summarizeRuns() returns count, median, p90, min, and max. Percentiles use the nearest-rank rule: sort finite values ascending and select the value at one-based rank ceil(0.90 * count). The median remains the middle value for odd counts and the mean of the two middle values for even counts.

## Cold and warm sample semantics

Cold samples use the static server's default no-store response policy and a fresh browser context for every run. Warm samples use the server's opt-in cacheable response policy, one persistent browser context, and one uncounted priming navigation before the ten measured navigations. The report must state that these are local-loopback measurements and must not present them as production-network timings.

## Decision gate

After the sample matrix is complete, calculate the data-wait/preprocessing interval as map-constructor-start minus data-fetch-start, and separately report data-fetch-end minus data-fetch-start plus admin-centroids-end minus admin-centroids-start.

A boot-order refactor is justified only if the data-wait/preprocessing interval is both:

1. at least 500 ms at the Chromium median; and
2. at least 25% of the Chromium median map-load time.

If either condition is not met, keep the current architecture and deliver the instrumentation/report only. If both conditions are met, stop at the measurement result and create a separately reviewed implementation plan for progressive map boot; do not mix that refactor into this instrumentation change.

## Non-goals

- No changes to data files, calculations, map style content, labels, or interaction behavior.
- No removal or hiding of overlays.
- No claims about a fixed number of seconds without a recorded sample.
- No deployment or promotion of preview/main as part of this pass.
