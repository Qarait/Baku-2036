# RAISE-Inspired Baku 2036 Design

## Purpose

Move Baku 2036 from an editorial atlas with opaque scenario percentages toward an explainable, evidence-traceable decision-support tool. Preserve the consumer-oriented map, bilingual content, mobile experience, evidence cards, risks, due-diligence guidance, planner, deal checker, and shortlist.

This design does not turn Baku 2036 into an automated valuation model. It establishes the transparency and data foundations required before any model-derived valuation can be considered.

## Current boundary

The current site is a static GitHub Pages application. `data/zones.json` contains 16 zone records, rough market ranges, a manually assigned `growthPct`, narrative theses and risks, and evidence entries. `v3.js` applies global oil, infrastructure, and currency multipliers to each zone's `growthPct`.

The repository does not contain a historical property-observation dataset, completed-sale records, a trained valuation model, model-error measurements, or backtesting results. Those absences are hard limits, not implementation details to work around.

## Product direction

The website should progress through five independently approved releases:

1. **Calculation transparency:** expose the existing editorial baseline and active sensitivity arithmetic without changing any values.
2. **Qualitative factor ledger:** connect approved zone factors to existing evidence without numerical factor weights.
3. **Governed market-data foundation:** define, validate, and audit property observations without exposing them in the public site.
4. **Descriptive market evidence:** publish aggregated historical summaries only after coverage, rights, and quality gates pass.
5. **Validated modelling research:** evaluate an interpretable offline model before any model output can enter the consumer interface.

Each release must remain useful if all later releases are cancelled.

## Global constraints

- Never invent scenario ranges, coefficients, exposure percentages, property observations, sample sizes, sale prices, or accuracy metrics.
- Keep the existing `growthPct` values and sensitivity formula unchanged during Release 1.
- Label `growthPct` as an editorial scenario assumption, not a forecast, valuation, expected return, or model estimate.
- Keep observed facts, derived geographic measurements, editorial assumptions, and model outputs as separate data types.
- Do not infer a numerical factor weight from evidence status or confidence.
- Do not treat asking prices as completed transaction prices.
- Do not scrape, store, redistribute, or publish third-party property data until source rights and retention rules are documented.
- Do not add machine learning, GWR, Monte Carlo simulation, drag-and-drop infrastructure, rezoning valuation, or 3D visualisation in Releases 1–3.
- Do not add a runtime backend, database, analytics, tracking, or remote API in Release 1.
- Preserve English and Turkish behavior, fixed-language entry points, mobile layout, URL compatibility, accessibility hooks, and the existing Pages deployment gate.
- Implement and deploy to `preview` first. Do not modify or promote `main` without a separate explicit instruction.

## Release 1: calculation transparency

### Data contract

Add bilingual methodology copy to `data/content.json`. Do not duplicate modifier values in content. The executable values remain owned by one JavaScript constant:

```js
const SCENARIO_MODIFIERS = Object.freeze({
  oil: Object.freeze({ norm: 1, bad: 0.8, good: 1.15 }),
  infra: Object.freeze({ on: 1, late: 0.72 }),
  cur: Object.freeze({ stable: 1, weak: 0.8 })
});
```

Expose a pure calculation result:

```js
scenarioBreakdown(zone, scenarios) => {
  baseGrowth: number,
  modifiers: {
    oil: { option: string, multiplier: number },
    infra: { option: string, multiplier: number },
    cur: { option: string, multiplier: number }
  },
  rawGrowth: number,
  roundedGrowth: number,
  roundingIncrement: 5
}
```

`scenarioGrowth(zone)` must become a compatibility wrapper returning `scenarioBreakdown(zone, state.scenarios).roundedGrowth`.

### Interface

The scenario result must show:

- The selected zone's existing editorial baseline.
- Each selected option and its actual multiplier.
- The final rounded sensitivity result.
- The five-percentage-point rounding rule.
- A visible statement that the calculation is a sensitivity, not a forecast or valuation.

Neutral `×1.00` modifiers remain visible so the full arithmetic is inspectable. Do not add downside/base/upside ranges.

### Shareable state

Extend the existing URL hash with:

- `oil=norm|bad|good`
- `infra=on|late`
- `cur=stable|weak`

Invalid or absent values fall back to the existing defaults. Existing links without these fields must continue to work. The fixed-language entry points must continue to override `lang` only; they must still read scenario fields.

### Methodology disclosure

Add a concise bilingual calculation-method block to the existing Sources accordion. It must identify:

- The zone baseline as an editorial input.
- The current global modifiers and their values.
- The rounding rule.
- The absence of a transaction-trained valuation model.
- The distinction between source evidence and the investment interpretation built from it.

## Release 2: qualitative factor ledger

This release starts only after a human reviewer approves the factor vocabulary and every zone-to-evidence mapping.

Each evidence item receives a stable ID. Each zone may then contain `scenarioFactors`, where every factor has a bilingual statement, a qualitative role (`support`, `risk`, `dependency`, or `unknown`), and one or more evidence IDs. Factors have no numeric weights and cannot affect `scenarioBreakdown()`.

The interface renders “What supports this scenario?” and “What could weaken it?” using only approved factor records. An unresolved evidence reference is a schema error that blocks deployment.

## Release 3: governed market-data foundation

This release is private/offline infrastructure. It defines a property-observation schema, provenance register, rights record, validator, deduplication report, missingness report, and coverage report.

Every observation must distinguish asking price from completed sale, include collection date and source, record currency and unit, and preserve enough property characteristics to avoid treating unlike properties as comparable. Raw observations are excluded from Pages and are not committed when the source licence or privacy basis does not permit redistribution.

No website calculation may consume this dataset during Release 3.

## Release 4: descriptive market evidence

This release starts only after a human reviewer accepts the Release 3 rights and quality reports. It publishes aggregates rather than raw records and always exposes observation count, period, property type, price type, and data limitations.

It may add historical price-per-square-metre summaries and comparable-listing context. It must not call an asking-price series a sale-price index or claim causal infrastructure uplift.

## Release 5: validated modelling research

This release is an offline research project with its own design and implementation plan. Begin with an interpretable baseline model. Evaluate it with time-based holdout and spatial holdout, report errors by geography and property type, inspect residuals, and compare it with a simple median benchmark.

No model output enters the website unless all of the following are approved:

- Data rights permit the intended use.
- Coverage and missingness are documented.
- The model beats the simple benchmark on held-out data.
- Error ranges are understandable and acceptable for the intended claim.
- A model card documents inputs, exclusions, training period, validation, limitations, and version.
- The consumer copy and interface have passed comprehension testing.

Infrastructure counterfactuals come after the valuation baseline is validated. They must be described as modelled associations unless a causal research design supports a causal statement.

## Testing and release policy

Every release uses test-driven changes, the full Chromium/WebKit suite, static contracts, syntax checks, `git diff --check`, preview pull-request checks, Pages deployment checks, and hosted preview verification.

Release 1 must add regressions for calculation breakdown, scenario URL round-trip, invalid hash fallback, old-link compatibility, fixed-language behavior, and English/Turkish disclosure copy. Later releases add schema-contract tests before rendering or modelling tests.

The real-iPhone Safari checklist remains a separate human release gate; Playwright WebKit does not substitute for physical iPhone testing.

## Explicit non-goals

- Reproducing RAISE's planner-facing interface.
- Estimating property-level current or future values from the existing 16 zones.
- Assigning numerical uplift to metro, roads, waterfront, schools, regeneration, or evidence confidence without validated market data.
- Replacing professional valuation, legal review, title checks, or investment advice.
