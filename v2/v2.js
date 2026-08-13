(function () {
  'use strict';

  const BBOX = [[49.25, 39.88], [50.38, 40.72]];
  const CENTRE = [49.841, 40.373];
  const AIRPORT = [50.046, 40.467];
  const PMTILES_URL = 'pmtiles://../assets/baku-absheron.pmtiles';
  const COLORS = { hot: '#bd5b2d', frontier: '#137b66', established: '#2e6b9e' };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const copy = {
    en: {
      title: 'Investment geography',
      subtitle: 'A data-first map of Baku and the Absheron peninsula',
      search: 'Search a place…',
      searchLabel: 'Search Baku and Absheron places',
      year: 'Map year',
      skip: 'Skip map',
      rayons: 'Rayons', areas: 'Areas', metro: 'Metro', heat: 'Heat',
      rayonBoundary: 'Rayon boundary', approxArea: 'Approximate investment area', metroLegend: 'Metro: solid built / dashed planned',
      kicker: 'MAP IDENTIFICATION',
      emptyTitle: 'Click anywhere on the map',
      emptyIntro: 'The map will tell you which administrative rayon you are in, the nearest investment area, and the distance to metro, central Baku and the airport.',
      administrative: 'Administrative rayon', investment: 'Investment context', nearestMetro: 'Nearest metro', centralBaku: 'Central Baku', airport: 'Airport', coordinates: 'Coordinates',
      noRayon: 'Outside loaded polygons', noZone: 'No nearby area', noMetro: 'No station nearby',
      rayonNote: 'Rayons are administrative geography. Investment areas are analytical approximations, not property boundaries.',
      clear: 'Clear selection', loading: 'Loading map data…', ready: 'Click a location to identify its geography', error: 'Map data could not be loaded', searchEmpty: 'No local place matched that search.'
    },
    tr: {
      title: 'Yatırım coğrafyası',
      subtitle: 'Bakü ve Abşeron yarımadası için veri odaklı harita',
      search: 'Bir yer arayın…',
      searchLabel: 'Bakü ve Abşeron yerlerini arayın',
      year: 'Harita yılı',
      skip: 'Haritayı geç',
      rayons: 'Rayonlar', areas: 'Bölgeler', metro: 'Metro', heat: 'Isı',
      rayonBoundary: 'Rayon sınırı', approxArea: 'Yaklaşık yatırım bölgesi', metroLegend: 'Metro: düz mevcut / kesikli planlanan',
      kicker: 'HARİTA TANIMLAMA',
      emptyTitle: 'Haritada herhangi bir yere tıklayın',
      emptyIntro: 'Harita bulunduğunuz idari rayonu, en yakın yatırım bölgesini ve metroya, Bakü merkezine ve havalimanına mesafeyi gösterir.',
      administrative: 'İdari rayon', investment: 'Yatırım bağlamı', nearestMetro: 'En yakın metro', centralBaku: 'Bakü merkezi', airport: 'Havalimanı', coordinates: 'Koordinatlar',
      noRayon: 'Yüklenen poligonların dışında', noZone: 'Yakın yatırım bölgesi yok', noMetro: 'Yakında istasyon yok',
      rayonNote: 'Rayonlar idari coğrafyadır. Yatırım bölgeleri mülk sınırı değil, analitik yaklaşık alanlardır.',
      clear: 'Seçimi temizle', loading: 'Harita verileri yükleniyor…', ready: 'Coğrafyayı tanımlamak için bir yere tıklayın', error: 'Harita verileri yüklenemedi', searchEmpty: 'Yerel gazetteer eşleşme bulamadı.'
    }
  };

  const zones = [
    ['whitecity', 'White City / Khatai', 'White City / Hatai', 'hot', [49.877, 40.383], 15],
    ['yasamal', 'Yasamal (New Yasamal)', 'Yasamal (Yeni Yasamal)', 'hot', [49.815, 40.389], 13],
    ['narimanov', 'Narimanov', 'Nərimanov', 'hot', [49.870, 40.404], 13],
    ['sabail', 'Sabail / centre', 'Səbail / merkez', 'established', [49.835, 40.360], 11],
    ['khojasan', 'Khojasan / Purple Line', 'Xocəsən / Mor Hat', 'frontier', [49.762, 40.416], 11],
    ['khirdalan', 'Khyrdalan–Masazir–Saray', 'Xırdalan–Masazır–Saray', 'frontier', [49.755, 40.455], 11],
    ['sumgayit', 'Sumgayit seafront', 'Sumqayıt sahili', 'frontier', [49.668, 40.589], 14],
    ['novkhani', 'Novkhani', 'Novxanı', 'frontier', [49.785, 40.520], 9],
    ['bilgah', 'Bilgah / Sea Breeze', 'Bilgəh / Sea Breeze', 'hot', [50.033, 40.560], 16],
    ['mardakan', 'Mardakan–Shuvalan–Buzovna', 'Mərdəkan–Şüvəlan–Buzovna', 'hot', [50.130, 40.505], 16],
    ['airport', 'Airport zone', 'Havalimanı bölgesi', 'frontier', [49.940, 40.470], 12],
    ['mohammadi', 'Mohammadi', 'Məhəmmədli', 'frontier', [49.845, 40.495], 12],
    ['hovsan', 'Hovsan–Zikh–Turkan', 'Hövsan–Zığ–Türkan', 'frontier', [50.055, 40.374], 12],
    ['zikh', 'Zikh', 'Zığ', 'frontier', [49.978, 40.353], 9],
    ['lokbatan', 'Lokbatan', 'Lökbatan', 'frontier', [49.730, 40.325], 9],
    ['alat', 'Alat / port & free zone', 'Alat / liman ve serbest bölge', 'frontier', [49.406, 39.945], 11]
  ].map(([id, nameEn, nameTr, tier, coords, radius]) => ({ id, nameEn, nameTr, tier, coords, radius }));

  const state = {
    lang: 'en', year: 2026, admin: true, investments: true, metro: true, heat: false,
    selected: null, data: null, map: null, ready: false
  };

  const $ = id => document.getElementById(id);
  const tr = () => copy[state.lang];
  const featureCollection = features => ({ type: 'FeatureCollection', features });
  const pointFeature = (coords, properties) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: properties || {} });
  const lineFeature = (coords, properties) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: properties || {} });

  function distanceKm(a, b) {
    const rad = Math.PI / 180;
    const dLat = (b[1] - a[1]) * rad;
    const dLon = (b[0] - a[0]) * rad;
    const lat1 = a[1] * rad;
    const lat2 = b[1] * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function distanceRing(center, radiusKm, steps = 72) {
    const latRad = center[1] * Math.PI / 180;
    const dLat = radiusKm / 111.32;
    const dLon = radiusKm / (111.32 * Math.max(.2, Math.cos(latRad)));
    const coordinates = [];
    for (let i = 0; i <= steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2;
      coordinates.push([center[0] + dLon * Math.cos(angle), center[1] + dLat * Math.sin(angle)]);
    }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] }, properties: { radiusKm } };
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map(v => Math.round(255 * v).toString(16).padStart(2, '0')).join('');
  }

  function investmentFeatures() {
    return zones.map(z => pointFeature(z.coords, { id: z.id, labelEn: z.nameEn.replace(/[\u2013\u2014]/g, '-'), tier: z.tier, color: COLORS[z.tier], radius: z.radius }));
  }

  function heatFeatures() {
    return zones.map((z, index) => pointFeature(z.coords, { id: z.id, radius: z.radius * 3.5, color: hslToHex(28 + index * 4, 77, 51) }));
  }

  function metroLineFeatures() {
    return (state.data?.metro.lines || []).map(line => lineFeature(line.coordinates, {
      id: line.id, line: line.line, color: line.color, built: state.year >= line.builtYear, status: line.status
    }));
  }

  function metroStationFeatures() {
    return (state.data?.metro.stations || []).map(station => pointFeature(station.coords, {
      id: station.id, label: state.lang === 'tr' ? station.nameTr : station.nameEn, line: station.line, color: station.color,
      built: state.year >= station.builtYear, status: station.status
    }));
  }

  function updateSource(id, data) {
    const source = state.map && state.map.getSource(id);
    if (source) source.setData(data);
  }

  function updateLayers() {
    if (!state.ready) return;
    const visibility = (id, on) => { if (state.map.getLayer(id)) state.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
    visibility('admin-fill', state.admin);
    visibility('admin-line', state.admin);
    visibility('admin-label', state.admin);
    visibility('investment-zones', state.investments);
    visibility('investment-labels', state.investments);
    visibility('metro-halo', state.metro);
    visibility('metro-lines', state.metro);
    visibility('metro-stations', state.metro);
    visibility('heat-layer', state.heat);
    updateSource('investment-zones', featureCollection(investmentFeatures()));
    updateSource('heat', featureCollection(heatFeatures()));
    updateSource('metro-lines', featureCollection(metroLineFeatures()));
    updateSource('metro-stations', featureCollection(metroStationFeatures()));
  }

  function createStyle(data) {
    return {
      version: 8,
      name: 'Baku 2036 v2 data-first',
      glyphs: '../assets/glyphs/{fontstack}/{range}.pbf',
      sources: {
        basemap: { type: 'vector', url: PMTILES_URL },
        admin: { type: 'geojson', data: data.admin },
        'investment-zones': { type: 'geojson', data: featureCollection(investmentFeatures()) },
        heat: { type: 'geojson', data: featureCollection(heatFeatures()) },
        'metro-lines': { type: 'geojson', data: featureCollection(metroLineFeatures()) },
        'metro-stations': { type: 'geojson', data: featureCollection(metroStationFeatures()) },
        rings: { type: 'geojson', data: featureCollection([]) },
        'click-point': { type: 'geojson', data: featureCollection([]) }
      },
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': '#e7e7df' } },
        { id: 'water', type: 'fill', source: 'basemap', 'source-layer': 'water_polygons', paint: { 'fill-color': '#c4dfe5', 'fill-opacity': .95 } },
        { id: 'ocean', type: 'fill', source: 'basemap', 'source-layer': 'ocean', paint: { 'fill-color': '#c4dfe5', 'fill-opacity': .85 } },
        { id: 'land', type: 'fill', source: 'basemap', 'source-layer': 'land', paint: { 'fill-color': '#e9e7df', 'fill-opacity': .7 } },
        { id: 'roads', type: 'fill', source: 'basemap', 'source-layer': 'street_polygons', paint: { 'fill-color': ['match', ['get', 'kind'], ['motorway', 'trunk'], '#c5a688', ['primary', 'secondary'], '#d7c8b4', '#dedbd1'], 'fill-opacity': .85 } },
        { id: 'street-lines', type: 'line', source: 'basemap', 'source-layer': 'streets', minzoom: 11, paint: { 'line-color': ['match', ['get', 'kind'], ['motorway', 'trunk'], '#aa755a', ['primary', 'secondary'], '#b9916d', '#b8b8b0'], 'line-width': ['interpolate', ['linear'], ['zoom'], 11, .5, 14, 2], 'line-opacity': .78 } },
        { id: 'buildings', type: 'fill', source: 'basemap', 'source-layer': 'buildings', minzoom: 12, paint: { 'fill-color': '#d2cec4', 'fill-outline-color': '#bcb6ac', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, .12, 14, .65] } },
        { id: 'admin-fill', type: 'fill', source: 'admin', paint: { 'fill-color': ['case', ['==', ['get', 'scope'], 'context'], '#b5c6c8', '#c2d8d6'], 'fill-opacity': .12 } },
        { id: 'admin-line', type: 'line', source: 'admin', paint: { 'line-color': ['case', ['==', ['get', 'scope'], 'context'], '#799397', '#356a70'], 'line-width': ['interpolate', ['linear'], ['zoom'], 8, .8, 11, 1.7, 14, 2.4], 'line-opacity': .82, 'line-dasharray': [2, 1.4] } },
        { id: 'admin-label', type: 'symbol', source: 'admin', layout: { 'text-field': ['get', 'nameEn'], 'text-font': ['noto_sans_bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 9, 11, 13], 'text-allow-overlap': false }, paint: { 'text-color': '#34565e', 'text-halo-color': '#f8f6ef', 'text-halo-width': 1.6 } },
        { id: 'metro-halo', type: 'line', source: 'metro-lines', paint: { 'line-color': '#fffdf8', 'line-width': 6, 'line-opacity': ['case', ['get', 'built'], .87, .42] } },
        { id: 'metro-lines', type: 'line', source: 'metro-lines', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'built'], 3, 2.3], 'line-opacity': ['case', ['get', 'built'], 1, .65], 'line-dasharray': ['case', ['get', 'built'], ['literal', [1, 0]], ['literal', [2, 2]]] } },
        { id: 'metro-stations', type: 'circle', source: 'metro-stations', paint: { 'circle-radius': ['case', ['get', 'built'], 4, 3.2], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fffdf8', 'circle-stroke-width': 1.2, 'circle-opacity': ['case', ['get', 'built'], 1, .62] } },
        { id: 'heat-layer', type: 'circle', source: 'heat', layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['*', ['get', 'radius'], .45], 11, ['get', 'radius'], 14, ['*', ['get', 'radius'], 1.25]], 'circle-color': ['get', 'color'], 'circle-opacity': .24, 'circle-blur': .82 } },
        { id: 'investment-zones', type: 'circle', source: 'investment-zones', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, ['*', ['get', 'radius'], .55], 11, ['get', 'radius'], 14, ['*', ['get', 'radius'], 1.45]], 'circle-color': ['get', 'color'], 'circle-opacity': .48, 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-opacity': .9 } },
        { id: 'investment-labels', type: 'symbol', source: 'investment-zones', layout: { 'text-field': ['get', 'labelEn'], 'text-font': ['noto_sans_bold'], 'text-size': 10, 'text-anchor': 'top', 'text-offset': [0, 1.2], 'text-allow-overlap': false }, paint: { 'text-color': '#27333c', 'text-halo-color': '#fffdf8', 'text-halo-width': 2 } },
        { id: 'rings', type: 'line', source: 'rings', paint: { 'line-color': '#214a69', 'line-width': 1.2, 'line-dasharray': [2, 2], 'line-opacity': .72 } },
        { id: 'click-point', type: 'circle', source: 'click-point', paint: { 'circle-radius': 6, 'circle-color': '#fffdf8', 'circle-stroke-color': '#183b58', 'circle-stroke-width': 2 } },
      ]
    };
  }

  function nearestStation(coords) {
    let nearest = null;
    for (const station of state.data.metro.stations) {
      const distance = distanceKm(coords, station.coords);
      if (!nearest || distance < nearest.distance) nearest = { station, distance };
    }
    return nearest;
  }

  function nearestZone(coords) {
    let nearest = null;
    for (const zone of zones) {
      const distance = distanceKm(coords, zone.coords);
      if (!nearest || distance < nearest.distance) nearest = { zone, distance };
    }
    return nearest;
  }

  function pointInRing(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const crosses = ((yi > point[1]) !== (yj > point[1])) && (point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function pointInGeometry(point, geometry) {
    if (!geometry) return false;
    if (geometry.type === 'Polygon') return pointInRing(point, geometry.coordinates[0]) && !geometry.coordinates.slice(1).some(ring => pointInRing(point, ring));
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(polygon => pointInGeometry(point, { type: 'Polygon', coordinates: polygon }));
    return false;
  }

  function findAdministrativeProperties(point) {
    const feature = state.data.admin.features.find(candidate => pointInGeometry(point, candidate.geometry));
    return feature ? feature.properties : null;
  }
  function identifyLocation(lngLat, point) {
    if (!state.ready) return;
    const coords = [Number(lngLat.lng), Number(lngLat.lat)];
    const rendered = point ? state.map.queryRenderedFeatures(point, { layers: ['admin-fill', 'investment-zones', 'metro-stations'] }) : [];
    const adminFeature = rendered.find(f => f.layer.id === 'admin-fill');
    const zoneFeature = rendered.find(f => f.layer.id === 'investment-zones');
    const stationFeature = rendered.find(f => f.layer.id === 'metro-stations');
    const byId = id => zones.find(z => z.id === id);
    const nearbyZone = zoneFeature ? { zone: byId(zoneFeature.properties.id), distance: distanceKm(coords, byId(zoneFeature.properties.id).coords) } : nearestZone(coords);
    const station = stationFeature ? { station: state.data.metro.stations.find(s => s.id === stationFeature.properties.id), distance: 0 } : nearestStation(coords);
    state.selected = { coords, admin: adminFeature?.properties || findAdministrativeProperties(coords), zone: nearbyZone, station };
    renderPanel();
    updateSelectionGeometry();
    updateHash();
  }

  function selectZone(id, announce = true) {
    const zone = zones.find(z => z.id === id);
    if (!zone || !state.ready) return;
    if (!state.map.getLayoutProperty('investment-zones', 'visibility') || state.map.getLayoutProperty('investment-zones', 'visibility') !== 'none') {
      state.map.flyTo({ center: zone.coords, zoom: Math.max(11, state.map.getZoom()), duration: reducedMotion ? 0 : 700, essential: true });
    }
    const fake = { lng: zone.coords[0], lat: zone.coords[1] };
    identifyLocation(fake, null);
    if (state.selected) state.selected.zone = { zone, distance: 0 };
    renderPanel();
    if (announce) $('v2Panel').focus({ preventScroll: true });
  }

  function updateSelectionGeometry() {
    if (!state.selected) {
      updateSource('rings', featureCollection([]));
      updateSource('click-point', featureCollection([]));
      return;
    }
    const coords = state.selected.coords;
    updateSource('rings', featureCollection([distanceRing(coords, 2), distanceRing(coords, 5), distanceRing(coords, 10)]));
    updateSource('click-point', featureCollection([pointFeature(coords)]));
  }

  function formatDistance(value) { return value < 1 ? `${Math.round(value * 1000)} m` : `${value.toFixed(1)} km`; }

  function renderPanel() {
    const u = tr();
    $('panelKicker').textContent = u.kicker;
    $('panelNote').textContent = u.rayonNote;
    $('rayonMetricLabel').textContent = u.administrative;
    $('zoneMetricLabel').textContent = u.investment;
    $('stationMetricLabel').textContent = u.nearestMetro;
    $('centreMetricLabel').textContent = u.centralBaku;
    $('airportMetricLabel').textContent = u.airport;
    $('coordinateMetricLabel').textContent = u.coordinates;
    if (!state.selected) {
      $('panelTitle').textContent = u.emptyTitle;
      $('panelIntro').textContent = u.emptyIntro;
      $('panelGrid').hidden = true;
      $('clearSelection').hidden = true;
      return;
    }
    const selected = state.selected;
    const adminName = selected.admin ? (state.lang === 'tr' ? (selected.admin.nameAz || selected.admin.nameEn) : selected.admin.nameEn) : u.noRayon;
    const zoneName = selected.zone?.zone ? (state.lang === 'tr' ? selected.zone.zone.nameTr : selected.zone.zone.nameEn) : u.noZone;
    const station = selected.station?.station;
    const stationName = station ? `${state.lang === 'tr' ? station.nameTr : station.nameEn} · ${formatDistance(selected.station.distance)}` : u.noMetro;
    $('panelTitle').textContent = zoneName;
    $('panelIntro').textContent = `${adminName} · ${state.lang === 'tr' ? 'harita yılı' : 'map year'} ${state.year}`;
    $('rayonMetric').textContent = adminName;
    $('zoneMetric').textContent = selected.zone ? `${zoneName} · ${formatDistance(selected.zone.distance)}` : u.noZone;
    $('stationMetric').textContent = stationName;
    $('centreMetric').textContent = formatDistance(distanceKm(selected.coords, CENTRE));
    $('airportMetric').textContent = formatDistance(distanceKm(selected.coords, AIRPORT));
    $('coordinateMetric').textContent = `${selected.coords[1].toFixed(4)}, ${selected.coords[0].toFixed(4)}`;
    $('panelGrid').hidden = false;
    $('clearSelection').hidden = false;
  }

  function searchPlaces(query) {
    const needle = String(query || '').trim().toLocaleLowerCase();
    if (!needle) return [];
    return state.data.places.filter(place => [place.nameEn, place.nameTr, place.type].some(value => String(value || '').toLocaleLowerCase().includes(needle))).sort((a, b) => {
      const aStarts = String(a.nameEn).toLocaleLowerCase().startsWith(needle) ? 0 : 1;
      const bStarts = String(b.nameEn).toLocaleLowerCase().startsWith(needle) ? 0 : 1;
      return aStarts - bStarts || a.nameEn.localeCompare(b.nameEn);
    }).slice(0, 8);
  }

  function renderSearchResults(query) {
    const results = $('searchResults');
    const matches = searchPlaces(query);
    results.innerHTML = '';
    if (!String(query || '').trim()) { results.hidden = true; return; }
    results.hidden = false;
    if (!matches.length) {
      const empty = document.createElement('div'); empty.className = 'search-result'; empty.textContent = tr().searchEmpty; results.appendChild(empty); return;
    }
    matches.forEach(place => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'search-result'; button.setAttribute('role', 'option');
      button.innerHTML = `<span><strong>${escapeHtml(state.lang === 'tr' ? place.nameTr : place.nameEn)}</strong><small>${escapeHtml(place.type)}</small></span><small>${place.coords[1].toFixed(3)}, ${place.coords[0].toFixed(3)}</small>`;
      button.addEventListener('click', () => { choosePlace(place); });
      results.appendChild(button);
    });
  }

  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }

  function choosePlace(place) {
    $('placeSearch').value = state.lang === 'tr' ? place.nameTr : place.nameEn;
    $('searchResults').hidden = true;
    state.map.flyTo({ center: place.coords, zoom: Math.max(12, state.map.getZoom()), duration: reducedMotion ? 0 : 700, essential: true });
    identifyLocation({ lng: place.coords[0], lat: place.coords[1] }, null);
    $('v2Panel').focus({ preventScroll: true });
  }

  function updateHash() {
    const params = new URLSearchParams();
    if (state.selected?.zone?.zone?.id) params.set('z', state.selected.zone.zone.id);
    params.set('y', String(state.year)); params.set('lang', state.lang); params.set('heat', state.heat ? '1' : '0'); params.set('metro', state.metro ? '1' : '0');
    history.replaceState(null, '', `${location.pathname}${location.search}#${params.toString()}`);
  }

  function readHash() {
    const raw = location.hash.replace(/^#/, '');
    const params = new URLSearchParams(raw);
    if (params.get('lang') === 'tr' || params.get('lang') === 'en') state.lang = params.get('lang');
    const year = Number(params.get('y')); if ([2026, 2030, 2036].includes(year)) state.year = year;
    if (params.get('heat') === '1' || params.get('heat') === '0') state.heat = params.get('heat') === '1';
    if (params.get('metro') === '1' || params.get('metro') === '0') state.metro = params.get('metro') === '1';
    const zoneId = params.get('z'); if (zoneId && zones.some(z => z.id === zoneId)) state.hashZone = zoneId;
  }

  function setLanguage(lang) {
    if (!copy[lang]) return;
    state.lang = lang;
    const u = tr();
    document.documentElement.lang = lang === 'tr' ? 'tr' : 'en';
    $('appTitle').textContent = u.title; $('appSubtitle').textContent = u.subtitle; $('placeSearch').placeholder = u.search; $('searchLabel').textContent = u.searchLabel; $('yearLabel').textContent = u.year; $('skipMap').textContent = u.skip;
    $('rayonLegend').textContent = u.rayonBoundary; $('areaLegend').textContent = u.approxArea; $('metroLegend').textContent = u.metroLegend;
    $('clearSelection').textContent = u.clear; $('langEn').classList.toggle('active', lang === 'en'); $('langTr').classList.toggle('active', lang === 'tr');
    document.querySelector('[data-layer="admin"]').textContent = u.rayons; document.querySelector('[data-layer="investments"]').textContent = u.areas; document.querySelector('[data-layer="metro"]').textContent = u.metro; document.querySelector('[data-layer="heat"]').textContent = u.heat;
    if (state.ready) { updateLayers(); renderPanel(); }
    updateHash();
  }

  function setYear(year) {
    const value = Number(year); if (![2026, 2030, 2036].includes(value)) return;
    state.year = value; $('yearSelect').value = String(value); updateLayers(); renderPanel(); updateHash();
  }

  function toggleLayer(layer) {
    if (!['admin', 'investments', 'metro', 'heat'].includes(layer)) return;
    state[layer] = !state[layer];
    const button = document.querySelector(`[data-layer="${layer}"]`); button.classList.toggle('active', state[layer]); button.setAttribute('aria-pressed', String(state[layer]));
    updateLayers(); updateHash();
  }

  function installControls() {
    $('langEn').addEventListener('click', () => setLanguage('en')); $('langTr').addEventListener('click', () => setLanguage('tr'));
    $('yearSelect').addEventListener('change', event => setYear(event.target.value));
    $('placeSearch').addEventListener('input', event => renderSearchResults(event.target.value));
    $('placeSearch').addEventListener('keydown', event => { if (event.key === 'Escape') { $('searchResults').hidden = true; event.target.blur(); } if (event.key === 'Enter') { const first = searchPlaces(event.target.value)[0]; if (first) choosePlace(first); } });
    $('clearSelection').addEventListener('click', () => { state.selected = null; state.hashZone = null; renderPanel(); updateSelectionGeometry(); updateHash(); });
    document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
      if (!state.map) return;
      const action = button.dataset.action;
      if (action === 'zoom-in') state.map.zoomIn({ duration: reducedMotion ? 0 : 220 });
      if (action === 'zoom-out') state.map.zoomOut({ duration: reducedMotion ? 0 : 220 });
      if (action === 'reset') state.map.fitBounds(BBOX, { padding: 44, duration: reducedMotion ? 0 : 500 });
    }));
    document.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => toggleLayer(button.dataset.layer)));
    document.addEventListener('click', event => { if (!event.target.closest('.search-box') && !event.target.closest('.search-results')) $('searchResults').hidden = true; });
  }

  function installMap(maplibregl, data) {
    if (!window.pmtiles || !maplibregl || state.map) return;
    const protocol = new window.pmtiles.Protocol(); maplibregl.addProtocol('pmtiles', protocol.tile);
    state.map = new maplibregl.Map({ container: 'v2Map', style: createStyle(data), center: [49.86, 40.42], zoom: 9.6, minZoom: 8, maxZoom: 15.4, dragRotate: false, pitchWithRotate: false, attributionControl: { compact: true } });
    state.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    state.map.on('load', () => {
      state.ready = true; $('mapStatus').textContent = tr().ready; $('mapStatus').classList.remove('error'); $('yearSelect').value = String(state.year);
      updateLayers(); renderPanel();
      state.map.on('click', event => identifyLocation(event.lngLat, event.point));
      ['investment-zones', 'metro-stations', 'admin-fill'].forEach(layer => { state.map.on('mouseenter', layer, () => { state.map.getCanvas().style.cursor = 'pointer'; }); state.map.on('mouseleave', layer, () => { state.map.getCanvas().style.cursor = ''; }); });
      if (state.hashZone) selectZone(state.hashZone, false); else state.map.fitBounds(BBOX, { padding: 50, duration: 0 });
    });
    state.map.on('error', event => { if (event?.error) console.warn('Baku v2 map error', event.error); });
  }

  async function loadData() {
    const [admin, metro, places] = await Promise.all(['data/admin-absheron.geojson', 'data/metro.json', 'data/places.json'].map(path => fetch(path).then(response => { if (!response.ok) throw new Error(path); return response.json(); })));
    state.data = { admin, metro, places }; return state.data;
  }

  async function boot() {
    readHash(); installControls(); setLanguage(state.lang); $('mapStatus').textContent = tr().loading;
    try {
      const data = await loadData();
      const maplibregl = window.__V2MapLibre;
      if (maplibregl) installMap(maplibregl, data); else window.addEventListener('v2-maplibre-ready', () => installMap(window.__V2MapLibre, data), { once: true });
    } catch (error) { console.error(error); $('mapStatus').textContent = tr().error; $('mapStatus').classList.add('error'); }
  }

  window.distanceKm = distanceKm;
  window.distanceRing = distanceRing;
  window.identifyLocation = identifyLocation;
  window.searchPlaces = searchPlaces;
  window.setYear = setYear;
  window.setLang = setLanguage;
  boot();
})();
