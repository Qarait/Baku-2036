# Performance Baseline — 2026-08-17

## Scope

- Preview: `https://qarait.github.io/Baku-2036/preview/`
- Live root: `https://qarait.github.io/Baku-2036/`
- Automated viewport: 390×844
- Engines: headless Chromium and Playwright WebKit
- Network: the runner’s normal internet connection; no artificial throttling
- Method: three runs for each URL/engine/cache combination using `scripts/measure-performance.js`

`cold` creates a fresh browser context per run. `warm` keeps one browser context and opens a new page per run. The raw records are the adjacent `performance-*.json` files.

## Median results

| URL | Engine | Cache | TTFB | FCP | LCP | Map ready | Admin transfer | Total response content-length |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Preview | Chromium | cold | 535 ms | 904 ms | 904 ms | 9,165 ms | 962,060 B | 1,717,877 B |
| Preview | Chromium | warm | 2 ms | 76 ms | 76 ms | 1,319 ms | 962,060 B | 1,717,877 B |
| Preview | WebKit | cold | 2,686 ms | 3,027 ms | 3,046 ms | 15,831 ms | 962,060 B | 1,717,877 B |
| Preview | WebKit | warm | 339 ms | 762 ms | 784 ms | 6,750 ms | 962,060 B | 1,717,877 B |
| Live root | Chromium | cold | 805 ms | 1,332 ms | 1,332 ms | 17,408 ms | 962,060 B | 1,712,726 B |
| Live root | Chromium | warm | 1 ms | 80 ms | 80 ms | 2,241 ms | 962,060 B | 1,712,726 B |
| Live root | WebKit | cold | 438 ms | 840 ms | 855 ms | 9,538 ms | 962,060 B | 1,712,726 B |
| Live root | WebKit | warm | 257 ms | 813 ms | 827 ms | 6,749 ms | 962,060 B | 1,712,726 B |

## Interpretation

The page produces visible content well before the interactive map becomes ready. The current startup sequence waits for the administrative GeoJSON with the other data, so base-map readiness, investment interaction, and full district identification are one initialization gate in this baseline.

The administrative file transfers as 962,060 bytes with gzip on every recorded remote run. Its source size is 2,530,157 bytes. The planned 5-decimal derivative target is at most 1.35 MB raw and 310 KB gzip; Phase A will compare against this baseline before deciding whether the more invasive deferred-admin design is warranted.

Network timing varied considerably between runs, particularly on the hosted preview path. The raw JSON must accompany any before/after comparison; do not treat a single run as evidence of a regression or improvement.

## Open release evidence

Physical-iPhone Safari measurements and safe-area interaction evidence are pending. They are required before release promotion, but do not block the automated preview work in this phase.
