# RAISE-Inspired Baku 2036 Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first safe RAISE-inspired release by making Baku 2036's existing editorial scenario calculation fully inspectable and shareable, then stop at explicit evidence gates before qualitative scoring, market-data publication, or modelling.

**Architecture:** Release 1 keeps the current static GitHub Pages architecture and existing formula. It centralizes the fixed modifiers in `v3.js`, exposes a pure breakdown object, renders the arithmetic and methodology in both languages, and round-trips scenario state through the URL hash. Releases 2–5 are independent subprojects and must receive separate approval and implementation plans after their evidence gates pass.

**Tech Stack:** Static HTML/CSS/JavaScript, JSON content, MapLibre GL, PMTiles, Playwright 1.62.1, PowerShell contract tests, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-21-raise-inspired-baku-design.md`

## Global Constraints

- Never invent scenario ranges, coefficients, exposure percentages, property observations, sample sizes, sale prices, or accuracy metrics.
- Keep all 16 existing `growthPct` values unchanged in Release 1.
- Preserve the exact modifier values: oil `norm=1`, `bad=0.8`, `good=1.15`; infrastructure `on=1`, `late=0.72`; currency `stable=1`, `weak=0.8`; rounding increment `5` percentage points.
- Label `growthPct` as an editorial scenario assumption, not a forecast, valuation, expected return, or model estimate.
- Do not add downside/base/upside ranges or zone-specific numerical weights in Release 1.
- Do not add dependencies, a backend, database, analytics, tracking, remote APIs, AI, machine learning, GWR, Monte Carlo simulation, 3D, rezoning valuation, or drag-and-drop infrastructure.
- Preserve the map, formulas, EN/TR behavior, fixed-language entry points, mobile layout, accessibility hooks, existing hash compatibility, and Pages artifact boundaries.
- Work in an isolated worktree on a `codex/` branch based on the latest `origin/preview`.
- Deploy to `preview` only after the pull-request check passes. Do not modify or merge to `main` without a separate explicit instruction.
- Do not stage `.playwright-cli/` or unrelated worktree files.

---

## File Responsibility Map

- `v3.js`: owns scenario modifier constants, pure calculation breakdown, hash parsing/serialization, and rendering.
- `v3.css`: owns compact visual hierarchy for the calculation breakdown and methodology block.
- `data/content.json`: owns bilingual labels and explanatory copy; it must not own executable multiplier values.
- `tests/e2e.spec.js`: owns browser behavior, URL round-trip, old-link compatibility, fixed-language behavior, and bilingual rendering checks.
- `tests/v3-single-audience-contract.ps1`: owns static Release 1 structural assertions that should fail before browser startup if required calculation/disclosure hooks disappear.
- `docs/superpowers/specs/2026-08-21-raise-inspired-baku-design.md`: owns product boundaries and evidence gates.
- `docs/superpowers/plans/2026-08-21-raise-inspired-baku-roadmap.md`: owns execution order and handoff rules.

## Executor Stop Rules

Stop and report to the user instead of improvising if any of the following occurs:

- A requested calculation requires changing a `growthPct` or modifier value.
- English or Turkish methodology wording is disputed.
- Existing hash tests depend on a different scenario-key name.
- A factor, range, coefficient, observation, sample count, or model metric is missing.
- A third-party property-data source has no documented reuse/storage permission.
- Release 1 requires changing `main`, introducing a backend, or adding a dependency.
- The full browser suite fails for behavior unrelated to the Release 1 files.

## Release 1 — Calculation Transparency and Shareable Scenarios

### Task 1: Lock the existing calculation with a failing breakdown test

**Files:**
- Modify: `tests/e2e.spec.js`
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: existing `?testHooks=1` mechanism and White City `growthPct=140`.
- Produces: required test-hook signature `window.__V3TestHooks.getScenarioBreakdown(zoneId, scenarios)`.

- [ ] **Step 1: Record the clean baseline**

Run:

```powershell
node --check v3.js
npm test
```

Expected: JavaScript syntax passes and the existing Chromium/WebKit suite passes before edits. Record the exact pass count in the pull-request body; do not copy a historical count.

- [ ] **Step 2: Add the failing pure-breakdown browser test**

Add after the existing scenario tests in `tests/e2e.spec.js`:

```js
test('scenario breakdown exposes the editorial baseline and exact fixed modifiers', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-breakdown&testHooks=1#z=whitecity&y=2026&lang=en');
  await waitForMap(page);

  const breakdown = await page.evaluate(() => window.__V3TestHooks.getScenarioBreakdown('whitecity', {
    oil: 'bad',
    infra: 'late',
    cur: 'weak'
  }));

  expect(breakdown.baseGrowth).toBe(140);
  expect(breakdown.modifiers).toEqual({
    oil: { option: 'bad', multiplier: 0.8 },
    infra: { option: 'late', multiplier: 0.72 },
    cur: { option: 'weak', multiplier: 0.8 }
  });
  expect(breakdown.rawGrowth).toBeCloseTo(64.512, 6);
  expect(breakdown.roundedGrowth).toBe(65);
  expect(breakdown.roundingIncrement).toBe(5);
});
```

- [ ] **Step 3: Run the focused test and verify the expected red state**

Run:

```powershell
npx playwright test tests/e2e.spec.js --project=chromium --grep "scenario breakdown exposes"
```

Expected: FAIL because `getScenarioBreakdown` does not exist.

- [ ] **Step 4: Commit the red test**

```powershell
git add tests/e2e.spec.js
git commit -m "test: define scenario breakdown contract"
```

### Task 2: Centralize modifiers and implement the pure breakdown

**Files:**
- Modify: `v3.js` near `scenarioBaseGrowth()`, `scenarioGrowth()`, and `window.__V3TestHooks`.
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: `zone.growthPct` and `{ oil, infra, cur }` scenario keys.
- Produces: `SCENARIO_MODIFIERS`, `scenarioBreakdown(zone, scenarios)`, and compatibility wrapper `scenarioGrowth(zone)`.

- [ ] **Step 1: Add immutable modifier ownership**

Immediately before `scenarioBaseGrowth()`, add:

```js
  const SCENARIO_MODIFIERS = Object.freeze({
    oil: Object.freeze({ norm: 1, bad: 0.8, good: 1.15 }),
    infra: Object.freeze({ on: 1, late: 0.72 }),
    cur: Object.freeze({ stable: 1, weak: 0.8 })
  });
  const SCENARIO_ROUNDING_INCREMENT = 5;
```

- [ ] **Step 2: Implement option validation and the pure calculation**

Replace the existing `scenarioGrowth()` body with these functions:

```js
  function scenarioOption(group, requested) {
    const options = SCENARIO_MODIFIERS[group];
    const fallback = group === 'oil' ? 'norm' : group === 'infra' ? 'on' : 'stable';
    return Object.prototype.hasOwnProperty.call(options, requested) ? requested : fallback;
  }

  function scenarioBreakdown(zone, scenarios = {}) {
    const baseGrowth = scenarioBaseGrowth(zone);
    const selected = {
      oil: scenarioOption('oil', scenarios.oil),
      infra: scenarioOption('infra', scenarios.infra),
      cur: scenarioOption('cur', scenarios.cur)
    };
    const modifiers = {
      oil: { option: selected.oil, multiplier: SCENARIO_MODIFIERS.oil[selected.oil] },
      infra: { option: selected.infra, multiplier: SCENARIO_MODIFIERS.infra[selected.infra] },
      cur: { option: selected.cur, multiplier: SCENARIO_MODIFIERS.cur[selected.cur] }
    };
    const rawGrowth = baseGrowth * modifiers.oil.multiplier * modifiers.infra.multiplier * modifiers.cur.multiplier;
    const roundedGrowth = Math.round(rawGrowth / SCENARIO_ROUNDING_INCREMENT) * SCENARIO_ROUNDING_INCREMENT;
    return { baseGrowth, modifiers, rawGrowth, roundedGrowth, roundingIncrement: SCENARIO_ROUNDING_INCREMENT };
  }

  function scenarioGrowth(zone) {
    return scenarioBreakdown(zone, state.scenarios).roundedGrowth;
  }
```

- [ ] **Step 3: Expose the test hook without exposing mutable state**

Add inside `window.__V3TestHooks`:

```js
      getScenarioBreakdown: (zoneId, scenarios) => {
        const zone = zones.find(item => item.id === zoneId);
        if (!zone) throw new Error('Unknown zone: ' + zoneId);
        return scenarioBreakdown(zone, scenarios);
      },
```

- [ ] **Step 4: Run syntax, focused, and existing currency tests**

```powershell
node --check v3.js
npx playwright test tests/e2e.spec.js --project=chromium --grep "scenario breakdown exposes|weak manat scenario|scenario calculator uses"
```

Expected: all selected tests PASS; White City weak-manat output remains `110%`, and Zikh bad-oil output remains `105%`.

- [ ] **Step 5: Commit**

```powershell
git add v3.js
git commit -m "refactor: expose scenario calculation breakdown"
```

### Task 3: Round-trip scenario state through the URL hash

**Files:**
- Modify: `tests/e2e.spec.js`
- Modify: `v3.js` in `updateHash()`, `readHash()`, and `setScenario()`.

**Interfaces:**
- Consumes: existing hash fields `z`, `y`, `lang`, `heat`, and `metro`.
- Produces: optional validated fields `oil`, `infra`, and `cur`.

- [ ] **Step 1: Add four URL compatibility tests**

Add:

```js
test('scenario selections load from and round-trip through the shareable hash', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-hash#z=whitecity&y=2026&lang=en&oil=bad&infra=late&cur=weak');
  await waitForMap(page);
  await page.locator('#accordion-scenarios .accordion-summary').click();
  await expect(page.locator('#scenarioOil')).toHaveValue('bad');
  await expect(page.locator('#scenarioInfra')).toHaveValue('late');
  await expect(page.locator('#scenarioCurrency')).toHaveValue('weak');
  await expect(page.locator('#scenarioOutput')).toContainText('65%');

  await page.locator('#scenarioOil').selectOption('good');
  await expect(page).toHaveURL(/oil=good/);
  await expect(page).toHaveURL(/infra=late/);
  await expect(page).toHaveURL(/cur=weak/);
});

test('invalid scenario hash values fall back to existing defaults', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-invalid#z=whitecity&y=2026&lang=en&oil=extreme&infra=never&cur=unknown');
  await waitForMap(page);
  await page.locator('#accordion-scenarios .accordion-summary').click();
  await expect(page.locator('#scenarioOil')).toHaveValue('norm');
  await expect(page.locator('#scenarioInfra')).toHaveValue('on');
  await expect(page.locator('#scenarioCurrency')).toHaveValue('stable');
  await expect(page.locator('#scenarioOutput')).toContainText('140%');
});

test('legacy hashes without scenario fields preserve existing defaults', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-legacy#z=whitecity&y=2026&lang=en&heat=0&metro=1');
  await waitForMap(page);
  await page.locator('#accordion-scenarios .accordion-summary').click();
  await expect(page.locator('#scenarioOil')).toHaveValue('norm');
  await expect(page.locator('#scenarioInfra')).toHaveValue('on');
  await expect(page.locator('#scenarioCurrency')).toHaveValue('stable');
});

test('fixed Turkish entry preserves scenario hash values while overriding language', async ({ page }) => {
  await page.goto('./tr/?cache=e2e-scenario-fixed-tr#z=whitecity&y=2026&lang=en&oil=bad&infra=late&cur=weak');
  await waitForMap(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await page.locator('#accordion-scenarios .accordion-summary').click();
  await expect(page.locator('#scenarioOil')).toHaveValue('bad');
  await expect(page.locator('#scenarioInfra')).toHaveValue('late');
  await expect(page.locator('#scenarioCurrency')).toHaveValue('weak');
  await expect(page.locator('#scenarioOutput')).toContainText('%65');
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

```powershell
npx playwright test tests/e2e.spec.js --project=chromium --grep "scenario selections load|invalid scenario hash|legacy hashes|fixed Turkish entry preserves"
```

Expected: the round-trip, invalid-value, and fixed-Turkish tests FAIL because scenario fields are not read or written; the legacy-default assertions may already pass.

- [ ] **Step 3: Serialize the validated state**

In `updateHash()`, after the existing map fields, add:

```js
    params.set('oil', scenarioOption('oil', state.scenarios.oil));
    params.set('infra', scenarioOption('infra', state.scenarios.infra));
    params.set('cur', scenarioOption('cur', state.scenarios.cur));
```

- [ ] **Step 4: Read only recognized scenario values**

In `readHash()`, add:

```js
    state.scenarios.oil = scenarioOption('oil', params.get('oil'));
    state.scenarios.infra = scenarioOption('infra', params.get('infra'));
    state.scenarios.cur = scenarioOption('cur', params.get('cur'));
```

Do not change fixed-language precedence.

- [ ] **Step 5: Persist changes made in the interface**

In `setScenario()`, validate the requested option by group, assign it, and call `updateHash()` before rendering:

```js
  function setScenario(key, value) {
    if (!['oil', 'infra', 'cur'].includes(key)) return;
    state.scenarios[key] = scenarioOption(key, value);
    updateHash();
    renderAllContent();
    renderPanel();
  }
```

- [ ] **Step 6: Run URL, language, deep-link, and scenario regressions**

```powershell
npx playwright test tests/e2e.spec.js --project=chromium --grep "scenario selections load|invalid scenario hash|legacy hashes|fixed Turkish entry preserves|deep link opens|fixed language entry points|weak manat scenario"
```

Expected: all selected tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add v3.js tests/e2e.spec.js
git commit -m "feat: preserve scenarios in shareable links"
```

### Task 4: Render the bilingual calculation breakdown

**Files:**
- Modify: `data/content.json` in both language `labels` objects.
- Modify: `tests/e2e.spec.js`.
- Modify: `v3.js` in `renderScenarios()`.
- Modify: `v3.css` near the existing `.tool-card` and `.tool-note` rules.

**Interfaces:**
- Consumes: `scenarioBreakdown(selectedZone, state.scenarios)`.
- Produces: `#scenarioBreakdown`, `[data-scenario-base]`, `[data-scenario-result]`, and `.scenario-modifier` rows.

- [ ] **Step 1: Add the exact bilingual labels**

Add these English label values:

```json
"editorialBaseline": "Editorial scenario baseline",
"activeModifiers": "Sensitivity modifiers",
"calculatedResult": "Illustrative sensitivity result",
"roundingRule": "Rounded to the nearest 5 percentage points",
"scenarioMethodWarning": "This calculation uses an editorial zone baseline and fixed sensitivity multipliers. It is not trained on property transactions and is not a valuation or forecast."
```

Add these Turkish label values:

```json
"editorialBaseline": "Editoryal senaryo başlangıcı",
"activeModifiers": "Duyarlılık çarpanları",
"calculatedResult": "Örnek duyarlılık sonucu",
"roundingRule": "En yakın 5 yüzde puanına yuvarlanır",
"scenarioMethodWarning": "Bu hesaplama, editoryal bölge başlangıcını ve sabit duyarlılık çarpanlarını kullanır. Gayrimenkul işlemleriyle eğitilmiş değildir; değerleme veya tahmin değildir."
```

- [ ] **Step 2: Add a failing bilingual rendering test**

```js
test('scenario output explains its editorial baseline, modifiers, rounding, and limitation', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-explanation#z=whitecity&y=2026&lang=en&oil=bad&infra=late&cur=weak');
  await waitForMap(page);
  await page.locator('#accordion-scenarios .accordion-summary').click();
  const breakdown = page.locator('#scenarioBreakdown');
  await expect(breakdown).toHaveAttribute('data-scenario-base', '140');
  await expect(breakdown).toHaveAttribute('data-scenario-result', '65');
  await expect(breakdown).toContainText('Editorial scenario baseline');
  await expect(breakdown).toContainText('×0.80');
  await expect(breakdown).toContainText('×0.72');
  await expect(breakdown).toContainText('Rounded to the nearest 5 percentage points');
  await expect(breakdown).toContainText('not a valuation or forecast');

  await engage(page);
  await page.locator('#langTr').click();
  await expect(page.locator('#scenarioBreakdown')).toContainText('Editoryal senaryo başlangıcı');
  await expect(page.locator('#scenarioBreakdown')).toContainText('değerleme veya tahmin değildir');
});
```

- [ ] **Step 3: Run the focused test and verify it fails**

```powershell
npx playwright test tests/e2e.spec.js --project=chromium --grep "scenario output explains"
```

Expected: FAIL because `#scenarioBreakdown` does not exist.

- [ ] **Step 4: Render from the breakdown object, never from duplicated arithmetic**

Add exact localization helpers beside `renderScenarios()`:

```js
  function scenarioGroupLabel(ui, group) {
    return group === 'oil' ? (ui.scOil || 'Oil money') : group === 'infra' ? (ui.scInfra || 'Metro & roads') : (ui.scCur || 'Manat');
  }

  function scenarioOptionLabel(ui, group, option) {
    const keys = {
      oil: { norm: 'scNorm', bad: 'scBad', good: 'scGood' },
      infra: { on: 'scOn', late: 'scLate' },
      cur: { stable: 'scStable', weak: 'scWeak' }
    };
    const fallbacks = {
      norm: 'Normal', bad: 'Bad years', good: 'Boom years',
      on: 'Built on time', late: 'Years late', stable: 'Stays stable', weak: 'Loses value'
    };
    return ui[keys[group][option]] || fallbacks[option];
  }
```

Inside `renderScenarios()`, calculate once:

```js
    const breakdown = selectedZone ? scenarioBreakdown(selectedZone, current) : null;
```

Construct the modifier rows from the breakdown object:

```js
    const modifierRows = breakdown ? Object.entries(breakdown.modifiers).map(([group, item]) =>
      '<div class="scenario-modifier"><span>' + escapeHtml(scenarioGroupLabel(ui, group)) + ': ' + escapeHtml(scenarioOptionLabel(ui, group, item.option)) + '</span><strong>×' + item.multiplier.toFixed(2) + '</strong></div>'
    ).join('') : '';
    const breakdownHtml = breakdown
      ? '<div id="scenarioBreakdown" data-scenario-base="' + breakdown.baseGrowth + '" data-scenario-result="' + breakdown.roundedGrowth + '">' +
        '<p><strong>' + escapeHtml(labels.editorialBaseline) + ':</strong> ' + breakdown.baseGrowth + '%</p>' +
        '<div><strong>' + escapeHtml(labels.activeModifiers) + '</strong>' + modifierRows + '</div>' +
        '<p><strong>' + escapeHtml(labels.calculatedResult) + ':</strong> ' + breakdown.roundedGrowth + '%</p>' +
        '<p>' + escapeHtml(labels.roundingRule) + '</p>' +
        '<div class="tool-note">' + escapeHtml(labels.scenarioMethodWarning) + '</div></div>'
      : '';
```

Insert `breakdownHtml` in the result card immediately after the existing `#scenarioOutput`. Keep the existing `#scenarioOutput` element and text so older tests and accessibility behavior remain compatible. Neutral options must render as `×1.00`.

The final HTML must include the warning and rounding copy from `content.labels`; do not hard-code English or Turkish sentences in `v3.js`.

- [ ] **Step 5: Add compact, mobile-safe styling**

Add:

```css
#scenarioBreakdown { display: grid; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
#scenarioBreakdown > p { margin: 0; }
.scenario-modifier { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 12px; }
.scenario-modifier strong { color: var(--navy); font-variant-numeric: tabular-nums; white-space: nowrap; }
```

Do not add animation, fixed heights, horizontal scrolling, or a new breakpoint.

- [ ] **Step 6: Run scenario and language regressions**

```powershell
node --check v3.js
node -e "JSON.parse(require('fs').readFileSync('data/content.json','utf8')); console.log('content json: PASS')"
npx playwright test tests/e2e.spec.js --project=chromium --grep "scenario output explains|weak manat scenario|Turkish tools keep|deep-linked zone refreshes"
```

Expected: syntax/JSON checks and all selected tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add data/content.json v3.js v3.css tests/e2e.spec.js
git commit -m "feat: explain scenario sensitivity arithmetic"
```

### Task 5: Add the calculation method to Sources and a static contract

**Files:**
- Modify: `data/content.json` in both language `sections.sources` objects.
- Modify: `v3.js` in `renderSources()`.
- Modify: `v3.css` near the existing source/tool-card rules.
- Modify: `tests/v3-single-audience-contract.ps1`.
- Modify: `tests/e2e.spec.js`.

**Interfaces:**
- Consumes: centralized `SCENARIO_MODIFIERS` and bilingual methodology copy.
- Produces: `.scenario-methodology` inside `#accordion-sources`.

- [ ] **Step 1: Add bilingual methodology copy**

Add under English `sections.sources`:

```json
"scenarioMethodTitle": "How the scenario calculation works",
"scenarioMethodBody": "Each zone starts with an editorial growth assumption stored in the atlas data. The oil, infrastructure, and currency controls apply fixed sensitivity multipliers, and the result is rounded to the nearest 5 percentage points. Source evidence informs the area narrative but does not statistically derive the growth assumption. Baku 2036 is not trained on property transactions and does not provide a professional valuation or forecast."
```

Add under Turkish `sections.sources`:

```json
"scenarioMethodTitle": "Senaryo hesaplaması nasıl çalışır?",
"scenarioMethodBody": "Her bölge, atlas verisinde kayıtlı editoryal bir büyüme varsayımıyla başlar. Petrol, altyapı ve döviz kontrolleri sabit duyarlılık çarpanları uygular; sonuç en yakın 5 yüzde puanına yuvarlanır. Kaynak kanıtları bölge anlatısını destekler, ancak büyüme varsayımını istatistiksel olarak üretmez. Baku 2036 gayrimenkul işlemleriyle eğitilmemiştir ve profesyonel değerleme veya tahmin sunmaz."
```

- [ ] **Step 2: Add a failing static contract**

In `tests/v3-single-audience-contract.ps1`, require:

```powershell
foreach ($token in @('SCENARIO_MODIFIERS', 'scenarioBreakdown', 'scenario-methodology', 'data-scenario-base', 'data-scenario-result')) {
  if ($script -notmatch [regex]::Escape($token)) { throw "Missing scenario transparency token: $token" }
}

$content = Get-Content -LiteralPath (Join-Path $root 'data\content.json') -Raw | ConvertFrom-Json
foreach ($lang in @('en', 'tr')) {
  foreach ($key in @('scenarioMethodTitle', 'scenarioMethodBody')) {
    if ([string]::IsNullOrWhiteSpace([string]$content.$lang.sections.sources.$key)) {
      throw "Missing $lang sources methodology key: $key"
    }
  }
}
```

- [ ] **Step 3: Run the contract and verify it fails**

```powershell
pwsh -NoProfile -File tests/v3-single-audience-contract.ps1
```

Expected: FAIL on the missing methodology class or missing content keys.

- [ ] **Step 4: Render the methodology block**

In `renderSources()`, insert this structure after the existing geography, projects, and circle-explanation paragraphs and before `.disclaimer-box`:

```html
<section class="scenario-methodology">
  <h3>[localized scenarioMethodTitle]</h3>
  <p>[localized scenarioMethodBody]</p>
</section>
```

Use `escapeHtml()` for both strings. Preserve every existing source, warning, attribution, and evidence legend element. The existing disclaimer remains the final element in the Sources body.

- [ ] **Step 5: Style the methodology as a subordinate disclosure**

Add:

```css
.scenario-methodology { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
.scenario-methodology h3 { margin: 0 0 6px; color: var(--navy); font-size: 14px; }
.scenario-methodology p { margin: 0; }
```

- [ ] **Step 6: Add an end-to-end disclosure test**

```js
test('sources disclose the scenario method in both languages', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-method#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#accordion-sources .accordion-summary').click();
  await expect(page.locator('.scenario-methodology')).toContainText('editorial growth assumption');
  await expect(page.locator('.scenario-methodology')).toContainText('does not statistically derive');
  await expect(page.locator('.scenario-methodology')).toContainText('not trained on property transactions');

  await engage(page);
  await page.locator('#langTr').click();
  await expect(page.locator('.scenario-methodology')).toContainText('editoryal bir büyüme varsayımı');
  await expect(page.locator('.scenario-methodology')).toContainText('istatistiksel olarak üretmez');
});
```

- [ ] **Step 7: Run static and browser tests**

```powershell
pwsh -NoProfile -File tests/v3-single-audience-contract.ps1
npx playwright test tests/e2e.spec.js --project=chromium --grep "sources disclose the scenario method|scenario output explains"
```

Expected: all selected checks PASS.

- [ ] **Step 8: Commit**

```powershell
git add data/content.json v3.js v3.css tests/e2e.spec.js tests/v3-single-audience-contract.ps1
git commit -m "docs: disclose scenario calculation method"
```

### Task 6: Verify Release 1 and deploy only to preview

**Files:**
- Verify: all tracked files changed by Tasks 1–5.
- Do not modify: `main` or live-root deployment behavior.

**Interfaces:**
- Consumes: completed Release 1 commits.
- Produces: reviewed preview pull request, successful Pages run, and hosted verification evidence.

- [ ] **Step 1: Inspect scope and forbidden changes**

```powershell
git status --short --branch
git diff origin/preview...HEAD --stat
git diff origin/preview...HEAD -- data/zones.json package.json package-lock.json .github/workflows/pages.yml
```

Expected: `.playwright-cli/` remains unstaged; `data/zones.json`, dependency files, and Pages architecture have no Release 1 changes.

- [ ] **Step 2: Run all static contracts**

```powershell
Get-ChildItem tests -Filter '*-contract.ps1' | ForEach-Object { pwsh -NoProfile -File $_.FullName }
```

Expected: every required contract passes; the existing explicitly optional 3D contract may report its documented skip condition.

- [ ] **Step 3: Run syntax, JSON, diff, and full browser verification**

```powershell
node --check v3.js
node -e "for (const f of ['data/content.json','data/zones.json','data/metro.json','data/places.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('json: PASS')"
git diff --check
npm test
```

Expected: all commands exit `0`. Record the fresh Chromium/WebKit count.

- [ ] **Step 4: Perform the manual preview checklist locally**

Verify at 390×844 and desktop width:

1. Legacy URL opens with neutral scenario defaults.
2. A scenario URL opens with all three selections restored.
3. Changing one selection updates the URL without losing zone, year, language, heat, or metro.
4. English and Turkish breakdowns contain no mixed-language copy.
5. Neutral multipliers remain visible as `×1.00`.
6. Existing percentages and deal-checker results have not changed.
7. The Sources methodology follows the existing explanatory source text, and the existing disclaimer remains last.

- [ ] **Step 5: Push the branch and create a draft pull request to `preview`**

```powershell
git push -u origin HEAD
gh pr create --repo Qarait/Baku-2036 --base preview --head codex/raise-inspired-roadmap --draft --title "Explain and share scenario calculations" --body "Release 1 only: exposes the existing editorial baseline and fixed modifiers, preserves scenarios in the URL, and adds bilingual methodology disclosure. No scenario values, formulas, dependencies, market data, or main deployment behavior changed."
```

- [ ] **Step 6: Wait for the required pull-request check**

```powershell
gh pr checks --repo Qarait/Baku-2036 --watch --interval 15
```

Expected: the required Playwright smoke suite passes. If it fails, inspect the failing job and fix only an in-scope Release 1 regression.

- [ ] **Step 7: Mark ready, merge to preview, and watch Pages**

```powershell
$raisePrNumber = gh pr view --repo Qarait/Baku-2036 --json number --jq '.number'
gh pr ready $raisePrNumber --repo Qarait/Baku-2036
gh pr merge $raisePrNumber --repo Qarait/Baku-2036 --merge --delete-branch=false
$raiseMergeSha = gh pr view $raisePrNumber --repo Qarait/Baku-2036 --json mergeCommit --jq '.mergeCommit.oid'
$raiseRunId = $null
for ($raiseAttempt = 0; $raiseAttempt -lt 12 -and -not $raiseRunId; $raiseAttempt++) {
  $raiseRunId = gh run list --repo Qarait/Baku-2036 --workflow pages.yml --branch preview --commit $raiseMergeSha --limit 1 --json databaseId --jq '.[0].databaseId'
  if (-not $raiseRunId) { Start-Sleep -Seconds 5 }
}
if (-not $raiseRunId) { throw "Pages run did not appear for merge $raiseMergeSha" }
gh run watch $raiseRunId --repo Qarait/Baku-2036 --exit-status
```

- [ ] **Step 8: Verify the hosted preview**

Open:

```text
https://qarait.github.io/Baku-2036/preview/#z=whitecity&y=2026&lang=en&heat=0&metro=1&oil=bad&infra=late&cur=weak
```

Expected: White City loads; the three controls show bad/late/weak; the result is `65%`; the breakdown shows baseline `140`, multipliers `×0.80`, `×0.72`, `×0.80`, the rounding rule, and the English warning. Repeat with `/preview/tr/` and confirm Turkish copy.

- [ ] **Step 9: Stop**

Report Release 1 results and request explicit approval before creating the Release 2 factor-ledger design. Do not add factor records, scenario ranges, zone weights, observations, or model code in this branch.

## Subsequent Release Sequence — Separate Approval and Plan Required

The executor must not implement these releases from this document. The table is the handoff order and gate definition for future plans.

| Release | Independent deliverable | Required inputs before design | Mandatory gate before next release |
| --- | --- | --- | --- |
| 2. Qualitative factor ledger | Stable evidence IDs, approved factor vocabulary, bilingual factor records, evidence-reference validation, support/risk/dependency UI; no arithmetic changes | Human-approved mapping for all 16 zones; every factor cites existing evidence or is explicitly `unknown` | Schema contract passes; no unresolved evidence IDs; human review confirms no factor or translation was invented |
| 3. Governed market-data foundation | Observation schema, provenance/rights register, offline validator, deduplication report, missingness report, coverage report; no public UI | Named data sources, permission/terms record, retention decision, asking-vs-sale classification, currency/unit policy | Human accepts source rights and quality report; raw restricted data excluded from Pages and Git where required |
| 4. Descriptive market evidence | Public aggregate files and charts showing period, type, price basis, observation count, and limitations | Release 3 gate; approved aggregation and publication rules | Aggregates reproduce from validated observations; asking prices never labelled sales; sparse/unsafe cells suppressed under the approved rule |
| 5. Validated modelling research | Offline interpretable benchmark, time holdout, spatial holdout, residual/error reports, model card; no automatic website publication | Sufficient approved historical coverage; explicit target claim and acceptable-error decision from a domain reviewer | Model beats simple median benchmark on held-out data; errors and exclusions approved; consumer comprehension test passes |
| 6. Infrastructure counterfactuals | Baseline-versus-intervention model outputs with uncertainty and association language | Approved Release 5 valuation baseline plus stable accessibility variables | Counterfactual validation and domain review; no causal language without causal design |

## Instructions for the next model after Release 1

1. Read the design spec and this plan completely.
2. Confirm which release the user authorized.
3. If the user authorized Release 2 or later, create a new design spec and implementation plan for that release only.
4. Inspect the actual current `preview` branch; do not assume Release 1 file positions or test counts remain unchanged.
5. Treat every gate failure as a stop condition, not permission to synthesize missing data.
6. Keep the consumer map useful even if modelling is never implemented.
