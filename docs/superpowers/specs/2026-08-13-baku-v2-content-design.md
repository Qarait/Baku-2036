# Baku 2036 v2 — map-first content design

## Goal

Port the useful narrative and decision tools from the v1 atlas into the separate `/v2/` application while keeping the map as the hero and making the interface understandable to a non-technical first-time visitor.

The root v1 site remains a stable artifact. Its `index.html`, including the embedded base64 image, is not edited by this work.

## Audience and product rule

The primary user is an average person who may know very little about maps, planning documents, or investment terminology. Every screen should answer one obvious question at a time. Technical rigor belongs in the data model, source notes, status badges, and expandable explanations—not in a wall of jargon.

## Page hierarchy

1. **Map hero** — the first and largest surface. It keeps rayon boundaries, approximate investment areas, metro, heat, search, zoom, and click-anywhere identification.
2. **How to use the map** — a short, plain-language three-step strip: tap a place, read the brief, check the risks.
3. **Selected-place drawer** — opens when a user clicks/searches a place or investment area. It explains “what this place means” with the same zone data used by the map:
   - entry price and scenario value;
   - rental yield or land-only status;
   - what is built, funded, planned, or merely a scenario;
   - why the location might matter;
   - biggest risk;
   - practical positioning advice;
   - printable due-diligence checklist.
4. **Collapsible tools** — large, friendly accordion sections below the map:
   - Watch the decade: the 2026–2036 time machine;
   - What if the world changes: oil, infrastructure timing, and currency switches;
   - Plan your money: buyer profiles, budget filter, and three outcomes;
   - Check a real listing: asking price and area verdict;
   - Compare your shortlist: side-by-side amounts and concentration warning;
   - Sources and important warning: provenance, limitations, and title/cadastral/zoning reminder.

On mobile, only one accordion section is open at a time. On desktop, the same rule prevents the page from becoming a long undifferentiated document. Each closed section has a one-line explanation of what the user will find inside.

## Content and language

The v1 English and Turkish copy is ported into v2’s own structured copy/data files rather than copied as HTML. Labels use plain language first. Terms such as `çıxarış`, cadastral rayon, and scenario midpoint get a short “What does this mean?” explanation next to them.

The interface keeps EN/TR switching consistent across the map controls, selected-place drawer, accordions, tool outputs, disclaimers, and source notes. A language switch re-renders the currently open drawer or accordion without resetting the selected zone, year, checklist, shortlist, or map view.

## Data architecture

- `v2/data/zones.json` becomes the single source for the 16 investment zones, EN/TR names, tier, location, entry range, scenario range, yield, volatility, projects, thesis, risk, action, and due-diligence items.
- The map layer, selected-place drawer, planner, deal checker, shortlist, time machine, heat display, and scenario adjustments all consume this shared zone data.
- Administrative rayon polygons remain a separate official geography layer. Investment areas remain approximate analytical areas and are labeled as such.
- Investment project rows carry explicit status values: `built`, `funded`, `planned`, or `scenario`. The UI must not visually imply that a planned or scenario item is already committed.
- Source metadata is retained per dataset and surfaced in the final accordion; source dates are visible where they change interpretation.

## Interaction and accessibility

- Use native buttons, inputs, selects, and keyboard-operable accordion controls.
- Every accordion summary has a visible label and a one-sentence description.
- Selected-place drawer focus moves into the drawer on open and returns to the map or search control on close.
- The map remains usable by pointer, touch, keyboard controls, and local search.
- `prefers-reduced-motion` applies to map flights, accordion transitions, time-machine animation, and spotlight movement.
- No new permanent toolbar clutter is added to the map hero. Deep tools are discoverable through the labeled collapsibles.

## State and persistence

- Preserve v2 hash state for selected zone, year, language, heat, and metro.
- Add an optional accordion key only if it does not make shared links noisy; default links should open on the map and selected-place content.
- Preserve shortlist and due-diligence checklist state in local storage, never in a server or tracking system.
- Scenario switches affect displayed scenario outputs immediately and clearly state that they are sensitivities, not forecasts.

## Accuracy and safety language

The page must repeat the distinction between actual administrative rayons and approximate investment areas. It must not call scenario values forecasts. The final warning must tell users to verify title (`çıxarış`), cadastral rayon, zoning, environmental history, and project status at the relevant official registry or authority before any purchase.

## Verification contract

The implementation is complete only when:

- the v2 content contract sees every required accordion and the shared zone data;
- all 16 zone ids have EN/TR content and required risk/action fields;
- existing v2 map contract tests still pass;
- the root `index.html` byte hash is unchanged;
- a real browser verifies map → drawer → accordion → EN/TR → planner/deal/shortlist flows at desktop and phone-sized viewports;
- the published `/Baku-2036/v2/` URL returns HTTP 200 with no console errors.

