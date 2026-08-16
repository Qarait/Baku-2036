# Baku single-audience release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a root audience release that consolidates the v2 map and v1 storytelling, uses one canonical zone JSON, speaks plainly in English and Turkish, and keeps the original at `/v1/`.

**Architecture:** Root files are the audience release; `data/zones.json` is the single live source for all zone-specific content. The existing v2 directory remains a developer snapshot in Git only, preserved at the `v2-archive` tag and excluded from Pages, while the previous root application is copied to `/v1/` with an archive note and relative asset references repaired.

**Tech Stack:** Static HTML, CSS, browser JavaScript, MapLibre GL, PMTiles, PowerShell contract tests, Playwright CLI with Chrome and iPhone viewport emulation.

## Global Constraints

- Do not change analytical numbers, prices, growth figures, ledgers, thesis, risk, action, or source-claim text.
- Root visitor-facing UI must not show `v1` or `v2` wording.
- Use `District borders`, `Investment spots`, `Where prices rise fastest`, `How sure is this?`, `That’s the sea`, and the straight-line metro wording in both languages.
- Keep the first screen to one explanation sentence, one `▶ Show me (1 minute)` CTA, and the map.
- Do not claim physical iOS Safari verification unless a real iOS device is available; report browser emulation separately.

---

### Task 1: Add the release contracts first

**Files:**
- Create: `tests/v3-single-audience-contract.ps1`
- Create: `tests/v3-mobile-contract.ps1`

**Interfaces:**
- Tests inspect root `index.html`, root `v3.js`, root `v3.css`, root `data/zones.json`, and `v1/index.html`.
- The contracts must fail before any production merge files exist.

- [ ] **Step 1: Write the failing tests**

Assert that root references `v3.css` and `v3.js`, loads root `data/zones.json`, has the exact first-screen CTA, has no visible `v1`/`v2` text, includes the requested English labels, contains Turkish label strings, has `v1/index.html` with the archive note, and that `v3.js` has no hardcoded 16-zone fallback.

Assert that root HTML has a `layersToggle` button, a layer menu hook, a 360px viewport, and the CSS contains a mobile media rule that prevents toolbar wrapping and uses a bottom-sheet panel.

- [ ] **Step 2: Run the contracts to verify RED**

Run:

```powershell
.\tests\v3-single-audience-contract.ps1
.\tests\v3-mobile-contract.ps1
```

Expected: both fail because root still contains the old v1 application and the new release files do not exist.

### Task 2: Make the data source canonical

**Files:**
- Create: `data/zones.json`
- Create: `data/content.json`
- Create: `data/places.json`
- Create: `data/metro.json`
- Create: `data/admin-absheron.geojson`
- Modify: `v2/v2.js`

**Interfaces:**
- Root `v3.js` loads `data/zones.json`, `data/content.json`, `data/places.json`, `data/metro.json`, and `data/admin-absheron.geojson`.
- The zone collection starts empty and is populated only by `hydrateZones()` after JSON loading.

- [ ] **Step 1: Copy the current v2 data files into root `data/`**

Copy the existing v2 JSON/GeoJSON data without editing its analytical values or text.

- [ ] **Step 2: Remove the JavaScript zone fallback**

Replace the 16-entry literal zone array with an empty collection and keep `hydrateZones()` as the only population path. Preserve the existing normalization of `tier`, `coords`, and `radius`.

- [ ] **Step 3: Run the source-of-truth contract**

Run:

```powershell
.\tests\v3-single-audience-contract.ps1
```

Expected: the path/structure assertions remain red until the root release is added, but the test output must identify only missing release files rather than a zone-data assertion error.

### Task 3: Build the root audience shell and archive

**Files:**
- Create: `v3.js`
- Create: `v3.css`
- Create: `favicon.svg`
- Create: `v1/index.html`
- Modify: `index.html`

**Interfaces:**
- Root HTML is the audience shell and loads `v3.js`.
- `/v1/index.html` remains the old application, adds one archive note, and uses `../assets/` and `../vendor/` paths.

- [ ] **Step 1: Create root v3 files from the current v2 app**

Copy the v2 shell, JavaScript, CSS, and favicon into root release names. Rewrite only path and release identifiers needed for root loading; retain feature behavior.

- [ ] **Step 2: Create the archived original**

Copy the previous root `index.html` into `v1/index.html`, prepend a one-line `Archived original` note, and rewrite root-relative vendor/asset/map script paths to parent-relative paths.

- [ ] **Step 3: Implement the minimal root UI wiring**

Add the first-screen CTA, quiet controls container, and layers button/menu hooks. Keep existing content sections available after engagement.

- [ ] **Step 4: Run root/archive contracts**

Run both v3 contracts and expect them to move from RED to GREEN.

### Task 4: Apply plain-language labels and first-screen flow

**Files:**
- Modify: `v3.js`
- Modify: `v3.css`
- Modify: `index.html`

**Interfaces:**
- `startTour()` reveals the quiet controls, opens the existing localized tour, and keeps the existing tour story content.
- `toggleLayerMenu()` opens/closes the mobile layer menu and updates `aria-expanded`.

- [ ] **Step 1: Add the requested EN/TR copy**

Update only interface labels, descriptions, and status labels. Keep zone narratives and analytical text sourced from JSON unchanged.

- [ ] **Step 2: Keep controls quiet before engagement**

Use the `engaged` state and a root class to hide search/year/language/layers until the CTA or a keyboard/focus interaction starts the interface.

- [ ] **Step 3: Run language and content contracts**

Run the existing language/content contracts plus the new root contract and confirm both languages expose the same plain-language labels.

### Task 5: Implement 360px behavior and accessibility hooks

**Files:**
- Modify: `v3.css`
- Modify: `v3.js`
- Modify: `index.html`

**Interfaces:**
- `layersToggle` is the single mobile toolbar entry point.
- The selected-location panel remains a focusable bottom sheet on narrow screens.

- [ ] **Step 1: Write the mobile CSS**

At `max-width: 520px`, hide individual toolbar layer buttons until the menu opens, keep toolbar items on one line, style the menu as a compact panel, and make the info panel a bottom sheet.

- [ ] **Step 2: Add keyboard behavior**

Ensure Enter/Space activates the CTA and layer button, Escape closes the layer menu, and the existing skip-map link can move focus to the content.

- [ ] **Step 3: Run mobile contract and static checks**

Run `v3-mobile-contract.ps1`, `node --check v3.js`, and all existing PowerShell contracts.

### Task 6: Browser verification

**Files:**
- Create: `tests/browser-v3-smoke.ps1` if a repeatable wrapper is needed
- Create: `output/playwright/` artifacts only when capturing screenshots

**Interfaces:**
- Browser checks use the deployed root and `/v1/` URLs.

- [ ] **Step 1: Verify the deployed root in English**

Check the CTA, tour, year story, spotlight/zone drawer, heat, metro, evidence, planner, deal checker, shortlist, deep link, and keyboard path.

- [ ] **Step 2: Verify Turkish**

Switch to Turkish and confirm the requested labels, zone selection, metro distance wording, tour, and tools remain usable.

- [ ] **Step 3: Verify phone-sized interaction**

Use an iPhone-sized browser context at 360px to test tap, drag, layer menu, bottom sheet, and map interaction. Report this as emulation unless physical Safari is connected.

- [ ] **Step 4: Verify `/v1/` archive**

Confirm the archive note renders and old assets load without affecting root.

### Task 7: Publish the v3 root release

**Files:**
- Modify: tracked root, `data/`, `v1/`, and test files only

- [ ] **Step 1: Review scope and run all verification commands**

Run the full contract suite, JavaScript syntax checks, and browser checks before committing.

- [ ] **Step 2: Commit the intentional release**

Use commit message `Publish v3 single audience site and archive original`.

- [ ] **Step 3: Push/publish to GitHub Pages**

Publish the root app, `/v1/` archive, canonical data, and tests to `Qarait/Baku-2036` using the repository’s working GitHub path. Confirm the Pages deployment resolves at root and archive URLs.
