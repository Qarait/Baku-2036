# Language Switch Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended) to implement this plan task-by-task.

**Goal:** Keep the EN/TR language switch visible and usable before map engagement.

**Architecture:** Remove the quiet-controls class from the shared top-actions wrapper and apply it only to search/year controls. Existing language event handlers and URL-hash persistence remain unchanged.

---

### Task 1: Regression and implementation

**Files:** `tests/e2e.spec.js`, `index.html`

- [ ] Add a test that loads the page, switches to Turkish, verifies Turkish map labels, switches back to English, and verifies English labels without calling `engage`.
- [ ] Move `quiet-controls` from `#topControls` to the search and year controls only.
- [ ] Run the focused test and confirm it passes.

### Task 2: Verification and commit

**Files:** `playwright.config.js`, `tests/webkit.spec.js`, `tests/v3-mobile-contract.ps1`

- [ ] Run `npm test`, headed mobile checks, all static contracts, and `git diff --check`.
- [ ] Commit with `git add index.html tests/e2e.spec.js docs/superpowers/specs/2026-08-16-language-switch-visibility-design.md docs/superpowers/plans/2026-08-16-language-switch-visibility.md && git commit -m "Keep language switch visible"`.
