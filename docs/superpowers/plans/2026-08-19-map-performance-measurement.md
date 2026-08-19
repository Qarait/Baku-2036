# Map Startup Performance Measurement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Instrument the existing Baku 2036 map boot path and produce reproducible cold/warm median and p90 measurements before deciding whether progressive map boot is warranted.

**Architecture:** Keep the application boot sequence unchanged and add a small diagnostics recorder inside the existing v3 IIFE. The Playwright measurement script reads the browser Performance API and the recorder's compact mark list, classifies resource timing entries, and summarizes numeric values with a nearest-rank p90. A committed report records the observed result and applies the spec's explicit refactor gate.

**Tech Stack:** Vanilla JavaScript, browser Performance API, Node.js node:test, Playwright Chromium/WebKit, the existing static HTTP server.

**Spec:** docs/superpowers/specs/2026-08-19-map-performance-measurement.md

## Global Constraints

- Preserve existing startup behavior and all map data/calculations.
- Emit the exact stable marks listed in the specification.
- Keep resource timing raw entries per run and classify them as specified.
- Report count, median, p90, min, and max for numeric metrics.
- Use the nearest-rank p90 rule: rank ceil(0.90 * count).
- Do not refactor boot ordering unless both decision-gate thresholds are met.
- Do not deploy or modify the existing mobile/video PR.

---

### Task 1: Establish the isolated measurement worktree and baseline dependencies

**Files:**
- No source files; worktree: C:\Users\Loritamus\Documents\Codex\2026-08-13\co\worktrees\baku-performance-measurement

**Interfaces:**
- Consumes: preview branch at the start of this task.
- Produces: a clean agent/map-performance-measurement worktree with the lockfile dependencies available.

- [ ] Step 1: Verify the worktree is based on preview and does not contain the mobile/video changes.

Run:

~~~powershell
git status --short --branch
git log --oneline -1
git diff --stat preview..HEAD
~~~

Expected: branch agent/map-performance-measurement, HEAD equals the current preview tip, and the diff is empty.

- [ ] Step 2: Install the declared dependencies from the lockfile.

Run:

~~~powershell
npm ci
~~~

Expected: @playwright/test is available in node_modules and no source files are changed.

- [ ] Step 3: Run the existing smoke suite before edits.

Run:

~~~powershell
npm test
~~~

Expected: the existing preview suite passes; if dependency installation or browser binaries are missing, record that environment failure and resolve it before judging application behavior.

### Task 2: Add the failing browser instrumentation contract

**Files:**
- Modify: tests/e2e.spec.js
- Modify: playwright.config.js only if a test timeout must be made explicit; do not change it otherwise.

**Interfaces:**
- Consumes: the running app's #mapStatus ready state.
- Produces: a browser test that requires window.__bakuPerformance.marks and the exact baku:* Performance API marks.

- [ ] Step 1: Add a test named map startup exposes phase marks.

Add this test after the existing root-load test:

~~~js
test('map startup exposes phase marks', async ({ page }) => {
  await page.goto('./?cache=e2e-performance');
  await waitForMap(page);
  const diagnostics = await page.evaluate(() => ({
    marks: window.__bakuPerformance?.marks || [],
    performanceMarks: performance.getEntriesByType('mark').map(entry => entry.name)
  }));
  const names = [
    'boot-start', 'data-fetch-start', 'data-fetch-end', 'data-hydrated',
    'admin-centroids-start', 'admin-centroids-end', 'style-build-start',
    'style-build-end', 'map-constructor-start', 'map-constructor-end',
    'map-load', 'boot-ready'
  ];
  expect(diagnostics.marks.map(mark => mark.name)).toEqual(expect.arrayContaining(names));
  expect(diagnostics.performanceMarks).toEqual(expect.arrayContaining(names.map(name => 'baku:' + name)));
  expect(diagnostics.marks.every(mark => Number.isFinite(mark.timeMs))).toBeTruthy();
});
~~~

- [ ] Step 2: Run only the new test to verify it fails for the missing diagnostics.

Run:

~~~powershell
npx playwright test tests/e2e.spec.js -g "map startup exposes phase marks"
~~~

Expected: FAIL because the application does not yet expose window.__bakuPerformance or the required marks.

### Task 3: Implement compact startup marks in v3.js

**Files:**
- Modify: v3.js near the constants for the recorder and near adminLabelFeatures, createStyle, installMap, loadData, and boot for phase boundaries.

**Interfaces:**
- Consumes: the browser performance.mark() API and the existing boot functions.
- Produces: window.__bakuPerformance = { version: 1, marks: [] } plus recordPerformanceMark(name, detail) behavior and the twelve required marks.

- [ ] Step 1: Add the minimal recorder before application boot executes.

Insert a recorder near the top of the IIFE:

~~~js
  const performanceDiagnostics = window.__bakuPerformance = {
    version: 1,
    marks: []
  };

  function recordPerformanceMark(name, detail) {
    const markName = 'baku:' + name;
    const timeMs = window.performance.now();
    window.performance.mark(markName);
    performanceDiagnostics.marks.push({ name, timeMs, ...(detail ? { detail } : {}) });
  }
~~~

The detail values must be small scalars or counts only.

- [ ] Step 2: Instrument data completion and preprocessing.

Add recordPerformanceMark('data-fetch-start') immediately before the five fetch calls; add recordPerformanceMark('data-fetch-end', { files: 5 }) after Promise.all resolves and JSON parsing completes; add recordPerformanceMark('data-hydrated', { zones: zones.length }) after hydrateZones() and hash validation.

Wrap adminLabelFeatures() with admin-centroids-start and admin-centroids-end, recording only the output feature count on the end mark.

- [ ] Step 3: Instrument style construction, MapLibre construction, load, and ready.

In createStyle(data), record style-build-start before constructing the object and style-build-end immediately after the object is constructed, preserving the returned style object.

In installMap(), record map-constructor-start immediately before new maplibregl.Map(...) and map-constructor-end immediately after it returns. At the first line of the MapLibre load callback record map-load; after the existing updateLayers(); renderPanel(); calls record boot-ready immediately before interaction handlers and initial fit behavior continue.

- [ ] Step 4: Run the focused browser contract.

Run:

~~~powershell
npx playwright test tests/e2e.spec.js -g "map startup exposes phase marks"
~~~

Expected: PASS, with no browser errors.

### Task 4: Extend the measurement runner with resource timing and p90

**Files:**
- Modify: scripts/measure-performance.js
- Create: tests/measure-performance.test.js

**Interfaces:**
- Consumes: window.__bakuPerformance.marks, browser Performance API resource entries, and existing response timing collection.
- Produces: per-run marks, resources, and resourceSummary, plus p90 in every numeric summary.

- [ ] Step 1: Add failing Node tests for p90 and resource classification.

Create tests/measure-performance.test.js:

~~~js
const assert = require('node:assert/strict');
const test = require('node:test');

const { classifyResource, summarizeRuns } = require('../scripts/measure-performance.js');

test('summarizeRuns reports nearest-rank p90', () => {
  assert.deepEqual(summarizeRuns([12, 4, 8, 20, 16, 24, 28, 32, 36, 40]), {
    count: 10, median: 22, p90: 40, min: 4, max: 40
  });
  assert.deepEqual(summarizeRuns([Number.NaN, 9]), {
    count: 1, median: 9, p90: 9, min: 9, max: 9
  });
});

test('classifyResource separates the measured resource classes', () => {
  assert.equal(classifyResource('http://127.0.0.1/data/admin-absheron.geojson', 'fetch'), 'data');
  assert.equal(classifyResource('pmtiles://assets/baku-absheron.pmtiles', 'other'), 'pmtiles');
  assert.equal(classifyResource('http://127.0.0.1/assets/glyphs/noto/0-255.pbf', 'other'), 'glyph');
  assert.equal(classifyResource('http://127.0.0.1/v3.js', 'script'), 'script');
  assert.equal(classifyResource('http://127.0.0.1/v3.css', 'link'), 'stylesheet');
});
~~~

- [ ] Step 2: Run the Node tests to verify they fail.

Run:

~~~powershell
node --test tests/measure-performance.test.js
~~~

Expected: FAIL because summarizeRuns() has no p90 and classifyResource() does not exist.

- [ ] Step 3: Implement deterministic p90 and resource classification.

Update summarizeRuns() to return count, median, p90, min, and max and use sorted[Math.ceil(sorted.length * 0.9) - 1] for p90. Add classifyResource(url, initiatorType) using the exact category precedence in the specification.

- [ ] Step 4: Collect diagnostics and resource entries after the page is ready.

In measurePage(), after the existing ready wait and 250 ms settling delay, evaluate the raw resource fields and the diagnostics object. Classify the raw entries in Node before writing output. Use the baku:boot-ready entry time for mapReadyMs, falling back to performance.now() only if the mark is absent so a broken diagnostic cannot be mistaken for a measured ready time.

Aggregate resources by category into count, total transfer size, total encoded size, total decoded size, and total duration while retaining the raw per-run list.

- [ ] Step 5: Run both focused test files.

Run:

~~~powershell
node --test tests/measure-performance.test.js
npx playwright test tests/e2e.spec.js -g "map startup exposes phase marks"
~~~

Expected: both pass.

### Task 5: Run the sample matrix and write the evidence report

**Files:**
- Modify: scripts/serve-static.js to accept an opt-in cache-control policy while retaining no-store by default.
- Modify: scripts/measure-performance.js to prime the persistent warm context before counted runs.
- Create: docs/performance/2026-08-19-map-startup.md
- Generated locally, not committed unless useful for reproduction: output/performance/*.json

**Interfaces:**
- Consumes: the instrumented application and scripts/measure-performance.js.
- Produces: Chromium/WebKit cold and warm sample JSON plus a concise report applying the spec's decision gate.

- [ ] Step 1: Add explicit cold/warm server and runner semantics.

The server must keep no-store as its default and accept `--cache-control <value>` for measurement-only runs. The runner must make one uncounted ready navigation in the persistent warm context before collecting its ten warm samples. Cold runs keep a fresh context per sample.

- [ ] Step 2: Start the static server and verify the target URL.

Run:

~~~powershell
node scripts/serve-static.js --port 8123
node scripts/serve-static.js --port 8124 --cache-control public,max-age=3600
~~~

Keep both processes running. Use port 8123 for cold samples and port 8124 for warm samples.

- [ ] Step 3: Run ten cold and ten warm samples in Chromium and WebKit.

Run these four commands from a second terminal while the server is running:

~~~powershell
node scripts/measure-performance.js --url http://127.0.0.1:8123/?measure=2026-08-19 --browser chromium --cache cold --runs 10 --output output/performance/chromium-cold.json
node scripts/measure-performance.js --url "http://127.0.0.1:8124/?measure=2026-08-19&cache=warm" --browser chromium --cache warm --runs 10 --output output/performance/chromium-warm.json
node scripts/measure-performance.js --url http://127.0.0.1:8123/?measure=2026-08-19 --browser webkit --cache cold --runs 10 --output output/performance/webkit-cold.json
node scripts/measure-performance.js --url "http://127.0.0.1:8124/?measure=2026-08-19&cache=warm" --browser webkit --cache warm --runs 10 --output output/performance/webkit-warm.json
~~~

Expected: run the server with `--cache-control public,max-age=3600`; all counted runs reach the ready status; JSON includes the twelve marks, categorized resources, and summaries with median and p90.

- [ ] Step 4: Inspect the Chromium cold sample for diagnostic completeness.

Run:

~~~powershell
$sample = Get-Content -Raw output/performance/chromium-cold.json | ConvertFrom-Json
$sample.runs[0].marks | Format-Table
$sample.runs[0].resourceSummary | Format-List
$sample.summaries | Format-List
~~~

Expected: data, pmtiles, glyph, script, and stylesheet categories are present when the browser requested them; every required mark has a finite time.

- [ ] Step 5: Write the report from the recorded numbers.

The report must include sample counts, Chromium and WebKit median/p90 for ttfbMs, fcpMs, lcpMs, mapReadyMs, dataFetchMs, hydrationMs, adminCentroidsMs, styleBuildMs, mapConstructorMs, and mapLoadAfterConstructorMs, plus the largest resource categories by transfer size. It must state that the measurements are local-loopback, and whether the data-wait/preprocessing interval meets both thresholds: at least 500 ms and at least 25% of Chromium median map-load time.

- [ ] Step 6: Stop before architectural refactoring if the gate is not met.

If the gate is not met, leave v3.js behavior unchanged apart from marks and commit the instrumentation/report. If the gate is met, do not refactor in this branch; report the evidence and create a follow-up plan specifically for progressive boot.

### Task 6: Full verification and handoff

**Files:**
- No additional source files.

**Interfaces:**
- Consumes: all implementation and report changes.
- Produces: verified local branch ready for review, with the mobile/video PR and main untouched.

- [ ] Step 1: Run static/contract checks.

Run:

~~~powershell
node --check v3.js
node --check scripts/measure-performance.js
node --test tests/measure-performance.test.js
~~~

Expected: all commands pass.

- [ ] Step 2: Run the full browser suite.

Run:

~~~powershell
npm test
~~~

Expected: all existing browser tests plus the new instrumentation test pass.

- [ ] Step 3: Review the diff and branch state.

Run:

~~~powershell
git diff --check
git status --short --branch
git diff --stat preview...HEAD
~~~

Expected: only the planned instrumentation, test, script, plan/spec, and report files are changed; no deployment has occurred.

- [ ] Step 4: Commit the measurement work.

Run:

~~~powershell
git add v3.js scripts/measure-performance.js tests/e2e.spec.js tests/measure-performance.test.js docs/superpowers/specs/2026-08-19-map-performance-measurement.md docs/superpowers/plans/2026-08-19-map-performance-measurement.md docs/performance/2026-08-19-map-startup.md
git commit -m "perf: measure map startup phases"
~~~

Expected: one focused commit on agent/map-performance-measurement; pushing/deployment remains a separate user-approved action.
