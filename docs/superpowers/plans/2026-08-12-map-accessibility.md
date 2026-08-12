# Baku-2036 Map Accessibility and Mobile Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Baku-2036 map easier to use on phones and fully operable by keyboard and assistive technology.

**Architecture:** Modify only `index.html` for production behavior. Reuse the existing SVG zone builder, `VIEW` pan/zoom state, `select()`/panel lifecycle, and toggle functions; add semantic attributes, small DOM helpers, and focused CSS. Keep tests and temporary diagnostics outside the deployed root files.

**Tech Stack:** Self-contained HTML/CSS/JavaScript, PowerShell static assertions, Playwright CLI browser checks, GitHub Pages.

## Global Constraints

- Do not modify the embedded base64 image bytes.
- Do not add permanent directional pan buttons; use arrow keys for keyboard panning.
- Preserve drag, pinch, data, and current visual style.
- New keyboard handlers must ignore editable fields and respect `TOURING`.
- Live-region zoom announcements must be debounced and limited to discrete zoom actions.
- Real iOS Safari verification must be requested from the user after deployment.

---

### Task 1: Create failing accessibility behavior checks

**Files:**
- Create: `work/map-accessibility-test.ps1`
- Test: `index.html` through UTF-8 DOM/source assertions

- [ ] **Step 1: Write the failing test**

Assert that `index.html` contains the approved accessibility contract: a skip link, 44px zoom control CSS, `role="dialog"` panel semantics, `aria-pressed` toggle semantics, zone keyboard attributes, editable-target guard, arrow-key pan handling, debounced zoom announcement, and reduced-motion CSS.

- [ ] **Step 2: Run the test and verify it fails**

Run PowerShell against `work/map-accessibility-test.ps1`. Expected result: FAIL on the first missing contract because the current file is click-only and lacks the new accessibility hooks.

### Task 2: Add semantic map and dialog structure

**Files:**
- Modify: `index.html` map markup and SVG zone-rendering code

- [ ] **Step 1: Implement the smallest semantic structure**

Add the skip link before the map, a polite/assertive status element for zoom announcements, `role="dialog"` and `aria-modal="true"` to the detail panel, `aria-pressed` to heat/metro chips, and `tabindex="0"`/`role="button"`/accessible labels to every zone group created by `Z.forEach`.

- [ ] **Step 2: Add keyboard zone activation**

Attach `keydown` handlers to zone groups that call `select(z.id,{spot:true})` for Enter and Space, prevent Space scrolling, and do nothing while `TOURING`.

- [ ] **Step 3: Run the static test**

Run `work/map-accessibility-test.ps1`. Expected result: the structure assertions pass while any remaining interaction assertions identify the next missing behavior.

### Task 3: Fix keyboard shortcuts, arrow panning, and focus lifecycle

**Files:**
- Modify: `index.html` keyboard, panel, and `VIEW` interaction code

- [ ] **Step 1: Add the failing interaction assertions**

Extend the test to require an editable-target predicate, arrow-key branches, focus capture/return variables, and a debounced discrete announcement helper.

- [ ] **Step 2: Implement input-safe shortcuts**

Update the document shortcut handler so `+`, `−`, and `0` return early for `INPUT`, `SELECT`, `TEXTAREA`, and contenteditable targets, and return while `TOURING`.

- [ ] **Step 3: Implement arrow-key panning**

Add a `panBy(dx,dy)` helper using `VIEW.x`, `VIEW.y`, and `applyView()`. Handle ArrowLeft/Right/Up/Down only when focus is on the map or a zone, ignore editable targets, and respect `TOURING`.

- [ ] **Step 4: Implement dialog focus management**

Store the opening zone element, focus the close button or dialog heading after opening, trap Tab/Shift+Tab inside the panel, and return focus to the opening zone after close. Preserve Escape behavior.

- [ ] **Step 5: Implement throttled zoom announcements**

Add `announceZoom()` with a roughly 500ms debounce and call it only from zoom buttons and keyboard zoom shortcuts, not wheel, pinch, drag, tour, or time-machine animation loops.

### Task 4: Improve mobile controls and motion preferences

**Files:**
- Modify: `index.html` CSS and zoom-control markup/handlers

- [ ] **Step 1: Make mobile controls touch-safe**

Set zoom buttons to at least 44px square at mobile widths, maintain a compact three-button toolbar, add safe-area-aware spacing, and preserve the current map overlay position.

- [ ] **Step 2: Add reduced-motion behavior**

Under `@media (prefers-reduced-motion: reduce)`, disable or shorten transitions and animations for the map, panel, tour caption, spotlight, time machine, and focus movement.

- [ ] **Step 3: Synchronize toggle state**

Update `aria-pressed` whenever heat or metro state changes, including language changes and initial render.

### Task 5: Browser verification and deployment

**Files:**
- Modify: `index.html` only for production
- Remove: `work/map-accessibility-test.ps1` after verification

- [ ] **Step 1: Run the static test and syntax checks**

Run the accessibility assertions, `git diff --check`, and a browser load check. Expected: all assertions pass and no JavaScript console errors occur.

- [ ] **Step 2: Run Playwright checks**

Use a desktop and narrow mobile viewport to verify: Tab reaches the skip link and zones, Enter/Space opens a zone, Escape closes and returns focus, arrow keys pan, typing `0` in the budget/deal inputs does not reset zoom, zoom controls are at least 44px on mobile, toggle `aria-pressed` changes, and the page has no horizontal overflow.

- [ ] **Step 3: Verify existing feature paths**

Smoke-test tour, time machine, spotlight, heat, metro lines, proof badges, planner, deal checker, shortlist, and EN/TR switching.

- [ ] **Step 4: Commit and push**

```powershell
git add index.html
git commit -m "Improve map mobile controls and keyboard access"
git push origin main
```

- [ ] **Step 5: Verify production**

Poll `https://qarait.github.io/Baku-2036/` for HTTP 200 and confirm the deployed HTML contains the new accessibility hooks. Ask the user to perform a final check on a real iOS Safari device, especially pinch zoom and drag behavior.