# Fixed Language Entry Points Design

## Goal

Provide two separate language-specific website entry points:

- `/preview/en/` for the English experience.
- `/preview/tr/` for the Turkish experience.

Each entry point must remain in its selected language, even if a visitor arrives with a conflicting `lang` hash parameter. The EN/TR switch must not be shown on either fixed-language page.

## Context

The application currently has one bilingual `index.html`. `v3.js` reads `lang` from the URL hash and updates all visible copy through `setLanguage()`. The app also loads JSON, CSS, JavaScript, PMTiles, and glyph assets using paths relative to the root preview page. GitHub Pages publishes the repository as a static artifact, so the language pages need to work without server-side routing.

## Chosen architecture

Keep `index.html` as the single source application and generate `en/index.html` and `tr/index.html` from it with `scripts/build-language-entrypoints.js`.

The generator will:

1. Copy the source HTML into each language directory.
2. Add `<base href="../">` so shared CSS, JavaScript, data, PMTiles, and glyph paths resolve to the published root.
3. Set the document language and inject `window.__BakuFixedLanguage` before `v3.js` starts.
4. Replace the interactive language switch with a non-interactive language label.

`v3.js` will treat `window.__BakuFixedLanguage` as authoritative: initial hash parsing cannot override it, and later calls to `setLanguage()` cannot change it. The existing root page will retain its bilingual behavior for compatibility. The skip-map link will be normalized to the current pathname so the generated base element cannot send keyboard users back to the root page.

The Pages workflow will regenerate the entry points before packaging. The generated files will also be committed so local static-server tests exercise the same URLs that Pages publishes; the workflow will fail if generation produces a diff.

## User experience

The English and Turkish pages share identical map, data, controls, and responsive behavior. Only language copy and document metadata differ. Each page shows a small non-interactive language label instead of buttons, so visitors can tell which fixed version they opened without being offered a cross-language interaction.

The root preview remains available as the existing bilingual compatibility page during this change. No `main` deployment is changed.

## Testing and acceptance criteria

Automated tests must verify:

1. `/en/` loads the map, renders English map labels, has `lang="en"`, and does not expose visible `#langEn` or `#langTr` controls.
2. `/tr/` loads the map, renders Turkish map labels, has `lang="tr"`, and does not expose visible `#langEn` or `#langTr` controls.
3. Conflicting hashes cannot change the fixed page language.
4. The fixed pages load their data and PMTiles assets without 404s in Chromium and WebKit.
5. The root bilingual page continues to switch languages as before.
6. The generator is deterministic and the Pages workflow verifies generated output before deployment.

## Non-goals

- Duplicating or translating the underlying data files.
- Removing the existing root bilingual page in this task.
- Changing the map, mobile layout, safe-area handling, typography, or content model.
- Adding language negotiation based on browser preferences.
