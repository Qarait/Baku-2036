# RAISE-Inspired Baku 2036 Release 2 Factor-Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a validated qualitative factor ledger that connects approved zone reasoning to existing evidence without changing Release 1 calculations.

**Architecture:** Evidence remains inline in `data/zones.json`, with one stable `id` added to each existing evidence record. Each zone receives a `scenarioFactors` array containing approved bilingual statements, one qualitative role, and one or more evidence IDs. A static validator blocks unresolved references and invalid records before browser tests or Pages deployment; the ledger never enters `scenarioBreakdown()`.

**Tech Stack:** Static JSON, JavaScript rendering, PowerShell contract tests, Playwright, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-08-21-raise-release2-factor-ledger-design.md`

## Global Constraints

- Do not implement until a human approves the vocabulary, roles, bilingual statements, and complete 16-zone mapping in the accompanying proposal.
- Never add numerical factor weights, coefficients, exposure percentages, scores, ranges, or confidence arithmetic.
- Keep every existing `growthPct` value, Release 1 modifier, `scenarioBreakdown()`, and deal-checker calculation unchanged.
- Use only the 19 existing evidence records unless a separately approved evidence change adds a documented record.
- Do not call asking prices completed sales or infer property-price movement from infrastructure evidence.
- Do not add scraping, remote APIs, databases, analytics, tracking, machine learning, GWR, Monte Carlo, or new dependencies.
- Preserve English/Turkish, fixed-language entry points, mobile layout, accessibility hooks, URL compatibility, and the Pages artifact boundary.
- Work in an isolated `codex/` branch based on the latest `origin/preview` and deploy to `preview` only.
- Do not stage `.playwright-cli/` or unrelated worktree files.

## Approval gate before implementation

- [ ] Reviewer approves `docs/superpowers/specs/2026-08-21-raise-release2-factor-ledger-design.md`.
- [ ] Reviewer confirms each evidence ID, factor role, and zone mapping.
- [ ] Reviewer approves the English/Turkish factor statements.
- [ ] Reviewer confirms that `unknown` mappings remain visible and are not silently converted to support or risk.

No code task below may begin while any approval item is unchecked.

## File responsibility map

- `data/zones.json`: owns stable evidence IDs and approved `scenarioFactors`; no executable values.
- `v3.js`: owns validation and rendering of approved factor records; must not read factors from scenario arithmetic.
- `v3.css`: owns compact support/risk/dependency/unknown presentation without new layout breakpoints.
- `tests/release2-factor-contract.ps1`: owns static/schema validation before browser startup.
- `tests/e2e.spec.js`: owns English/Turkish rendering, accessibility, and non-interference regressions.
- `data/content.json`: owns bilingual section labels and factor-role copy; it must not own factor records or numeric values.

## Task 1: Freeze the approved data contract with failing tests

**Files:**
- Create: `tests/release2-factor-contract.ps1`
- Modify: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: the approved evidence IDs, factor IDs, roles, and bilingual statements from the Release 2 spec.
- Produces: a validator contract that rejects duplicate IDs, unresolved references, invalid roles, missing statements, and empty factor arrays.

- [ ] **Step 1: Add a failing contract fixture assertion**

Require every evidence record to have a unique non-empty `id`. Require every `scenarioFactors` item to have:

```json
{
  "id": "transport-programmed",
  "role": "dependency",
  "evidenceIds": ["whitecity.aiib-metro-y14"],
  "en": "Approved English statement.",
  "tr": "Onaylı Türkçe ifade."
}
```

The accepted roles are exactly `support`, `risk`, `dependency`, and `unknown`. The contract must verify every `evidenceIds` value against the evidence IDs in the same canonical zones file.

- [ ] **Step 2: Run the contract and confirm the expected red state**

Run:

```powershell
pwsh -NoProfile -File tests/release2-factor-contract.ps1
```

Expected: FAIL because the current data has no approved evidence IDs or `scenarioFactors` yet.

- [ ] **Step 3: Add browser assertions before rendering implementation**

Add tests that select White City and assert one support/dependency factor is visible in English, switch to Turkish and assert its approved Turkish statement is visible, and confirm `#scenarioOutput` remains the same before and after factor rendering.

- [ ] **Step 4: Commit the red contract**

```powershell
git add tests/release2-factor-contract.ps1 tests/e2e.spec.js
git commit -m "test: define qualitative factor ledger contract"
```

## Task 2: Add stable IDs and approved qualitative records

**Files:**
- Modify: `data/zones.json`
- Modify: `tests/release2-factor-contract.ps1`
- Test: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: the approved 19 evidence IDs and complete zone mapping.
- Produces: canonical evidence records and `scenarioFactors` that contain no executable numeric values.

- [ ] **Step 1: Add exactly the approved evidence IDs**

Add the IDs from the approved spec to the corresponding existing evidence objects. Do not duplicate a source entry to create a factor. Do not change source URLs, claims, meanings, status, confidence, or dates in this task.

- [ ] **Step 2: Add approved factors for all 16 zones**

Add only the approved mapping. For example, the approved White City records would be structurally equivalent to:

```json
"scenarioFactors": [
  {
    "id": "transport-programmed",
    "role": "dependency",
    "evidenceIds": ["whitecity.aiib-metro-y14"],
    "en": "An official plan or programme documents planned transport work; timing, delivery, and useful access remain dependencies.",
    "tr": "Resmî bir plan veya program planlanan ulaşım çalışmasını belgeler; zamanlama, teslim ve işe yarar erişim hâlâ bağımlılıktır."
  },
  {
    "id": "development-anchor",
    "role": "support",
    "evidenceIds": ["whitecity.atkins-white-city"],
    "en": "A named regeneration or private development anchor is documented; reported plans or targets are not independent market forecasts.",
    "tr": "Adı belirtilen bir yenileme veya özel gelişim odağı belgelenmiştir; bildirilen planlar veya hedefler bağımsız piyasa tahminleri değildir."
  }
]
```

Do not copy this example into every zone. Each zone must use its approved evidence IDs and statement.

- [ ] **Step 3: Run the contract and data checks**

Run:

```powershell
pwsh -NoProfile -File tests/release2-factor-contract.ps1
node -e "JSON.parse(require('fs').readFileSync('data/zones.json','utf8')); console.log('zones json: PASS')"
```

Expected: PASS, with all 19 evidence IDs unique and all factor references resolvable.

- [ ] **Step 4: Confirm arithmetic non-interference**

Run the existing scenario tests and assert that White City remains 140% neutral and 65% for bad/late/weak. The factor records must not be imported by `scenarioBreakdown()`.

- [ ] **Step 5: Commit the data contract**

```powershell
git add data/zones.json tests/release2-factor-contract.ps1 tests/e2e.spec.js
git commit -m "data: add approved qualitative factor mappings"
```

## Task 3: Validate references before rendering

**Files:**
- Modify: `v3.js`
- Modify: `tests/release2-factor-contract.ps1`
- Modify: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: canonical evidence IDs and zone `scenarioFactors`.
- Produces: validated factor records available to the zone-detail renderer, never to scenario arithmetic.

- [ ] **Step 1: Add failing runtime validation coverage**

Route a test copy of `zones.json` with one unresolved factor reference, one duplicate evidence ID, and one invalid role. Assert that the existing localized validation state blocks startup and identifies the dataset and record.

- [ ] **Step 2: Implement validation with explicit errors**

The validator must reject:

```text
duplicate evidence id
missing evidence id
unknown evidence reference
role outside support|risk|dependency|unknown
missing or empty en/tr statement
missing factor id
duplicate factor id within one zone
```

It must not reject a factor merely because its role is `unknown`; `unknown` is an approved evidence-gap state.

- [ ] **Step 3: Run malformed-data tests**

Run the focused validation tests and confirm the error path is localized in English and Turkish.

- [ ] **Step 4: Commit validation**

```powershell
git add v3.js tests/release2-factor-contract.ps1 tests/e2e.spec.js
git commit -m "feat: validate qualitative factor references"
```

## Task 4: Render the factor ledger accessibly in both languages

**Files:**
- Modify: `v3.js`
- Modify: `v3.css`
- Modify: `data/content.json`
- Modify: `tests/e2e.spec.js`

**Interfaces:**
- Consumes: validated `scenarioFactors` and existing evidence cards.
- Produces: a subordinate “What supports this scenario?” / “What could weaken it?” area with role labels and links to existing evidence cards.

- [ ] **Step 1: Add exact bilingual UI labels**

Add labels for support, risk, dependency, unknown, factor heading, and evidence link. Keep the copy explanatory and do not call a factor a forecast, score, premium, or causal effect.

- [ ] **Step 2: Add failing browser tests**

For White City, assert the transport dependency and development support appear with their source names. For Narimanov and Sabail, assert the market-context factor is labeled `unknown` and does not contain a zone-specific price-lead claim. Repeat the assertions through the fixed Turkish entry point.

- [ ] **Step 3: Render from validated records only**

Use the existing escaped HTML helpers. Each evidence link must point to the existing evidence card or source URL and preserve `rel="noopener"`. Keep factor content separate from `scenarioOutput` and the scenario breakdown.

- [ ] **Step 4: Add mobile-safe styling**

Use the existing grid, typography, colors, and touch-target conventions. Do not add horizontal scrolling, fixed heights, animation, or a new breakpoint.

- [ ] **Step 5: Run focused browser and accessibility regressions**

Run the factor-ledger, scenario non-interference, fixed-language, mobile, and keyboard-focus tests.

- [ ] **Step 6: Commit the UI**

```powershell
git add v3.js v3.css data/content.json tests/e2e.spec.js
git commit -m "feat: show evidence-linked qualitative factors"
```

## Task 5: Release 2 verification and preview gate

**Files:**
- Verify: all Release 2 files and contracts.
- Do not modify: `main`, Release 1 formula, scenario modifiers, or raw market data.

- [ ] **Step 1: Confirm no numerical scenario changes**

Compare all 16 `growthPct` values and run the Release 1 scenario-breakdown tests before and after the factor UI is open.

- [ ] **Step 2: Run every static contract**

```powershell
Get-ChildItem tests -Filter '*-contract.ps1' | ForEach-Object { pwsh -NoProfile -File $_.FullName }
```

- [ ] **Step 3: Run the complete browser suite**

```powershell
node --check v3.js
node -e "for (const f of ['data/content.json','data/zones.json','data/metro.json','data/places.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('json: PASS')"
git diff --check
npm test
```

- [ ] **Step 4: Perform the human evidence review**

Review all 16 zones in English and Turkish. Confirm each factor statement is supported by its linked evidence, every unknown remains visibly unknown, and no copy implies a measured return or causal premium.

- [ ] **Step 5: Deploy to preview through a pull request**

Push the Release 2 branch, create a draft PR against `preview`, wait for the required Playwright check, mark ready, merge only after it is clean, and watch the Pages workflow.

- [ ] **Step 6: Verify hosted preview**

Check White City support/dependency factors, Narimanov/Sabail unknown market context, English/Turkish fixed entry points, direct evidence links, and unchanged scenario output at the deployed `/preview/` URL.

- [ ] **Step 7: Stop before Release 3**

Do not add property observations, source scraping, public market aggregates, or modelling. Release 3 requires a separate rights and data-governance approval.
