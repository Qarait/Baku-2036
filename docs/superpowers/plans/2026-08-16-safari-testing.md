# Safari Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add focused WebKit smoke coverage to the browser gates and document the remaining real-iPhone release check.

**Architecture:** Keep the full Chromium suite as the primary regression suite. Add a separate `webkit.spec.js` focused suite and a Playwright WebKit project, then install WebKit in both GitHub workflows so every preview/main gate runs the focused Safari-engine checks.

**Tech Stack:** Playwright 1.62.1, WebKit, GitHub Actions, static HTML/CSS/JavaScript.

## Global Constraints

- Do not claim real iPhone Safari verification from a Windows WebKit run.
- Keep Chromium coverage and existing mobile contracts unchanged.
- Keep main/live promotion blocked until a physical iPhone check is completed.

---

### Task 1: Add the failing WebKit smoke suite and project

**Files:**
- Create: `tests/webkit.spec.js`
- Modify: `playwright.config.js`

**Interfaces:**
- Consumes: the existing static server and map URL.
- Produces: a `webkit` project with focused map, drawer, and 390px checks.

- [ ] **Step 1: Write the focused WebKit tests**

Add three tests for map load without browser errors, bilingual drawer collapse/reopen/close, and 390px safe-area/touch geometry with the layer menu opened.

- [ ] **Step 2: Run the project to verify it fails before configuration**

Run `npx playwright test --project=webkit tests/webkit.spec.js`.

Expected: FAIL because the current configuration has no `webkit` project and WebKit is not installed.

### Task 2: Enable WebKit locally and in CI

**Files:**
- Modify: `playwright.config.js`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: `tests/webkit.spec.js` from Task 1.
- Produces: local and CI WebKit execution.

- [ ] **Step 1: Configure the focused project**

Add a `webkit` project using `browserName: 'webkit'`, a 390px mobile viewport, and `testMatch: 'webkit.spec.js'`; keep Chromium matching `e2e.spec.js`.

- [ ] **Step 2: Install and run WebKit locally**

Run `npx playwright install webkit` followed by `npx playwright test --project=webkit`.

Expected: PASS for all focused WebKit tests.

- [ ] **Step 3: Add the CI browser dependency**

Change both workflows’ browser installation command to install `chromium webkit` before running `npm test`.

### Task 3: Document the real-iPhone gate and verify

**Files:**
- Create: `docs/release/real-iphone-safari-checklist.md`

**Interfaces:**
- Consumes: the deployed preview URL and focused WebKit results.
- Produces: a manual checklist that distinguishes physical-device verification from automation.

- [ ] **Step 1: Write the physical-device checklist**

Cover preview loading, portrait/landscape, safe-area placement, map tap/zoom/pan, search keyboard, layer menu, drawer collapse/reopen/close, EN/TR switching, and 360–390px scrolling.

- [ ] **Step 2: Run complete local verification**

Run `npm test`, `npx playwright test --project=webkit`, all four static contracts, and `git diff --check`.

- [ ] **Step 3: Commit**

Run `git add playwright.config.js tests/webkit.spec.js .github/workflows/ci.yml .github/workflows/pages.yml docs/superpowers/specs/2026-08-16-safari-testing-design.md docs/superpowers/plans/2026-08-16-safari-testing.md docs/release/real-iphone-safari-checklist.md && git commit -m "Add WebKit Safari smoke coverage"`.
