# Fixed Language Entry Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (recommended). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `/preview/en/` and `/preview/tr/` as separate fixed-language entry points generated from the shared Baku 2036 application.

**Architecture:** Keep `index.html` as the bilingual source. Generate `en/index.html` and `tr/index.html` with a deterministic Node script that adds a parent asset base, injects a fixed-language bootstrap, and replaces the interactive language switch with a label. Make `v3.js` honor the fixed language and make the local server and Pages workflow serve and verify directory entry points.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node.js 24, GitHub Pages, Playwright Chromium and WebKit.

## Global Constraints

- The root `index.html` remains bilingual and continues to support its existing EN/TR switch.
- Fixed pages must use the shared root `data/`, `assets/`, `vendor/`, `v3.css`, and `v3.js` resources.
- Fixed pages must ignore conflicting `lang` hash values.
- No `main` deployment is changed; deployment is pushed only to `preview`.
- Generated entry points must be deterministic and checked before Pages packaging.

---

### Task 1: Add failing fixed-entry tests

**Files:**
- Modify: `tests/e2e.spec.js`
- Modify: `tests/webkit.spec.js`
- Modify: `scripts/serve-static.js`

**Interfaces:**
- Consumes: The future `/en/` and `/tr/` directory entry points.
- Produces: Browser regression coverage for fixed language, conflicting hashes, hidden language switch, and directory serving.

- [x] **Step 1: Add the Chromium regression test**

Add this test after the existing root bilingual language test in `tests/e2e.spec.js`:

```js
test('fixed language entry points stay separated', async ({ page }) => {
  await page.goto('/en/?cache=e2e-fixed-en#lang=tr');
  await waitForMap(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#rayonLegend')).toHaveText('District borders');
  await expect(page.locator('.language-switch')).toHaveCount(0);

  await page.goto('/tr/?cache=e2e-fixed-tr#lang=en');
  await waitForMap(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
  await expect(page.locator('.language-switch')).toHaveCount(0);
});
```

- [x] **Step 2: Add the WebKit regression test**

Add this test after the WebKit map smoke test in `tests/webkit.spec.js`:

```js
test('WebKit loads both fixed language entry points without asset errors', async ({ page }) => {
  for (const entry of [
    { path: '/en/', hash: '#lang=tr', lang: 'en', legend: 'District borders' },
    { path: '/tr/', hash: '#lang=en', lang: 'tr', legend: 'İlçe sınırları' }
  ]) {
    const errors = [];
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
    });
    await page.goto(`${entry.path}?cache=webkit-fixed-${entry.lang}${entry.hash}`);
    await waitForMap(page);
    await expect(page.locator('html')).toHaveAttribute('lang', entry.lang);
    await expect(page.locator('#rayonLegend')).toHaveText(entry.legend);
    await expect(page.locator('.language-switch')).toHaveCount(0);
    expect(errors).toEqual([]);
  }
});
```

- [x] **Step 3: Make the test server model GitHub Pages directory indexes**

Update `safeFilePath()` in `scripts/serve-static.js` so `/en/` resolves to `en/index.html` and `/` still resolves to `index.html`:

```js
const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
const filePath = path.resolve(root, relative);
if (filePath !== root && filePath.startsWith(root + path.sep)) {
  try {
    if (fs.statSync(filePath).isDirectory()) return path.join(filePath, 'index.html');
  } catch {}
}
return filePath === root || filePath.startsWith(root + path.sep) ? filePath : null;
```

- [x] **Step 4: Run the focused tests and verify the expected red state**

Run:

```powershell
npx playwright test tests/e2e.spec.js -g "fixed language entry points"
npx playwright test tests/webkit.spec.js -g "both fixed language entry points"
```

Expected: FAIL because `/en/` and `/tr/` do not exist yet, not because of a test syntax error.

### Task 2: Implement the shared generator and language lock

**Files:**
- Create: `scripts/build-language-entrypoints.js`
- Create: `en/index.html`
- Create: `tr/index.html`
- Modify: `v3.js:865-885,1098-1099,1141-1145`
- Modify: `v3.css:39-42`

**Interfaces:**
- Consumes: Root `index.html` as the source template and `window.__BakuFixedLanguage` in generated pages.
- Produces: Deterministic `en/index.html` and `tr/index.html`; fixed-language runtime behavior.

- [x] **Step 1: Write the deterministic generator**

Create `scripts/build-language-entrypoints.js`. It must read root `index.html`, replace the document language, add `<base href="../">`, inject `window.__BakuFixedLanguage` before the MapLibre module, replace the `.language-switch` block with a localized `#languageLock`, and either write or `--check` the two generated files:

```js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const entries = { en: 'English', tr: 'Türkçe' };

function render(language, label) {
  return source
    .replace('<html lang="en">', `<html lang="${language}">`)
    .replace('<head>', '<head>\n  <base href="../">')
    .replace('<script type="module">', `<script>window.__BakuFixedLanguage = '${language}';</script>\n  <script type="module">`)
    .replace(/\s*<div class="language-switch"[\s\S]*?<\/div>/, `\n        <span class="language-lock" id="languageLock">${label}</span>`);
}

for (const [language, label] of Object.entries(entries)) {
  const outputDirectory = path.join(root, language);
  const outputPath = path.join(outputDirectory, 'index.html');
  const rendered = render(language, label);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== rendered) {
      console.error(`${language}/index.html is stale; run node scripts/build-language-entrypoints.js`);
      process.exitCode = 1;
    }
  } else {
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(outputPath, rendered);
  }
}
```

- [x] **Step 2: Add fixed-language runtime handling**

Update `readHash()` and `setLanguage()` in `v3.js` so a valid fixed-language bootstrap takes priority over the hash and later language changes. Guard the existing `#langEn`/`#langTr` class updates and listeners because generated pages replace the buttons. At boot, set `$`(`skipMap`).href to `${location.pathname}#v2ZoneDrawer` so the `<base>` element does not redirect the skip link to the root page.

- [x] **Step 3: Add label styling and generate both pages**

Add `.language-lock` styling matching the compact header controls, then run:

```powershell
node scripts/build-language-entrypoints.js
```

- [x] **Step 4: Run the focused tests and generator check**

Run:

```powershell
npx playwright test tests/e2e.spec.js -g "fixed language entry points"
npx playwright test tests/webkit.spec.js -g "both fixed language entry points"
node scripts/build-language-entrypoints.js --check
```

Expected: all focused tests pass and the generator check exits 0.

### Task 3: Integrate Pages packaging and static contracts

**Files:**
- Modify: `.github/workflows/pages.yml`
- Create: `tests/fixed-language-entrypoints-contract.ps1`

**Interfaces:**
- Consumes: The generator and committed generated pages.
- Produces: A deployment gate that refuses stale generated language pages.

- [x] **Step 1: Add the static contract**

Create a PowerShell contract that reads `en/index.html` and `tr/index.html` and asserts each has its expected document language, fixed-language bootstrap, parent base, language label, and no `class="language-switch"`.

- [x] **Step 2: Add generator verification to Pages packaging**

Before the preview/live artifact steps in `.github/workflows/pages.yml`, add:

```yaml
      - name: Verify generated language entry points
        run: node scripts/build-language-entrypoints.js --check
```

- [x] **Step 3: Run contracts and inspect generated paths**

Run:

```powershell
./tests/fixed-language-entrypoints-contract.ps1
node scripts/build-language-entrypoints.js --check
git diff --check
```

Expected: all checks exit 0 and the generated pages reference root-shared resources through `<base href="../">`.

### Task 4: Full verification, commit, and preview deployment

**Files:**
- Modify: `docs/superpowers/plans/2026-08-16-fixed-language-entry-points.md`
- Modify: generated/source files from Tasks 1–3 as required by verification.

- [x] **Step 1: Run the full browser suite**

Run `npm test` and record Chromium and WebKit pass counts, including the fixed-entry tests.

- [x] **Step 2: Run headed mobile checks**

Run:

```powershell
npx playwright test tests/e2e.spec.js -g "fixed language entry points|mobile metadata remains readable|360px toolbar stays on one row|mobile zone details use one page scroll" --headed
```

- [x] **Step 3: Run all static contracts**

Run:

```powershell
./tests/v2-content-contract.ps1
./tests/v2-foundation-contract.ps1
./tests/v3-mobile-contract.ps1
./tests/v3-single-audience-contract.ps1
./tests/fixed-language-entrypoints-contract.ps1
git diff --check
```

- [x] **Step 4: Commit the implementation**

```powershell
git add .github/workflows/pages.yml scripts/serve-static.js scripts/build-language-entrypoints.js v3.js v3.css en/index.html tr/index.html tests/e2e.spec.js tests/webkit.spec.js tests/fixed-language-entrypoints-contract.ps1 docs/superpowers/plans/2026-08-16-fixed-language-entry-points.md
git commit -m "Add fixed language entry points"
```

- [x] **Step 5: Push only the preview branch and monitor deployment**

```powershell
git push origin HEAD:preview
gh run list --repo Qarait/Baku-2036 --branch preview --limit 4 --json databaseId,status,conclusion,name,headSha,createdAt
```

Wait for Pages and CI to finish successfully. Verify both URLs with cache-busting requests and confirm `main` remains untouched.
