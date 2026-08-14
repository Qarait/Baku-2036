# Baku-wide 2026–2036 Simulation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a data-driven, phone-friendly Baku-wide 2026–2036 map story that animates existing transport, event, project, and evidence information without inventing annual price forecasts.

**Architecture:** Keep the existing MapLibre map and `setYear()` path as the single renderer for both manual year changes and autoplay. Add a small bilingual `simulation` block to the existing `data/content.json`, derive city events from the already loaded content and transport data, and render one temporary city-story card over the map. Keep the existing detailed zone tour available separately so the primary “Show me (1 minute)” action can become the Baku-wide story without removing an existing feature.

**Tech Stack:** Static HTML/CSS/JavaScript, MapLibre GL JS, shared JSON data, Playwright 1.62.1, GitHub Actions Pages deployment.

## Global Constraints

- Use the existing shared JSON data at runtime; do not create a second set of city facts.
- Show change through transport, projects, events, and evidence status.
- Do not invent annual property prices or turn scenario figures into measured forecasts.
- Keep planned and promised changes visibly different from completed changes.
- Use short plain-language explanations, with the map doing most of the storytelling.
- Preserve deep links, English/Turkish switching, selection panels, click-to-identify, metro distance wording, planner, deal checker, shortlist, keyboard access, and mobile layout.
- Rayon-specific simulations are out of scope for this implementation.
- Do not change existing analytical numbers or scenario figures.
- A successful load must have no console errors; a failed JSON load must produce an explicit visible error state.
- The primary story uses the checkpoints 2026, 2028, 2030, 2033, and 2036.

---

## File map

- Modify `data/content.json`: add bilingual city-story captions and autoplay control labels under each language object’s `simulation` property.
- Modify `index.html`: add a dedicated detailed-tour action only if the existing rendered content has no separate control; do not add a second first-screen onboarding block.
- Modify `v3.js`: add city-story state, checkpoint rendering, event features, autoplay controls, manual-interaction pause behaviour, and explicit loading/error handling while reusing `setYear()` and existing layers.
- Modify `v3.css`: style the city-story card, status cues, and controls without creating nested mobile scrolling; preserve the existing 360px toolbar and page-flow drawer rules.
- Modify `tests/e2e.spec.js`: add Baku-wide story, pause/continue/skip, bilingual caption, state-change, error-state, and regression coverage; update the primary CTA test to reflect the new city-wide story.
- Modify `README.md`: add the human iPhone release checks for the city story if the current checklist does not already cover them.
- Do not modify `data/metro.json`, `data/zones.json`, or boundary geometry unless a test exposes an existing regression. Their existing values are inputs to this feature, not new analysis.

## Data contract

Add the following object under both `en` and `tr` in `data/content.json`. The checkpoint keys and control keys must match exactly in both languages:

```json
"simulation": {
  "checkpoints": {
    "2026": "Start here: this is the 2026 picture.",
    "2028": "Early changes become visible around roads and nearby projects.",
    "2030": "A major checkpoint: new connections and visible projects give more areas a reason to watch.",
    "2033": "The story spreads: planned connections and activity reach farther across the map.",
    "2036": "2036 scenario: Baku is more connected, but each change has a different level of certainty."
  },
  "controls": {
    "pause": "Pause",
    "resume": "Continue",
    "skip": "Skip",
    "finish": "Explore the map",
    "progress": "City story year"
  }
}
```

Use these Turkish equivalents:

```json
"simulation": {
  "checkpoints": {
    "2026": "Buradan başlayın: bu, 2026 yılının görünüşüdür.",
    "2028": "Yollar ve yakındaki projeler çevresinde ilk değişiklikler görünür.",
    "2030": "Büyük bir aşama: yeni bağlantılar ve görünür projeler daha fazla alanı izlemeye değer kılar.",
    "2033": "Hikâye yayılır: planlanan bağlantılar ve hareketlilik haritanın daha uzağına ulaşır.",
    "2036": "2036 senaryosu: Bakü daha çok bağlantıya sahip, ancak her değişikliğin kesinlik düzeyi farklı."
  },
  "controls": {
    "pause": "Duraklat",
    "resume": "Devam et",
    "skip": "Atla",
    "finish": "Haritayı keşfet",
    "progress": "Şehir hikâyesi yılı"
  }
}
```

The renderer must read these strings through `atlasCopy().simulation`; no copy is hardcoded in `v3.js`.

### Task 1: Add the bilingual simulation data contract

**Files:**
- Modify: `data/content.json`
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Produces: `atlasCopy().simulation.checkpoints`, an object keyed by the five year strings.
- Produces: `atlasCopy().simulation.controls`, containing `pause`, `resume`, `skip`, `finish`, and `progress`.
- Consumes: existing `content.en` and `content.tr` hydration.

- [ ] **Step 1: Write the failing data-contract test**

Add a Playwright request test that parses `content.json` and checks both language objects:

```js
test('city simulation content has five bilingual checkpoints and controls', async ({ request }) => {
  const response = await request.get('./data/content.json');
  const content = await response.json();
  const years = ['2026', '2028', '2030', '2033', '2036'];
  for (const language of ['en', 'tr']) {
    expect(Object.keys(content[language].simulation.checkpoints)).toEqual(years);
    for (const year of years) expect(content[language].simulation.checkpoints[year]).not.toBe('');
    for (const key of ['pause', 'resume', 'skip', 'finish', 'progress']) {
      expect(content[language].simulation.controls[key]).not.toBe('');
    }
  }
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `npx playwright test tests/e2e.spec.js -g "city simulation content"`

Expected: FAIL because `simulation` is not present yet.

- [ ] **Step 3: Add the exact EN/TR `simulation` objects**

Insert the objects shown in the data contract above under `content.en` and `content.tr`, preserving valid JSON and all existing numbers/text.

- [ ] **Step 4: Run the contract test and JSON parse check**

Run: `npx playwright test tests/e2e.spec.js -g "city simulation content"`

Expected: PASS.

Run: `node -e "JSON.parse(require('fs').readFileSync('data/content.json','utf8')); console.log('content.json valid')"`

Expected: `content.json valid`.

- [ ] **Step 5: Commit the data contract**

```bash
git add data/content.json tests/e2e.spec.js
git commit -m "Add bilingual Baku simulation content"
```

### Task 2: Add year-aware city event and transport snapshots

**Files:**
- Modify: `v3.js` (`investmentFeatures`, `heatFeatures`, `metroLineFeatures`, `metroStationFeatures`, layer/source setup)
- Modify: `v3.css` only if an existing map status class needs a style for future/active items
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Produces: `cityEventFeatures(year)`, returning a GeoJSON feature array with `phase` values `active` or `future` and localized `label` properties.
- Produces: `citySimulationSnapshot(year)`, returning `{ year, activeEvents, futureEvents, builtLines, plannedLines, builtStations, plannedStations }` for DOM metadata and test assertions.
- Consumes: `atlasCopy().events`, `state.data.metro.lines`, `state.data.metro.stations`, and `state.year`.

- [ ] **Step 1: Write the failing snapshot test**

Add a browser test that starts at 2026, advances to 2030, and verifies the story state exposes a changed snapshot without asserting invented price values:

```js
test('city snapshot changes with the selected year', async ({ page }) => {
  await page.goto('./?cache=e2e-city-snapshot#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2026');
  const first = await page.locator('#cityStory').getAttribute('data-active-events');
  await page.locator('#cityStorySkip').click();
  await page.locator('#cityStorySkip').click();
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2030');
  const later = await page.locator('#cityStory').getAttribute('data-active-events');
  expect(later).not.toBe(first);
  await expect(page.locator('#cityStoryCaption')).not.toBeEmpty();
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx playwright test tests/e2e.spec.js -g "city snapshot changes"`

Expected: FAIL because the city-story element and snapshot renderer do not exist.

- [ ] **Step 3: Implement pure year-aware feature builders**

Add the following functions near the existing feature builders:

```js
function cityEventFeatures(year) {
  return (atlasCopy().events || []).map(event => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: event.ll },
    properties: {
      year: event.y,
      phase: event.y <= year ? 'active' : 'future',
      label: state.lang === 'tr' ? event.tr : event.en
    }
  }));
}

function citySimulationSnapshot(year) {
  const metro = state.data?.metro || { lines: [], stations: [] };
  const lines = metro.lines || [];
  const stations = metro.stations || [];
  const events = cityEventFeatures(year);
  return {
    year,
    activeEvents: events.filter(feature => feature.properties.phase === 'active').length,
    futureEvents: events.filter(feature => feature.properties.phase === 'future').length,
    builtLines: lines.filter(line => year >= line.builtYear).length,
    plannedLines: lines.filter(line => year < line.builtYear).length,
    builtStations: stations.filter(station => year >= station.builtYear).length,
    plannedStations: stations.filter(station => year < station.builtYear).length
  };
}
```

Keep the current line/station status properties so the existing solid-versus-dashed styles continue to distinguish built and planned items. Do not scale investment circles by year.

- [ ] **Step 4: Add the city-events source and layers**

Create one GeoJSON source named `city-events` and two layers named `city-events-active` and `city-events-future`. The active layer uses the existing strong event colour; the future layer uses a lighter, dashed/outlined treatment where MapLibre supports it. Both layers must expose the localized event label for the existing map popup or accessibility description.

Update `updateLayers()` and initial map setup so `city-events` is refreshed whenever `setYear()` or `setLanguage()` runs.

- [ ] **Step 5: Add a semantic snapshot to the story element**

When the city story is open, render `data-year`, `data-active-events`, `data-future-events`, `data-built-lines`, `data-planned-lines`, `data-built-stations`, and `data-planned-stations` from `citySimulationSnapshot(state.year)`. These attributes are also useful for screen-reader status text and stable tests.

- [ ] **Step 6: Run the snapshot and full current tests**

Run: `npx playwright test tests/e2e.spec.js -g "city snapshot changes"`

Expected: PASS.

Run: `npm test`

Expected: existing tests remain green before the autoplay controls are changed.

- [ ] **Step 7: Commit year-aware map snapshots**

```bash
git add v3.js v3.css tests/e2e.spec.js
git commit -m "Render year-aware Baku city snapshots"
```

### Task 3: Build the city-story card and autoplay state

**Files:**
- Modify: `v3.js` (`setYear`, `installControls`, new city-story functions, existing `finishTour` interaction)
- Modify: `v3.css`
- Modify: `index.html` only if a separate detailed-tour button is needed in the rendered time-machine content
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Produces: `startCityStory()`, `pauseCityStory()`, `resumeCityStory()`, `skipCityStory()`, `finishCityStory()`.
- Produces: one temporary `#cityStory` element containing `#cityStoryCaption`, `#cityStoryPause`, `#cityStorySkip`, and `#cityStoryFinish`.
- Consumes: `setYear(year)`, `atlasCopy().simulation`, `citySimulationSnapshot(year)`, and existing `setEngaged(true)`.

- [ ] **Step 1: Write the failing primary-action and control tests**

Add tests for the five checkpoint sequence and controls:

```js
test('Show me starts the Baku-wide city story', async ({ page }) => {
  await page.goto('./?cache=e2e-city-story');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await expect(page.locator('#cityStory')).toBeVisible();
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2026');
  await expect(page.locator('#cityStoryCaption')).toContainText('Start here');
});

test('city story can pause, continue, skip, and finish', async ({ page }) => {
  await page.goto('./?cache=e2e-city-controls');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await page.locator('#cityStoryPause').click();
  await expect(page.locator('#cityStoryPause')).toHaveText('Continue');
  await page.locator('#cityStoryPause').click();
  await expect(page.locator('#cityStoryPause')).toHaveText('Pause');
  await page.locator('#cityStorySkip').click();
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2028');
  await page.locator('#cityStoryFinish').click();
  await expect(page.locator('#cityStory')).toHaveCount(0);
  await expect(page.locator('#yearSelect')).toHaveValue('2028');
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx playwright test tests/e2e.spec.js -g "city story"`

Expected: FAIL because `showMe` still calls `startTour()` and the city-story controls do not exist.

- [ ] **Step 3: Add explicit city-story state and functions**

Extend the existing state with:

```js
cityStory: { active: false, paused: false, index: 0, timer: null }
```

Use the exact function contract below:

```js
const CITY_STORY_YEARS = [2026, 2028, 2030, 2033, 2036];
const CITY_STORY_INTERVAL_MS = 12000;

function startCityStory() { /* create card, set index 0, setYear(2026), start timer */ }
function pauseCityStory() { /* clear timer and set paused true */ }
function resumeCityStory() { /* set paused false and restart timer */ }
function skipCityStory() { /* move to the next checkpoint or show the final state */ }
function finishCityStory() { /* clear timer, remove card, resize map, preserve current year */ }
```

`startCityStory()` must call `setEngaged(true)`, pause any existing detailed tour, and never start two timers. `finishCityStory()` must leave the current year unchanged; the final checkpoint must therefore remain 2036 when the story reaches its end.

- [ ] **Step 4: Render the city-story card from shared content**

Render a card inside `.map-stage` with the following structure and no hardcoded visible copy:

```html
<section id="cityStory" role="region" aria-live="polite" aria-label="City story year">
  <div class="city-story-kicker">2030</div>
  <p id="cityStoryCaption">...</p>
  <div class="city-story-actions">
    <button id="cityStoryPause" type="button">Pause</button>
    <button id="cityStorySkip" type="button">Skip</button>
    <button id="cityStoryFinish" type="button">Explore the map</button>
  </div>
</section>
```

The actual implementation may build the same structure with `innerHTML`, matching existing project patterns, but all user-visible labels must come from `atlasCopy().simulation.controls`.

- [ ] **Step 5: Wire the primary CTA and preserve the detailed tour**

Change only the `#showMe` listener to call `startCityStory()`. Keep `startTour()` and its five zone stops intact. If no existing control exposes `startTour()`, add one secondary button in the existing time-machine/tool area with the existing bilingual `ui.tourBtn` label and `id="zoneTourStart"`; do not place it above the map or beside the first-screen CTA.

Update the existing tour test to click `#zoneTourStart` when that button is present, then continue through the five `[data-tour-next]` buttons and verify `#tourOverlay` is removed.

- [ ] **Step 6: Pause autoplay on manual interaction**

When the visitor uses `timeYear`, `yearSelect`, language buttons, a map click, a zone selection, or search, call `pauseCityStory()` if the city story is active. The card remains visible and updates to the selected year; the visitor can continue or finish it.

- [ ] **Step 7: Style the card without nested mobile scrolling**

Add styles that:

- keep the card inside `.map-stage` and above the map;
- cap text width so it remains readable at 360px;
- keep controls on one line where possible and allow only the card’s action row to wrap;
- do not add `overflow-y: auto` to the card or `.map-stage`;
- respect the existing safe-area padding;
- preserve map dragging outside the card.

- [ ] **Step 8: Run the city-story tests**

Run: `npx playwright test tests/e2e.spec.js -g "city story|Baku-wide"`

Expected: PASS for start, pause, continue, skip, finish, and preserved detailed tour.

- [ ] **Step 9: Commit the city-story interaction**

```bash
git add index.html v3.js v3.css tests/e2e.spec.js
git commit -m "Add Baku-wide city story controls"
```

### Task 4: Connect manual year changes, language, and loading/error states

**Files:**
- Modify: `v3.js` (`setYear`, `setLanguage`, `boot`, data hydration and status rendering)
- Modify: `v3.css`
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Produces: `renderCityStory()` that updates caption, year, snapshot attributes, and localized control labels.
- Produces: `setMapStatus(kind, message)` with `kind` values `loading`, `ready`, and `error`.
- Consumes: existing `#mapStatus`, `#dataFreshness`, and retry/data-loading path.

- [ ] **Step 1: Write the failing manual/language/error tests**

```js
test('dragging the year updates the city story caption and map snapshot', async ({ page }) => {
  await page.goto('./?cache=e2e-city-manual#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await page.locator('#yearSelect').selectOption('2033');
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2033');
  await expect(page.locator('#cityStoryCaption')).toContainText('story spreads');
});

test('city story controls and caption switch to Turkish', async ({ page }) => {
  await page.goto('./?cache=e2e-city-tr#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await page.locator('#langTr').click();
  await expect(page.locator('#cityStoryPause')).toHaveText('Duraklat');
  await expect(page.locator('#cityStoryCaption')).toContainText('Buradan başlayın');
});

test('city simulation data failure is visible and retryable', async ({ page }) => {
  await page.route('**/data/content.json*', route => route.fulfill({ status: 503, body: 'temporary failure' }));
  await page.goto('./?cache=e2e-city-error#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText('couldn’t load');
  await expect(page.locator('#mapStatus')).toContainText('refresh');
  page.__browserErrors = [];
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npx playwright test tests/e2e.spec.js -g "city story caption|city simulation data failure|dragging the year"`

Expected: FAIL because `setYear()` does not update the new story card and the city-specific error state is not covered.

- [ ] **Step 3: Make `setYear()` the single update path**

Keep the existing public signature `setYear(year)`. After normalizing the year, it must continue to call `updateLayers()`, `renderPanel()`, and hash/time-control updates, then additionally call `renderCityStory()` when the city story is active. Do not duplicate year logic inside the autoplay timer.

- [ ] **Step 4: Localize the active city story in `setLanguage()`**

After the existing language UI refresh, call `renderCityStory()` when active. Preserve `state.year`, `state.selected`, and the deep-link hash. Update the event layer labels through `cityEventFeatures(state.year)`.

- [ ] **Step 5: Add explicit loading, ready, and error status**

Set `#mapStatus` to the localized loading message before the `Promise.all` data load. On success, set the existing ready message. On any required JSON failure, add the `error` class, show the existing plain-language refresh guidance, remove/disable city-story controls, and render a retry button that invokes the same boot/data-load function. The error path must not silently fall back to an empty city story.

- [ ] **Step 6: Run focused and full tests**

Run: `npx playwright test tests/e2e.spec.js -g "city story caption|city simulation data failure|dragging the year"`

Expected: PASS.

Run: `npm test`

Expected: PASS with no browser errors.

- [ ] **Step 7: Commit interaction and error handling**

```bash
git add v3.js v3.css tests/e2e.spec.js
git commit -m "Connect city story to language and error states"
```

### Task 5: Preserve existing atlas features and mobile behaviour

**Files:**
- Modify: `tests/e2e.spec.js`
- Modify: `v3.js` only for narrowly scoped event-listener cleanup discovered by regression tests
- Modify: `v3.css` only for scoped city-story/mobile fixes
- Modify: `README.md` if the human checklist needs the city-story check

**Interfaces:**
- Consumes: all existing public UI functions and selectors.
- Produces: no new analytical data; regression evidence that the Baku-wide story does not break existing features.

- [ ] **Step 1: Add a regression test for deep links and zone selection after the story**

```js
test('deep-linked zone remains selectable after the city story finishes', async ({ page }) => {
  await page.goto('./?cache=e2e-city-regression#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Göster (1 dakika)' }).click();
  await page.locator('#cityStoryFinish').click();
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#yearSelect')).toHaveValue('2030');
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
});
```

- [ ] **Step 2: Run the regression test and record any failure**

Run: `npx playwright test tests/e2e.spec.js -g "deep-linked zone remains"`

Expected: FAIL only if the new story leaves an overlay, changes the deep-link year, or loses language state.

- [ ] **Step 3: Run the complete existing feature suite**

Run: `npm test`

Expected: PASS for zone JSON content, close/reopen, source insight, EN/TR switching, deal checker, deep link, all five data files, click-to-identify, 360px toolbar, and mobile page-flow scrolling.

- [ ] **Step 4: Run static contract checks**

Run:

```powershell
./tests/v2-content-contract.ps1
./tests/v2-foundation-contract.ps1
./tests/v3-mobile-contract.ps1
./tests/v3-single-audience-contract.ps1
```

Expected: all scripts exit successfully and no visible version wording is introduced.

- [ ] **Step 5: Review the 360px layout in a real browser**

Run: `npm run test:headed -- --project=chromium`

Check manually at 360px that the story card does not cover the Layers button, the map remains draggable outside the card, and the zone drawer still uses one page scroll. Do not add an inner scroll container to solve a layout issue.

- [ ] **Step 6: Commit regression protection and release checklist updates**

```bash
git add tests/e2e.spec.js README.md v3.js v3.css
git commit -m "Verify city story preserves atlas interactions"
```

### Task 6: Final verification and preview handoff

**Files:**
- No planned source changes; only test artifacts are expected.

- [ ] **Step 1: Run the full local verification**

Run:

```powershell
npm test
git diff --check HEAD~1
node -e "JSON.parse(require('fs').readFileSync('data/content.json','utf8')); JSON.parse(require('fs').readFileSync('data/metro.json','utf8')); JSON.parse(require('fs').readFileSync('data/places.json','utf8')); JSON.parse(require('fs').readFileSync('data/zones.json','utf8')); JSON.parse(require('fs').readFileSync('data/admin-absheron.geojson','utf8')); console.log('all runtime JSON valid')"
```

Expected: all Playwright tests pass, no whitespace errors, and `all runtime JSON valid` is printed.

- [ ] **Step 2: Inspect the final diff against the design**

Confirm:

- only the existing shared JSON and the listed runtime/test/style/docs files changed;
- no annual price series or new market claims were added;
- planned/company items remain visually distinct;
- `Show me` starts the Baku-wide story;
- the detailed zone tour remains reachable;
- the existing `/v1/` archive and root product are untouched except for the intended root feature;
- no hardcoded simulation copy or coordinates exist in `v3.js`.

- [ ] **Step 3: Push to the preview branch only**

Use the repository’s existing preview workflow after local checks pass:

```bash
git push origin HEAD:preview
```

Open the generated preview Pages URL on a real iPhone and manually confirm map tiles, pinch/drag, city-story playback, pause/continue, language switching, deep link, zone selection, and the six-line release checklist. Do not promote to `main` in this implementation plan.

- [ ] **Step 4: Report the verification evidence**

Record the local test count, preview CI run, preview Pages URL, and any human-only iPhone checks that remain. If a failure occurs, fix the smallest scoped issue and rerun the relevant focused test before rerunning the full suite.
