# Baku atlas clarity improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or **superpowers:executing-plans** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add freshness, failure, and year-slider explanations to the root atlas without changing analytical content.

**Architecture:** Keep all new dates and the slider explanation in the existing shared `data/content.json` runtime payload. Render the date in the existing map attribution area, render the slider hint in the existing time-machine card, and use the current `mapStatus` element for a clear fetch failure.

**Tech Stack:** Static HTML, vanilla JavaScript, JSON, Playwright.

## Global Constraints

- Do not change analytical figures, zone claims, or existing scenario wording.
- Preserve the five runtime JSON files, deep links, EN/TR switching, and quiet first screen.
- Keep the messages plain and short for non-technical visitors.

---

### Task 1: Add shared freshness and slider copy

**Files:**
- Modify: `data/content.json`
- Modify: `v3.js`
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: `state.data.content.meta`, `atlasCopy().sections.time.yearSliderHint`, and the existing EN/TR copy table.
- Produces: `#dataFreshness` text and `.year-slider-hint` text after runtime hydration.

- [ ] **Step 1: Write assertions for the new runtime-visible text.**
  Add checks that the map shows `Data checked` and `Scenario baseline` in English, that the time machine shows the growing-circle explanation, and that switching to Turkish changes both labels.

- [ ] **Step 2: Run the focused tests and confirm they fail because the elements/copy are absent.**
  Run: `npx playwright test tests/e2e.spec.js -g "freshness|slider explanation"`
  Expected: FAIL with missing text or locator.

- [ ] **Step 3: Add the shared `meta` object and `yearSliderHint` strings.**
  Keep the dates in `data/content.json`; do not duplicate them in page markup.

- [ ] **Step 4: Render the metadata and hint with existing escaping/localisation helpers.**
  Add the freshness text to the existing attribution block and the hint directly under the time-machine range control.

- [ ] **Step 5: Run the focused tests and confirm they pass.**
  Run: `npx playwright test tests/e2e.spec.js -g "freshness|slider explanation"`
  Expected: PASS.

### Task 2: Make JSON-load failure explicit

**Files:**
- Modify: `v3.js`
- Modify: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: existing `loadData()` rejection and `mapStatus` element.
- Produces: a bilingual refresh instruction in `#mapStatus` and the current `.error` state.

- [ ] **Step 1: Add a test that blocks one runtime JSON request and expects the clear error message.**
  Assert the English message contains `couldn’t load` and `refresh`.

- [ ] **Step 2: Run the focused test and confirm it fails against the current short error copy.**
  Run: `npx playwright test tests/e2e.spec.js -g "clear JSON-load error"`
  Expected: FAIL because the current message does not tell the visitor to refresh.

- [ ] **Step 3: Replace only the English/Turkish error copy.**
  Keep the current console error for CI diagnostics and keep valid empty map results unchanged.

- [ ] **Step 4: Run the focused test in both languages.**
  Run: `npx playwright test tests/e2e.spec.js -g "clear JSON-load error"`
  Expected: PASS.

### Task 3: Full verification

**Files:**
- Review: `index.html`, `v3.js`, `v3.css`, `data/content.json`, `tests/e2e.spec.js`

- [ ] **Step 1: Run the full browser suite.**
  Run: `npm test`
  Expected: all ten tests pass with no browser errors.

- [ ] **Step 2: Inspect the diff for forbidden analytical changes.**
  Run: `git diff --check` and `git diff --stat`; confirm only the agreed UI/data metadata/test files changed.

- [ ] **Step 3: Commit the implementation.**
  Run: `git add data/content.json v3.js tests/e2e.spec.js && git commit -m "Add data freshness and map clarity messages"`
