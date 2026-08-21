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

## Hosted preview measurements

The optimized preview was measured after Pages deployment `32484546227` using the same 390×844 viewport and three-run protocol. The admin response was 284,570 B in every run, approximately 70.4% below the previously recorded 962,060 B hosted baseline. The table's p90 is nearest-rank p90 over only three samples, so it equals the slowest sample and should be treated as an instability signal rather than a stable percentile.

| Engine | Cache | Map ready median | p90 (n=3) | Range | Admin response content-length | Total response content-length |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Chromium | cold | 10,335 ms | 19,168 ms | 6,090–19,168 ms | 284,570 B | 1,047,065 B |
| Chromium | warm | 3,645 ms | 19,543 ms | 2,573–19,543 ms | 284,570 B | 1,047,065 B |
| WebKit | cold | 3,955 ms | 10,383 ms | 3,796–10,383 ms | 284,570 B | 1,047,065 B |
| WebKit | warm | 10,022 ms | 14,783 ms | 8,583–14,783 ms | 284,570 B | 1,047,065 B |

The derivative clearly reduces the administrative transfer, but these measurements do not isolate the cause of the remaining readiness variance. The safe conclusion is to keep the derivative and defer asynchronous administrative loading until a separate measurement can attribute the long tail to data parsing, MapLibre setup, network variability, or another startup step. Physical-iPhone Safari evidence remains outstanding.
