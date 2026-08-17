# Pages Artifact Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent development, testing, planning, and archived application files from entering the public GitHub Pages artifact while preserving all runtime site assets.

**Architecture:** Add one `.pagesignore` manifest shared by the live and preview rsync stages. For preview, extract `origin/main` into a temporary staging directory, filter it through the same manifest, then overlay the preview branch through that manifest. Extend the Pages artifact contract to require the manifest and its key exclusions.

**Tech Stack:** GitHub Actions, rsync, PowerShell contract tests, GitHub Pages.

## Global Constraints

- Preserve the root live artifact as the runtime files from `main`.
- Preserve the `/preview/` artifact as filtered `main` plus filtered `preview` overlay.
- Keep runtime directories `assets`, `data`, `en`, `tr`, and `vendor` available.
- Exclude `.github`, `docs`, `scripts`, `tests`, `v1`, `v2`, package metadata, test configuration, README, and MapLibre dev bundles.
- Do not modify application JavaScript, CSS, JSON, HTML, or the `main` branch.

---

### Task 1: Add the shared Pages exclusion manifest

**Files:**
- Create: `.pagesignore`
- Test: `tests/pages-artifact-contract.ps1`

**Interfaces:**
- `.pagesignore` is consumed by every Pages `rsync` stage.
- The contract test verifies that the manifest contains each required exclusion.

- [x] **Step 1: Add contract assertions first**

Extend `tests/pages-artifact-contract.ps1` with exact required entries:

```powershell
$ignorePath = Join-Path $root '.pagesignore'
Assert-True (Test-Path -LiteralPath $ignorePath) '.pagesignore is missing'
$ignore = [System.IO.File]::ReadAllText($ignorePath)
foreach ($entry in @('.github/', 'docs/', 'scripts/', 'tests/', 'v1/', 'v2/', 'package.json', 'package-lock.json', 'playwright.config.js', 'README.md', 'vendor/*-dev.mjs')) {
  Assert-True ($ignore -match [regex]::Escape($entry)) ".pagesignore must exclude $entry"
}
```

- [x] **Step 2: Run the contract and verify RED**

Run: `pwsh -File tests/pages-artifact-contract.ps1`

Expected: failure because `.pagesignore` does not exist yet.

- [x] **Step 3: Create the minimal exclusion manifest**

Create `.pagesignore` with these entries, one per line:

```text
.git/
.github/
.gitignore
.pagesignore
docs/
scripts/
tests/
v1/
v2/
dist/
test-results/
playwright-report/
package.json
package-lock.json
playwright.config.js
README.md
vendor/*-dev.mjs
```

- [x] **Step 4: Run the contract and verify GREEN**

Run: `pwsh -File tests/pages-artifact-contract.ps1`

Expected: PASS.

### Task 2: Filter both Pages artifact construction paths

**Files:**
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- The live build consumes the current branch through `.pagesignore`.
- The preview build consumes a temporary filtered archive of `origin/main`, then overlays the filtered current branch into `dist/preview`.

- [x] **Step 1: Change the preview staging commands**

Replace the direct `git archive ... | tar -x -C dist` and unfiltered overlay with:

```bash
mkdir -p .pages-main dist/preview
git archive origin/main | tar -x -C .pages-main
rsync -a --delete --exclude-from=.pagesignore .pages-main/ dist/
rsync -a --delete --exclude-from=.pagesignore ./ dist/preview/
rm -rf .pages-main
```

- [x] **Step 2: Change the live staging command**

Replace the repeated inline exclusions with:

```bash
mkdir dist
rsync -a --delete --exclude-from=.pagesignore ./ dist/
```

- [x] **Step 3: Verify the workflow contract locally**

Run: `pwsh -File tests/pages-artifact-contract.ps1`

Expected: PASS, including the existing v2 archival assertions.

### Task 3: Verify artifact contents and deployment

**Files:**
- Modify: `docs/superpowers/plans/2026-08-17-pages-artifact-cleanup.md`

- [x] **Step 1: Run local regression checks**

Run:

```powershell
pwsh -File tests/pages-artifact-contract.ps1
npm test
git diff --check
```

Expected: contract PASS, 41 Playwright tests PASS, and no diff errors.

- [x] **Step 2: Commit and push only to preview**

Commit with:

```bash
git add .pagesignore .github/workflows/pages.yml tests/pages-artifact-contract.ps1 docs/superpowers/plans/2026-08-17-pages-artifact-cleanup.md
git commit -m "Exclude development files from Pages artifacts"
git push origin HEAD:preview
```

- [x] **Step 3: Verify GitHub Actions and hosted paths**

Confirm the Pages workflow and browser smoke workflow for the new commit succeed. Check that `/preview/`, `/preview/en/`, and `/preview/tr/` remain HTTP 200 while `/preview/tests/e2e.spec.js`, `/preview/package.json`, `/preview/scripts/measure-performance.js`, and `/preview/docs/` no longer resolve successfully.

- [x] **Step 4: Mark the plan complete**

After the remote checks pass, mark all steps complete and commit the checklist update if needed.
