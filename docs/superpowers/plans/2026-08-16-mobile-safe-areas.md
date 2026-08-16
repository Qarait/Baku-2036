# Mobile Safe Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect edge-positioned Baku 2036 content from iPhone cutouts, rounded corners, and the home indicator.

**Architecture:** Retain the existing static HTML/CSS layout and `viewport-fit=cover`. Add safe-area-aware `max()` insets to the top bar, map overlays, map cards, and mobile drawer while retaining existing minimum spacing as the fallback.

**Tech Stack:** Static HTML, CSS environment variables, Playwright, PowerShell contract tests.

## Global Constraints

- Preserve the 360px one-row toolbar contract.
- Preserve the mobile drawer’s normal page flow and visible overflow.
- Keep desktop spacing unchanged when safe-area variables resolve to zero.
- Do not alter map data, marker visuals, or interaction state.

---

### Task 1: Add the failing safe-area contract

**Files:**
- Modify: `tests/v3-mobile-contract.ps1`

**Interfaces:**
- Consumes: the existing responsive viewport and mobile CSS contract.
- Produces: explicit checks for top, left, right, and bottom safe-area handling.

- [ ] **Step 1: Add assertions**

Require `safe-area-inset-top`, `safe-area-inset-left`, `safe-area-inset-right`, and `safe-area-inset-bottom` in `v3.css`.

- [ ] **Step 2: Run the contract to verify it fails**

Run `./tests/v3-mobile-contract.ps1`.

Expected: FAIL because the current stylesheet only references the bottom inset.

### Task 2: Add safe-area-aware responsive spacing

**Files:**
- Modify: `v3.css`

**Interfaces:**
- Consumes: the four safe-area contract requirements from Task 1.
- Produces: fallback-safe edge spacing for top, side, and bottom overlays.

- [ ] **Step 1: Implement the minimal CSS**

Use `max()` with `env(safe-area-inset-*)` on the top bar, map toolbar, info panel, legend, status, freshness, attribution, story host, and mobile drawer margins. Keep existing pixel spacing as the first argument to preserve desktop and zero-inset behavior.

- [ ] **Step 2: Run the mobile contract and headed mobile checks**

Run `./tests/v3-mobile-contract.ps1` and the existing 360px/390px headed tests.

Expected: PASS, with no toolbar wrapping or drawer-flow regression.

### Task 3: Full verification and commit

**Files:**
- Verify: `index.html`, `v3.css`, `tests/v3-mobile-contract.ps1`, `tests/e2e.spec.js`

- [ ] **Step 1: Run the complete verification**

Run `npm test`, all four static contracts, and `git diff --check`.

- [ ] **Step 2: Commit the change**

Run `git add v3.css tests/v3-mobile-contract.ps1 docs/superpowers/specs/2026-08-16-mobile-safe-areas-design.md docs/superpowers/plans/2026-08-16-mobile-safe-areas.md && git commit -m "Protect mobile layout with safe areas"`.
