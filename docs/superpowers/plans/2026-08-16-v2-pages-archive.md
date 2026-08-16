# Move v2 to Git Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop publishing the developer-only `/v2/` snapshot on GitHub Pages while preserving the exact snapshot in Git and keeping repository contracts and documentation accurate.

**Architecture:** Keep `v2/` tracked in the repository for reference and archive it at the current pre-change commit with an annotated `v2-archive` tag. Add a `v2` exclusion to both Pages rsync commands so neither the preview nor live artifact exposes `/v2/`. Add a static deployment contract that requires both exclusions and update historical documentation that currently treats the deployed `/v2/` URL as an active requirement.

**Tech Stack:** GitHub Pages workflow YAML, PowerShell static contracts, Markdown architecture records, Git annotated tags, Playwright smoke tests.

## Global Constraints

- Keep `/v1/` published as the intentional archived original.
- Keep all `v2/` files in Git; do not delete or refactor the snapshot.
- Do not modify or push `main`; publish the implementation only to `preview`.
- The root audience release and its current runtime asset paths must remain unchanged.

---

### Task 1: Add the deployment contract first

**Files:**
- Create: `tests/pages-artifact-contract.ps1`

- [ ] **Step 1: Add a contract that requires both Pages rsync commands to exclude `v2`**

The contract reads `.github/workflows/pages.yml`, counts the exact `--exclude='v2'` guard, and throws unless the count is two. It also verifies that the tracked `v2/index.html` remains present so the archive is retained in Git.

- [ ] **Step 2: Run the new contract before changing the workflow**

Run: `pwsh -File tests/pages-artifact-contract.ps1`

Expected: FAIL because the current workflow has zero `v2` exclusions.

### Task 2: Exclude v2 from Pages artifacts

**Files:**
- Modify: `.github/workflows/pages.yml:59,64`

- [ ] **Step 1: Add `--exclude='v2'` to preview and live rsync commands**

Keep the existing `vendor/*-dev.mjs` exclusions and add the new directory exclusion to both commands.

- [ ] **Step 2: Re-run the deployment contract**

Run: `pwsh -File tests/pages-artifact-contract.ps1`

Expected: PASS.

- [ ] **Step 3: Run the same contract in the Pages deploy job**

Add a `pwsh -File tests/pages-artifact-contract.ps1` step after generated language entry-point verification so both preview and live deployments are gated by the exclusion rule.

### Task 3: Record the new archive/deployment boundary

**Files:**
- Modify: `docs/superpowers/plans/2026-08-13-baku-v2-foundation.md`
- Modify: `docs/superpowers/plans/2026-08-13-baku-v2-content-port.md`
- Modify: `docs/superpowers/specs/2026-08-13-baku-v2-content-design.md`
- Modify: `docs/superpowers/plans/2026-08-13-baku-v3-single-audience.md`

- [ ] **Step 1: Replace active `/v2/` Pages URL checks with repository-only archive wording**

Historical implementation plans should say that `/v2/` can be tested locally from the checkout and is preserved in Git, while the current Pages deployment publishes the root audience release and `/v1/` archive only.

- [ ] **Step 2: Verify no current documentation still requires a published `/v2/` URL**

Run: `rg -n --glob '*.md' --glob '*.ps1' '/Baku-2036/v2|published.*v2|v2.*returns HTTP 200|v2.*deployed' docs tests`

Expected: no active deployment requirement remains; historical references must explicitly describe the old state.

### Task 4: Preserve the exact snapshot in Git

**Files:**
- Git tag: `v2-archive` at commit `cef68e2`

- [ ] **Step 1: Confirm the tag name is unused**

Run: `git tag --list v2-archive; git ls-remote --tags origin refs/tags/v2-archive`

Expected: no local or remote tag output.

- [ ] **Step 2: Create and push the annotated archive tag**

Run: `git tag -a v2-archive cef68e2 -m "Archive the v2 developer snapshot before Pages removal"` followed by `git push origin v2-archive`.

Expected: the tag points to `cef68e2`, which contains the complete tracked `v2/` snapshot before this deployment-only change.

### Task 5: Verify and publish preview

**Files:**
- Test: `tests/pages-artifact-contract.ps1`, all existing static contracts, Playwright Chromium/WebKit suites.

- [ ] **Step 1: Run the new contract and all existing static contracts**

Expected: every contract passes; the optional 3D contract may report its existing intentional skip.

- [ ] **Step 2: Run the full browser suite**

Run: `npm test`

Expected: all Chromium and WebKit tests pass.

- [ ] **Step 3: Inspect the final diff and commit only the intended workflow, contract, and documentation changes**

Run: `git diff --check; git status --short`

Expected: no whitespace errors and no unrelated files.

- [ ] **Step 4: Commit and push the implementation to `preview`**

Use commit message `Stop publishing v2 developer snapshot`, then run `git push origin HEAD:preview`.

- [ ] **Step 5: Verify the remote preview**

Check that the root preview still loads and that `https://qarait.github.io/Baku-2036/preview/v2/` returns 404 while `https://qarait.github.io/Baku-2036/preview/v1/` remains available. Confirm `main` has not moved.
