# Baku single-audience release design

## Goal

Make the root of Baku-2036 one plain-language, phone-first experience for people who want to understand Baku property geography, while preserving the original application at `/v1/` and the existing v2 source snapshot for reference.

## Architecture

The current v2 application remains the functional base because it has official district geometry, deep links, click-to-identify, the shared content loaders, and the analytical tools. The audience release will be served from root files named for the release, with root `data/` as the only live zone-content source. The current root application will be copied to `/v1/` and kept as an archived reference with corrected relative asset paths.

The live application will load all zone-specific analytical content from `data/zones.json`. JavaScript will not contain a second list of zone names, coordinates, radii, prices, ledgers, or zone narratives. Existing non-zone reference data remains in the existing JSON files for places, metro, boundaries, and UI copy.

## First-screen experience

The page opens with one sentence explaining that the map helps people understand where Baku prices may rise and why, plus one prominent `▶ Show me (1 minute)` button. The map remains visible. Search, year, language, and layer controls are available after the user starts the tour or opens the compact controls. The tour uses the existing localized story content and ends by inviting exploration.

## Plain-language labels

The live UI uses:

- `District borders`, `Investment spots`, `Where prices rise fastest`, and `How sure is this?` in English.
- Turkish equivalents `İlçe sınırları`, `Yatırım noktaları`, `Fiyatların en hızlı arttığı yerler`, and `Ne kadar emin olabiliriz?`.
- `That’s the sea` / `Burası deniz` for water clicks.
- `Drag to see the future` / `Geleceği görmek için sürükleyin` for the year control.
- `Nearest metro (straight line — walking is a bit longer)` / `En yakın metro (kuş uçuşu — yürüyüş biraz daha uzun)`.
- Evidence levels expressed for a lay reader as `Already built`, `Being built now`, `Government plan`, and `Company promise`, with the existing long-range concept status retained only where the data uses it.

Analytical zone copy, prices, growth figures, investment ledgers, and source claims are not rewritten.

## Mobile behavior

At a 360px viewport, the toolbar becomes one `Layers` button. The button opens a small layer menu without changing the map, and the selected-location panel becomes a bottom sheet with scrollable content and touch-sized controls. The map remains draggable and tappable; keyboard focus and the skip-map link remain available for desktop and assistive technology users.

## Verification and deployment

Static contracts cover canonical data loading, root/archive paths, visible wording, the first-screen CTA, and the mobile layer control. Existing foundation, content, language-switch, map migration, and optional 3D contracts continue to run. Browser checks cover root and `/v1/`, both languages, guided tour, year story, heat, metro, evidence, planner, deal checker, shortlist, deep links, keyboard access, and a 360px/iPhone-sized interaction pass. A physical iOS Safari check is reported separately if no connected iOS device is available.
