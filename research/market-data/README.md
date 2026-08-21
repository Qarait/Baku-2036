# Governed market-data operations

This workspace is synthetic-only. The tracked fixtures are non-real test data and do not describe the Baku market. Do not scrape, import, publish, or represent real market data through this repository without a completed source-rights review.

Run the tools offline from the repository root:

```powershell
npm run validate:market-data
npm run report:market-data
npm run test:market-data
```

The validator and report CLI accept paired local input paths when processing reviewed data. Supply both `--observations <local-path>` and `--rights <local-path>`; the report CLI also requires `--out-dir <temporary-local-path>`. Use temporary paths for inputs and generated reports. The default report command writes to `research/market-data/generated/`.

Before any non-synthetic use, review the source terms and rights record, including allowed use, redistribution, derived-publication permission, personal-data handling, and retention. The operator who acquires data is responsible for retaining it only for the approved period and disposing of it according to the source terms.

Reports are deterministic quality summaries, not a market assessment. They do not establish that observed records are complete, representative, current, licensed for publication, or suitable for valuation.

Never copy raw or private files into tracked paths or Pages artifacts. Keep restricted material only under `research/market-data/raw/` or `research/market-data/private/`, and keep generated reports under `research/market-data/generated/`. Git ignore reduces accidental staging; it is not a rights-control mechanism and does not grant permission to collect, retain, share, or publish data.
