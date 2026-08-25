# Baku 2036 Minimum CI and Preview Design

## Goal

Prevent silent breakage in the single audience app with a small Playwright smoke suite, a push-gated GitHub Actions workflow, a preview branch, and a short human release checklist.

## Decisions

- Keep the root product unchanged except for testability only where selectors are missing.
- Use about ten browser smoke tests in one `tests/e2e.spec.js` file.
- Capture uncaught page errors and console errors; any unexpected error fails the test.
- Load all five runtime JSON files explicitly, because a missing JSON path otherwise leaves the map empty.
- Run the smoke suite on every push and pull request before any Pages deployment.
- Publish the `preview` branch under `https://qarait.github.io/Baku-2036/preview/` on the existing Pages site. GitHub Pages does not create a second hostname for a branch in the same project.
- Keep promotion simple: preview branch is tested and phone-checked, then merged or fast-forwarded into `main`; only `main` publishes the live root.
- Remove the legacy `/v2/v2.js` coordinate seed so shared JSON remains the only zone source.
- Add exactly six human checks to the README; no coverage targets, flags, canaries, changelog, or semantic-versioning process.

## Test coverage

The Playwright suite covers:

1. Root page, map container, and no unexpected console errors.
2. One-minute tour starts, advances, and exits.
3. Year control advances and changes the visible year/deep-link state.
4. A zone deep link opens the zone panel with content from the shared JSON.
5. EN/TR changes visible UI text.
6. Deal checker returns a verdict for a real numeric input.
7. Deep link `#z=whitecity&y=2030&lang=tr` selects the correct zone, year, and language.
8. The five JSON files load with successful responses and valid JSON.
9. Map click-to-identify returns a district and metro distance.
10. At 360px, the toolbar stays one row and collapses to `Layers`.

## Deployment flow

The CI workflow starts a local static server, installs Chromium, and runs the smoke suite. A separate Pages workflow runs the same suite first. On `preview`, it copies the site into a `preview/` directory in the Pages artifact; on `main`, it publishes the root. A failed test stops the workflow before deployment.

## Error policy

Tests fail on `pageerror`, browser `console.error`, failed runtime data requests, missing map load, and uncaught assertion failures. Known browser fallback warnings are not silently ignored; they remain visible in CI unless they are removed from the app or explicitly classified with a test comment.
