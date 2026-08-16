# Mobile Touch Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure iPhone-sized layouts expose reliable 44px touch targets across the Baku 2036 map experience.

**Architecture:** Keep the existing HTML and interaction model. Use a mobile CSS rule set to enlarge hit boxes through minimum dimensions and padding, while preserving desktop sizing and the existing responsive toolbar/menu layout. Verify the rendered geometry with Playwright at 390px and preserve the existing 360px contracts.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Playwright, PowerShell contract tests.

## Global Constraints

- Keep the 360px map toolbar on one row.
- Keep the mobile information drawer in normal page flow with visible overflow.
- Keep keyboard focus styles and existing bilingual behavior.
- Do not change the visual size of map markers in this pass.

---

### Task 1: Add the failing rendered touch-target regression

**Files:**
- Modify: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: existing `waitForMap` helper and current map/layer/drawer controls.
- Produces: a 390px regression that measures the actual visible hit boxes.

- [x] **Step 1: Write the failing test**

Add a test that loads a selected zone at 390px, opens the layer menu, and measures these visible controls: `#placeSearch`, `#langEn`, `#langTr`, the three primary `.map-button` controls, `#layersToggle`, visible `.layer-button` controls, `#collapseDetails`, `#closeDetails`, `.drawer-action`, and `#clearSelection`. Require every measured width and height to be at least 44px.

- [x] **Step 2: Run the test to verify it fails**

Run `npx playwright test tests/e2e.spec.js -g "mobile controls expose 44px"`.

Expected: FAIL with one or more controls below 44px, currently including language buttons, drawer actions, and layer-menu buttons.

### Task 2: Apply mobile hit-area sizing

**Files:**
- Modify: `v3.css`

**Interfaces:**
- Consumes: the existing selectors measured by Task 1.
- Produces: mobile rules that make the measured controls at least 44px without changing desktop layout.

- [x] **Step 1: Implement the minimal CSS**

Within the existing `@media (max-width: 760px)` scope, set 44px minimum dimensions for search, language, map, layer, drawer, tool, story, and search-result buttons; give text-only actions 44px vertical padding; keep action groups wrapping and preserve the 360px toolbar rule.

- [x] **Step 2: Run the focused regression**

Run `npx playwright test tests/e2e.spec.js -g "mobile controls expose 44px"`.

Expected: PASS.

### Task 3: Full verification and commit

**Files:**
- Verify: `index.html`, `v3.css`, `v3.js`, `tests/e2e.spec.js`, `tests/v3-mobile-contract.ps1`

**Interfaces:**
- Consumes: the green focused regression from Tasks 1–2.
- Produces: a committed, regression-tested mobile touch-target update.

- [x] **Step 1: Run the complete verification**

Run `npm test`, all four static contracts, and `git diff --check`.

- [x] **Step 2: Commit the change**

Run `git add v3.css tests/e2e.spec.js docs/superpowers/specs/2026-08-16-mobile-touch-targets-design.md docs/superpowers/plans/2026-08-16-mobile-touch-targets.md && git commit -m "Improve mobile touch targets"`.
