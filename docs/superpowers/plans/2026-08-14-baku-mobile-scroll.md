# Baku atlas mobile scrolling fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the selected district and investment-spot details use one natural page scroll on iPhone, with no dead viewport space and no content hidden behind Safari controls.

**Architecture:** Wrap the map surface and its overlays in a bounded `.map-stage`. Keep the selected `#v2ZoneDrawer` as a sibling inside `.map-shell`, so desktop can continue positioning it over the map while mobile can place it in normal document flow. Use a stable `svh`-based map height on mobile and safe-area-aware bottom spacing.

**Tech Stack:** Static HTML, vanilla CSS, vanilla JavaScript, Playwright.

## Global Constraints

- Keep desktop overlay behavior unchanged.
- Keep all analytical numbers, zone content, translations, deep links, and map interactions unchanged.
- The mobile page must have one primary vertical scroll container; the zone drawer must not have its own height-limited scrollbar.
- Use `svh` with a `vh` fallback for the bounded mobile map stage.
- Use `env(safe-area-inset-bottom, 0px)` with a normal spacing fallback for the final mobile content.
- Preserve the existing 12-test suite and add one focused regression test.

---

### Task 1: Add the failing mobile-flow regression

**Files:**
- Modify: `tests/e2e.spec.js` after the existing 360px toolbar test

**Interfaces:**
- Consumes: `waitForMap(page)` and the existing deep-link zone selection.
- Produces: a regression assertion that `#v2ZoneDrawer` is below `.map-stage`, has no inner scroll, and can expose `#clearSelection` at the bottom of the document.

- [ ] **Step 1: Add the test.**

```js
test('mobile zone details use one page scroll and reach their final action', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./?cache=e2e-mobile-scroll#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  const layout = await page.locator('#v2ZoneDrawer').evaluate(element => {
    const drawer = element.getBoundingClientRect();
    const stage = document.querySelector('.map-stage').getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      position: style.position,
      overflowY: style.overflowY,
      drawerTop: drawer.top,
      stageBottom: stage.bottom,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight
    };
  });
  expect(layout.position).toBe('relative');
  expect(layout.overflowY).toBe('visible');
  expect(layout.drawerTop).toBeGreaterThanOrEqual(layout.stageBottom);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('#clearSelection')).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2)).toBeTruthy();
});
```

- [ ] **Step 2: Run only the new test and confirm it fails against the current overlay layout.**

Run: `npx playwright test tests/e2e.spec.js -g "mobile zone details"`

Expected: FAIL because the current drawer is absolutely positioned inside the fixed-height map and remains an inner scroller.

### Task 2: Separate the bounded map stage from the mobile detail flow

**Files:**
- Modify: `index.html` around `.map-shell` and `#v2ZoneDrawer`
- Modify: `v3.css` map-shell, map-stage, info-panel, and mobile rules

**Interfaces:**
- Consumes: the existing map controls, legend, status, freshness note, attribution, and `#v2ZoneDrawer` selectors.
- Produces: `.map-stage` as the containing block for map visuals and overlays; `#v2ZoneDrawer` remains the same DOM id and content contract.

- [ ] **Step 1: Wrap only the map surface and map overlays in `<div class="map-stage">`.**

Move these existing elements into `.map-stage`: `#skipMap`, `#v2Map`, `#mapToolbar`, `#mapLegend`, `#mapStatus`, `#dataFreshness`, and `#attributionNote`. Leave `#v2ZoneDrawer` immediately after `.map-stage` inside `.map-shell`.

- [ ] **Step 2: Make `.map-stage` own the desktop map dimensions.**

Replace the fixed-height responsibility on `.map-shell` with:

```css
.map-shell { position: relative; background: var(--cream); }
.map-stage { position: relative; min-height: calc(100vh - 86px); height: calc(100vh - 86px); overflow: hidden; background: #d7e2e1; }
```

Keep `#v2Map { position: absolute; inset: 0; }` and the existing overlay positions unchanged.

- [ ] **Step 3: Keep desktop drawer overlay behavior explicit.**

Give `.info-panel` a desktop max-height based on the viewport rather than a percentage of the now-auto-height parent:

```css
.info-panel { max-height: calc(100vh - 118px); }
```

- [ ] **Step 4: Make the mobile map bounded and the drawer normal-flow content.**

Inside the mobile media query, use a fallback followed by the stable small viewport unit:

```css
.map-shell { overflow: visible; }
.map-stage { min-height: 460px; height: clamp(460px, 66vh, 620px); height: clamp(460px, 66svh, 620px); }
.info-panel {
  position: relative;
  top: auto; right: auto; bottom: auto; left: auto;
  width: auto;
  max-height: none;
  overflow: visible;
  margin: 10px 8px 12px;
  margin-bottom: max(12px, env(safe-area-inset-bottom, 0px));
}
```

Do not change the drawer’s typography or JSON-generated content.

- [ ] **Step 5: Run the focused test and confirm it passes.**

Run: `npx playwright test tests/e2e.spec.js -g "mobile zone details"`

Expected: PASS, with the drawer below the stage and its final action reachable by document scrolling.

### Task 3: Verify no mobile regressions

**Files:**
- Review: `index.html`, `v3.css`, `tests/e2e.spec.js`

- [ ] **Step 1: Run the complete Playwright suite.**

Run: `npm test`

Expected: 13 tests pass with no browser errors.

- [ ] **Step 2: Check the diff and whitespace.**

Run: `git diff --check` and `git diff --stat`.

Confirm that only the intended HTML/CSS/test changes plus the design/plan documentation are present; no JSON numbers or copy changed.

- [ ] **Step 3: Validate the preview at the 360px viewport.**

Use the preview URL and confirm the map, circle taps, district identification, EN/TR switch, deep link, and final checklist are reachable with one page scroll. Real iPhone Safari confirmation remains required for pinch/drag feel and toolbar behavior.

- [ ] **Step 4: Commit the implementation.**

```bash
git add index.html v3.css tests/e2e.spec.js
git commit -m "Fix mobile zone detail scrolling"
```
