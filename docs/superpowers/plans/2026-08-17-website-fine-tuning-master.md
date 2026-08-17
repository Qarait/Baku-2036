# Baku 2036 Website Fine-Tuning Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans for each unimplemented subsystem, then superpowers:executing-plans with a verification checkpoint after every task. This document controls sequencing and release gates; it does not replace the subsystem-level TDD plans.

**Goal:** Improve Baku 2036’s mobile usability, map-ready performance, data confidence, and release reliability without changing the live `main` release until preview evidence supports promotion.

**Architecture:** Keep the application deterministic: structured JSON remains the source of truth for zones, projections, projects, and evidence. Improve the existing v3 implementation in small, independently testable stages. Keep English and Turkish as separate entry points, keep v2 as a Git archive, and use preview as the release candidate.

**Tech Stack:** Vanilla JavaScript, CSS, MapLibre GL JS, PMTiles, GeoJSON, GitHub Pages, Playwright Chromium/WebKit, PowerShell contract tests.

## Global Constraints

- `main` and the live root remain unchanged until the complete verification gate passes.
- All changes land on the preview branch first.
- Promotion to `main` requires explicit user authorization after the release evidence is presented; it is never automatic.
- English and Turkish remain separate entry points: `/en/` and `/tr/`.
- v2 remains tracked in Git and excluded from the optimized preview subtree; it is removed from the live-root artifact only during an authorized `main` promotion.
- Numeric projections must come from numeric data fields, never display prose.
- No AI or model inference is introduced into financial or geographic calculations.
- Every implementation task adds or updates a regression test before changing behavior.
- A physical-iPhone check is required for release; if no physical device is available, that gate is recorded as pending rather than passed.
- Before/after performance comparisons use the same device, network profile, and run protocol; report three cold-cache and three warm-cache runs with medians and ranges.

## Current Baseline

- Preview currently has the explicit `growthPct` data fix.
- Unused MapLibre development bundles and v2 are absent from `/preview/`, and v2 is preserved through the `v2-archive` tag.
- Because `main` has intentionally remained untouched, the current live-root `/v2/` and unused dev-bundle URLs still return HTTP 200; Preview mode must preserve that live state, while authorized Live mode removes them.
- Drawer collapse/close, 44px mobile touch targets, four-edge safe-area CSS, targeted mobile typography, and WebKit smoke coverage are already implemented and must be revalidated rather than reimplemented.
- At commit `b4bc12a`, the last recorded full local Playwright run passed 35 Chromium/WebKit tests; Tasks 1–3 must rerun them rather than relying on that historical result.
- The remaining known performance issue is the administrative GeoJSON request before map installation.

## Work Sequence

### Task 1: Capture a reproducible performance baseline

**Files:**
- Create: `docs/release/performance-baseline-2026-08-17.md`
- Create: `scripts/measure-performance.js`
- Inspect: `v3.js:1144-1165`, `playwright.config.js`, `.github/workflows/pages.yml`

Create a read-only Playwright measurement script that accepts a URL, browser engine, run count, and output path, installs an LCP observer before navigation, logs response transfer information, and emits raw JSON for every run before producing medians and ranges. If an engine does not expose an LCP entry, report it as unsupported rather than substituting another metric. Use Safari Web Inspector for physical-iPhone network metrics; a screen recording may prove visible behavior and timing but cannot substitute for missing transfer or Web Inspector evidence. Record cold-cache and warm-cache measurements for preview and live root: TTFB, FCP, LCP, total transferred bytes, admin GeoJSON transfer size, base-map-ready time, investment-interaction-ready time, full-geography/admin-ready time, and first successful map interaction. Record desktop Chromium, WebKit at 390×844, and one real iPhone Safari result. Keep first paint, partial map readiness, and full geography readiness as separate metrics so deferred loading cannot create an artificial performance win by redefining “ready.” For the current blocking implementation, explicitly record that base-map, investment, and full-admin readiness converge at the same initialization gate.

**Gate:** The baseline includes timestamps, URLs, browser/device, network conditions, and a network waterfall or equivalent evidence. Before Task 5 begins, present the target-device results and record an explicitly approved full-map-readiness budget; conditional Phase B cannot be justified against an unspecified target.

### Task 2: Revalidate mobile interaction and safe-area polish

**Files:**
- Inspect; modify only after a demonstrated failure: `v3.css`, `v3.js`, `index.html`, `en/index.html`, `tr/index.html`
- Test: `tests/webkit.spec.js`, `tests/e2e.spec.js`
- Reference: `docs/superpowers/plans/2026-08-16-mobile-touch-targets.md`, `mobile-safe-areas.md`, `mobile-drawer-collapse.md`

Run the existing touch-target, safe-area, drawer, and WebKit tests before changing CSS or JavaScript. Modify the implementation only if a test or physical-device check demonstrates a regression. Every interactive control covered by the existing mobile selector list must measure at least 44×44 CSS pixels; any excluded inline text link must be documented with its spacing rationale. Confirm the existing four-edge `env(safe-area-inset-*)` handling and drawer collapse/reopen/close behavior without trapping scroll or covering essential content. Test portrait, landscape, 390px width, and a real notched iPhone.

**Gate:** No horizontal overflow, no control hidden behind browser chrome, no unusable overlay, and all mobile touch-size assertions pass in WebKit.

### Task 3: Revalidate targeted small-text typography

**Files:**
- Inspect; modify only after a demonstrated failure: `v3.css`
- Test: `tests/webkit.spec.js`
- Reference: `docs/superpowers/plans/2026-08-16-mobile-typography.md`

Run the existing targeted typography assertions and physical-device review before changing font sizes. Modify only labels, metadata, helper text, legend text, or compact controls that still fail the accepted typography design. Preserve the visual hierarchy of headings and map narrative text. Check Turkish diacritics, line wrapping, contrast, and text at 320px, 390px, and landscape widths.

**Gate:** Metadata is readable without zooming, no card overflows, and heading hierarchy remains visually intentional.

### Task 4: Strengthen data and numeric regression coverage

**Files:**
- Modify: `tests/e2e.spec.js`
- Modify: `v3.js`
- Inspect: `data/zones.json`, `data/content.json`
- Add contract coverage in: `tests/v3-single-audience-contract.ps1`

Add exact English DOM assertions for Zikh with a `$60,000` price and `100 m²` area: `$138,000` under normal conditions, `$123,000` with bad oil, and `$117,000` with delayed infrastructure. Assert that the canonical dataset currently contains 16 zones with unique IDs and finite numeric `growthPct` values, while keeping the runtime capable of accepting future non-empty valid zone sets of other sizes. Add coverage for the Turkish UTF-8 fallback, visible event labels, and the current structured snapshot totals: 14 done, 10 funded, and 23 planned projects; 9 operational, 2 contracted, 6 programmed, and 2 private-plan evidence records.

Replace the exact-length trapdoor in `hydrateZones()`: reject a non-array, an empty array, duplicate or empty IDs, coordinates that are not a pair of finite numbers, or a non-finite `growthPct`, but preserve the existing defaults for optional fields and accept a valid seventeenth zone. One Playwright test must intercept the canonical zones response and append a valid seventeenth record with a unique ID and finite coordinates, then assert that the map and investment layer still initialize. A separate test must return an empty array, assert a localized “map data validation failed” message in `#mapStatus`, and assert that the exact diagnostic count is written to the console without exposing untranslated developer text in the Turkish UI.

**Gate:** A wrong numeric projection, missing fallback translation, missing event label, invalid canonical zone record, or empty hydrated zone set fails with a specific assertion; a valid seventeenth zone does not break initialization.

### Task 5: Reduce the administrative payload, then conditionally defer it

**Files:**
- Preserve: `data/admin-absheron.geojson` as the canonical source for comparison and future regeneration.
- Create: `data/admin-absheron-5dp.geojson`
- Modify: `data/SOURCES.md`
- Modify: `v3.js`
- Create: `scripts/build-admin-geojson.ps1`
- Create: `scripts/validate-admin-geojson.ps1`
- Test: `tests/e2e.spec.js`, `tests/v3-single-audience-contract.ps1`, `tests/pages-artifact-contract.ps1`

Phase A is payload reduction. Generate `data/admin-absheron-5dp.geojson` deterministically from the canonical source without overwriting it. `scripts/build-admin-geojson.ps1` must round coordinate numbers only, preserve feature/property order, emit compact JSON in UTF-8 without a byte-order mark, and support a check mode that fails when the committed derivative is stale. The validator must check valid GeoJSON, unchanged feature count, unchanged feature properties, closed polygon rings with at least four positions, and maximum coordinate displacement of 1.5 metres from the canonical source. For every zone coordinate that resolves to an administrative feature in the canonical source, district lookup against the derivative must return the same identifying properties. Both PowerShell scripts must run under PowerShell 7 on Windows and GitHub’s Ubuntu runner. Change the v3 fetch to the derivative while retaining the current blocking initialization, run the full functional suite, and repeat the Task 1 measurements. This isolates the value of precision reduction before introducing asynchronous behavior.

Phase B is conditional. If the same-protocol Phase A evidence shows that full map readiness still misses the performance budget established in Task 1, write and review a dedicated deferred-admin design before changing startup semantics. If Phase A meets the budget, stop here and do not add asynchronous admin states merely to satisfy the roadmap. If Phase B is justified, split map startup into essential data and deferred administrative data. `loadData()` must fetch metro, places, zones, and content only; it must set `state.data.admin` to `null` and an explicit admin load state to `pending`. `createStyle(data)` must install empty `admin` and `admin-labels` GeoJSON sources so the initial MapLibre style remains valid. Add `loadAdministrativeData()` to fetch `data/admin-absheron-5dp.geojson`, set the admin data/load state, and call `installAdministrativeData(admin)`, which updates both sources after the map is ready. Handle this promise separately from the essential-data `boot()` catch so an admin failure cannot turn a working base map into a full map-data error. `findAdministrativeProperties()` must return `null` while admin data is unavailable instead of throwing. `renderPanel()` must distinguish `pending`, `ready`, and `error`: before boundaries arrive it displays a translated district-loading label, after failure it displays a translated district-unavailable label, and it uses “That’s the sea” only for an actual water hit. If the user selects a location before admin data arrives, `installAdministrativeData(admin)` must recompute the selected location’s administrative properties and rerender the panel so the temporary loading label does not remain stale. Use `#mapStatus` to distinguish “map ready; district borders loading,” fully ready, and “map ready; district borders unavailable” in both languages. Add tests for both race orders: admin response completes before MapLibre `load`, and admin response is delayed until after the map and an investment selection are ready.

Keep the canonical 2.5 MB source in Git. In Preview-mode artifacts, retain the original at root because the unchanged live `origin/main` still references it, but exclude `/preview/data/admin-absheron.geojson` and include `/preview/data/admin-absheron-5dp.geojson`. In Live mode after authorized promotion, exclude the original at root and include the derivative. Encode these path-specific rules in the artifact contract. Do not move the polygons into PMTiles in this task. Measure that as a separate architectural option after the deferred/rounded version has real-device evidence.

**Gate:** The derivative must be at most 1.35 MB raw and 310 KB gzip, compared with the current approximately 2.53 MB raw and 962 KB gzip deployment, without geographic regressions. Phase A must report its isolated before/after timing. If Phase B is not justified, document that decision and retain the simpler blocking model. If Phase B proceeds, first paint is measured independently, the base map and investment circles are interactive while administrative data is pending, both admin/map race orders pass, district lookup is safe and refreshes correctly before and after the deferred request, and a failed admin request produces a visible translated degraded state without a page error. Only the optimized preview subtree excludes its canonical source before promotion.

### Task 6: Replace manual cache tokens with generated asset versioning

**Files:**
- Modify: `.github/workflows/pages.yml`
- Modify or create: `scripts/build-language-entrypoints.js`
- Create: `scripts/build-pages-artifact.ps1`
- Test: `tests/pages-artifact-contract.ps1`, `tests/v3-single-audience-contract.ps1`
- Inspect: `index.html`, `en/index.html`, `tr/index.html`, `v3.js`

Add a deterministic `scripts/build-pages-artifact.ps1` staging step with explicit `Preview` and `Live` modes. `Preview` mode must reproduce the current site architecture: export `origin/main` at the artifact root without rewriting or newly excluding its files, then stage the current preview branch under `dist/preview/` and apply optimization exclusions and cache-token rewriting only inside that preview subtree. This prevents a preview deployment from changing the live root, including its currently published historical v2/dev files. `Live` mode must stage the current `main` branch at the artifact root, apply the optimized exclusions there, and run only after explicit promotion.

For the branch subtree being built, run the language-entrypoint check and compute 12-hex-character SHA-256-derived tokens for staged `data/admin-absheron-5dp.geojson`, `data/metro.json`, `data/places.json`, `data/zones.json`, and `data/content.json`. Rewrite their explicit source markers into staged `v3.js`, hash that final staged `v3.js`, and separately hash staged `v3.css`. Only then rewrite staged `index.html`, `en/index.html`, and `tr/index.html` with the JavaScript and CSS tokens. The source files must contain explicit replacement markers rather than manually maintained commit SHAs. In Preview mode, apply v2, development-bundle, and canonical-admin exclusions only under `/preview/`; preserve the exported `origin/main` root exactly. In Live mode after promotion, apply those exclusions at root. Preserve stable entry-point URLs while ensuring changed first-party JavaScript, CSS, and JSON cannot remain stale behind an old token. The PowerShell staging script must run under PowerShell 7 on Windows and GitHub’s Ubuntu runner.

**Gate:** Changing each hashed source independently produces the expected changed token in a clean staging directory, all three entry points reference the staged JavaScript and CSS tokens, staged `v3.js` references all five staged data tokens, no replacement marker remains in optimized preview HTML or JavaScript, and the generated language-entrypoint check remains reproducible. Before preview deployment, checksums of staged production-root HTML and referenced assets must match cache-bypassed downloads from the current live root; a mismatch blocks preview deployment instead of silently changing live content. In Preview mode, the artifact contract requires `/preview/v2/` and preview dev bundles to be absent while preserving the current root versions; in Live mode after promotion, it requires root v2 and dev bundles to be absent. Canonical/optimized admin checks are likewise path-specific, while v1 and both fixed-language entry points remain available.

### Task 7: Run the release verification matrix

**Files:**
- Modify: `.github/workflows/pages.yml` only if a test gate is missing
- Use: `tests/e2e.spec.js`, `tests/webkit.spec.js`, all PowerShell contract tests
- Update: `docs/release/real-iphone-safari-checklist.md`

Run the exact local gate: `npm ci`; `node scripts/build-language-entrypoints.js --check`; `npm test`; every `tests/*-contract.ps1` script, recording the intentional `SKIP` from `optional-3d-map-contract.ps1`; and the clean Preview-mode Pages staging script. Run keyboard/focus, reduced-motion, contrast, and screen-reader-label checks alongside the real-iPhone checklist. Before deployment, compare staged production-root files with cache-bypassed live downloads and stop on any mismatch. Verify preview remotely by checking staged asset paths, `/preview/v1/`, expected `/preview/v2/` and preview dev-bundle absence, English/Turkish entry points, console errors, and failed requests. Confirm that root `/v2/`, root dev bundles, the `main` commit, and checksums of live-root HTML/referenced assets remain unchanged during preview deployment; no physical-iPhone evidence means the release gate remains pending.

**Release gate:**

- All automated tests pass.
- No page errors or failed asset requests.
- English and Turkish entry points remain separated and correct.
- Mobile controls, drawer, safe areas, and typography pass on a real iPhone.
- Numeric projection assertions pass.
- Performance report distinguishes first paint, base-map readiness, investment interaction, and full administrative readiness.
- Preview and live root versions are documented.
- Accessibility checks and physical-iPhone evidence are attached; neither is silently skipped.

### Task 8: Decide whether to promote or continue optimization

Present the release evidence and request explicit promotion authorization. Promote only if the release gate passes, the same-protocol comparison shows no first-paint regression and a smaller administrative transfer, and the selected Task 5 path meets its recorded budget: equal-or-earlier full-map readiness for Phase A alone, or earlier base-map/investment readiness plus equal-or-earlier full-administrative readiness if conditional Phase B was implemented. Record the pre-promotion `main` commit. After an authorized promotion, repeat the remote smoke and live-root checks, including root `/v2/` and root dev-bundle 404 expectations; if a blocking regression appears, create and deploy a new revert commit that restores the recorded pre-promotion behavior rather than rewriting branch history. If the site is correct and usable but the map remains slow, keep the release stable and evaluate PMTiles-based administrative polygons as a separate design and implementation project.

## Expected Value

- Tasks 1–3 establish evidence and preserve the already-implemented iPhone improvements.
- Task 4 protects decision-related calculations and zone hydration from silent regressions.
- Task 5 improves map readiness and reduces the largest blocking data transfer.
- Task 6 reduces stale-cache incidents and maintenance commits.
- Tasks 7–8 prevent subjective “looks fine” approval without evidence.
