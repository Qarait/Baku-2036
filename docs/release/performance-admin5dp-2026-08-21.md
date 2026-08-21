# Administrative Boundary Derivative Measurement — 2026-08-21

## Change

Preview now loads `data/admin-absheron-5dp.geojson`, a deterministic five-decimal derivative of the canonical `data/admin-absheron.geojson`. The canonical source remains unchanged. The derivative preserves all 15 features and properties, keeps closed polygon rings, preserves every zone’s administrative lookup, and has a maximum coordinate displacement of 0.695 m.

## Payload result

| Asset | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| Canonical `admin-absheron.geojson` | 2,530,157 | 962,060 recorded on hosted baseline |
| Derivative `admin-absheron-5dp.geojson` | 1,304,098 | 302,359 |

The derivative is 48.5% smaller raw and 68.6% smaller than the recorded hosted gzip transfer.

## Local same-protocol measurements

Three cold-cache and three warm-cache runs were taken at 390×844 using the existing measurement script and local static server. `mapReadyMs` is the time until the map status reports ready; ranges are min–max across the three runs.

| Engine | Cache | Map ready median | Range | Admin response content-length |
| --- | --- | ---: | ---: | ---: |
| Chromium | cold | 2,303 ms | 2,162–2,382 ms | 1,304,098 B |
| Chromium | warm | 2,193 ms | 2,065–2,559 ms | 1,304,098 B |
| WebKit | cold | 2,090 ms | 1,688–2,444 ms | 1,304,098 B |
| WebKit | warm | 2,395 ms | 2,177–2,586 ms | 1,304,098 B |

These local timings are not a substitute for hosted or physical-iPhone evidence. Hosted cold/warm measurements must be repeated after the optimized preview is deployed before deciding whether deferred administrative loading is justified.
