# Optional 3D Baku Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished optional MapLibre 3D mode using the existing geographic building tiles while preserving the current 2D default and all investment overlays.

**Architecture:** Keep 3D state in `index.html` beside heat/metro/deep-link state. Expose it through `window.BakuAtlas`; let `maplibre-atlas.js` own the extrusion layer, camera transitions, and toggle bridge. Use static contracts plus syntax, image-identity, PMTiles, and live Pages checks.

**Tech Stack:** Self-contained HTML, inline JavaScript, MapLibre GL JS, local PMTiles/vector tiles, PowerShell contract tests, Node syntax checks.

## Global Constraints

- 2D remains the default; 3D is optional and reversible.
- Use real `buildings` footprints from `assets/baku-absheron.pmtiles`; add no decorative fake geometry.
- Preserve circles, labels, heat, metro, events, spotlight, accessible markers, panel, tour, planner, deal checker, shortlist, and EN/TR switching.
- Add no external map/runtime dependency; remain offline after loading.
- Unknown or malformed `view` hash values fall back silently to 2D.
- The embedded base64 image in `index.html` must remain byte-identical.
- Respect `prefers-reduced-motion` for camera changes.

---

### Task 1: Add failing 3D contract tests

**Files:** Create `tests/optional-3d-map-contract.ps1`.

**Interfaces:** Reads `index.html` and `maplibre-atlas.js`; produces a repeatable contract for the toolbar, state, deep link, extrusion layer, camera helper, and bilingual labels.

- [ ] **Step 1: Write the failing test**

Assert these exact contracts:

```powershell
Assert-Contains $html 'id="view3dBtn"' '3D map toggle is missing.'
Assert-Contains $html 'view3d' '3D state/deep-link hook is missing.'
Assert-Contains $html 'view=3d' '3D deep-link serialization is missing.'
Assert-Contains $html '3B görünüm' 'Turkish 3D label is missing.'
Assert-Contains $controller "type:'fill-extrusion'" 'Building extrusion layer is missing.'
Assert-Contains $controller 'setMapView' '3D camera helper is missing.'
Assert-Contains $controller "'building-extrusions'" '3D layer id is missing.'
```

- [ ] **Step 2: Run it and verify RED**

Run `powershell -NoProfile -ExecutionPolicy Bypass -File tests/optional-3d-map-contract.ps1`. Expected: FAIL because the current code has none of these new hooks.

- [ ] **Step 3: Commit the red test**

```powershell
git add tests/optional-3d-map-contract.ps1
git commit -m "Add optional 3D map contract test"
```

### Task 2: Add bilingual state, control, and deep-link handling

**Files:** Modify `index.html` toolbar CSS/HTML, UI dictionaries, state declarations, `deepLinkHash()`, `parseDeepLink()`, `applyDeepLink()`, and `window.BakuAtlas`.

**Interfaces:** Consumes existing `LANG`, `HEAT`, `METROON`, `TMYEAR`, `select()`, `setLang()`, and deep-link flow. Produces `VIEW3D`, `toggle3D()`, `view3dBtn`, `view=3d|2d`, and `BakuAtlas.view3d`.

- [ ] **Step 1: Add the control and bilingual labels**

Add beside the heat/metro chips:

```html
<button class="chip viewchip" id="view3dBtn" aria-pressed="false" onclick="toggle3D()" data-i18n="view3dBtn">3D view</button>
```

Add EN `view3dBtn:'3D view'`, `view2dBtn:'2D view'`; add TR `view3dBtn:'3B görünüm'`, `view2dBtn:'2B görünüm'`.

- [ ] **Step 2: Add state and toggle behavior**

Add `let VIEW3D=false` with the other state. `toggle3D()` inverts it, updates button text/class/`aria-pressed`, calls `window.setMapView(VIEW3D)` when available, and calls `syncDeepLink()`.

- [ ] **Step 3: Add hash parse/serialize/apply**

Serialize `view=3d` when true and `view=2d` when false. Parse only `view=3d` and `view=2d`; malformed values remain null. Apply after language, year, heat, and metro, before zone selection:

```javascript
if(state.view3d!==null && state.view3d!==VIEW3D) toggle3D();
```

Expose `get view3d(){return VIEW3D;}`.

- [ ] **Step 4: Run contracts**

Run the new contract plus `tests/zone-language-switch-regression.ps1` and `tests/map-migration-contract.ps1`. Expected: existing tests stay green; the new contract waits for MapLibre work if its assertions are not yet complete.

### Task 3: Add real MapLibre 3D rendering and camera controls

**Files:** Modify `maplibre-atlas.js` style layers, initialization, and hook bridge.

**Interfaces:** Consumes `api.view3d`, `api.reduced`, existing PMTiles source, and overlay layers. Produces `setMapView(is3d)`, `set3DView()`, `set2DView()`, and `building-extrusions`.

- [ ] **Step 1: Add the real extrusion layer**

Insert after flat `buildings`:

```javascript
{id:'building-extrusions',type:'fill-extrusion',source:'basemap','source-layer':'buildings',minzoom:12,layout:{visibility:'none'},paint:{
  'fill-extrusion-color':['interpolate',['linear'],['coalesce',['get','levels'],1],1,'#d9d2c5',8,'#a7a59f',18,'#777b80'],
  'fill-extrusion-height':['coalesce',['get','height'],['*',['coalesce',['get','levels'],2],3.2],6],
  'fill-extrusion-base':['coalesce',['get','min_height'],0],
  'fill-extrusion-opacity':.78,'fill-extrusion-vertical-gradient':true
}}
```

The fallback is conservative so the visual depth is attractive without implying surveyed heights where the tile lacks them.

- [ ] **Step 2: Add camera helpers**

Implement `set3DView()` with `pitch:48`, `bearing:-18`, `setLayoutProperty('building-extrusions','visibility','visible')`; implement `set2DView()` with `pitch:0`, `bearing:0`, and visibility `none`; use duration `0` when `api.reduced` is true and otherwise short easing. `setMapView(is3d)` dispatches to the appropriate helper and safely returns if the map is not ready.

- [ ] **Step 3: Connect state without disturbing overlays**

Expose `window.setMapView=setMapView`, call `setMapView(api.view3d)` after map load, and leave `updateSources()` data unchanged. Zones, heat, metro, events, and spotlight remain above the basemap.

- [ ] **Step 4: Run the new contract and syntax**

Run `powershell -NoProfile -ExecutionPolicy Bypass -File tests/optional-3d-map-contract.ps1` and `node --check maplibre-atlas.js`. Expected: PASS.

### Task 4: Verify invariants and the embedded asset

**Files:** Modify only `tests/optional-3d-map-contract.ps1` if a missing invariant is found.

- [ ] **Step 1: Run all static contracts**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/optional-3d-map-contract.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tests/zone-language-switch-regression.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tests/map-migration-contract.ps1
```

- [ ] **Step 2: Run syntax and image identity checks**

Run `node --check maplibre-atlas.js`, parse non-module inline scripts with `new Function`, and compare each `data:image/...;base64,...` payload in `index.html` against `git show HEAD:index.html` by SHA-256. Expected: syntax passes and image hashes match.

- [ ] **Step 3: Inspect scope**

Run `git diff --check`, `git diff --stat`, and `git status --short --branch`. Expected: only intended 3D files/tests changed and no embedded-image rewrite appears.

### Task 5: Publish and verify GitHub Pages

**Files:** No additional source files.

- [ ] **Step 1: Commit implementation and plan**

```powershell
git add index.html maplibre-atlas.js tests/optional-3d-map-contract.ps1 docs/superpowers/plans/2026-08-13-optional-3d-map.md
git commit -m "Add optional 3D Baku map view"
```

- [ ] **Step 2: Push and trigger Pages**

```powershell
git -c http.version=HTTP/2 -c http.lowSpeedLimit=0 -c http.lowSpeedTime=600 push origin main
gh api repos/Qarait/Baku-2036/pages/builds --method POST
```

- [ ] **Step 3: Verify deployment**

Poll the Pages build until the commit matches `HEAD` and status is `built`. Request `https://qarait.github.io/Baku-2036/?v=<commit>` and require HTTP 200 plus `view3dBtn`, `view=3d`, and the MapLibre controller reference.

- [ ] **Step 4: Report**

Report the live URL, commit, test results, and that 3D remains optional/default-off pending visual approval on desktop and a real phone.
