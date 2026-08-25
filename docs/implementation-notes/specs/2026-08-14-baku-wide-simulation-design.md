# Baku-wide 2026–2036 Simulation

## Purpose

Add a city-wide time story to the existing Baku property atlas. A first-time visitor should be able to press “Show me (1 minute)” and understand, from the map, how the parts of Baku shown by the atlas may change between 2026 and 2036.

This phase is deliberately Baku-wide. Rayon-specific simulations are a later phase and are not part of this work.

The experience should feel visual and memorable, while staying honest about what is known, planned, promised, or only a scenario. It must remain understandable to a non-technical visitor on a phone.

## Design principles

- Use the existing shared JSON data at runtime; do not create a second set of city facts.
- Show change through transport, projects, events, and evidence status.
- Do not invent annual property prices or turn scenario figures into measured forecasts.
- Keep planned and promised changes visibly different from completed changes.
- Use short plain-language explanations, with the map doing most of the storytelling.
- Preserve the current deep links, English/Turkish switch, selection panels, click-to-identify, metro distance wording, planner, deal checker, shortlist, keyboard access, and mobile layout.

## Visitor experience

### Starting screen

The existing first screen remains unchanged: one plain-language sentence and the prominent “Show me (1 minute)” action. No new onboarding block is added.

### Guided city story

Pressing “Show me (1 minute)” starts a Baku-wide autoplay. The story moves through five meaningful checkpoints:

| Year | Role |
| --- | --- |
| 2026 | Starting picture |
| 2028 | Near-term changes |
| 2030 | Mid-period changes |
| 2033 | Later planned changes |
| 2036 | Combined scenario view |

At each checkpoint:

- the year control moves to the checkpoint;
- the map updates its transport, event, and project layers;
- the year narration appears in the existing story area;
- a short “What changed” caption explains the visible difference;
- the map remains the dominant visual.

The visitor can pause, continue, skip to the next checkpoint, or drag the year manually. Finishing the story leaves the map on 2036 rather than resetting it.

### Manual exploration

Dragging the year control uses the same rendering path as the autoplay. It must be possible to stop at any supported year and see the corresponding map state. A visitor can then tap an investment spot or tap elsewhere to identify the area, just as today.

## Data architecture

No new parallel data folder is introduced.

### Existing sources

- `data/content.json`: English/Turkish year narration, city event captions, interface wording, and source insight text.
- `data/metro.json`: transport geometry, stations, built years, planned years, status, and source information.
- `data/zones.json`: investment spots, current figures, 2036 scenario figures, project timelines, evidence levels, and existing panel content.
- `data/admin-absheron.geojson`: district boundaries.
- `data/places.json`: place search and click-to-identify reference points.

### Small shared-data addition

If the existing narration and event arrays cannot express the five story captions cleanly, add one small `simulation` object to `data/content.json`, with English and Turkish text for the five checkpoints. This is the only intended new content structure. It should describe what the visitor is seeing, not add new numerical claims.

The runtime must load this content through the same hydration path as the rest of the application. There must be no hardcoded fallback copy or coordinates in the simulation renderer.

## Map behaviour and visual meaning

### Transport and projects

The year determines whether a dated item is shown as active, future, or not yet visible, using the dates already present in the JSON data.

- Already built: solid, clear, and fully visible.
- Being built now: active colour or emphasis, without claiming completion.
- Government plan: lighter and dashed.
- Company promise: lighter outline or subdued marker.

The labels and evidence statuses remain available in the existing legend and panels. A planned item must never silently become a built item merely because the year slider advanced.

### Investment spots

Investment spots keep their real locations and existing map identity. Their circles do not expand as if they were exact development boundaries or measured price forecasts.

The city-wide story may bring relevant spots into visual focus when a related transport or project event appears, but this emphasis must be a presentation cue—not an invented statistic. Existing current values, yields, and 2036 scenario figures remain in the selected panel with their existing scenario language.

### Event markers

Events from the shared content data appear at their existing coordinates and stated timing. They may fade in or become highlighted at the relevant checkpoint. The caption should make clear whether an item is built, being built, planned, or promised according to its existing evidence data.

### 2036 ending

The final state should communicate:

> 2036 scenario — more connections, more planned activity, and different levels of certainty across Baku.

This is a combined scenario view, not a guarantee that every planned item will be delivered.

## Controls and phone behaviour

- Reuse the existing year slider and map controls wherever possible.
- Add only the minimum autoplay controls: pause/continue and skip/finish.
- Keep the mobile toolbar collapsed behind the existing Layers button.
- Do not introduce a second onboarding prompt.
- Keep captions short enough for a 360px-wide viewport without forcing awkward nested scrolling.
- Respect safe-area insets and the current mobile bottom-sheet/page-flow behaviour.
- Pause autoplay when the visitor manually drags the year, taps a zone, opens a panel, or changes language.

## Language

All new visible text must exist in both English and Turkish in the shared content data. Switching language during or after the story must update the caption, controls, status labels, and year narration without changing the selected year or zone.

## Loading and error handling

The simulation must have explicit states:

- loading: a short visible loading message while the shared data is being fetched;
- ready: the normal map and story controls;
- error: a clear message such as “The city-change data could not be loaded. Please try again.” with a retry action.

A failed city simulation data load must never look like an empty but valid map. Console errors should remain absent during a successful load.

## Accessibility and interaction

- Autoplay controls are real buttons with accessible names and keyboard focus.
- Pause/continue state is announced through the button label or accessible state.
- The year remains available through the existing keyboard-operable range input.
- The story must not rely on colour alone: status style and text remain available.
- Manual selection and closing/reopening a zone panel continue to work after autoplay.

## Verification criteria

The implementation is ready for review when the existing test suite covers at least:

1. The root app loads with no console errors and the map is visible.
2. “Show me (1 minute)” starts the Baku-wide story.
3. Pause, continue, skip, and completion work.
4. The story visits the five checkpoints and ends on 2036.
5. Dragging the year updates the map and caption.
6. A dated transport/project item changes state at its stored year while future items remain distinct.
7. English and Turkish captions and controls switch correctly.
8. A missing simulation/content file produces the visible error state and retry path.
9. Zone selection, click-to-identify, deep links, and existing panels still work after the story.
10. The 360px mobile layout keeps the toolbar collapsed and avoids nested scrolling regressions.

The human release check remains necessary for map tiles, pinch/drag, bottom-sheet behaviour, language quality, and overall visual clarity on a real iPhone.

## Scope boundaries

Included:

- Baku-wide visual time story from 2026 through 2036.
- Autoplay and manual year exploration.
- Data-driven transport, event, project, and evidence-state changes.
- Plain-language English/Turkish captions.
- Explicit loading/error states and regression tests.

Not included:

- Rayon-specific forecast curves or rayon simulations.
- New annual price datasets.
- Scraping, live market feeds, or backtesting.
- 3D buildings, traffic simulation, route-level travel-time claims, or a new map engine.
- Any change to the existing analytical numbers or scenario figures.
