# Release 3 — Governed market-data foundation

**Status:** Approved concept; implementation specification for review  
**Date:** 2026-08-21  
**Scope:** Private/offline research infrastructure only

## Purpose

Release 3 creates the smallest trustworthy foundation for handling future property observations without allowing raw market data to enter the public Baku 2036 website. It defines what an observation means, records why the project may use it, rejects records that are incomplete or misleading, and produces reproducible quality reports before any aggregation or modelling is considered.

There is no licensed or private market-data source available yet. The implementation therefore uses synthetic fixtures only. It must not scrape a site, import a real listing, or imply that the synthetic records describe the Baku market.

## Goals

1. Define a versioned property-observation contract.
2. Define a provenance and rights register that gates internal use and any future derived publication.
3. Validate observations without silently coercing ambiguous values.
4. Identify exact and probable duplicate observations without deleting records.
5. Report missingness and coverage by source, period, geography, property type, and price basis.
6. Prove that private/raw research paths are excluded from GitHub Pages artifacts.
7. Keep the consumer site, its scenario calculations, and its public data unchanged.

## Non-goals

- No real property observations, asking-price series, completed-sale records, seller details, contact information, or personal data.
- No scraping, remote data connector, database, analytics, or new runtime dependency.
- No public market aggregates, charts, API, map layer, or UI.
- No currency conversion, inflation adjustment, imputation, outlier removal, or model calculation.
- No claim that asking prices are completed sales.
- No change to `v3.js`, `data/zones.json`, `growthPct`, `scenarioBreakdown()`, or any existing public calculation.

## Research boundary

The research workspace lives under `research/market-data/` and is not part of the Pages artifact. Tracked files are limited to schemas, documentation, validators, synthetic fixtures, tests, and deterministic report examples. Real or restricted files must be placed under ignored paths:

- `research/market-data/raw/`
- `research/market-data/private/`
- `research/market-data/generated/`

The validator accepts an explicit local input path so a future researcher can run it against a licensed file without copying that file into the repository. The public site never imports the research workspace.

## Proposed file responsibilities

- `research/market-data/README.md`: operator instructions, boundary rules, and examples that are clearly synthetic.
- `research/market-data/schemas/observation.schema.json`: versioned observation field contract.
- `research/market-data/schemas/rights-record.schema.json`: versioned rights/provenance contract.
- `research/market-data/fixtures/synthetic-observations.json`: non-real records used only by tests.
- `research/market-data/fixtures/synthetic-rights.json`: rights records for the synthetic fixture.
- `scripts/validate-market-data.mjs`: offline validator and machine-readable validation result.
- `scripts/report-market-data.mjs`: deterministic duplicate, missingness, and coverage reports.
- `tests/market-data-contract.test.js`: Node built-in test coverage for the foundation.
- `tests/pages-artifact-contract.ps1`: assertion that research/private/raw/generated paths cannot be published.
- `.gitignore`: ignore real/private/generated research files.
- `.pagesignore`: exclude the complete research workspace from Pages artifacts.

## Observation contract

Every observation must have the following conceptual fields:

```json
{
  "observationId": "synthetic-observation-001",
  "sourceId": "synthetic-source",
  "sourceRecordId": "fixture-001",
  "rightsId": "synthetic-internal-rights",
  "transactionType": "asking",
  "observedAt": "2026-06-15",
  "eventDate": null,
  "propertyType": "apartment",
  "price": {
    "amount": 200000,
    "currency": "AZN",
    "basis": "total"
  },
  "area": {
    "value": 80,
    "unit": "m2",
    "measure": "gross"
  },
  "location": {
    "district": "synthetic-district",
    "zoneId": "synthetic-zone",
    "precision": "zone"
  },
  "characteristics": {
    "rooms": 3,
    "condition": "unknown"
  }
}
```

Required rules:

- `observationId`, `sourceId`, and `rightsId` are non-empty stable identifiers.
- `sourceRecordId` is required when the source provides one and is never treated as a public identifier.
- `transactionType` is exactly `asking` or `completed_sale`; the validator never infers one from wording.
- `observedAt` is required. `eventDate` is required for `completed_sale` and must not be invented for `asking`.
- `price.amount` is a positive finite number. `price.currency` is an explicit ISO-style code such as `AZN`, `USD`, or `EUR`. `price.basis` is `total` or `per_m2`.
- `area.value` is positive and `area.unit` is `m2`. `area.measure` distinguishes `gross`, `net`, and `land`; these are not interchangeable.
- `propertyType` is explicit: `apartment`, `house`, `land`, `commercial`, or `other`.
- Location is allowed to be coarse or unknown. `precision` is one of `exact`, `street`, `district`, `zone`, or `unknown`; no missing location is converted into a guessed zone.
- Characteristics are optional but typed. Unknown values use explicit `unknown` or omission, never a fabricated default.
- No free-text field may contain seller, broker, phone, email, or other personal data in the Release 3 contract.

## Rights and provenance contract

Each source has a separate rights record referenced by `rightsId`:

```json
{
  "rightsId": "synthetic-internal-rights",
  "sourceId": "synthetic-source",
  "sourceName": "Synthetic fixture — not market data",
  "acquisitionBasis": "synthetic",
  "termsUrl": null,
  "allowedUses": ["internal_testing"],
  "rawRedistribution": "prohibited",
  "derivedPublication": "prohibited",
  "retention": "repository_fixture_only",
  "personalDataHandling": "prohibited",
  "reviewedAt": "2026-08-21",
  "reviewer": "project-maintainer",
  "status": "approved_for_fixture_testing"
}
```

The rights validator must reject an observation when its rights record is absent, expired, rejected, or does not permit the intended operation. Rights states are explicit rather than inferred from a URL. `rawRedistribution` and `derivedPublication` are separate because permission to create an aggregate does not imply permission to publish raw records.

## Validation behavior

The validator runs offline and returns a non-zero exit code for contract violations. It reports the observation ID, field path, and reason without printing raw record contents beyond stable internal IDs.

It rejects:

- duplicate or missing observation IDs;
- missing source or rights references;
- missing or invalid dates;
- non-positive, non-finite, or unitless prices/areas;
- unknown currency, price basis, property type, transaction type, area measure, or location precision;
- a completed sale with no event date;
- an asking observation labelled as a sale or a sale labelled as asking;
- a rights record that does not permit the declared test operation;
- personal-data fields in the observation payload;
- malformed JSON or unexpected top-level records.

It does not:

- convert currencies;
- convert gross area to net area;
- fill missing values;
- remove outliers;
- decide that two records are the same without reporting the evidence;
- turn an asking price into a sale price.

## Deduplication report

Deduplication is a report, not destructive cleaning. The report contains:

- `inputDigest` and schema version;
- exact duplicate groups based on `sourceId + sourceRecordId` when the source ID is stable;
- probable duplicate groups based on a normalized fingerprint of source, transaction type, date, price, currency, area, coarse location, property type, and selected characteristics;
- the observation IDs in each group;
- the matching rule used;
- a count of records retained for review.

No canonical record is silently chosen and no observation is deleted.

## Missingness report

Missingness is measured, not repaired. The report includes counts and rates for required and optional fields, broken down where sample size permits by source, month/quarter, property type, transaction type, and coarse geography. It distinguishes:

- field absent;
- explicit `unknown`;
- not applicable;
- invalid/rejected.

The report must not present a zero count as evidence of no activity.

## Coverage report

Coverage is descriptive, not representativeness evidence. The report includes:

- total input, valid, rejected, and reportable observation counts;
- earliest/latest observation dates;
- source and rights IDs represented;
- property types and transaction types represented;
- currencies and price bases represented;
- coarse districts/zones represented;
- source-by-period and geography-by-period cell counts;
- explicit uncovered periods, geographies, and property types in the configured coverage frame.

Every coverage report must carry a limitation statement: the observed records are not automatically a representative sample of the Baku market.

## Public-artifact and privacy boundary

The Pages workflow must exclude `research/` in addition to existing development paths. A contract test must fail if a generated Pages staging tree contains any research schema, fixture, report, raw, private, or generated file. The test must also confirm that the public application has no import or fetch path into `research/market-data/`.

Real restricted files are excluded from Git by path and are not recoverable from repository history because they are never added. The implementation must document that `.gitignore` is not a rights control: access, retention, and source terms remain the operator's responsibility.

## Tests and acceptance gates

The implementation is accepted only when:

1. Synthetic valid observations and rights records pass.
2. Each required invalid fixture fails for the expected reason.
3. Duplicate, missingness, and coverage reports are deterministic for the same input digest.
4. Report generation never mutates the input records.
5. A raw/private path is ignored and excluded from a Pages artifact contract.
6. Existing public-site tests and Release 2 factor validation remain unchanged and passing.
7. No public HTML, JavaScript, zone data, or scenario formula imports the research workspace.
8. A human reviewer accepts the rights and quality reports before any real source is added.

Release 3 ends at this gate. Public aggregate evidence is a separate Release 4 decision, and modelling is a separate Release 5 decision.
