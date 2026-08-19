(function () {
  'use strict';

  const BBOX = [[49.25, 39.88], [50.38, 40.72]];
  const CENTRE = [49.841, 40.373];
  const AIRPORT = [50.046, 40.467];
  const PMTILES_URL = 'pmtiles://assets/baku-absheron.pmtiles';
  const COLORS = { hot: '#bd5b2d', frontier: '#137b66', established: '#2e6b9e' };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fixedLanguage = window.__BakuFixedLanguage === 'tr' || window.__BakuFixedLanguage === 'en' ? window.__BakuFixedLanguage : null;

  const copy = {
    en: {
      title: 'Understand Baku property',
      subtitle: 'See where prices may rise, what is changing, and how sure we are.',
      search: 'Search a place\u2026',
      searchLabel: 'Search Baku and Absheron places', showMe: '\u25b6 Show me (1 minute)',
      year: 'Drag to see the future',
      dataChecked: 'Data checked', projectStatus: 'Project status checked', scenarioBaseline: 'Scenario baseline',
      skip: 'Skip map',
      rayons: 'District borders', areas: 'Investment spots', metro: 'Metro', heat: 'Where prices rise fastest',
      rayonBoundary: 'District borders', approxArea: 'Investment spots', metroLegend: 'Metro: solid built / dashed planned', evidenceLegend: 'How sure is this?', builtLegend: 'Already built', contractedLegend: 'Being built now', programmedLegend: 'Government plan', privateLegend: 'Company promise',
      kicker: 'SELECTED PLACE',
      emptyTitle: 'Tap a circle to see what’s coming',
      emptyIntro: 'Or tap anywhere to find out where you are.',
      administrative: 'District', investment: 'Investment spot', nearestMetro: 'Nearest metro (straight line — walking is a bit longer)', centralBaku: 'Central Baku', airport: 'Airport', coordinates: 'Coordinates',
      noRayon: 'That’s the sea', noZone: 'No nearby spot', noMetro: 'No station nearby',
      rayonNote: 'District borders show official administrative geography. Investment spots are approximate, not property boundaries.',
      clear: 'Clear', closeDetails: 'Close', collapseDetails: 'Hide details', showDetails: 'Show details', locationDetails: 'Location details', loading: 'Loading map data\u2026', ready: 'Click a location to identify its geography', error: 'We couldn\u2019t load the map data. Please refresh and try again.', validation: 'We couldn\u2019t validate the map data. Please refresh and try again.', retry: 'Retry', searchEmpty: 'No local place matched that search.'
    },
    tr: {
      title: 'Bakü gayrimenkulünü anlayın',
      subtitle: 'Fiyatların nerede artabileceğini, neyin değiştiğini ve ne kadar emin olduğumuzu görün.',
      search: 'Bir yer aray\u0131n\u2026',
      searchLabel: 'Bak\u00fc ve Ab\u015feron yerlerini aray\u0131n', showMe: '\u25b6 Göster (1 dakika)',
      year: 'Geleceği görmek için sürükleyin',
      dataChecked: 'Veriler kontrol edildi', projectStatus: 'Proje durumu kontrol edildi', scenarioBaseline: 'Senaryo ba\u015flang\u0131c\u0131',
      skip: 'Haritay\u0131 ge\u00e7',
      rayons: 'İlçe sınırları', areas: 'Yatırım noktaları', metro: 'Metro', heat: 'Fiyatların en hızlı arttığı yerler',
      rayonBoundary: 'İlçe sınırları', approxArea: 'Yatırım noktaları', metroLegend: 'Metro: çalışan / planlanan hatlar', evidenceLegend: 'Ne kadar emin olabiliriz?', builtLegend: 'Zaten yapıldı', contractedLegend: 'Şimdi yapılıyor', programmedLegend: 'Devlet planı', privateLegend: 'Şirket sözü',
      kicker: 'SE\u00c7\u0130LEN YER',
      emptyTitle: 'Bir daireye dokunarak ne olacağını görün',
      emptyIntro: 'Ya da nerede olduğunuzu öğrenmek için haritada herhangi bir yere dokunun.',
      administrative: 'İlçe', investment: 'Yatırım noktası', nearestMetro: 'En yakın metro (kuş uçuşu — yürüyüş biraz daha uzun)', centralBaku: 'Bakü merkezi', airport: 'Havalimanı', coordinates: 'Koordinatlar',
      noRayon: 'Burası deniz', noZone: 'Yakında yatırım noktası yok', noMetro: 'Yakında istasyon yok',
      rayonNote: 'İlçe sınırları resmi idari coğrafyayı gösterir. Yatırım noktaları yaklaşık alanlardır; mülk sınırı değildir.',
      clear: 'Temizle', closeDetails: 'Kapat', collapseDetails: 'Ayrıntıları gizle', showDetails: 'Ayrıntıları göster', locationDetails: 'Konum ayrıntıları', loading: 'Harita verileri y\u00fckleniyor\u2026', ready: 'Co\u011frafyay\u0131 tan\u0131mlamak i\u00e7in bir yere t\u0131klay\u0131n', error: 'Harita verilerini y\u00fckleyemedik. L\u00fctfen sayfay\u0131 yenileyin ve tekrar deneyin.', validation: 'Harita verilerini do\u011frulayamad\u0131k. L\u00fctfen sayfay\u0131 yenileyin ve tekrar deneyin.', retry: 'Yeniden deneyin', searchEmpty: 'Yerel gazetteer e\u015fle\u015fme bulamad\u0131.'
    }
  };
  const zones = [];

  function zoneValidationError(message) {
    const error = new Error('Zone data validation failed: ' + message);
    error.code = 'zone-data-validation';
    return error;
  }

  function hydrateZones(atlasZones) {
    if (!Array.isArray(atlasZones)) throw zoneValidationError('expected an array');
    if (!atlasZones.length) throw zoneValidationError('expected at least 1 zone; received 0');
    const ids = new Set();
    const hydrated = atlasZones.map((zone, index) => {
      const id = typeof zone?.id === 'string' ? zone.id.trim() : '';
      if (!id) throw zoneValidationError('zone ' + index + ' has a missing id');
      if (ids.has(id)) throw zoneValidationError('duplicate id ' + id);
      ids.add(id);
      const coords = zone.coords;
      if (!Array.isArray(coords) || coords.length < 2 || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) throw zoneValidationError('zone ' + id + ' has invalid coordinates');
      if (!Number.isFinite(zone.growthPct)) throw zoneValidationError('zone ' + id + ' has invalid growthPct');
      return {
        ...zone,
        id,
        tier: zone.tier === 'est' ? 'established' : (zone.tier === 'fr' ? 'frontier' : zone.tier),
        coords: [coords[0], coords[1]],
        radius: Number(zone.radius) || 10
      };
    });
    zones.length = 0;
    zones.push(...hydrated);
  }

  function atlasCopy() {
    return state.data?.content?.[state.lang] || { ui: copy[state.lang], labels: {} };
  }

  function renderDataFreshness() {
    const host = $('dataFreshness');
    const meta = state.data?.content?.meta;
    if (!host || !meta?.checked) return;
    const dates = meta.checked[state.lang] || meta.checked.en;
    const u = tr();
    host.textContent = [u.dataChecked + ': ' + dates.data, u.projectStatus + ': ' + dates.projectStatus, u.scenarioBaseline + ': ' + dates.scenarioBaseline].join(' · ');
    host.dataset.revision = meta.revision || '';
    host.hidden = false;
  }

  function zoneTierLabel(zone) {
    const ui = atlasCopy().ui || {};
    const key = zone.tier === 'hot' ? 'hot' : zone.tier === 'established' ? 'est' : 'fr';
    return ui.tier?.[key] || (zone.tier === 'hot' ? 'High-conviction' : zone.tier === 'established' ? 'Established / income' : 'Frontier');
  }

  function statusLabel(status) {
    const labels = atlasCopy().labels || {};
    if (status === 'done') return labels.built || 'Built / underway';
    if (status === 'fund') return labels.funded || 'Funded / committed';
    if (status === 'plan') return labels.planned || 'Planned';
    return labels.scenario || 'Scenario only';
  }

  function evidenceStatusLabel(status) {
    const labels = atlasCopy().labels || {};
    const fallback = state.lang === 'tr' ? { operational: 'Zaten yapıldı', contracted: 'Şimdi yapılıyor', programmed: 'Devlet planı', 'private-plan': 'Şirket sözü', concept: 'Uzun vadeli fikir' } : { operational: 'Already built', contracted: 'Being built now', programmed: 'Government plan', 'private-plan': 'Company promise', concept: 'Long-range idea' };
    return fallback[status] || labels[status] || status;
  }

  function renderEvidence(zone) {
    const labels = atlasCopy().labels || {};
    const items = Array.isArray(zone.evidence) ? zone.evidence : [];
    const safeUrl = item => /^https?:\/\//i.test(String(item.url || '')) ? item.url : '#';
    const localized = item => state.lang === 'tr' ? (item.claimTr || item.claim) : item.claim;
    const localizedMeaning = item => state.lang === 'tr' ? (item.investmentMeaningTr || item.investmentMeaning) : item.investmentMeaning;
    const cards = items.map(item => '<article class="evidence-card evidence-' + escapeHtml(item.status) + '">' +
      '<div class="evidence-card-head"><span class="evidence-status">' + escapeHtml(evidenceStatusLabel(item.status)) + '</span><span class="evidence-confidence">' + escapeHtml((labels.confidence || 'Confidence') + ': ' + (labels[item.confidence] || item.confidence)) + '</span></div>' +
      '<p class="evidence-claim">' + escapeHtml(localized(item)) + '</p>' +
      '<p class="evidence-meaning"><strong>' + escapeHtml(labels.investmentMeaning || 'What it may mean for property') + '</strong> ' + escapeHtml(localizedMeaning(item)) + '</p>' +
      '<div class="evidence-meta"><span>' + escapeHtml(item.source) + '</span><span>' + escapeHtml((labels.checked || 'Checked') + ' ' + item.checkedAt) + '</span><a href="' + escapeHtml(safeUrl(item)) + '" target="_blank" rel="noopener">' + escapeHtml(labels.readSource || 'Read source') + '</a></div>' +
      '</article>').join('');
    return '<div class="brief-section evidence-section"><div class="evidence-title-row"><h4>' + escapeHtml(tr().evidenceLegend || 'How sure is this?') + '</h4><span>' + escapeHtml(labels.evidenceHint || 'What is real, who says it, and what it may mean.') + '</span></div>' + cards + '</div>';
  }

  function localPlaceStatusLabel(status) {
    const labels = atlasCopy().labels || {};
    return status === 'open' ? (labels.localOpen || 'Open') : (labels.localBuilding || 'Being built');
  }

  function renderLocalPlaces(zone) {
    const labels = atlasCopy().labels || {};
    const items = Array.isArray(zone.localPlaces) ? zone.localPlaces : [];
    if (!items.length) return '';
    const cards = items.map(item => '<article class="local-place-card local-place-' + escapeHtml(item.status) + '">' +
      '<div class="local-place-head"><strong>' + escapeHtml(state.lang === 'tr' ? item.nameTr : item.nameEn) + '</strong><span>' + escapeHtml(localPlaceStatusLabel(item.status)) + '</span></div>' +
      '<p>' + escapeHtml(state.lang === 'tr' ? item.tr : item.en) + '</p></article>').join('');
    return '<div class="brief-section local-places-section"><h4>' + escapeHtml(labels.localPlaces || 'New places nearby') + '</h4><div class="local-place-list">' + cards + '</div></div>';
  }

  function readLocalObject(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (error) { return {}; }
  }

  function writeLocalObject(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function loadLocalState() {
    state.shortlist = readLocalObject('baku2036-v2-shortlist');
    state.shortlistAmounts = readLocalObject('baku2036-v2-shortlist-amounts');
  }

  function toggleShortlist(zoneId) {
    if (!zones.some(zone => zone.id === zoneId)) return;
    if (state.shortlist[zoneId]) delete state.shortlist[zoneId];
    else state.shortlist[zoneId] = true;
    writeLocalObject('baku2036-v2-shortlist', state.shortlist);
    renderZoneDrawer(zoneId);
    renderAllContent();
  }

  function scenarioBaseGrowth(zone) {
    const growthPct = Number(zone?.growthPct);
    if (!Number.isFinite(growthPct)) throw new Error('Zone is missing numeric growthPct: ' + (zone?.id || 'unknown'));
    return growthPct;
  }

  function scenarioProjection(zone, language = state.lang) {
    const detail = zone?.[language] || zone?.en || {};
    const prefix = language === 'tr' ? '%+' + scenarioBaseGrowth(zone) : '+' + scenarioBaseGrowth(zone) + '%';
    const qualifier = String(detail.proj || '').trim();
    return [prefix, qualifier].filter(Boolean).join(' ');
  }

  function scenarioGrowth(zone) {
    const base = scenarioBaseGrowth(zone);
    const oil = state.scenarios.oil === 'bad' ? .8 : state.scenarios.oil === 'good' ? 1.15 : 1;
    const infra = state.scenarios.infra === 'late' ? .72 : 1;
    return Math.round(base * oil * infra / 5) * 5;
  }


  const state = {
    lang: 'en', year: 2026, admin: true, investments: true, metro: true, heat: false,
    selected: null, data: null, map: null, ready: false, content: null, controlsInstalled: false, drawerCollapsed: false, shortlist: {}, shortlistAmounts: {}, scenarios: { oil: 'norm', infra: 'on', cur: 'stable' }, openAccordion: null, timeTimer: null, engaged: false, cityStory: { active: false, paused: false, index: 0, timer: null }, tourIndex: 0, tourStops: ['whitecity', 'mohammadi', 'bilgah', 'sumgayit', 'hovsan']
  };

  const $ = id => document.getElementById(id);
  const tr = () => copy[state.lang];
  const isMobileViewport = () => window.matchMedia('(max-width: 760px)').matches;
  function setMapStatus(kind, message) {
    const host = $('mapStatus');
    if (!host) return;
    host.classList.toggle('error', kind === 'error');
    host.dataset.status = kind;
    host.textContent = message;
    if (kind === 'error') {
      const retry = document.createElement('button');
      retry.id = 'retryData'; retry.type = 'button'; retry.className = 'retry-data';
      retry.textContent = tr().retry || (state.lang === 'tr' ? 'Yeniden deneyin' : 'Retry');
      retry.addEventListener('click', boot);
      host.append(' ', retry);
    }
  }
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

  const CITY_STORY_YEARS = [2026, 2028, 2030, 2033, 2036];
  const CITY_STORY_INTERVAL_MS = 12000;

  function cityCheckpointYears() {
    const checkpoints = atlasCopy().simulation?.checkpoints || {};
    return CITY_STORY_YEARS.filter(year => checkpoints[String(year)]);
  }

  function cityEventProperties(event, year) {
    return {
      year: event.y,
      phase: event.y <= year ? 'active' : 'future',
      label: state.lang === 'tr' ? event.tr : event.en,
      labelEn: event.en,
      labelTr: event.tr
    };
  }

  function cityEventFeatures(year) {
    return (atlasCopy().events || []).map(event => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: event.ll },
      properties: cityEventProperties(event, year)
    }));
  }

  function cityProjectEvidenceCounts() {
    const snapshot = {
      doneProjects: 0,
      fundedProjects: 0,
      plannedProjects: 0,
      operationalEvidence: 0,
      contractedEvidence: 0,
      programmedEvidence: 0,
      privatePlanEvidence: 0
    };
    for (const zone of state.data?.zones || []) {
      for (const project of zone.inv || []) {
        const status = project[2] || 'plan';
        if (status === 'done') snapshot.doneProjects += 1;
        else if (status === 'fund') snapshot.fundedProjects += 1;
        else if (status === 'plan') snapshot.plannedProjects += 1;
      }
      for (const item of zone.evidence || []) {
        if (item.status === 'operational') snapshot.operationalEvidence += 1;
        else if (item.status === 'contracted') snapshot.contractedEvidence += 1;
        else if (item.status === 'programmed') snapshot.programmedEvidence += 1;
        else if (item.status === 'private-plan') snapshot.privatePlanEvidence += 1;
      }
    }
    return snapshot;
  }

  function citySimulationSnapshot(year) {
    const metro = state.data?.metro || { lines: [], stations: [] };
    const lines = metro.lines || [];
    const stations = metro.stations || [];
    const events = cityEventFeatures(year);
    return {
      year,
      activeEvents: events.filter(feature => feature.properties.phase === 'active').length,
      futureEvents: events.filter(feature => feature.properties.phase === 'future').length,
      builtLines: lines.filter(line => year >= line.builtYear).length,
      plannedLines: lines.filter(line => year < line.builtYear).length,
      builtStations: stations.filter(station => year >= station.builtYear).length,
      plannedStations: stations.filter(station => year < station.builtYear).length,
      ...cityProjectEvidenceCounts()
    };
  }

  function nearestCityEvent(coords) {
    let nearest = null;
    for (const event of atlasCopy().events || []) {
      const distance = distanceKm(coords, event.ll);
      if (!nearest || distance < nearest.distance) nearest = { event, distance };
    }
    return nearest ? { distance: nearest.distance, ...cityEventProperties(nearest.event, state.year) } : null;
  }

  function selectedCityEventLabel(event) {
    if (!event) return '';
    return state.lang === 'tr' ? (event.labelTr || event.label) : (event.labelEn || event.label);
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

  function ringArea(ring) {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i += 1) area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
    return Math.abs(area) / 2;
  }

  function ringCentroid(ring) {
    let area = 0; let x = 0; let y = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const cross = (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
      area += cross; x += (ring[i][0] + ring[i + 1][0]) * cross; y += (ring[i][1] + ring[i + 1][1]) * cross;
    }
    if (!area) return ring[0];
    return [x / (3 * area), y / (3 * area)];
  }

  function adminLabelFeatures(admin) {
    const features = (admin?.features || []).map(feature => {
      const polygons = feature.geometry?.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry?.coordinates];
      const outer = polygons.filter(polygon => Array.isArray(polygon?.[0]) && polygon[0].length > 2).sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0]?.[0];
      return outer ? pointFeature(ringCentroid(outer), { ...feature.properties }) : null;
    }).filter(Boolean);
    return featureCollection(features);
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
    visibility('admin-water-mask', state.admin);
    visibility('admin-ocean-mask', state.admin);
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
    updateSource('city-events', featureCollection(cityEventFeatures(state.year)));
  }

  function createStyle(data) {
    return {
      version: 8,
      name: 'Baku 2036 audience map',
      glyphs: 'assets/glyphs/{fontstack}/{range}.pbf',
      sources: {
        basemap: {
          type: 'vector',
          url: PMTILES_URL,
          attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · processed by <a href="https://download.geofabrik.de/" target="_blank" rel="noopener">Geofabrik</a>'
        },
        admin: { type: 'geojson', data: data.admin },
        'admin-labels': { type: 'geojson', data: adminLabelFeatures(data.admin) },
        'investment-zones': { type: 'geojson', data: featureCollection(investmentFeatures()) },
        heat: { type: 'geojson', data: featureCollection(heatFeatures()) },
        'metro-lines': { type: 'geojson', data: featureCollection(metroLineFeatures()) },
        'metro-stations': { type: 'geojson', data: featureCollection(metroStationFeatures()) },
        'city-events': { type: 'geojson', data: featureCollection(cityEventFeatures(state.year)) },
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
        { id: 'admin-water-mask', type: 'fill', source: 'basemap', 'source-layer': 'water_polygons', paint: { 'fill-color': '#c4dfe5', 'fill-opacity': .95 } },
        { id: 'admin-ocean-mask', type: 'fill', source: 'basemap', 'source-layer': 'ocean', paint: { 'fill-color': '#c4dfe5', 'fill-opacity': .85 } },
        { id: 'admin-label', type: 'symbol', source: 'admin-labels', layout: { 'text-field': ['get', 'nameEn'], 'text-font': ['noto_sans_bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 9, 11, 13], 'text-allow-overlap': false }, paint: { 'text-color': '#34565e', 'text-halo-color': '#f8f6ef', 'text-halo-width': 1.6 } },
        { id: 'metro-halo', type: 'line', source: 'metro-lines', paint: { 'line-color': '#fffdf8', 'line-width': 6, 'line-opacity': ['case', ['get', 'built'], .87, .42] } },
        { id: 'metro-lines', type: 'line', source: 'metro-lines', paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'built'], 3, 2.3], 'line-opacity': ['case', ['get', 'built'], 1, .65], 'line-dasharray': ['case', ['get', 'built'], ['literal', [1, 0]], ['literal', [2, 2]]] } },
        { id: 'metro-stations', type: 'circle', source: 'metro-stations', paint: { 'circle-radius': ['case', ['get', 'built'], 4, 3.2], 'circle-color': ['get', 'color'], 'circle-stroke-color': '#fffdf8', 'circle-stroke-width': 1.2, 'circle-opacity': ['case', ['get', 'built'], 1, .62] } },
        { id: 'city-events-future', type: 'circle', source: 'city-events', filter: ['==', ['get', 'phase'], 'future'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4.2, 12, 6.8], 'circle-color': COLORS.hot, 'circle-opacity': .1, 'circle-stroke-color': COLORS.hot, 'circle-stroke-width': 1.4, 'circle-stroke-opacity': .42 } },
        { id: 'city-events-active', type: 'circle', source: 'city-events', filter: ['==', ['get', 'phase'], 'active'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4.6, 12, 7.2], 'circle-color': COLORS.hot, 'circle-opacity': .86, 'circle-stroke-color': '#fffdf8', 'circle-stroke-width': 1.2, 'circle-stroke-opacity': .95 } },
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
  function identifyLocation(lngLat, point, options = {}) {
    if (!state.ready) return;
    pauseCityStory();
    state.drawerCollapsed = false;
    const coords = [Number(lngLat.lng), Number(lngLat.lat)];
    const waterHit = point ? state.map.queryRenderedFeatures(point, { layers: ['water', 'ocean'] }).length > 0 : false;
    const rendered = point ? state.map.queryRenderedFeatures(point, { layers: ['admin-fill', 'investment-zones', 'metro-stations', 'city-events-active', 'city-events-future'] }) : [];
    const adminFeature = rendered.find(f => f.layer.id === 'admin-fill');
    const zoneFeature = rendered.find(f => f.layer.id === 'investment-zones');
    const stationFeature = rendered.find(f => f.layer.id === 'metro-stations');
    const cityEventFeature = rendered.find(f => f.layer.id === 'city-events-active' || f.layer.id === 'city-events-future');
    const byId = id => zones.find(z => z.id === id);
    const nearbyZone = zoneFeature ? { zone: byId(zoneFeature.properties.id), distance: distanceKm(coords, byId(zoneFeature.properties.id).coords) } : nearestZone(coords);
    const station = stationFeature ? { station: state.data.metro.stations.find(s => s.id === stationFeature.properties.id), distance: 0 } : nearestStation(coords);
    const event = cityEventFeature ? cityEventFeature.properties : (options.includeNearbyEvent ? nearestCityEvent(coords) : null);
    state.selected = { coords, admin: adminFeature?.properties || (waterHit ? null : findAdministrativeProperties(coords)), waterHit, zone: nearbyZone, station, event };
    state.drawerCollapsed = isMobileViewport();
    renderPanel();
    updateSelectionGeometry();
    updateHash();
  }

  function selectZone(id, announce = true) {
    const zone = zones.find(z => z.id === id);
    if (!zone || !state.ready) return;
    pauseCityStory();
    if (!state.map.getLayoutProperty('investment-zones', 'visibility') || state.map.getLayoutProperty('investment-zones', 'visibility') !== 'none') {
      state.map.flyTo({ center: zone.coords, zoom: Math.max(11, state.map.getZoom()), duration: reducedMotion ? 0 : 700, essential: true });
    }
    const fake = { lng: zone.coords[0], lat: zone.coords[1] };
    identifyLocation(fake, null);
    if (state.selected) state.selected.zone = { zone, distance: 0 };
    renderPanel();
    if (announce) $('v2ZoneDrawer').focus({ preventScroll: true });
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

  function zoneEvidenceStrength(zone) {
    const labels = atlasCopy().labels || {};
    const items = Array.isArray(zone.evidence) ? zone.evidence : [];
    if (!items.length) return labels.noEvidence || (state.lang === 'tr' ? 'Kaynak yok' : 'No sources attached');
    const confidence = items.every(item => item.confidence === 'high') ? 'high' : items.some(item => item.confidence === 'low') ? 'low' : 'medium';
    const sourceWord = labels.sourceCount || (state.lang === 'tr' ? 'kaynak' : 'sources');
    return items.length + ' ' + sourceWord + ' · ' + (labels[confidence] || confidence);
  }

  function renderZoneDrawer(zoneId) {
    const host = $('zoneBrief');
    const zone = zones.find(item => item.id === zoneId);
    if (!host || !zone || !state.selected) {
      if (host) { host.hidden = true; host.innerHTML = ''; }
      return;
    }
    const language = state.lang;
    const detail = zone[language] || zone.en;
    const labels = atlasCopy().labels || {};
    const ui = atlasCopy().ui || {};
    const checklist = zone.dd?.[language] || [];
    const projects = Array.isArray(detail.inv) ? detail.inv : [];
    const projectHtml = projects.map(project => '<div class="brief-project" data-status="' + escapeHtml(project[2] || 'plan') + '"><time>' + escapeHtml(project[0]) + '</time><span><strong>' + escapeHtml(statusLabel(project[2])) + '</strong><br>' + escapeHtml(project[1]) + '</span></div>').join('');
    const checklistHtml = checklist.map((item, index) => {
      const key = 'baku2036-v2-checklist-' + zone.id + '-' + index;
      const checked = readLocalObject(key).done === true;
      return '<label class="zone-check"><input type="checkbox" data-check-key="' + escapeHtml(key) + '"' + (checked ? ' checked' : '') + '><span>' + escapeHtml(item) + '</span></label>';
    }).join('');
    const starred = Boolean(state.shortlist[zone.id]);
    const risk = detail.risk || zone.risk || (state.lang === 'tr' ? 'Ana risk belirtilmedi.' : 'Main risk not specified.');
    const compactHtml =
      '<div id="zoneQuickSummary" class="zone-quick-summary" aria-label="' + escapeHtml(labels.quickSummary || (state.lang === 'tr' ? 'Kısa özet' : 'Quick summary')) + '">' +
        '<div class="quick-fact"><small>' + escapeHtml(labels.currentPrice || (state.lang === 'tr' ? 'Bugünkü fiyat' : 'Current price')) + '</small><strong>' + escapeHtml(detail.now || '—') + '</strong></div>' +
        '<div class="quick-fact"><small>' + escapeHtml(labels.possibleUpside || (state.lang === 'tr' ? 'Bu senaryoda olası artış' : 'Possible upside under this scenario')) + '</small><strong>' + escapeHtml(scenarioProjection(zone, language)) + '</strong></div>' +
        '<div class="quick-fact quick-fact-wide"><small>' + escapeHtml(labels.mainRisk || (state.lang === 'tr' ? 'Ana risk' : 'Main risk')) + '</small><p>' + escapeHtml(risk) + '</p></div>' +
        '<div class="quick-fact"><small>' + escapeHtml(labels.evidenceStrength || (state.lang === 'tr' ? 'Kanıt gücü' : 'Evidence strength')) + '</small><strong>' + escapeHtml(zoneEvidenceStrength(zone)) + '</strong></div>' +
      '</div>' +
      '<p class="scenario-insight">' + escapeHtml(labels.scenarioInsight || (state.lang === 'tr' ? 'Bu rakamın kaynağı: kamu planları, ulaşım, yakındaki projeler ve piyasa göstergeleri. Bu bir senaryodur, garanti değildir.' : 'Where this comes from: public plans, transport, nearby projects and market signals. This is a scenario, not a promise.')) + '</p>';
    const detailHtml =
      '<div id="zoneDetailContent" class="zone-detail-content">' +
      '<div class="brief-metrics"><div class="brief-metric"><small>' + escapeHtml(ui.entry || (state.lang === 'tr' ? 'Bugünkü giriş' : 'Entry today')) + '</small><strong>' + escapeHtml(detail.now || '—') + '</strong></div>' +
      '<div class="brief-metric"><small>' + escapeHtml(ui.scen || (state.lang === 'tr' ? '2036 senaryosu' : '2036 scenario')) + '</small><strong>' + escapeHtml(scenarioProjection(zone, language)) + '</strong></div>' +
      '<div class="brief-metric"><small>' + escapeHtml(state.lang === 'tr' ? 'Kira getirisi' : 'Rental yield') + '</small><strong>' + escapeHtml(detail.yield || '—') + '</strong></div></div>' +
      '<p class="scenario-insight">' + escapeHtml(labels.scenarioInsight || (state.lang === 'tr' ? 'Bu rakamın kaynağı: kamu planları, ulaşım, yakındaki projeler ve piyasa göstergeleri. Bu bir senaryodur, garanti değildir.' : 'Where this comes from: public plans, transport, nearby projects and market signals. This is a scenario, not a promise.')) + '</p>' +
      '<div class="brief-section"><h4>' + escapeHtml(labels.whatHappening || 'What is happening?') + '</h4><div class="brief-projects">' + projectHtml + '</div></div>' +
      renderLocalPlaces(zone) +
      renderEvidence(zone) +
      '<div class="brief-section"><h4>' + escapeHtml(labels.whyMatters || 'Why this place matters') + '</h4><p>' + escapeHtml(detail.thesis || '') + '</p></div>' +
      '<div class="brief-section"><h4>' + escapeHtml(labels.riskQuestion || 'What could go wrong?') + '</h4><p>' + escapeHtml(risk) + '</p></div>' +
      '<div class="brief-section"><h4>' + escapeHtml(labels.nextStep || 'A sensible next step') + '</h4><p>' + escapeHtml(detail.act || zone.act || '') + '</p></div>' +
      '<div class="brief-section"><h4>' + escapeHtml(labels.checklist || 'Before you buy here') + '</h4><div class="brief-checklist">' + checklistHtml + '</div></div>' +
      '<div class="drawer-actions"><button type="button" class="drawer-action' + (starred ? ' starred' : '') + '" data-zone-star="' + escapeHtml(zone.id) + '">' + escapeHtml(starred ? (labels.remove || 'Remove from shortlist') : (labels.add || 'Add to shortlist')) + '</button>' +
      '<button type="button" class="drawer-action" data-open-tool="accordion-deal">' + escapeHtml(labels.check || 'Check it') + '</button></div>' +
      '</div>';
    host.innerHTML =
      '<div class="brief-head"><h3>' + escapeHtml(state.lang === 'tr' ? zone.nameTr : zone.nameEn) + '</h3><span class="brief-tier">' + escapeHtml(zoneTierLabel(zone)) + '</span></div>' +
      (state.drawerCollapsed && isMobileViewport() ? compactHtml : detailHtml);
    host.hidden = false;
    host.querySelector('[data-zone-star]')?.addEventListener('click', event => toggleShortlist(event.currentTarget.dataset.zoneStar));
    host.querySelector('[data-open-tool]')?.addEventListener('click', event => {
      setAccordion(event.currentTarget.dataset.openTool);
      document.getElementById(event.currentTarget.dataset.openTool)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
    host.querySelectorAll('[data-check-key]').forEach(input => input.addEventListener('change', event => {
      writeLocalObject(event.currentTarget.dataset.checkKey, { done: event.currentTarget.checked });
    }));
  }

  function renderPanel() {
    const u = tr();
    $('panelKicker').textContent = u.kicker;
    $('closeDetails').textContent = u.closeDetails;
    $('collapseDetails').textContent = u.collapseDetails;
    $('showDetails').textContent = u.showDetails;
    $('panelDetailsTitle').textContent = u.locationDetails;
    $('panelNote').textContent = u.rayonNote;
    $('rayonMetricLabel').textContent = u.administrative;
    $('zoneMetricLabel').textContent = u.investment;
    $('stationMetricLabel').textContent = u.nearestMetro;
    $('centreMetricLabel').textContent = u.centralBaku;
    $('airportMetricLabel').textContent = u.airport;
    $('coordinateMetricLabel').textContent = u.coordinates;
    if (!state.selected) {
      state.drawerCollapsed = false;
      $('v2ZoneDrawer').classList.remove('is-collapsed');
      $('panelTitle').textContent = u.emptyTitle;
      $('panelIntro').textContent = u.emptyIntro;
      $('panelGrid').hidden = true;
      $('panelDetailsTitle').hidden = true;
      $('clearSelection').hidden = true;
      $('collapseDetails').hidden = true;
      $('showDetails').hidden = true;
      $('closeDetails').hidden = true;
      renderZoneDrawer(null);
      return;
    }
    const selected = state.selected;
    const adminName = selected.admin ? (state.lang === 'tr' ? (selected.admin.nameAz || selected.admin.nameEn) : selected.admin.nameEn) : u.noRayon;
    const zoneName = selected.zone?.zone ? (state.lang === 'tr' ? selected.zone.zone.nameTr : selected.zone.zone.nameEn) : u.noZone;
    const station = selected.station?.station;
    const stationName = station ? (state.lang === 'tr' ? station.nameTr : station.nameEn) + ' · ' + formatDistance(selected.station.distance) : u.noMetro;
    $('panelTitle').textContent = zoneName;
    const eventLabel = selectedCityEventLabel(selected.event);
    $('panelIntro').textContent = [adminName, state.year, eventLabel].filter(Boolean).join(' · ');
    $('rayonMetric').textContent = adminName;
    $('zoneMetric').textContent = selected.zone ? zoneName + ' · ' + formatDistance(selected.zone.distance) : u.noZone;
    $('stationMetric').textContent = stationName;
    $('centreMetric').textContent = formatDistance(distanceKm(selected.coords, CENTRE));
    $('airportMetric').textContent = formatDistance(distanceKm(selected.coords, AIRPORT));
    $('coordinateMetric').textContent = selected.coords[1].toFixed(4) + ', ' + selected.coords[0].toFixed(4);
    $('panelDetailsTitle').hidden = false;
    $('panelGrid').hidden = false;
    $('clearSelection').hidden = false;
    const collapsed = state.drawerCollapsed;
    $('v2ZoneDrawer').classList.toggle('is-collapsed', collapsed);
    $('panelIntro').hidden = collapsed;
    $('panelDetailsTitle').hidden = collapsed;
    $('panelGrid').hidden = collapsed;
    $('panelNote').hidden = collapsed;
    $('zoneBrief').hidden = collapsed && !isMobileViewport();
    $('clearSelection').hidden = collapsed;
    $('collapseDetails').hidden = collapsed;
    $('showDetails').hidden = !collapsed;
    $('closeDetails').hidden = false;
    renderZoneDrawer(selected.zone?.zone?.id);
    $('zoneBrief').hidden = collapsed && !isMobileViewport();
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
    $('v2ZoneDrawer').focus({ preventScroll: true });
  }

  function accordionShell(id, section, body) {
    return '<button type="button" class="accordion-summary" aria-expanded="false" aria-controls="' + id + '-body">' +
      '<span><strong class="accordion-title">' + escapeHtml(section.title) + '</strong><span class="accordion-description">' + escapeHtml(section.description) + '</span></span>' +
      '<span class="accordion-chevron" aria-hidden="true">⌄</span></button>' +
      '<div id="' + id + '-body" class="accordion-body">' + body + '</div>';
  }

  function renderHowTo() {
    const how = atlasCopy().howTo;
    if (!$('v2HowTo') || !how) return;
    const video = how.video || {};
    const videoHref = 'how-to.html?lang=' + (state.lang === 'tr' ? 'tr' : 'en');
    const videoLabel = video.linkLabel || (state.lang === 'tr' ? 'Haritayı nasıl kullanacağınızı izle' : 'Watch how to use the map');
    const videoLink = $('howToVideoLink');
    if (videoLink) {
      videoLink.setAttribute('href', videoHref);
      const videoLabelNode = $('howToVideoLabel');
      if (videoLabelNode) videoLabelNode.textContent = videoLabel;
    }
    $('v2HowTo').innerHTML = '<h2 id="howToTitle">' + escapeHtml(how.title) + '</h2><div><p>' + escapeHtml(how.intro) + '</p><div class="howto-steps">' +
      (how.steps || []).map((step, index) => '<div class="howto-step"><b>' + (index + 1) + '</b><span>' + escapeHtml(step) + '</span></div>').join('') + '</div></div>';
  }

  function renderTimeMachine() {
    const content = atlasCopy();
    const ui = content.ui || {};
    const story = ui.tmY?.[String(state.year)] || '';
    return '<div class="tool-grid"><div class="tool-card"><h3>' + escapeHtml(ui.tmTitle || 'Time machine') + '</h3><p>' + escapeHtml(content.sections.time.whatThisMeans) + '</p><div class="year-track"><output id="timeYearOutput">' + state.year + '</output><input id="timeYear" type="range" min="2026" max="2036" step="1" value="' + state.year + '" aria-label="Timeline year"></div><div class="tool-actions"><button type="button" class="primary-action" id="timePlay">' + escapeHtml(content.labels.play || 'Play the decade') + '</button><button type="button" class="secondary-action" id="zoneTourStart">' + escapeHtml(ui.tourBtn || '') + '</button></div></div><div class="year-story" id="timeStory"><strong>' + state.year + '</strong>' + escapeHtml(story) + '</div></div>';
  }

  function renderYearSliderHint() {
    const input = $('timeYear');
    const existing = input?.parentElement?.querySelector('.year-slider-hint');
    if (!input || existing) return;
    const text = atlasCopy().sections.time.yearSliderHint;
    if (!text) return;
    const hint = document.createElement('p');
    hint.className = 'year-slider-hint';
    hint.textContent = text;
    input.parentElement.appendChild(hint);
  }

  function renderScenarios() {
    const content = atlasCopy();
    const ui = content.ui || {};
    const current = state.scenarios;
    return '<div class="tool-grid"><div class="tool-card"><h3>' + escapeHtml(content.sections.scenarios.title) + '</h3><p>' + escapeHtml(content.sections.scenarios.whatThisMeans) + '</p>' +
      '<label>' + escapeHtml(ui.scOil || 'Oil money') + '<select id="scenarioOil"><option value="norm"' + (current.oil === 'norm' ? ' selected' : '') + '>' + escapeHtml(ui.scNorm || 'Normal') + '</option><option value="bad"' + (current.oil === 'bad' ? ' selected' : '') + '>' + escapeHtml(ui.scBad || 'Bad years') + '</option><option value="good"' + (current.oil === 'good' ? ' selected' : '') + '>' + escapeHtml(ui.scGood || 'Boom years') + '</option></select></label>' +
      '<label>' + escapeHtml(ui.scInfra || 'Metro & roads') + '<select id="scenarioInfra"><option value="on"' + (current.infra === 'on' ? ' selected' : '') + '>' + escapeHtml(ui.scOn || 'Built on time') + '</option><option value="late"' + (current.infra === 'late' ? ' selected' : '') + '>' + escapeHtml(ui.scLate || 'Years late') + '</option></select></label>' +
      '<label>' + escapeHtml(ui.scCur || 'Manat') + '<select id="scenarioCurrency"><option value="stable"' + (current.cur === 'stable' ? ' selected' : '') + '>' + escapeHtml(ui.scStable || 'Stays stable') + '</option><option value="weak"' + (current.cur === 'weak' ? ' selected' : '') + '>' + escapeHtml(ui.scWeak || 'Loses value') + '</option></select></label></div>' +
      '<div class="tool-card"><h3>' + escapeHtml(content.labels.sensitivity || 'Sensitivity, not a forecast') + '</h3><p id="scenarioOutput">' + escapeHtml(state.selected?.zone?.zone ? ((state.lang === 'tr' ? state.selected.zone.zone.nameTr : state.selected.zone.zone.nameEn) + ': ' + scenarioGrowth(state.selected.zone.zone) + '% illustrative growth sensitivity') : content.labels.noData) + '</p><div class="tool-note">' + escapeHtml(ui.scNoteWeak || content.labels.noAdvice) + '</div></div></div>';
  }

  function plannerBuyingText(zone, budget) {
    if (budget < Number(zone.mint || 0)) return 'Below rough entry point (' + formatMoney(zone.mint) + ')';
    const range = zone.med || [500, 1000];
    const mid = (Number(range[0]) + Number(range[1])) / 2;
    if (zone.kind === 'land') return 'Roughly ' + (budget / (mid * 100)).toFixed(1) + ' sot';
    return 'About ' + Math.max(1, Math.round(budget / mid)) + ' m² at the rough midpoint';
  }

  function formatMoney(value) {
    return '$' + Math.round(Number(value) || 0).toLocaleString(state.lang === 'tr' ? 'tr-TR' : 'en-US');
  }

  function plannerListHtml(budget) {
    return zones.slice().sort((a, b) => Number(a.mint || 0) - Number(b.mint || 0)).map(zone => '<div class="zone-result"><strong>' + escapeHtml(state.lang === 'tr' ? zone.nameTr : zone.nameEn) + '</strong><small>' + escapeHtml(plannerBuyingText(zone, budget)) + '</small></div>').join('');
  }

  function renderPlanner() {
    const content = atlasCopy();
    const ui = content.ui || {};
    const budget = Number(state.plannerBudget || 50000);
    const profiles = content.profiles || {};
    const profileLabels = { safe: ui.pr1T || 'Safer and easier to rent', patient: ui.pr2T || 'Patient land buyer', summer: ui.pr3T || 'Summer and investment', rent: ui.pr4T || 'Monthly rental income' };
    return '<div class="tool-grid"><div class="tool-card"><h3>' + escapeHtml(ui.planT || content.sections.planner.title) + '</h3><p>' + escapeHtml(ui.planL || content.sections.planner.description) + '</p><label>' + escapeHtml(content.labels.budget || 'My budget (USD)') + '<output id="budgetOutput">' + formatMoney(budget) + '</output><input id="budgetRange" type="range" min="5000" max="200000" step="5000" value="' + budget + '" aria-label="' + escapeHtml(content.labels.budget || 'My budget') + '"></label><label>Buyer profile<select id="profileSelect"><option value="">No profile</option>' + Object.keys(profiles).map(key => '<option value="' + key + '"' + (state.profile === key ? ' selected' : '') + '>' + escapeHtml(profileLabels[key]) + '</option>').join('') + '</select></label><p class="tool-note">' + escapeHtml(ui.budNote || content.sections.planner.whatThisMeans) + '</p></div><div class="tool-card"><h3>What this budget reaches</h3><div id="plannerResults" class="zone-result-list">' + plannerListHtml(budget) + '</div></div></div>';
  }

  function renderDealChecker() {
    const content = atlasCopy();
    const ui = content.ui || {};
    const selectedId = state.selected?.zone?.zone?.id || zones[0]?.id;
    return '<div class="tool-grid"><div class="tool-card"><h3>' + escapeHtml(ui.dealT || content.sections.deal.title) + '</h3><p>' + escapeHtml(ui.dealSub || content.sections.deal.description) + '</p><label>' + escapeHtml(ui.dZone || 'Area') + '<select id="dealZone">' + zones.map(zone => '<option value="' + zone.id + '"' + (zone.id === selectedId ? ' selected' : '') + '>' + escapeHtml(state.lang === 'tr' ? zone.nameTr : zone.nameEn) + '</option>').join('') + '</select></label><label>' + escapeHtml(content.labels.price || ui.dPrice || 'Asking price (USD)') + '<input id="dealPrice" type="number" min="0" inputmode="decimal" placeholder="e.g. 85000"></label><label>' + escapeHtml(content.labels.size || ui.dArea || 'Size (m²)') + '<input id="dealArea" type="number" min="1" inputmode="decimal" placeholder="e.g. 70"></label><div class="tool-actions"><button type="button" class="primary-action" id="dealCheck">' + escapeHtml(content.labels.check || ui.dGo || 'Check it') + '</button></div><div id="dealResult" class="tool-result" aria-live="polite"></div></div><div class="tool-card"><h3>How to read it</h3><p>' + escapeHtml(content.sections.deal.whatThisMeans) + '</p><div class="tool-note">' + escapeHtml(ui.dCaveat || content.labels.noAdvice) + '</div></div></div>';
  }

  function checkDeal() {
    const output = $('dealResult');
    const zone = zones.find(item => item.id === $('dealZone')?.value);
    const price = Number($('dealPrice')?.value);
    const area = Number($('dealArea')?.value);
    const ui = atlasCopy().ui || {};
    if (!output || !zone || !price || !area || price <= 0 || area <= 0) {
      if (output) output.innerHTML = '<p class="inline-warning">' + escapeHtml(ui.dNeed || 'Please fill in the price and the size.') + '</p>';
      return;
    }
    const perM2 = price / area;
    const range = zone.med || [500, 1000];
    let verdict = ui.dFair || 'That is a fair price for this area.';
    if (perM2 < range[0]) verdict = ui.dGood || 'That is below the usual range for this area.';
    if (perM2 > range[1]) verdict = ui.dHigh || 'That looks expensive for this area.';
    const growth = scenarioGrowth(zone);
    output.innerHTML = '<div class="year-story"><strong>' + escapeHtml(formatMoney(perM2) + ' / m²') + '</strong>' + escapeHtml(verdict) + '<br><small>' + escapeHtml((ui.dGrow || 'If the area grows as expected, this could be worth about') + ' ' + formatMoney(price * (1 + growth / 100)) + ' ' + (ui.dBy || 'by 2036.') + ' ' + (ui.dCaveat || 'Rough guide only.')) + '</small></div>';
  }

  function renderShortlist() {
    const article = $('accordion-shortlist');
    if (!article) return;
    const content = atlasCopy();
    const ids = Object.keys(state.shortlist).filter(id => zones.some(zone => zone.id === id));
    if (!ids.length) {
      article.dataset.shortlistBody = '<div class="shortlist-empty">' + escapeHtml(content.labels.noData || 'Star a place on the map and it will appear here.') + '</div>';
      return;
    }
    const total = ids.reduce((sum, id) => sum + (Number(state.shortlistAmounts[id]) || 0), 0);
    const rows = ids.map(id => {
      const zone = zones.find(item => item.id === id);
      const detail = zone[state.lang] || zone.en;
      return '<div class="shortlist-row"><strong>' + escapeHtml(state.lang === 'tr' ? zone.nameTr : zone.nameEn) + '</strong><span>' + escapeHtml(detail.now || '—') + '</span><span>' + escapeHtml(detail.yield || '—') + '</span><label><span class="sr-only">Amount</span><input type="number" min="0" placeholder="Amount" data-shortlist-amount="' + zone.id + '" value="' + (Number(state.shortlistAmounts[id]) || '') + '"></label></div>';
    }).join('');
    article.dataset.shortlistBody = '<div class="tool-card"><p>' + escapeHtml(content.labels.saved || 'Saved on this device') + ' · Total: ' + escapeHtml(formatMoney(total)) + '</p><div class="shortlist-table">' + rows + '</div><div class="tool-note">' + escapeHtml(content.labels.noAdvice || 'Not financial advice') + '</div></div>';
  }

  function evidenceLegend() {
    const labels = atlasCopy().labels || {};
    return '<div class="evidence-legend"><strong>' + escapeHtml(tr().evidenceLegend || 'How sure is this?') + '</strong><span><i class="legend-line operational"></i>' + escapeHtml(tr().builtLegend || 'Already built') + '</span><span><i class="legend-line contracted"></i>' + escapeHtml(tr().contractedLegend || 'Being built now') + '</span><span><i class="legend-line programmed"></i>' + escapeHtml(tr().programmedLegend || 'Government plan') + '</span><span><i class="legend-line private-plan"></i>' + escapeHtml(tr().privateLegend || 'Company promise') + '</span></div>';
  }

  function renderSources() {
    const content = atlasCopy();
    return '<div class="source-list">' + evidenceLegend() + '<p><strong>Geography:</strong> ' + escapeHtml('Baku and Absheron rayon polygons, local PMTiles basemap, and the offline place gazetteer in data/.') + '</p><p><strong>Projects:</strong> ' + escapeHtml('Built, funded, planned, and scenario-only labels are kept separate in the shared zone briefs. Planned lines and sensitivities must be verified before any purchase.') + '</p><p><strong>How to read the circles:</strong> ' + escapeHtml(content.sections.sources.whatThisMeans) + '</p><div class="disclaimer-box">' + escapeHtml(content.disclaimer) + '</div></div>';
  }

  function setAccordion(sectionId, forceOpen = false) {
    const target = sectionId ? document.getElementById(sectionId) : null;
    document.querySelectorAll('.v2-accordion').forEach(article => {
      const open = Boolean(target && article === target && (forceOpen || !article.classList.contains('open')));
      article.classList.toggle('open', open);
      const button = article.querySelector('.accordion-summary');
      if (button) button.setAttribute('aria-expanded', String(open));
    });
    state.openAccordion = target && target.classList.contains('open') ? sectionId : null;
  }

  function updatePlannerResults() {
    const budget = Number(state.plannerBudget || 50000);
    if ($('budgetOutput')) $('budgetOutput').textContent = formatMoney(budget);
    if ($('plannerResults')) $('plannerResults').innerHTML = plannerListHtml(budget);
  }

  function setBudget(value) {
    const budget = Math.max(5000, Math.min(200000, Number(value) || 50000));
    state.plannerBudget = budget;
    updatePlannerResults();
  }

  function setScenario(key, value) {
    if (!['oil', 'infra', 'cur'].includes(key)) return;
    state.scenarios[key] = value;
    renderAllContent();
    renderPanel();
  }

  function toggleTimeMachine() {
    const button = $('timePlay');
    if (state.timeTimer) {
      clearInterval(state.timeTimer);
      state.timeTimer = null;
      if (button) button.textContent = atlasCopy().labels.play || 'Play the decade';
      return;
    }
    if (button) button.textContent = atlasCopy().labels.pause || 'Pause';
    state.timeTimer = setInterval(() => {
      const next = state.year >= 2036 ? 2026 : state.year + 1;
      setYear(next);
      if (next === 2026 && state.timeTimer) { clearInterval(state.timeTimer); state.timeTimer = null; }
    }, reducedMotion ? 1100 : 760);
  }

  function wireContent() {
    document.querySelectorAll('.accordion-summary').forEach(button => button.addEventListener('click', () => setAccordion(button.closest('.v2-accordion').id)));
    $('timeYear')?.addEventListener('input', event => { pauseCityStory(); setYear(event.target.value); });
    $('timePlay')?.addEventListener('click', toggleTimeMachine);
    $('zoneTourStart')?.addEventListener('click', startTour);
    $('scenarioOil')?.addEventListener('change', event => setScenario('oil', event.target.value));
    $('scenarioInfra')?.addEventListener('change', event => setScenario('infra', event.target.value));
    $('scenarioCurrency')?.addEventListener('change', event => setScenario('cur', event.target.value));
    $('budgetRange')?.addEventListener('input', event => setBudget(event.target.value));
    $('profileSelect')?.addEventListener('change', event => { state.profile = event.target.value || null; updatePlannerResults(); });
    $('dealCheck')?.addEventListener('click', checkDeal);
    document.querySelectorAll('[data-shortlist-amount]').forEach(input => input.addEventListener('change', event => {
      state.shortlistAmounts[event.currentTarget.dataset.shortlistAmount] = Number(event.currentTarget.value) || 0;
      writeLocalObject('baku2036-v2-shortlist-amounts', state.shortlistAmounts);
      renderShortlist();
      renderAllContent();
    }));
  }

  function renderAllContent() {
    const preserveAccordion = state.openAccordion || document.querySelector('.v2-accordion.open')?.id || null;
    renderHowTo();
    const content = atlasCopy();
    const sections = content.sections;
    const articles = [
      ['accordion-time', sections.time, renderTimeMachine()],
      ['accordion-scenarios', sections.scenarios, renderScenarios()],
      ['accordion-planner', sections.planner, renderPlanner()],
      ['accordion-deal', sections.deal, renderDealChecker()],
      ['accordion-shortlist', sections.shortlist, ''],
      ['accordion-sources', sections.sources, renderSources()]
    ];
    renderShortlist();
    articles[4][2] = $('accordion-shortlist')?.dataset.shortlistBody || '<div class="shortlist-empty">' + escapeHtml(content.labels.noData || 'Star a place on the map and it will appear here.') + '</div>';
    articles.forEach(item => {
      const article = $(item[0]);
      if (article) article.innerHTML = accordionShell(item[0], item[1], item[2]);
    });
    renderYearSliderHint();
    wireContent();
    if (preserveAccordion) setAccordion(preserveAccordion, true);
  }
  function updateHash() {
    const params = new URLSearchParams();
    if (state.selected?.zone?.zone?.id) params.set('z', state.selected.zone.zone.id); else if (state.hashZone) params.set('z', state.hashZone);
    params.set('y', String(state.year)); params.set('lang', state.lang); params.set('heat', state.heat ? '1' : '0'); params.set('metro', state.metro ? '1' : '0');
    history.replaceState(null, '', `${location.pathname}${location.search}#${params.toString()}`);
  }

  function readHash() {
    const raw = location.hash.replace(/^#/, '');
    const params = new URLSearchParams(raw);
    if (fixedLanguage) state.lang = fixedLanguage;
    else if (params.get('lang') === 'tr' || params.get('lang') === 'en') state.lang = params.get('lang');
    const year = Number(params.get('y')); if (Number.isInteger(year) && year >= 2026 && year <= 2036) state.year = year;
    if (params.get('heat') === '1' || params.get('heat') === '0') state.heat = params.get('heat') === '1';
    if (params.get('metro') === '1' || params.get('metro') === '0') state.metro = params.get('metro') === '1';
    const zoneId = params.get('z'); if (zoneId) state.hashZone = zoneId;
  }

  function setLanguage(lang) {
    if (fixedLanguage) lang = fixedLanguage;
    if (!copy[lang]) return;
    state.lang = lang;
    const u = tr();
    document.documentElement.lang = lang === 'tr' ? 'tr' : 'en';
    $('appTitle').textContent = u.title; $('appSubtitle').textContent = u.subtitle; $('showMe').textContent = u.showMe || (state.lang === 'tr' ? '\u25b6 Göster (1 dakika)' : '\u25b6 Show me (1 minute)'); $('placeSearch').placeholder = u.search; $('searchLabel').textContent = u.searchLabel; $('yearLabel').textContent = u.year; $('skipMap').textContent = u.skip;
    $('rayonLegend').textContent = u.rayonBoundary; $('areaLegend').textContent = u.approxArea; $('metroLegend').textContent = u.metroLegend;
    $('evidenceLegend').textContent = u.evidenceLegend; $('builtLegend').textContent = u.builtLegend; $('contractedLegend').textContent = u.contractedLegend; $('programmedLegend').textContent = u.programmedLegend; $('privateLegend').textContent = u.privateLegend;
    $('clearSelection').textContent = u.clear;
    $('langEn')?.classList.toggle('active', lang === 'en'); $('langTr')?.classList.toggle('active', lang === 'tr');
    document.querySelector('[data-layer="admin"]').textContent = u.rayons; document.querySelector('[data-layer="investments"]').textContent = u.areas; document.querySelector('[data-layer="metro"]').textContent = u.metro; document.querySelector('[data-layer="heat"]').textContent = u.heat;
    document.querySelectorAll('[data-layer]').forEach(button => {
      const active = Boolean(state[button.dataset.layer]);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (state.ready) { updateLayers(); renderPanel(); }
    if (state.data) renderAllContent();
    if (state.cityStory.active) renderCityStory();
    if ($('tourOverlay')) renderTourStop();
    renderDataFreshness();
    updateHash();
  }

  function setYear(year) {
    const value = Number(year); if (!Number.isInteger(value) || value < 2026 || value > 2036) return;
    state.year = value; $('yearSelect').value = String(value); updateLayers(); renderPanel();
    if ($('timeYear')) $('timeYear').value = String(value);
    if ($('timeYearOutput')) $('timeYearOutput').textContent = String(value);
    if ($('timeStory')) $('timeStory').innerHTML = '<strong>' + value + '</strong>' + escapeHtml(atlasCopy().ui?.tmY?.[String(value)] || '');
    if (state.cityStory.active) {
      const checkpointIndex = cityStoryCheckpointIndex(value);
      if (checkpointIndex >= 0) state.cityStory.index = checkpointIndex;
      renderCityStory();
    }
    updateHash();
  }

  function toggleLayer(layer) {
    if (!['admin', 'investments', 'metro', 'heat'].includes(layer)) return;
    state[layer] = !state[layer];
    const button = document.querySelector(`[data-layer="${layer}"]`); button.classList.toggle('active', state[layer]); button.setAttribute('aria-pressed', String(state[layer]));
    updateLayers(); updateHash();
  }


  function setEngaged(value = true) {
    state.engaged = Boolean(value);
    document.body.classList.toggle('engaged', state.engaged);
    document.querySelectorAll('.quiet-controls').forEach(element => element.classList.toggle('is-visible', state.engaged));
    if (state.engaged && $('layerMenu')) $('layerMenu').hidden = false;
  }

  function toggleLayerMenu(force) {
    setEngaged(true);
    const button = $('layersToggle'); const menu = $('layerMenu');
    if (!button || !menu) return;
    const open = typeof force === 'boolean' ? force : !menu.classList.contains('open');
    menu.classList.toggle('open', open); button.setAttribute('aria-expanded', String(open));
  }

  function cityStoryCheckpointIndex(year) {
    const years = cityCheckpointYears();
    if (!years.length) return -1;
    let index = 0;
    for (let i = 0; i < years.length; i += 1) {
      if (years[i] <= year) index = i;
    }
    return index;
  }

  function cityStoryCaption(year) {
    const years = cityCheckpointYears();
    if (!years.length) return '';
    const checkpointYear = years[Math.max(0, cityStoryCheckpointIndex(year))];
    return atlasCopy().simulation?.checkpoints?.[String(checkpointYear)] || '';
  }

  function cityStoryProjectSummaryText(snapshot) {
    const labels = atlasCopy().labels || {};
    return (labels.whatHappening || 'What is happening?') + ': ' + [
      snapshot.doneProjects + ' ' + statusLabel('done'),
      snapshot.fundedProjects + ' ' + statusLabel('fund'),
      snapshot.plannedProjects + ' ' + statusLabel('plan')
    ].join(' · ');
  }

  function cityStoryEvidenceSummaryText(snapshot) {
    return (tr().evidenceLegend || 'How sure is this?') + ': ' + [
      snapshot.operationalEvidence + ' ' + evidenceStatusLabel('operational'),
      snapshot.contractedEvidence + ' ' + evidenceStatusLabel('contracted'),
      snapshot.programmedEvidence + ' ' + evidenceStatusLabel('programmed'),
      snapshot.privatePlanEvidence + ' ' + evidenceStatusLabel('private-plan')
    ].join(' · ');
  }

  function renderCityStory() {
    const host = $('cityStoryHost');
    if (!host) return;
    if (!state.cityStory.active) {
      host.innerHTML = '';
      return;
    }
    const controls = atlasCopy().simulation?.controls || {};
    const snapshot = citySimulationSnapshot(state.year);
    host.innerHTML = "<section id='cityStory' class='city-story' role='region' aria-live='polite' aria-label='" + escapeHtml(controls.progress || 'City story year') + "'" +
      " data-year='" + snapshot.year + "'" +
      " data-active-events='" + snapshot.activeEvents + "'" +
      " data-future-events='" + snapshot.futureEvents + "'" +
      " data-built-lines='" + snapshot.builtLines + "'" +
      " data-planned-lines='" + snapshot.plannedLines + "'" +
      " data-built-stations='" + snapshot.builtStations + "'" +
      " data-planned-stations='" + snapshot.plannedStations + "'" +
      " data-done-projects='" + snapshot.doneProjects + "'" +
      " data-funded-projects='" + snapshot.fundedProjects + "'" +
      " data-planned-projects='" + snapshot.plannedProjects + "'" +
      " data-operational-evidence='" + snapshot.operationalEvidence + "'" +
      " data-contracted-evidence='" + snapshot.contractedEvidence + "'" +
      " data-programmed-evidence='" + snapshot.programmedEvidence + "'" +
      " data-private-plan-evidence='" + snapshot.privatePlanEvidence + "'>" +
      "<div class='city-story-head'><span class='city-story-kicker'>" + escapeHtml(controls.progress || 'City story year') + "</span><strong class='city-story-year'>" + snapshot.year + "</strong></div>" +
      "<p id='cityStoryCaption'>" + escapeHtml(cityStoryCaption(snapshot.year)) + "</p>" +
      "<p class='city-story-summary' id='cityStoryProjectSummary'>" + escapeHtml(cityStoryProjectSummaryText(snapshot)) + "</p>" +
      "<p class='city-story-summary' id='cityStoryEvidenceSummary'>" + escapeHtml(cityStoryEvidenceSummaryText(snapshot)) + "</p>" +
      "<div class='city-story-actions'><button type='button' class='secondary-action' id='cityStoryPause' aria-pressed='" + String(!state.cityStory.paused) + "'>" + escapeHtml((state.cityStory.paused ? controls.resume : controls.pause) || '') + "</button><button type='button' class='secondary-action' id='cityStorySkip'>" + escapeHtml(controls.skip || '') + "</button><button type='button' class='primary-action' id='cityStoryFinish'>" + escapeHtml(controls.finish || '') + "</button></div>" +
      "</section>";
    $('cityStoryPause')?.addEventListener('click', () => state.cityStory.paused ? resumeCityStory() : pauseCityStory());
    $('cityStorySkip')?.addEventListener('click', skipCityStory);
    $('cityStoryFinish')?.addEventListener('click', finishCityStory);
  }

  function clearCityStoryTimer() {
    if (state.cityStory.timer) {
      clearTimeout(state.cityStory.timer);
      state.cityStory.timer = null;
    }
  }

  function scheduleCityStoryTimer() {
    clearCityStoryTimer();
    if (!state.cityStory.active || state.cityStory.paused) return;
    const years = cityCheckpointYears();
    if (state.cityStory.index >= years.length - 1) return;
    state.cityStory.timer = setTimeout(() => {
      state.cityStory.timer = null;
      skipCityStory();
    }, CITY_STORY_INTERVAL_MS);
  }

  function startCityStory() {
    if (!state.data) return;
    finishTour();
    finishCityStory();
    setEngaged(true);
    const years = cityCheckpointYears();
    state.cityStory.active = years.length > 0;
    state.cityStory.paused = false;
    state.cityStory.index = Math.max(0, cityStoryCheckpointIndex(state.year));
    if (years.length) {
      setYear(years[state.cityStory.index]);
      renderCityStory();
      scheduleCityStoryTimer();
    }
  }

  function pauseCityStory() {
    if (!state.cityStory.active) return;
    clearCityStoryTimer();
    state.cityStory.paused = true;
    renderCityStory();
  }

  function resumeCityStory() {
    if (!state.cityStory.active) return;
    state.cityStory.paused = false;
    scheduleCityStoryTimer();
    renderCityStory();
  }

  function skipCityStory() {
    const years = cityCheckpointYears();
    if (!years.length) return;
    clearCityStoryTimer();
    state.cityStory.index = Math.min(state.cityStory.index + 1, years.length - 1);
    setYear(years[state.cityStory.index]);
    state.cityStory.paused = state.cityStory.index >= years.length - 1;
    renderCityStory();
    scheduleCityStoryTimer();
  }

  function finishCityStory() {
    clearCityStoryTimer();
    state.cityStory.active = false;
    state.cityStory.paused = false;
    state.cityStory.index = 0;
    renderCityStory();
    if (state.map) state.map.resize();
  }

  function renderTourStop() {
    const ui = atlasCopy().ui || {}; const stopId = state.tourStops[state.tourIndex];
    const zone = zones.find(item => item.id === stopId); if (zone) selectZone(stopId, false);
    const overlay = $('tourOverlay'); if (!overlay) return;
    const name = zone ? (state.lang === 'tr' ? zone.nameTr : zone.nameEn) : '';
    const story = ui.tour?.[stopId] || '';
    const last = state.tourIndex >= state.tourStops.length - 1;
    overlay.innerHTML = '<div class="tour-card"><div class="tour-kicker">' + escapeHtml(ui.tourStop || 'Stop') + ' ' + (state.tourIndex + 1) + ' / ' + state.tourStops.length + '</div><h2>' + escapeHtml(name) + '</h2><p>' + escapeHtml(story) + '</p><button type="button" class="primary-action" data-tour-next>' + escapeHtml(last ? (ui.tourEnd || 'Explore the map') : 'Next') + '</button><button type="button" class="tour-close" data-tour-close>' + escapeHtml(ui.tourExit || 'Close tour') + '</button></div>';
    overlay.querySelector('[data-tour-next]')?.addEventListener('click', () => { if (last) finishTour(); else { state.tourIndex += 1; renderTourStop(); } });
    overlay.querySelector('[data-tour-close]')?.addEventListener('click', finishTour);
  }

  function startTour() {
    if (!state.data) return;
    finishCityStory(); setEngaged(true); state.tourIndex = 0;
    let overlay = $('tourOverlay');
    if (!overlay) { overlay = document.createElement('div'); overlay.id = 'tourOverlay'; overlay.className = 'tour-overlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); document.body.appendChild(overlay); }
    renderTourStop();
  }

  function finishTour() { $('tourOverlay')?.remove(); if (state.map) state.map.resize(); }

  function installControls() {
    $('showMe')?.addEventListener('click', startCityStory); $('layersToggle')?.addEventListener('click', () => toggleLayerMenu());
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { toggleLayerMenu(false); finishCityStory(); finishTour(); } });
    document.querySelectorAll('.quiet-controls').forEach(element => element.addEventListener('focusin', () => setEngaged(true)));
    $('langEn')?.addEventListener('click', () => { setEngaged(true); setLanguage('en'); }); $('langTr')?.addEventListener('click', () => { setEngaged(true); setLanguage('tr'); });
    $('yearSelect').addEventListener('focus', () => setEngaged(true)); $('yearSelect').addEventListener('change', event => { setEngaged(true); pauseCityStory(); setYear(event.target.value); });
    $('placeSearch').addEventListener('focus', () => setEngaged(true)); $('placeSearch').addEventListener('input', event => { pauseCityStory(); renderSearchResults(event.target.value); });
    $('placeSearch').addEventListener('keydown', event => { if (event.key === 'Escape') { $('searchResults').hidden = true; event.target.blur(); } if (event.key === 'Enter') { const first = searchPlaces(event.target.value)[0]; if (first) choosePlace(first); } });
    const clearSelection = () => { pauseCityStory(); state.selected = null; state.hashZone = null; renderPanel(); updateSelectionGeometry(); updateHash(); $('v2ZoneDrawer').focus({ preventScroll: true }); };
    const collapseDetails = () => { if (!state.selected) return; state.drawerCollapsed = true; renderPanel(); $('showDetails').focus({ preventScroll: true }); };
    const showDetails = () => { if (!state.selected) return; state.drawerCollapsed = false; renderPanel(); $('collapseDetails').focus({ preventScroll: true }); };
    $('clearSelection').addEventListener('click', clearSelection); $('closeDetails').addEventListener('click', clearSelection); $('collapseDetails').addEventListener('click', collapseDetails); $('showDetails').addEventListener('click', showDetails);
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
      state.ready = true; setMapStatus('ready', tr().ready); $('yearSelect').value = String(state.year);
      updateLayers(); renderPanel();
      state.map.on('click', event => identifyLocation(event.lngLat, event.point));
      ['investment-zones', 'metro-stations', 'admin-fill', 'city-events-active', 'city-events-future'].forEach(layer => { state.map.on('mouseenter', layer, () => { state.map.getCanvas().style.cursor = 'pointer'; }); state.map.on('mouseleave', layer, () => { state.map.getCanvas().style.cursor = ''; }); });
      if (state.hashZone) selectZone(state.hashZone, false); else state.map.fitBounds(BBOX, { padding: 50, duration: 0 });
    });
    state.map.on('error', event => { if (event?.error) console.warn('Baku v2 map error', event.error); });
  }

  async function loadData() {
    const [admin, metro, places, zonesData, content] = await Promise.all(['data/admin-absheron.geojson', 'data/metro.json', 'data/places.json', 'data/zones.json?rev=b35a571', 'data/content.json?rev=b35a571'].map(path => fetch(path).then(response => { if (!response.ok) throw new Error(path); return response.json(); })));
    state.data = { admin, metro, places, zones: zonesData, content };
    hydrateZones(zonesData);
    if (state.hashZone && !zones.some(zone => zone.id === state.hashZone)) { state.hashZone = null; updateHash(); }
    return state.data;
  }

  async function boot() {
    if ($('skipMap')) $('skipMap').href = `${location.pathname}#v2ZoneDrawer`;
    readHash();
    if (!state.controlsInstalled) { installControls(); state.controlsInstalled = true; }
    setLanguage(state.lang); setMapStatus('loading', tr().loading);
    try {
      const data = await loadData();
      renderDataFreshness();
      loadLocalState();
      renderAllContent();
      const maplibregl = window.__V3MapLibre;
      if (maplibregl) installMap(maplibregl, data); else window.addEventListener('v3-maplibre-ready', () => installMap(window.__V3MapLibre, data), { once: true });
    } catch (error) { console.error(error); finishCityStory(); setMapStatus('error', error?.code === 'zone-data-validation' ? tr().validation : tr().error); }
  }

  window.distanceKm = distanceKm;
  window.distanceRing = distanceRing;
  window.identifyLocation = identifyLocation;
  window.searchPlaces = searchPlaces;
  window.setYear = setYear;
  window.setLang = setLanguage;
  window.startTour = startTour;
  window.toggleLayerMenu = toggleLayerMenu;
  boot();
})();
