# Baku 2036 Minimum CI and Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the minimum browser regression suite and deployment gate that prevents the static Baku 2036 product from silently publishing a broken map.

**Architecture:** Keep the app static. Add one Playwright smoke file and one shared local-server command, then make GitHub Actions run that suite before the Pages artifact is uploaded. Treat `preview` as the review branch and publish it at `/preview/`; `main` remains the live root.

**Tech Stack:** Node 24, npm, `@playwright/test`, Chromium, PowerShell static server, GitHub Actions, GitHub Pages artifact deployment.

## Global Constraints

- Preserve analytical numbers and visible content.
- Use the existing root v3 app as the product.
- Keep `/v1/` archived and `/v2/` developer-only.
- Use the shared root `data/` files at runtime; no duplicate zone seed.
- No feature flags, canary rollouts, load testing, coverage targets, changelogs, or semantic versioning.

### Task 1: Add reproducible browser-test tooling

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `playwright.config.js`
- Create: `tests/e2e.spec.js`

- [ ] Write the ten smoke tests listed in the design. Use stable IDs and text already present in `index.html`; use `page.evaluate` only for map readiness or direct map click coordinates when no accessible control exists.
- [ ] Run `npm install` and `npx playwright install chromium`.
- [ ] Run `npm test` against a local static server and confirm the suite catches failed JSON responses.

### Task 2: Add the push/deployment gate

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pages.yml`
- Create: `scripts/serve-static.ps1`

- [ ] Make `ci.yml` run on every push and pull request, install dependencies, install Chromium, start the static server, and run `npm test`.
- [ ] Make `pages.yml` run the same test job before building the Pages artifact. Use `preview` to publish the site under `preview/`; use `main` to publish the live root.
- [ ] Set `needs: smoke` on the deploy job so a failed test cannot upload an artifact.

### Task 3: Remove the last zone-data duplicate and document human checks

**Files:**
- Modify: `v2/v2.js`
- Modify: `README.md`
- Test: `tests/v3-single-audience-contract.ps1`

- [ ] Keep `const zones = []` in the developer snapshot and assert that no coordinate array seed returns.
- [ ] Add the six-line human release checklist exactly: map tiles, real iPhone pinch/drag, both languages, deep link, tour completion, no console errors.
- [ ] Add preview and test commands to the README without adding project-management process.

### Task 4: Verify and publish the preview branch

**Files:**
- Branch: `preview`

- [ ] Run the full local smoke suite and existing PowerShell contracts.
- [ ] Push `preview` and verify `https://qarait.github.io/Baku-2036/preview/`.
- [ ] Run the phone-sized browser check and record that a real iPhone still needs the human checklist.
- [ ] Promote only after the preview tests and human phone check are complete.
