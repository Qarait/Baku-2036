# Baku 2036 Map Startup Measurement

Date: 2026-08-19

## Result

The current boot sequence does not meet the refactor gate. The measured data-wait/preprocessing interval is below 500 ms and is not a material share of map startup in Chromium. Keep the current boot architecture for this change; do not split MapLibre initialization into a second phase based on these samples.

These are local-loopback measurements from the static test server, not production-network timings. They establish where work happens in the browser and how much data is requested, but they do not predict a user's mobile or public-internet latency.

## Sample matrix

Each cell is median / p90 in milliseconds. There are 10 counted runs per row. Warm runs used a cacheable local server and one uncounted priming navigation in a persistent browser context.

| Sample | TTFB | FCP | LCP | Map ready |
| --- | ---: | ---: | ---: | ---: |
| Chromium cold | 8.3 / 16.6 | 168 / 204 | 168 / 204 | 1827.9 / 1937.9 |
| Chromium warm | 1.1 / 2.2 | 154 / 164 | 154 / 164 | 1730.3 / 1885.6 |
| WebKit cold | 5.0 / 9.0 | 209.5 / 260 | 360 / 643 | 2668.5 / 2765 |
| WebKit warm | 5.0 / 7.0 | 213 / 246 | 353 / 733 | 2617 / 3005 |

## Phase timings

| Sample | Data fetch | Hydration | Admin centroids | Style build | Map constructor | Constructor to map load | Data wait/preprocessing |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Chromium cold | 163.5 / 174.3 | 0.4 / 0.8 | 5.6 / 5.9 | 7.2 / 7.5 | 33.2 / 45.6 | 1475.2 / 1593.3 | 241.6 / 252.8 |
| Chromium warm | 174.7 / 181.9 | 0.4 / 0.5 | 5.6 / 6.7 | 7.2 / 9.9 | 30.5 / 36.4 | 1408.3 / 1580.7 | 241.6 / 275.3 |
| WebKit cold | 190.5 / 218 | 0 / 0 | 5 / 14 | 6.5 / 16 | 39.5 / 68 | 2189.5 / 2345 | 309 / 344 |
| WebKit warm | 178 / 224 | 0 / 1 | 5.5 / 8 | 6.5 / 11 | 35.5 / 63 | 2114.5 / 2410 | 296 / 345 |

For the Chromium cold median, 241.6 ms divided by the 1823.7 ms map-load mark is 13.2%. Even against only the post-constructor interval, it is 16.4%. Both comparisons are below the 25% threshold, and 241.6 ms is below 500 ms.

## Resource timing

A representative Chromium cold run transferred approximately:

| Category | Requests | Transfer |
| --- | ---: | ---: |
| Data JSON/GeoJSON | 5 | 2.71 MB |
| JavaScript | 6 | 1.63 MB |
| Glyphs | 3 | 337 KB |
| CSS | 2 | 109 KB |
| PMTiles ranges | 7 | 78 KB |

The admin GeoJSON is the largest individual data response at 2,530,157 bytes in this checkout. The PMTiles archive is range-fetched; the browser did not transfer the full 9.4 MB archive during the representative run.

Chromium warm samples showed zero transfer size for cached data, JavaScript, CSS, and glyph responses in the first counted run, while PMTiles ranges still transferred. WebKit retained the same-context warm procedure but still reported transfer for its resources, so its warm row should not be interpreted as a cache-saving result. This is an engine/cache observation, not a reason to change application boot ordering.

## Implementation

The branch adds:

- stable Performance API marks for boot, data fetch/parse, hydration, admin centroid calculation, style build, MapLibre construction, map load, and ready state;
- compact window diagnostics at window.__bakuPerformance;
- raw per-run resource timing with data, PMTiles, glyph, script, stylesheet, and other categories;
- deterministic nearest-rank p90 summaries;
- an opt-in cacheable local-server mode for valid warm-run priming;
- browser and Node regression coverage.

No data, calculations, map behavior, deployment, or existing mobile/video PR was changed.
