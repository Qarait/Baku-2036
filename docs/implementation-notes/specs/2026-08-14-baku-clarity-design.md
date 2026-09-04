# Baku atlas clarity improvements

## Goal

Help a first-time visitor understand how current the information is, distinguish a temporary data failure from a valid empty map area, and understand what growing circles mean when moving through the years.

## Design

- Add one shared `meta` object to `data/content.json` with the project’s human-readable freshness dates and a non-visible data revision. The app reads it at runtime so the freshness note cannot drift from the source used by the UI.
- Render the freshness note in the existing small map attribution area. English and Turkish use the same dates with simple localised labels.
- Keep the current loading status while data and map assets are starting. If the runtime JSON load fails, replace it with a plain bilingual refresh instruction and the existing error styling. Valid sea/empty results remain separate and unchanged.
- Add one short bilingual sentence beside the time-machine range control explaining that larger circles show more investment interest in the scenario, not a guaranteed price rise.

## Constraints

- Do not change analytical figures, zone claims, or existing scenario wording.
- Keep the first screen quiet; no new onboarding control is added.
- Preserve the existing five runtime JSON files and all current routes, hash links, and language behavior.

## Verification

- Add focused Playwright assertions for freshness text, the slider explanation in EN/TR, and the JSON-load error message.
- Run the full `npm test` suite and inspect the final diff.
