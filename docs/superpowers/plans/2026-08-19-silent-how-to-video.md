# Silent How-to Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact attachment that opens a localized page with an 18–20 second silent recording demonstrating the Baku 2036 website flow.

**Architecture:** Reuse the existing `renderHowTo()` block for the attachment and add a standalone root-level `how-to.html` page that loads the existing bilingual content JSON. The recording is generated from the real app with Playwright and stored as a static WebM asset; the static test server declares its video MIME type and already supports byte ranges. The root-relative link works from fixed-language entries because those pages already use `<base href="../">`.

**Tech Stack:** Static HTML, CSS, JavaScript, JSON, Node.js, Playwright Test, Playwright browser video recording.

**Spec:** `docs/superpowers/specs/silent-how-to-video.md`

## Global Constraints

- Video is silent and contains no captions, subtitles, narration, text overlays, investment commentary, or analysis explanation.
- Video duration must be greater than 0 seconds and no greater than 20 seconds.
- Preserve the existing written How-to steps and all existing uncommitted changes.
- Do not deploy or modify the main/live environment.
- Keep links relative so the feature works below a GitHub Pages project subpath.

---

### Task 1: Lock the attachment and page contract with browser tests

**Files:**
- Modify: `tests/e2e.spec.js`
- Modify: `tests/webkit.spec.js`

**Interfaces:**
- Consumes: the existing map test helpers and `#v2HowTo` render target.
- Produces: stable assertions for `#howToVideoLink`, `how-to.html`, native video controls, language copy, and the 20-second maximum.

- [ ] **Step 1: Write the failing Chromium test**

Open the root page, wait for the map, assert `#howToVideoLink` has `target="_blank"` and `how-to.html?lang=en`, switch the main page to Turkish and assert `how-to.html?lang=tr`, then open `./how-to.html?lang=tr`. Assert `html[lang="tr"]`, `video#howToVideo[controls][playsinline]`, no `autoplay`, no `track`, and a positive duration no greater than 20 seconds after `loadedmetadata`.

- [ ] **Step 2: Run the focused Chromium test and verify the expected failure**

```powershell
npx playwright test tests/e2e.spec.js -g "silent how-to walkthrough"
```

Expected: FAIL because `#howToVideoLink` and `how-to.html` do not exist yet.

- [ ] **Step 3: Add the failing WebKit smoke contract**

Open `./how-to.html?lang=en` and `./how-to.html?lang=tr`, assert the localized document language and heading, confirm the video is visible, and collect HTTP responses at or above 400.

- [ ] **Step 4: Run the focused WebKit test and verify the expected failure**

```powershell
npx playwright test tests/webkit.spec.js -g "silent how-to walkthrough"
```

Expected: FAIL because the dedicated page and asset are not implemented.

### Task 2: Implement the localized attachment and video page

**Files:**
- Modify: `data/content.json`
- Modify: `v3.js`
- Modify: `v3.css`
- Modify: `scripts/serve-static.js`
- Create: `how-to.html`

**Interfaces:**
- Consumes: `atlasCopy().howTo`, `state.lang`, the existing content JSON, and relative asset paths.
- Produces: localized `howTo.video` copy, `#howToVideoLink`, and a playable `#howToVideo` page.

- [ ] **Step 1: Add bilingual video copy**

Extend both existing `howTo` objects with `video.linkLabel`, `pageTitle`, `pageIntro`, `description`, `back`, and `fallback`. The copy must describe a silent website walkthrough, not the underlying investment content.

- [ ] **Step 2: Add the attachment to `renderHowTo()`**

Keep the current title, intro, and three written step cards unchanged. Append an anchor with `id="howToVideoLink"`, `target="_blank"`, `rel="noopener"`, and `href="how-to.html?lang=" + (state.lang === 'tr' ? 'tr' : 'en')`.

- [ ] **Step 3: Create `how-to.html`**

Load `v3.css`, read `lang` from the query string, fetch `data/content.json`, render the selected `howTo.video` copy, and include:

```html
<video id="howToVideo" controls playsinline preload="metadata">
  <source src="assets/how-to-use.webm" type="video/webm">
</video>
```

Do not add a `<track>`, `autoplay`, narration, captions, subtitles, or explanatory overlays. Include a relative link back to the matching root map URL.

- [ ] **Step 4: Add responsive styles**

Add a small bordered attachment treatment to `v3.css` and a responsive full-width video layout for the dedicated page. Preserve a 44px minimum touch target on mobile.

- [ ] **Step 5: Declare the video MIME type**

Add `.webm: 'video/webm'` to `scripts/serve-static.js`; retain the existing range-response behavior.

- [ ] **Step 6: Run focused tests before recording**

```powershell
npx playwright test tests/e2e.spec.js -g "silent how-to walkthrough"
npx playwright test tests/webkit.spec.js -g "silent how-to walkthrough"
```

Expected: the page contract passes except for the missing asset duration assertion, which remains red until Task 3.

### Task 3: Record the real silent website walkthrough

**Files:**
- Create: `scripts/record-how-to.js`
- Create: `assets/how-to-use.webm` (generated binary)
- Modify: `package.json`

**Interfaces:**
- Consumes: the local static server, Chromium, and the actual website controls.
- Produces: a 1024×640-or-smaller WebM recording with no audio and duration no greater than 20 seconds.

- [ ] **Step 1: Add a reproducible recording script**

Use a Chromium context with `recordVideo`, open the local root page, wait for `#mapStatus`, focus/search a place, select a result, click `#showDetails`, open an existing tool, wait between state changes, close the page, and rename the generated WebM to `assets/how-to-use.webm`. Do not inject captions, narration, explanatory overlays, or investment commentary.

- [ ] **Step 2: Add the recording command**

```json
"record:howto": "node scripts/record-how-to.js"
```

- [ ] **Step 3: Generate the asset**

```powershell
npm run record:howto
```

Expected: `assets/how-to-use.webm` exists and is non-empty.

- [ ] **Step 4: Run duration and playback tests**

Run the focused Chromium and WebKit tests again. Both browsers must load the asset, report a positive duration no greater than 20 seconds, and produce no HTTP or browser errors.

### Task 4: Full verification and preview-only handoff

**Files:**
- Test: `tests/e2e.spec.js`
- Test: `tests/webkit.spec.js`
- Check: all changed files and generated entry points.

**Interfaces:**
- Consumes: the completed attachment, page, and video asset.
- Produces: verification evidence; no deployment.

- [ ] **Step 1: Run focused UI checks**

```powershell
npx playwright test tests/e2e.spec.js -g "silent how-to walkthrough|fixed language entry points"
npx playwright test tests/webkit.spec.js -g "silent how-to walkthrough|fixed language entry points"
```

- [ ] **Step 2: Run the full browser suite**

```powershell
npm test
```

Expected: zero failures across Chromium and WebKit.

- [ ] **Step 3: Run project contracts and checks**

```powershell
node scripts/build-language-entrypoints.js --check
Get-ChildItem tests -Filter '*.ps1' | ForEach-Object { & $_.FullName }
git diff --check
```

Expected: generated entries are current, required contracts pass with the existing intentional optional 3D skip if reported, and no whitespace errors occur.

- [ ] **Step 4: Inspect the final diff**

Confirm the existing mobile UX and neutral attribution-copy changes remain intact, the new asset is included, no main/live deployment occurred, and the preview worktree is ready for user review.
