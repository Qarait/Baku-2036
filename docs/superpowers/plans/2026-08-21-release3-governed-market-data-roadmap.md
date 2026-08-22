
# Release 3 Governed Market-Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private/offline, source-agnostic property-observation foundation with rights validation, non-destructive deduplication, missingness and coverage reports, while keeping raw market data out of the public site and Pages artifacts.

**Architecture:** Keep schemas and clearly synthetic fixtures under `research/market-data/`; keep executable logic in dependency-free Node modules under `scripts/market-data/`. A contract module validates rights and observations before report generation. Reporting produces deterministic JSON from a canonical input digest and never mutates or deletes observations. The public application does not import this workspace, and Pages excludes the entire `research/` tree.

**Tech Stack:** Node.js built-ins (`node:fs`, `node:path`, `node:crypto`, `node:test`), JSON Schema documents, PowerShell repository contracts, GitHub Pages exclusion manifest, and no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-21-release3-governed-market-data-design.md`

## Global Constraints

- Use synthetic fixtures only; no licensed, private, or real property records are available for this release.
- Do not scrape, call remote data sources, add a database, or add a new dependency.
- Do not publish raw observations, source-record identifiers, personal data, or restricted rights material.
- Keep asking prices and completed sales as separate explicit transaction types.
- Do not convert currencies, convert area measures, impute missing values, remove outliers, or silently merge duplicates.
- Every observation must have `observationId`, `sourceId`, `rightsId`, `transactionType`, `observedAt`, `propertyType`, explicit price currency/basis, and explicit area unit/measure.
- Completed sales require `eventDate`; asking observations must not be upgraded to sales.
- Rights records must gate the declared operation; missing, expired, rejected, or insufficient rights fail validation.
- Duplicate, missingness, and coverage outputs must be deterministic for the same input.
- Real/private/generated paths are `research/market-data/raw/`, `research/market-data/private/`, and `research/market-data/generated/`.
- The Pages artifact must exclude `research/`; no public JavaScript, HTML, zone data, or scenario formula may consume it.
- Do not modify `v3.js`, `data/zones.json`, `growthPct`, `scenarioBreakdown()`, or public UI behavior.
- Do not stage `.playwright-cli/` or any real/private/generated research file.

## File Responsibility Map

- `research/market-data/README.md`: offline operator instructions, fixture boundary, commands, and rights warning.
- `research/market-data/schemas/observation.schema.json`: version 1.0 observation structure and enums.
- `research/market-data/schemas/rights-record.schema.json`: version 1.0 provenance and rights structure.
- `research/market-data/fixtures/synthetic-observations.json`: non-real records covering asking/sale, periods, types, and optional missingness.
- `research/market-data/fixtures/synthetic-rights.json`: rights records for the synthetic fixture.
- `scripts/market-data/contract.mjs`: pure validation, canonicalization, and input digest functions.
- `scripts/market-data/reports.mjs`: pure duplicate, missingness, and coverage report functions.
- `scripts/validate-market-data.mjs`: offline validation CLI with non-zero failure status.
- `scripts/report-market-data.mjs`: offline deterministic report CLI.
- `tests/market-data-contract.test.mjs`: Node built-in tests for schemas, validation, rights gating, and reports.
- `.gitignore`: ignores private/raw/generated research paths.
- `.pagesignore`: excludes `research/` from every Pages build.
- `tests/pages-artifact-contract.ps1`: verifies the research exclusion and public artifact boundary.
- `package.json`: adds `test:market-data` without changing the existing browser test command.

---

### Task 1: Freeze the contract with failing tests

**Files:**
- Create: `tests/market-data-contract.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: the approved Release 3 field and rights rules.
- Produces the test-facing API:
```js
import {
  validateRights,
  validateObservations,
  canonicalJson,
  digestJson
} from '../scripts/market-data/contract.mjs';

import {
  buildDuplicateReport,
  buildMissingnessReport,
  buildCoverageReport
} from '../scripts/market-data/reports.mjs';
```

- [ ] **Step 1: Add the market-data test command.**

Add this script beside the existing scripts in `package.json`:

```json
"test:market-data": "node --test tests/market-data-contract.test.mjs"
```

- [ ] **Step 2: Write the failing API tests.**

The test file must import the not-yet-created modules and assert a valid synthetic record passes, a completed sale without `eventDate` fails with code `missing-event-date`, and equivalent objects with different key order have equal `canonicalJson` and `digestJson` values. Add cases for missing rights, invalid `m2` units, invalid transaction types, personal-data fields, duplicate observation IDs, and rights that do not allow the intended use. Add report expectations for an exact duplicate group, field missingness, and period/type/geography counts using inline synthetic objects.

- [ ] **Step 3: Run the new command and confirm the expected red state.**

Run:

```powershell
npm run test:market-data
```

Expected: failure because the imported contract and report modules do not exist. The failure must be module resolution, not a syntax error in the test.

- [ ] **Step 4: Commit the red test contract.**

```powershell
git add -- package.json tests/market-data-contract.test.mjs
git commit -m "test: define Release 3 market-data contract"
```

---

### Task 2: Add versioned schemas and synthetic fixtures

**Files:**
- Create: `research/market-data/schemas/observation.schema.json`
- Create: `research/market-data/schemas/rights-record.schema.json`
- Create: `research/market-data/fixtures/synthetic-observations.json`
- Create: `research/market-data/fixtures/synthetic-rights.json`
- Modify: `tests/market-data-contract.test.mjs`

**Interfaces:**
- Consumes: the field contract in the approved specification.
- Produces: parseable version 1.0 schemas and synthetic fixtures loaded by tests and later CLI defaults.

- [ ] **Step 1: Write the observation schema.**

Use JSON Schema draft 2020-12 with `additionalProperties: false` at observation, price, area, location, and characteristics levels. Require `schemaVersion`, `observationId`, `sourceId`, `rightsId`, `transactionType`, `observedAt`, `propertyType`, `price`, `area`, and `location`. Define transaction type `asking|completed_sale`, property type `apartment|house|land|commercial|other`, currencies `AZN|USD|EUR`, price basis `total|per_m2`, area unit `m2`, area measure `gross|net|land`, and location precision `exact|street|district|zone|unknown`.

- [ ] **Step 2: Write the rights schema.**

Require `schemaVersion`, `rightsId`, `sourceId`, `sourceName`, `acquisitionBasis`, `allowedUses`, `rawRedistribution`, `derivedPublication`, `retention`, `personalDataHandling`, `reviewedAt`, `reviewer`, and `status`. Use explicit values:

```text
acquisitionBasis: synthetic | licensed | permission | public_terms | internal
rawRedistribution: prohibited | allowed | not_applicable
derivedPublication: prohibited | allowed | review_required | not_applicable
personalDataHandling: prohibited | redacted | allowed
status: approved_for_fixture_testing | approved | restricted | rejected | expired
```

Accept nullable `termsUrl`, but validate HTTP(S) when present.

- [ ] **Step 3: Add synthetic records that exercise reports.**

Create at least five clearly synthetic observations: two asking observations in different periods and currencies, one completed sale with an event date, a second observation with the same `sourceId + sourceRecordId` for an exact duplicate report, and one valid observation with optional characteristics omitted and location precision `unknown`. Use IDs and names containing `synthetic`; do not use real addresses, market claims, or real source URLs. Add matching rights records with `allowedUses: ["internal_testing"]`, `rawRedistribution: "not_applicable"`, and `derivedPublication: "not_applicable"`.

- [ ] **Step 4: Add fixture-loading assertions.**

Parse both fixture files, assert arrays and `schemaVersion: "1.0"`, and assert no fixture source name claims to be real market data.

- [ ] **Step 5: Run JSON and test checks.**

```powershell
node -e "for (const f of ['research/market-data/schemas/observation.schema.json','research/market-data/schemas/rights-record.schema.json','research/market-data/fixtures/synthetic-observations.json','research/market-data/fixtures/synthetic-rights.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('Release 3 JSON: PASS')"
npm run test:market-data
```

Expected: JSON parsing passes; tests remain red because the contract/report modules are still unimplemented.

- [ ] **Step 6: Commit schemas and fixtures.**

```powershell
git add -- research/market-data/schemas research/market-data/fixtures tests/market-data-contract.test.mjs
git commit -m "data: add governed market-data schemas and synthetic fixtures"
```

---

### Task 3: Implement rights and observation validation

**Files:**
- Create: `scripts/market-data/contract.mjs`
- Modify: `tests/market-data-contract.test.mjs`

**Interfaces:**
- Consumes: parsed rights and observation arrays.
- Produces:
```js
validateRights(records, { intendedUse }): {
  valid: boolean,
  errors: Array<{ code: string, path: string, message: string }>,
  rightsById: Map<string, object>
}

validateObservations(records, rightsById, { intendedUse }): {
  valid: boolean,
  errors: Array<{ code: string, path: string, message: string }>,
  records: object[],
  rejected: Array<{ record: object, errors: Array<object> }>
}

canonicalJson(value): string
digestJson(value): string
```

- [ ] **Step 1: Implement canonicalization and digests.**

Recursively sort object keys, preserve array order, serialize with `JSON.stringify`, and hash the UTF-8 canonical string with `crypto.createHash('sha256')`. Do not include a generated timestamp in the digest.

- [ ] **Step 2: Implement rights validation.**

Validate unique non-empty `rightsId` and `sourceId`, schema version, date fields, explicit status, HTTP(S) `termsUrl` when non-null, and `allowedUses`. Build `rightsById` only from records with no errors. Require `allowedUses` to contain `intendedUse`; accept `internal_testing` for fixtures and `internal_analysis` for future private use. Reject `rejected` and `expired` records.

- [ ] **Step 3: Implement observation validation.**

Validate duplicate IDs, required identifiers, date patterns, transaction/property enums, positive price and area numbers, explicit currency and basis, `m2` area units, area measure, location precision, and rights references. Require `eventDate` for `completed_sale`; reject a sale with no event date and reject an asking record with a non-null event date. Reject keys outside the allowed characteristics set and keys matching personal-data names such as `seller`, `broker`, `phone`, or `email`. Return valid records separately from rejected records; rejected records may remain in memory for quality reporting but must never be printed or serialized by the validator.

- [ ] **Step 4: Run tests and fix only implementation failures.**

```powershell
npm run test:market-data
```

Expected: the valid fixture and every validation case pass. Error assertions must identify stable IDs and field paths, not raw record payloads.

- [ ] **Step 5: Commit validation.**

```powershell
git add -- scripts/market-data/contract.mjs tests/market-data-contract.test.mjs
git commit -m "feat: validate governed market observations and rights"
```

---

### Task 4: Implement deterministic quality reports

**Files:**
- Create: `scripts/market-data/reports.mjs`
- Modify: `tests/market-data-contract.test.mjs`

**Interfaces:**
- Consumes: validated observations, `inputDigest`, and `schemaVersion`.
- Produces:
```js
buildDuplicateReport(records, { inputDigest, schemaVersion }): object
buildMissingnessReport(records, { inputDigest, schemaVersion, rejectedRecords }): object
buildCoverageReport(records, { inputDigest, schemaVersion, coverageFrame, rejectedCount }): object
```

- [ ] **Step 1: Implement exact duplicate groups.**

Group by `sourceId + sourceRecordId` only when `sourceRecordId` is non-empty. Return `kind: "exact-source-record"`, sorted observation IDs, matching key type, and `duplicateGroupCount`. Keep all records in the validated array.

- [ ] **Step 2: Implement probable fingerprint groups.**

Fingerprint source ID, transaction type, observed date, property type, price amount/currency/basis, area value/unit/measure, coarse location, and stable characteristics. Exclude free text and observation ID. Group only fingerprints occurring more than once and label them `kind: "probable-normalized-fingerprint"`; never call them confirmed duplicates.

- [ ] **Step 3: Implement missingness counts.**

For required and optional paths, return `present`, `missing`, `explicitUnknown`, `notApplicable`, `invalid`, and `rate`. Include breakdowns by source, month/quarter, transaction type, property type, and coarse location. Feed rejected records into the `invalid` counts without exposing their values; valid records remain the only records eligible for duplicate and coverage dimensions. Treat omitted characteristics and `location.precision: "unknown"` as missingness signals without turning them into zero values.

- [ ] **Step 4: Implement coverage counts.**

Return input/valid/rejected/reportable counts, date min/max, source IDs, rights IDs, transaction/property types, currencies, price bases, coarse geographies, source-by-period counts, and geography-by-period counts. Accept a `coverageFrame` containing configured periods and geographies so the report can list explicit zero-count cells. Include the limitation string: `Observed records are not automatically a representative sample of the Baku market.`

- [ ] **Step 5: Add report assertions and deterministic comparison.**

Assert the synthetic exact group, intentional missingness, invalid/rejected counts, source and period breakdowns, both transaction types, expected period cells, deep equality of two report executions, identical `inputDigest` values, and that report generation does not mutate valid or rejected input objects.

- [ ] **Step 6: Run tests and commit reports.**

```powershell
npm run test:market-data
git add -- scripts/market-data/reports.mjs tests/market-data-contract.test.mjs
git commit -m "feat: generate deterministic market-data quality reports"
```

Expected: all contract and report tests pass.

---

### Task 5: Add offline CLI entry points

**Files:**
- Create: `scripts/validate-market-data.mjs`
- Create: `scripts/report-market-data.mjs`
- Modify: `tests/market-data-contract.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes `--observations <path>`, `--rights <path>`, optional `--use <internal_testing|internal_analysis>`, and report `--out-dir <path>`.
- Produces validation JSON on stdout with no raw record contents, exit code 0 for valid input and 1 for invalid input; report files `duplicates.json`, `missingness.json`, `coverage.json`, and `summary.json`.

- [ ] **Step 1: Define CLI path behavior.**

With no input paths, use synthetic fixtures. Reject an incomplete pair where only one input path is supplied. Resolve paths from the current working directory and never search the public `data/` directory.

- [ ] **Step 2: Implement validation CLI output.**

Success output must contain `valid`, `schemaVersion`, `inputDigest`, `recordsRead`, `rightsRecordsRead`, and `errors: []`. Failure output must contain `valid: false`, stable error objects, and no price, address, or raw record payload. Set `process.exitCode = 1` for expected validation failures.

- [ ] **Step 3: Implement report CLI output.**

Validate first. If JSON cannot be parsed or the input shape cannot be safely classified, fail without writing reports. For contract-invalid records, write reports from valid records plus rejected-count/missingness metadata, mark the summary `valid: false`, and exit 1 so invalid input cannot be mistaken for a successful run. Create `--out-dir` if needed, write stable pretty JSON with a trailing newline, and include the same digest and schema version in every report. Never include raw observation objects, prices, addresses, or source-record payloads in report files.

- [ ] **Step 4: Add subprocess tests.**

Use `node:child_process.spawnSync` to test:
```powershell
node scripts/validate-market-data.mjs
node scripts/validate-market-data.mjs --observations <invalid> --rights <valid>
node scripts/report-market-data.mjs --out-dir <temporary-directory>
```
Assert exit codes, report filenames for valid and contract-invalid inputs, deterministic contents, rejected counts, and the absence of `amount`, exact addresses, or source-record payloads in report JSON.

- [ ] **Step 5: Add package scripts and run the foundation check.**

Add:
```json
"validate:market-data": "node scripts/validate-market-data.mjs",
"report:market-data": "node scripts/report-market-data.mjs --out-dir research/market-data/generated"
```

Use a temporary directory in tests; leave generated output ignored and untracked.

Run:
```powershell
npm run test:market-data
npm run validate:market-data
```

- [ ] **Step 6: Commit the CLIs.**

```powershell
git add -- scripts/validate-market-data.mjs scripts/report-market-data.mjs tests/market-data-contract.test.mjs package.json
git commit -m "feat: add offline market-data validation and report CLIs"
```

---

### Task 6: Add operator documentation and privacy boundaries

**Files:**
- Create: `research/market-data/README.md`
- Modify: `.gitignore`
- Modify: `.pagesignore`
- Modify: `tests/pages-artifact-contract.ps1`
- Modify: `tests/market-data-contract.test.mjs`

**Interfaces:**
- Consumes: the CLI commands from Task 5.
- Produces: documented offline operation and a static/public-artifact gate.

- [ ] **Step 1: Add Git ignore rules.**

Add only these rules to `.gitignore`:
```text
research/market-data/raw/
research/market-data/private/
research/market-data/generated/
```
Do not ignore schemas, README, tests, or synthetic fixtures. Document that Git ignore is not a rights-control mechanism.

- [ ] **Step 2: Exclude research from Pages.**

Add exactly `research/` to `.pagesignore`. Keep the existing `--exclude-from=.pagesignore` workflow behavior unchanged.

- [ ] **Step 3: Extend the Pages artifact contract.**

Assert `.pagesignore` contains `research/` and no public entry point (`index.html`, `en/index.html`, `tr/index.html`, `v3.js`) contains a `research/market-data` or `scripts/market-data` import/fetch. Preserve all existing artifact assertions.

- [ ] **Step 4: Write operator documentation.**

Document:
```powershell
npm run validate:market-data
npm run report:market-data
npm run test:market-data
```
Explain the synthetic-only status, local input-path usage, source-rights review requirement, retention responsibility, report limitations, and the prohibition on copying raw/private files into tracked paths or Pages artifacts.

- [ ] **Step 5: Add privacy assertions.**

Assert the three restricted paths are ignored with `git check-ignore`. The Pages contract must assert `research/` is excluded. Tests must never create a real private file or print a raw fixture record. Use temporary paths only for CLI inputs and outputs.

- [ ] **Step 6: Run boundary checks and commit.**

```powershell
npm run test:market-data
pwsh -NoProfile -File tests/pages-artifact-contract.ps1
git diff --check
git add -- research/market-data/README.md .gitignore .pagesignore tests/pages-artifact-contract.ps1 tests/market-data-contract.test.mjs
git commit -m "chore: keep market-data research private and off Pages"
```

---

### Task 7: Release 3 verification and human quality gate

**Files:**
- Verify: all Release 3 schemas, fixtures, scripts, tests, ignore manifests, and docs.
- Do not modify: public application files or any real/private/generated data.

**Interfaces:**
- Consumes: the complete offline foundation.
- Produces: a reproducible verification record and reviewer-ready quality report; no public artifact.

- [ ] **Step 1: Run all market-data and repository contracts.**

```powershell
npm run test:market-data
npm run validate:market-data
Get-ChildItem tests -Filter '*-contract.ps1' | ForEach-Object { pwsh -NoProfile -File $_.FullName }
```

- [ ] **Step 2: Run the existing public-site regression suite.**

```powershell
node --check v3.js
node -e "for (const f of ['data/content.json','data/zones.json','data/metro.json','data/places.json']) JSON.parse(require('fs').readFileSync(f,'utf8')); console.log('public JSON: PASS')"
git diff --check
npm test
```

Expected: the existing public suite remains green and no public behavior changes.

- [ ] **Step 3: Confirm no Release 3 files enter the public artifact.**

Build the same Pages staging tree used by the workflow in a temporary directory and assert no `research/` path exists. Inspect the tracked diff for only schemas, synthetic fixtures, scripts, tests, docs, and ignore manifests.

- [ ] **Step 4: Review reports as evidence-quality documents.**

Confirm every report carries schema version, input digest, counts, dimensions, and limitations; asking prices and completed sales remain separate; missingness is visible; probable duplicates are not called confirmed duplicates; and no report exposes raw values or source-record payloads.

- [ ] **Step 5: Stop at the Release 3 gate.**

Do not add a real source until a reviewer accepts its rights record, retention decision, privacy basis, and quality reports. Do not publish aggregates in this release. Release 4 requires separate approval for aggregate publication rules.

- [ ] **Step 6: Prepare integration handoff.**

```powershell
git status --short --branch
git log --oneline --decorate -8
git diff origin/preview...HEAD --stat
```

Keep `.playwright-cli/` untracked, do not push or deploy without an explicit integration decision, and present the standard merge/PR/keep-as-is options after verification.
