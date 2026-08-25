# Preview hardening implementation plan

## Goal

Close the confirmed preview governance, least-privilege, licence-notice, and basemap-attribution gaps without changing atlas data, calculations, or user flows.

## Scope

1. Move GitHub Pages write and OIDC permissions from the workflow default to the deployment job.
2. Ship verified MapLibre and PMTiles licence notices, including vendored provenance and the full upstream BSD-3-Clause text.
3. Add explicit linked OpenStreetMap/ODbL and Geofabrik attribution to the MapLibre source and the visible map note.
4. Extend repository contracts and CI coverage for the workflow, notices, and attribution.
5. After verification, protect `preview` with pull requests, the Playwright smoke check, and no force-push/deletion.

## Non-goals

- No changes to map data, scenario formulas, calculations, or panel behavior.
- No CSP or hosting migration in this pass.
- No guessed PMTiles version: record the missing original version metadata and the exact vendored bundle hash instead.

## Verification

- Focused repository contract checks first.
- Language entrypoint generation check, JavaScript syntax checks, npm audit, and the full Playwright suite.
- Pages artifact contract and exact-head GitHub Actions run.
- Confirm preview branch protection through the GitHub API after the PR is merged.
