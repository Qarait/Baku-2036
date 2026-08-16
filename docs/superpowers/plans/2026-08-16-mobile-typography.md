# Mobile Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make small mobile metadata labels easier to read without globally enlarging the interface.

**Architecture:** Add a single mobile-only typography override block after the existing content styles so it wins over the current 9–10px metadata rules. Keep primary text and desktop rules unchanged, then use Playwright computed styles to guard both the targeted increases and the unchanged primary scale.

**Tech Stack:** Static CSS, Playwright, Chromium/WebKit, PowerShell contracts.

## Global Constraints

- Do not increase the global body font size.
- Do not change desktop typography.
- Preserve Turkish wrapping and the one-page mobile drawer.
- Preserve the 360px toolbar layout.

---

### Task 1: Add the failing typography regression

**Files:**
- Modify: `tests/e2e.spec.js`

- [x] **Step 1: Write the failing test**

At 390px with a selected Turkish zone, read computed font sizes for `.metric span`, `.brief-metric small`, `.brief-tier`, `.evidence-card-head`, `.evidence-meta`, `.map-legend`, and `.data-freshness`; require their targeted mobile sizes. Also require `#panelTitle` and `.brief-head h3` to retain their current primary sizes.

- [x] **Step 2: Run the focused test and observe the expected failure**

Run `npx playwright test tests/e2e.spec.js -g "mobile metadata remains readable"`.

### Task 2: Add targeted mobile typography

**Files:**
- Modify: `v3.css`

- [x] **Step 1: Add scoped overrides**

Within a mobile-only block after the audience styles, raise only the audited metadata selectors by 1–2px and set readable line-height where labels wrap.

- [x] **Step 2: Run the focused test and mobile checks**

Run the focused test and headed 360px/390px tests. Expected: PASS without toolbar or drawer-scroll regressions.

### Task 3: Full verification and commit

**Files:**
- Verify: `v3.css`, `tests/e2e.spec.js`

- [x] **Step 1: Run `npm test`, all four static contracts, and `git diff --check`.**
- [x] **Step 2: Commit with `git add v3.css tests/e2e.spec.js docs/superpowers/specs/2026-08-16-mobile-typography-design.md docs/superpowers/plans/2026-08-16-mobile-typography.md && git commit -m "Improve targeted mobile typography"`.**
