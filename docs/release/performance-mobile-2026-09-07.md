# Mobile loading baseline — 2026-09-07

## Scope and reproduction

Measured production at https://qarait.github.io/Baku-2036/, revision
5dc62da3453134dbe5530ce4b6e8ef0a9f47a328 (main checked before and after collection).

Run one benchmark process at a time:
```powershell
node scripts/measure-performance.js --url https://qarait.github.io/Baku-2036/ --browser chromium --profile mobile --cache cold --runs 10 --output docs/release/performance-2026-09-07-mobile-cold.json
node scripts/measure-performance.js --url https://qarait.github.io/Baku-2036/ --browser chromium --profile mobile --cache warm --runs 10 --output docs/release/performance-2026-09-07-mobile-warm.json
node scripts/measure-performance.js --url https://qarait.github.io/Baku-2036/ --browser webkit --profile native --cache cold --runs 3 --output docs/release/performance-2026-09-07-webkit-check.json
node --test tests/measure-performance.test.js tests/measure-performance-browser.test.js
```

Host: Windows x64, Intel Core i5-1235U. Chromium 151.0.7922.34,
Playwright 1.62.1; WebKit 26.5. Headless, 390×844, mobile/touch enabled,
device scale factor 1, service workers blocked.
The mobile profile sets CDP latency to 150 ms, download to 200,000 B/s
(1.6 Mbps), upload to 93,750 B/s (750 Kbps), and CPU slowdown to 4×.
These are synthetic settings, not an Azercell measurement or a calibrated iPhone.

Cold samples use fresh browser contexts in one browser process. They do not
reset OS DNS, TLS, server, or CDN caches. Warm samples reuse the same page
and context after an excluded priming visit reaches network idle.
The native profile applies no artificial throttling.

## Results

Timing summaries include successful visits only. p90 uses nearest rank.
With only nine successful cold samples, p90 equals the maximum; these are
initial estimates, not stable regression thresholds.

| Metric | Cold median | Cold p90 | Warm median | Warm p90 |
| --- | ---: | ---: | ---: | ---: |
| First contentful paint | 964 ms | 1,788 ms | 146 ms | 172 ms |
| First map-render status observed | 4,799 ms | 7,193 ms | 423 ms | 451 ms |
| Overlay-ready status observed | 6,535 ms | 8,835 ms | 1,177 ms | 1,788 ms |
| Long-task blocking before ready | 434 ms | 902 ms | 38 ms | 44 ms |
| Window resource transferSize sum at ready | 929,522 B | 929,522 B | 57,535 B | 57,535 B |

Cold: 10 attempted, 9 successful, 1 map error. Warm: 10 attempted, 10 successful,
after one excluded priming visit. This sample does not establish a population
failure rate. Successful samples recorded no page errors or HTTP errors.

A separate unthrottled WebKit compatibility check completed 3/3 visits,
with ready signal median 1,495 ms (range 1,376–1,920 ms).
Its long-task API is unavailable and is reported as null. This is not a
performance comparison with throttled Chromium.

Two pilot files are retained separately and excluded from these summaries.
The first pilot reached map error without detailed diagnostics; the second
completed successfully after failure diagnostics were added.

## Evidence that changes the next priority

Cold sample 6 showed the error status at 6,561 ms without an observed
HTTP error, failed request, or JavaScript exception. The MapLibre module
completed at 7,315 ms and its shared dependency at 8,198 ms. There was no
first-render signal.

In v3.js, waitForMapRuntime starts a 5,000 ms timer and reports failure if
window.__V3MapLibre is not set at expiry. This ordering strongly supports
premature runtime timeout as the cause of this sample. It should be
reproduced with a deliberately delayed successful library response before
changing the application. The present batch stopped observing full app
behavior shortly after failure, so later recovery was not evaluated.

Recommendation: make slow-but-successful library loading an explicit
regression case, then design a recoverable loading/timeout policy.
Do not simply remove the missing-library failure handling.

The successful cold resource records also show:
- Administrative data is the largest single completed response by measured
  transferSize (284,870 B, including reported transfer overhead).
- MapLibre modules load in stages before the first-render signal.
- Font/glyph responses commonly finish near the ready signal.
- Warm visits are materially faster, while cold visits also show main-thread
  blocking. These data do not isolate how much time belongs to JSON parsing,
  centroid work, style construction, worker processing, or GPU rendering.
  Do not choose a boundary refactor from byte size alone.

## Measurement definitions and limits

- Readiness values are timestamps taken by an injected MutationObserver at
  DOM status changes. They replace text matching and the old additional
  250 ms delay. They are not exact internal MapLibre timestamps.
- map-visible is set by the application's first render callback; it does
  not prove actual basemap tiles are painted. ready can precede final
  worker/GPU rendering and is not a measured successful selection.
- LCP is only a snapshot up to readiness, not final navigation LCP.
- Long-task blocking sums task time beyond 50 ms before ready. It is not
  Lighthouse TBT and cannot measure GPU frame smoothness.
- Resources contain completed window Resource Timing entries at readiness.
  PMTiles range requests and glyphs are visible in these samples, but
  worker-originated requests may be absent. These sums are not a complete
  wire-byte accounting. Navigation transfer is reported separately.
- Zero transferSize alone does not prove a cache hit; timing access limits
  can also produce zero. The controlled local test verifies actual warm
  cache reuse through server request counts.
- Chromium reported negative duration for maplibre-gl-worker.mjs entries.
  Raw entries are preserved for inspection. Do not use those durations for
  attribution or sum overlapping resource durations into elapsed time.
  No resource-timing buffer overflow was observed.
- Profile changes, browser versions, host load, and CDN conditions affect
  results. Historical August reports used a different metric definition and
  protocol and should not be treated as a direct before/after comparison.

## Verification and remaining work

The unit and real-browser tests pass. The controlled browser fixture checks
priming is excluded, assets are fetched for each cold context, warm samples
use cached assets, status ordering, long-task capture, and failed samples
being retained but excluded from timing summaries.

This completes the initial loading benchmark upgrade and production baseline.
It remains separate from ordinary pass/fail CI. No website code or deployment
was changed.

Remaining measurement work: real selection-to-summary latency, repeatable
scroll-frame measurements and bottom reachability within the benchmark,
processing-phase marks, larger samples after stability improves, and physical
phone calibration. Existing scrolling functional tests remain distinct from
performance evidence.
