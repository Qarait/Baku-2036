# Mobile Map Identification Drawer Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add bilingual Collapse, Show details, and Close behavior to the selected-place drawer while preserving map selection and mobile page flow.

**Architecture:** Keep selection ownership in the existing `state.selected` object and add a separate `state.drawerCollapsed` presentation flag. `renderPanel()` will render the appropriate expanded or compact drawer state, while existing close behavior will continue to clear selection. Labels remain in the existing `copy` dictionaries.

**Tech Stack:** Static HTML, CSS, JavaScript, Playwright 1.62.1, PowerShell contract checks.

## Global Constraints

- Do not add a nested mobile scroll container.
- Do not change map data, analytical claims, or the existing deep-link format.
- Preserve English/Turkish language switching and existing close behavior.
- Keep main and the live site untouched; work only on the isolated preview branch.

---

### Task 1: Add the failing drawer-state regression

**Files:**
- Modify: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: existing `#closeDetails`, `#v2ZoneDrawer`, `#panelTitle`, and selected-zone deep link.
- Produces: a regression contract for `#collapseDetails`, `#showDetails`, and the compact drawer state.

- [ ] **Step 1: Write the failing test**

Add:

```js
test('selected drawer can collapse, reopen, and close in Turkish', async ({ page }) => {
  await page.goto('./?cache=e2e-drawer-collapse#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await page.locator('#collapseDetails').click();
  await expect(page.locator('#v2ZoneDrawer')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#zoneBrief')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#showDetails')).toHaveText('Ayrıntıları göster');
  await page.locator('#showDetails').click();
  await expect(page.locator('#v2ZoneDrawer')).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await page.locator('#closeDetails').click();
  await expect(page.locator('#panelTitle')).toHaveText('Bir daireye dokunarak ne olacağını görün');
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npx playwright test tests/e2e.spec.js -g "selected drawer can collapse"`

Expected: FAIL because the collapse and show-details controls do not exist yet.

### Task 2: Implement localized collapsed and expanded drawer states

**Files:**
- Modify: `index.html`
- Modify: `v3.js`
- Modify: `v3.css`

**Interfaces:**
- Consumes: `state.selected`, `setLanguage()`, `renderPanel()`, and existing `clearSelection` behavior.
- Produces: `state.drawerCollapsed`, `#collapseDetails`, `#showDetails`, and `.info-panel.is-collapsed`.

- [ ] **Step 1: Add the copy and state fields**

Add English and Turkish labels for Collapse, Show details, and Close, plus `drawerCollapsed: false` to state.

- [ ] **Step 2: Add the compact-state controls**

Add a Collapse button beside the existing close button in the drawer header and a Show details button rendered for the compact state. Keep selection data in `state.selected`; only toggle `state.drawerCollapsed`.

- [ ] **Step 3: Make renderPanel the single drawer renderer**

Reset the collapsed flag when selection is cleared. When a selection exists, render the expanded details unless collapsed; when collapsed, hide the metrics/brief/actions and expose the selected title plus Show details control. Language changes must update both states through the existing `renderPanel()` call.

- [ ] **Step 4: Add scoped mobile-safe styling**

Style the compact drawer as a short page-flow bar on mobile and a compact panel on desktop. Preserve safe-area spacing, map interaction outside the drawer, and the existing no-inner-scroll behavior.

### Task 3: Verify and commit

**Files:**
- Test: `tests/e2e.spec.js`
- Verify: `index.html`, `v3.js`, `v3.css`

- [ ] **Step 1: Run the focused regression**

Run: `npx playwright test tests/e2e.spec.js -g "selected drawer can collapse"`

Expected: PASS.

- [ ] **Step 2: Run the full verification**

Run: `npm test`, all four static contracts, and `git diff --check`.

- [ ] **Step 3: Commit the feature**

```bash
git add index.html v3.js v3.css tests/e2e.spec.js
git commit -m "Add optional map identification drawer collapse"
```
