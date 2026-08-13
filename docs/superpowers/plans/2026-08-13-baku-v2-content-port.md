# Baku 2036 v2 Content Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port v1’s narrative and decision tools into v2 while keeping the MapLibre map as the hero and making every secondary capability discoverable through simple collapsible sections.

**Architecture:** Extract v1’s zone briefs and interface copy into structured v2 JSON, then make the map, selected-place drawer, planner, time machine, deal checker, shortlist, and accordions consume that shared model. The v2 page keeps one accessible content shell below the map; its controller owns state, while existing geographic data remains in separate files.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, MapLibre GL JS, GeoJSON, JSON, PowerShell contract tests, and real-browser smoke testing.

## Global Constraints

- The root v1 site remains a stable artifact; do not modify `index.html` or its embedded base64 image.
- The map remains the first and largest v2 surface.
- The primary user is a non-technical first-time visitor; headings and controls use plain language.
- Technical accuracy is preserved through shared zone data, explicit built/funded/planned/scenario statuses, source notes, and the distinction between rayon boundaries and approximate investment areas.
- On mobile and desktop, only one secondary accordion section is open at a time.
- Preserve EN/TR, v2 hash state, local shortlist/checklist persistence, reduced motion, keyboard access, and map-first deep links.
- No server, database, tracking, geocoder, routing service, or new runtime dependency.

---

### Task 1: Lock the v2 content contract

**Files:**
- Create: `tests/v2-content-contract.ps1`
- Test: `tests/v2-content-contract.ps1`

**Interfaces:**
- Consumes: `v2/index.html`, `v2/v2.js`, `v2/data/zones.json`, and `v2/data/content.json`.
- Produces: a static contract that later tasks must satisfy.

- [ ] **Step 1: Write the failing test**

Assert that the v2 page contains:

```powershell
@(
  'v2HowTo', 'v2Content', 'v2ZoneDrawer', 'accordion-time',
  'accordion-scenarios', 'accordion-planner', 'accordion-deal',
  'accordion-shortlist', 'accordion-sources'
) | ForEach-Object {
  if ($html -notlike "*id=\"$_\"*") { throw "Missing v2 content surface: $_" }
}
```

Assert that the controller contains `renderZoneDrawer`, `renderTimeMachine`, `renderScenarios`, `renderPlanner`, `renderDealChecker`, `renderShortlist`, and `setAccordion`.

Assert that `zones.json` contains exactly 16 unique ids, EN/TR names, `en`, `tr`, and `dd` content, and that every zone has `risk`, `act`, and `inv` fields.

Assert that `content.json` contains `en` and `tr`, each with the accordion labels, plain-language explanations, and disclaimer copy.

- [ ] **Step 2: Run test to verify it fails**

Run: `& .\tests\v2-content-contract.ps1`

Expected: FAIL because the new content files, content shell, and renderer functions do not yet exist.

- [ ] **Step 3: Commit the failing contract**

```powershell
git add tests/v2-content-contract.ps1
git commit -m "Add v2 content port contract"
```

### Task 2: Create the shared v2 content data

**Files:**
- Create: `v2/data/zones.json`
- Create: `v2/data/content.json`
- Modify: `v2/data/SOURCES.md`
- Test: `tests/v2-content-contract.ps1`

**Interfaces:**
- Consumes: v1’s `Z`, `UI`, `REASONS`, `PROFILES`, `MED`, `MINT`, `KIND`, and due-diligence data from `index.html`.
- Produces: JSON objects loaded by `loadContentData()` and consumed by every v2 renderer.

- [ ] **Step 1: Extract v1 data without editing v1**

Use a read-only Node extraction command to evaluate the balanced `const Z = [...]` and `const UI = {...}` literals from v1, normalize malformed display encoding only in the generated v2 files, and write JSON. Add the v1-derived reason, profile, budget, deal-comparison, and item-type fields needed by v2.

- [ ] **Step 2: Add the v2 content metadata**

Create `content.json` with this stable shape:

```json
{
  "en": {
    "howTo": { "title": "How to use this map", "steps": [] },
    "sections": { "time": {}, "scenarios": {}, "planner": {}, "deal": {}, "shortlist": {}, "sources": {} },
    "labels": {},
    "disclaimer": "..."
  },
  "tr": { "howTo": {}, "sections": {}, "labels": {}, "disclaimer": "..." }
}
```

Keep labels user-facing and short. Put technical explanation text in `whatThisMeans` fields rather than in button names.

- [ ] **Step 3: Add provenance**

Document that the structured zone and interface copy are derived from v1’s August 2026 atlas content, while geography remains sourced from the existing v2 files. Document that scenario values remain illustrative, not forecasts.

- [ ] **Step 4: Run the contract**

Run: `& .\tests\v2-content-contract.ps1`

Expected: FAIL only on the missing v2 markup/controller functions.

- [ ] **Step 5: Commit the data layer**

```powershell
git add v2/data/zones.json v2/data/content.json v2/data/SOURCES.md
git commit -m "Add shared v2 atlas content data"
```

### Task 3: Add the map-first content shell and accordion behavior

**Files:**
- Modify: `v2/index.html`
- Modify: `v2/v2.css`
- Modify: `v2/v2.js`
- Test: `tests/v2-content-contract.ps1`

**Interfaces:**
- Consumes: `content.json` and the current map state.
- Produces: `setAccordion(sectionId)`, `renderHowTo()`, `renderZoneDrawer()`, `renderAllContent()`, and accessible `data-accordion` controls.

- [ ] **Step 1: Add the content markup**

After the map shell, add:

```html
<section id="v2HowTo" class="v2-howto" aria-labelledby="howToTitle"></section>
<section id="v2Content" class="v2-content" aria-label="Baku 2036 tools">
  <article id="accordion-time" class="v2-accordion"></article>
  <article id="accordion-scenarios" class="v2-accordion"></article>
  <article id="accordion-planner" class="v2-accordion"></article>
  <article id="accordion-deal" class="v2-accordion"></article>
  <article id="accordion-shortlist" class="v2-accordion"></article>
  <article id="accordion-sources" class="v2-accordion"></article>
</section>
```

Each article has one button summary, `aria-expanded`, `aria-controls`, a short description, and a body region. The selected-place drawer remains visually attached to the map panel, not buried below the tools.

- [ ] **Step 2: Add plain-language styling**

Use large summary rows, visible section descriptions, 44px minimum controls, strong focus rings, generous spacing, and a mobile bottom-sheet treatment for the selected-place drawer. The map hero must remain visually dominant above the fold.

- [ ] **Step 3: Add one-open accordion state**

Implement `setAccordion(sectionId)` so it closes all other bodies, toggles the requested body, updates `aria-expanded`, and preserves the selected map state. If the user opens a section from a zone drawer action, scroll only that section into view when reduced motion is off.

- [ ] **Step 4: Run the contract**

Run: `& .\tests\v2-content-contract.ps1`

Expected: FAIL only on the tool renderer functions not yet being wired.

- [ ] **Step 5: Commit the shell**

```powershell
git add v2/index.html v2/v2.css v2/v2.js
git commit -m "Add v2 map-first content shell"
```

### Task 4: Port the selected-place briefs and core explanatory copy

**Files:**
- Modify: `v2/v2.js`
- Modify: `v2/v2.css`
- Test: `tests/v2-content-contract.ps1`

**Interfaces:**
- Consumes: `zones.json`, selected map coordinates, `state.lang`, `state.year`, and existing `identifyLocation()`.
- Produces: `renderZoneDrawer(zoneId)`, shared zone labels, status badges, and due-diligence checklist rendering.

- [ ] **Step 1: Write the failing renderer assertions**

Extend the contract to require that the v2 controller references `entry`, `proj`, `yield`, `thesis`, `risk`, `act`, `inv`, `dd`, `whatThisMeans`, and status labels.

- [ ] **Step 2: Implement the drawer**

When a zone is selected, render the v1 brief into the v2 drawer using the shared JSON. Show the zone tier, entry range, scenario label, yield, project rows, thesis, risk, action, and checklist. Use plain labels such as “What is happening?” and “What could go wrong?” while retaining the detailed technical content inside.

- [ ] **Step 3: Preserve state on language changes**

`setLanguage()` must re-render the open zone drawer and all visible accordion summaries without clearing the selected zone, map year, heat/metro state, shortlist, or checklist data.

- [ ] **Step 4: Run the contract and existing tests**

Run:

```powershell
& .\tests\v2-content-contract.ps1
& .\tests\v2-foundation-contract.ps1
```

Expected: PASS.

- [ ] **Step 5: Commit the drawer**

```powershell
git add v2/v2.js v2/v2.css tests/v2-content-contract.ps1
git commit -m "Port v2 zone briefs and due diligence"
```

### Task 5: Port the time machine, scenarios, planner, deal checker, and shortlist

**Files:**
- Modify: `v2/v2.js`
- Modify: `v2/v2.css`
- Test: `tests/v2-content-contract.ps1`

**Interfaces:**
- Consumes: shared zones and UI data from Task 2, accordion state from Task 3, and current map state.
- Produces: `renderTimeMachine()`, `renderScenarios()`, `renderPlanner()`, `renderDealChecker()`, `renderShortlist()`, `setScenario()`, `setBudget()`, `checkDeal()`, and local shortlist persistence.

- [ ] **Step 1: Write the failing tool assertions**

Require each renderer name in v2/v2.js plus the visible input labels and result containers inside their accordion bodies.

- [ ] **Step 2: Implement the time machine**

Render a 2026–2036 range input and play button. Changing the year calls the existing `setYear()`, updates map metro visibility and the selected-place brief, and narrates the year in plain words. Respect reduced motion and never call a live external service.

- [ ] **Step 3: Implement scenarios**

Add three select controls for oil, infrastructure, and currency. Recalculate displayed scenario figures only; label the result as sensitivity, not forecast. Keep selections in v2 state and update the current zone brief.

- [ ] **Step 4: Implement planner and deal checker**

Port buyer profiles, budget filtering, three outcomes, and the listing check. Use numeric validation that returns an understandable inline message for missing/invalid price or area and never resets the map.

- [ ] **Step 5: Implement shortlist persistence**

Port starring and amount comparison using local storage key `baku2036-v2-shortlist`. Show total amount, rough scenario result, and concentration warning without presenting it as financial advice.

- [ ] **Step 6: Run tests**

Run:

```powershell
& .\tests\v2-content-contract.ps1
& .\tests\v2-foundation-contract.ps1
```

Expected: PASS.

- [ ] **Step 7: Commit the tools**

```powershell
git add v2/v2.js v2/v2.css tests/v2-content-contract.ps1
git commit -m "Port v2 atlas decision tools"
```

### Task 6: Verify the complete v2 content experience

**Files:**
- Modify: `tests/v2-content-contract.ps1` only if a verified contract gap is found.

**Interfaces:**
- Consumes: the complete v2 app.
- Produces: fresh static, browser, deployment, and byte-integrity evidence.

- [ ] **Step 1: Run static checks**

Run:

```powershell
node --check v2\v2.js
& .\tests\v2-content-contract.ps1
& .\tests\v2-foundation-contract.ps1
$head=(git rev-parse HEAD:index.html)
$work=(git hash-object -- index.html)
if($head -ne $work){throw 'root index.html changed'}
```

- [ ] **Step 2: Run a real-browser desktop flow**

Open `/v2/`, click a zone, open each accordion, switch EN/TR, move the year, toggle heat and metro, run the planner, enter a deal, star a shortlist zone, and confirm no console errors.

- [ ] **Step 3: Run a mobile flow**

At 390×844, verify that the map remains usable, one accordion opens at a time, the drawer is readable, controls remain reachable, and the same core interactions produce no console errors.

- [ ] **Step 4: Verify GitHub Pages**

Push `main`, request `https://qarait.github.io/Baku-2036/v2/`, and confirm HTTP 200 plus the content marker. Re-run the published page browser smoke test.

- [ ] **Step 5: Commit any test-only correction and report evidence**

Do not claim completion until the final command output confirms all static tests pass, the root hash matches, the deployed URL returns 200, and browser console output is clean.

