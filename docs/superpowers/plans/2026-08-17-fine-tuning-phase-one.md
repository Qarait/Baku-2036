# Baku 2036 Fine-Tuning Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Each production change follows superpowers:test-driven-development.

**Goal:** Establish reproducible automated performance evidence, revalidate current mobile behavior, and remove the zone-validation and decision-output regression gaps on preview.

**Architecture:** Keep the static v3 application and structured JSON source of truth. Add a read-only measurement CLI outside the browser bundle. Make zone hydration reject malformed/empty payloads while accepting a future valid seventeenth zone, and assert exact decision-output values through the existing Playwright UI.

**Tech Stack:** Node.js, Playwright, vanilla JavaScript, PowerShell contracts.

## Global Constraints

- Work only on `agent/mobile-scroll-fix`; do not modify or deploy `main`.
- English and Turkish fixed entry points remain separate.
- Existing 44px, safe-area, drawer, typography, and WebKit work is verification-only unless a test proves a regression.
- `hydrateZones()` accepts any non-empty valid zone list; the current canonical file still has 16 zones.
- No map-loading refactor or GeoJSON precision change occurs in this phase.

---

### Task 1: Add the automated performance measurement CLI

**Files:**
- Create: `scripts/measure-performance.js`
- Create: `tests/measure-performance.test.js`
- Modify: `package.json`
- Create: `docs/release/performance-baseline-2026-08-17.md`

**Interfaces:**
- `summarizeRuns(runs)` returns `{ count, median, min, max }` for finite numeric run values.
- CLI: `node scripts/measure-performance.js --url <url> --browser <chromium|webkit> --runs <n> --output <path>` writes JSON containing raw runs and summaries.

- [x] **Step 1: Write the failing unit test**

Create `tests/measure-performance.test.js` using Node’s built-in test runner. Require `../scripts/measure-performance.js` and assert:

```js
assert.deepStrictEqual(summarizeRuns([12, 4, 8]), { count: 3, median: 8, min: 4, max: 12 });
assert.deepStrictEqual(summarizeRuns([NaN, 9]), { count: 1, median: 9, min: 9, max: 9 });
```

- [x] **Step 2: Run the unit test and verify RED**

Run: `node --test tests/measure-performance.test.js`

Expected: failure because `scripts/measure-performance.js` does not yet exist.

- [x] **Step 3: Implement the smallest measurement CLI**

Export `summarizeRuns`. When run directly, parse the four documented flags, use Playwright to launch Chromium or WebKit, install a `PerformanceObserver` for LCP before navigation, collect navigation timings, paint entries, response content-length values, and timestamps for `#mapStatus` readiness. Run the requested number of fresh browser contexts, write raw JSON plus summaries, and mark unsupported LCP as `null` rather than inventing a value.

- [x] **Step 4: Run GREEN and the CLI**

Run: `node --test tests/measure-performance.test.js`

Run a one-run Chromium measurement against local static server output and verify the JSON contains URL, browser, raw run, and summary fields.

- [x] **Step 5: Record baseline evidence**

Use three cold and three warm runs for preview and live root in Chromium and WebKit. Record raw files, medians, ranges, network conditions, and the fact that physical iPhone evidence remains pending in `docs/release/performance-baseline-2026-08-17.md`.

### Task 2: Revalidate already-delivered mobile behavior

**Files:**
- Verify: `tests/e2e.spec.js`, `tests/webkit.spec.js`, `tests/v3-mobile-contract.ps1`
- Modify only after a failure: `v3.css`, `v3.js`, `index.html`, `en/index.html`, `tr/index.html`

- [x] **Step 1: Run the existing focused mobile checks**

Run:

```powershell
npx playwright test tests/e2e.spec.js -g "mobile controls expose 44px|mobile metadata remains readable|mobile zone details"
npx playwright test tests/webkit.spec.js
pwsh -File tests/v3-mobile-contract.ps1
```

- [x] **Step 2: Preserve passing behavior**

If all commands pass, make no CSS or UI changes. If one fails, write a narrower regression assertion first, then make the smallest scoped fix and rerun the focused command.

### Task 3: Add exact decision and zone-validation regression coverage

**Files:**
- Modify: `tests/e2e.spec.js`
- Modify: `v3.js`

**Interfaces:**
- `hydrateZones(atlasZones)` throws `Error('Zone data validation failed: …')` for invalid payloads and repopulates `zones` for valid payloads of any positive length.
- The map boot catch presents localized validation copy in `#mapStatus` and logs the exact diagnostic.

- [x] **Step 1: Write failing Playwright tests**

Add tests that:

```js
// Zikh, $60,000 / 100 m²
expect(result).toContainText('$138,000'); // normal
expect(result).toContainText('$123,000'); // bad oil
expect(result).toContainText('$117,000'); // delayed infrastructure
```

Intercept `**/data/zones.json*` once with a cloned, unique seventeenth zone and assert the map reaches ready state. Intercept it with `[]` and assert English/Turkish `#mapStatus` uses localized validation copy while `console.error` contains `received 0`. Route Turkish content without `ui.entry` and assert the fallback displays `Bugünkü giriş`, not replacement characters.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `npx playwright test tests/e2e.spec.js -g "Zikh deal|seventeenth zone|empty zone payload|Turkish entry fallback"`

Expected: the numeric and seventeenth-zone cases lack coverage/behavior, empty data does not produce localized validation copy, and the Turkish fallback is malformed.

- [x] **Step 3: Implement the smallest production changes**

Correct the Turkish fallback text. Make `hydrateZones()` validate a non-empty array, unique non-empty string IDs, finite coordinate pairs, and finite `growthPct`; throw an exact diagnostic on failure and accept any positive valid length. In `boot()`, map that validation error to localized user copy while retaining the diagnostic in `console.error`.

- [x] **Step 4: Run GREEN, then complete regression suite**

Run the focused command, then `npm test` and every `tests/*-contract.ps1` script. Record any intentional optional-3D skip.

- [ ] **Step 5: Commit the phase-one deliverable**

Commit the plan, measurement CLI/test/baseline, data validation, regression tests, and documentation with a focused message. Push only to `preview` after all verification passes.

## Phase-One Stop Condition

Do not start the admin-GeoJSON optimization until the recorded automated baseline is available and the user approves a target-device full-map-readiness budget. Physical-iPhone evidence remains a release gate, not a reason to block automated phase-one work.
