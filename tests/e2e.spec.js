const { test, expect } = require('@playwright/test');

const dataFiles = [
  'admin-absheron.geojson',
  'metro.json',
  'places.json',
  'zones.json',
  'content.json'
];

async function waitForMap(page) {
  await expect(page.locator('#v2Map canvas')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#mapStatus')).toHaveText(/Click a location|Coğrafyayı/, { timeout: 30000 });
}

async function engage(page) {
  await page.locator('#langTr').focus();
  await expect(page.locator('body')).toHaveClass(/engaged/);
}

test.beforeEach(async ({ page }) => {
  const browserErrors = [];
  page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  page.on('response', response => { if (response.status() >= 400) browserErrors.push(`http ${response.status()}: ${response.url()}`); });
  page.on('close', () => { page.__browserErrors = browserErrors; });
  page.__browserErrors = browserErrors;
});

test.afterEach(async ({ page }) => {
  expect(page.__browserErrors, page.__browserErrors?.join('\n')).toEqual([]);
});

test('root loads a rendered map and tour starts without browser errors', async ({ page }) => {
  await page.goto('./?cache=e2e-root');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await expect(page.locator('#cityStory')).toBeVisible();
  await expect(page).toHaveTitle(/understand property geography/);
  await expect(page.locator('#v2Map')).toHaveAttribute('aria-label', /Interactive Baku/);
});

test('mobile intro exposes the how-to video before the map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?cache=e2e-howto-top');
  await waitForMap(page);
  const link = page.locator('.brand #howToVideoLink');
  await expect(link).toBeVisible();
  const positions = await page.evaluate(() => {
    const linkBox = document.querySelector('.brand #howToVideoLink')?.getBoundingClientRect();
    const mapBox = document.querySelector('#v2Map')?.getBoundingClientRect();
    return { linkBottom: linkBox?.bottom || 0, mapTop: mapBox?.top || 0 };
  });
  expect(positions.linkBottom).toBeLessThanOrEqual(positions.mapTop);
});

test('basemap attribution is visible and links to the OSM copyright page', async ({ page }) => {
  await page.goto('./?cache=e2e-attribution');
  await waitForMap(page);
  const control = page.locator('.maplibregl-ctrl-attrib-inner');
  await expect(control).toContainText('OpenStreetMap contributors');
  await expect(control.locator('a[href="https://www.openstreetmap.org/copyright"]')).toHaveCount(1);
  await expect(page.locator('#attributionNote')).toContainText('Geofabrik');
  await expect(page.locator('#attributionNote a[href="https://www.openstreetmap.org/copyright"]')).toHaveCount(1);
});

test('one-minute tour runs through its stops and exits', async ({ page }) => {
  await page.goto('./?cache=e2e-tour');
  await waitForMap(page);
  await page.locator('#accordion-time .accordion-summary').click();
  await expect(page.locator('#zoneTourStart')).toBeVisible();
  await page.locator('#zoneTourStart').click();
  await expect(page.locator('#tourOverlay')).toBeVisible();
  for (let stop = 0; stop < 5; stop += 1) {
    await page.locator('#tourOverlay [data-tour-next]').click();
  }
  await expect(page.locator('#tourOverlay')).toHaveCount(0);
});

test('Show me starts the Baku-wide city story', async ({ page }) => {
  await page.goto('./?cache=e2e-city-story');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await expect(page.locator('#cityStory')).toBeVisible();
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2026');
  await expect(page.locator('#cityStoryCaption')).toContainText('Start here');
});

test('city story can pause, continue, skip, and finish', async ({ page }) => {
  await page.goto('./?cache=e2e-city-controls');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await page.locator('#cityStoryPause').click();
  await expect(page.locator('#cityStoryPause')).toHaveText('Continue');
  await page.locator('#cityStoryPause').click();
  await expect(page.locator('#cityStoryPause')).toHaveText('Pause');
  await page.locator('#cityStorySkip').click();
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2028');
  await page.locator('#cityStoryFinish').click();
  await expect(page.locator('#cityStory')).toHaveCount(0);
  await expect(page.locator('#yearSelect')).toHaveValue('2028');
});

test('dragging the year updates the city story caption and map snapshot', async ({ page }) => {
  await page.goto('./?cache=e2e-city-manual#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await page.locator('#yearSelect').selectOption('2033');
  await expect(page.locator('#cityStory')).toHaveAttribute('data-year', '2033');
  await expect(page.locator('#cityStoryCaption')).toContainText('story spreads');
});

test('city story controls and caption switch to Turkish', async ({ page }) => {
  await page.goto('./?cache=e2e-city-tr#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await page.locator('#langTr').click();
  await expect(page.locator('#cityStoryPause')).toHaveText('Duraklat');
  await expect(page.locator('#cityStoryCaption')).toContainText('Buradan başlayın');
});

test('time machine wraps from 2036 and resets its button to Play', async ({ page }) => {
  await page.goto('./?cache=e2e-time-wrap#y=2036&lang=en');
  await waitForMap(page);
  await page.locator('#accordion-time .accordion-summary').click();
  await expect(page.locator('#timeYear')).toHaveValue('2036');
  await page.locator('#timePlay').click();
  await expect(page.locator('#timeYear')).toHaveValue('2026', { timeout: 5000 });
  await expect(page.locator('#timePlay')).toHaveText('Play the decade');
});

test('time machine, city story, and tour playback cannot run concurrently', async ({ page }) => {
  await page.goto('./?cache=e2e-playback-exclusive#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await expect(page.locator('#cityStory')).toBeVisible();
  await page.locator('#accordion-time .accordion-summary').click();
  await page.locator('#timePlay').click();
  await expect(page.locator('#cityStory')).toHaveCount(0);
  await expect(page.locator('#timePlay')).toHaveText('Pause');
  await page.locator('#zoneTourStart').click();
  await expect(page.locator('#tourOverlay')).toBeVisible();
  await expect(page.locator('#timePlay')).toHaveText('Play the decade');
});

test('city simulation data failure is visible and retryable', async ({ page }) => {
  let failContent = true;
  await page.route('**/data/content.json*', route => failContent ? route.fulfill({ status: 503, body: 'temporary failure' }) : route.continue());
  await page.goto('./?cache=e2e-city-error#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText('couldn’t load');
  await expect(page.locator('#mapStatus')).toContainText('refresh');
  await expect(page.locator('#retryData')).toBeVisible();
  failContent = false;
  await page.locator('#retryData').click();
  await expect(page.locator('#mapStatus')).toContainText('Click a location', { timeout: 30000 });
  page.__browserErrors = [];
});

test('missing MapLibre reports a retryable map error instead of loading forever', async ({ page }) => {
  await page.route('**/vendor/maplibre-gl.mjs', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'throw new Error("simulated missing MapLibre");' }));
  await page.goto('./?cache=e2e-maplibre-missing#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/, { timeout: 15000 });
  await expect(page.locator('#mapStatus')).toContainText('couldn’t load');
  await expect(page.locator('#retryData')).toBeVisible();
  await expect(page.locator('#mapStatus')).not.toContainText('Loading map data');
  page.__browserErrors = [];
});

test('missing PMTiles reports a retryable map error instead of loading forever', async ({ page }) => {
  await page.route('**/vendor/pmtiles.js', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await page.goto('./?cache=e2e-pmtiles-missing#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/, { timeout: 15000 });
  await expect(page.locator('#mapStatus')).toContainText('couldn’t load');
  await expect(page.locator('#retryData')).toBeVisible();
  await expect(page.locator('#mapStatus')).not.toContainText('Loading map data');
  page.__browserErrors = [];
});

test('PMTiles basemap failure reports an error instead of ready', async ({ page }) => {
  let failBasemap = true;
  await page.route('**/assets/baku-absheron.pmtiles*', route => failBasemap ? route.fulfill({ status: 503, body: 'temporary basemap failure' }) : route.continue());
  await page.goto('./?cache=e2e-pmtiles-failure#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/, { timeout: 30000 });
  await expect(page.locator('#mapStatus')).toContainText('couldn’t load');
  await expect(page.locator('#retryData')).toBeVisible();
  await expect(page.locator('#mapStatus')).not.toContainText('Click a location');
  failBasemap = false;
  page.__browserErrors = [];
  await page.locator('#retryData').click();
  await expect(page.locator('#mapStatus')).toContainText('Click a location', { timeout: 30000 });
});

test('deep-linked zone remains selectable after the city story finishes', async ({ page }) => {
  await page.goto('./?cache=e2e-city-regression#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Göster (1 dakika)' }).click();
  await page.locator('#cityStoryFinish').click();
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#yearSelect')).toHaveValue('2030');
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
});

test('city snapshot changes with the selected year', async ({ page }) => {
  await page.goto('./?cache=e2e-city-snapshot#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  const story = page.locator('#cityStory');
  await expect(story).toHaveAttribute('data-year', '2026');
  const firstActive = await story.getAttribute('data-active-events');
  const firstFuture = await story.getAttribute('data-future-events');
  const firstBuiltLines = await story.getAttribute('data-built-lines');
  const firstPlannedLines = await story.getAttribute('data-planned-lines');
  await page.locator('#cityStorySkip').click();
  await page.locator('#cityStorySkip').click();
  await expect(story).toHaveAttribute('data-year', '2030');
  const laterActive = await story.getAttribute('data-active-events');
  const laterFuture = await story.getAttribute('data-future-events');
  const laterBuiltLines = await story.getAttribute('data-built-lines');
  const laterPlannedLines = await story.getAttribute('data-planned-lines');
  expect(laterActive).not.toBe(firstActive);
  expect(laterFuture).not.toBe(firstFuture);
  expect(laterBuiltLines).not.toBe(firstBuiltLines);
  expect(laterPlannedLines).not.toBe(firstPlannedLines);
  await expect(page.locator('#cityStoryCaption')).not.toBeEmpty();
});

test('city event selection shows a localized event label in the panel', async ({ page }) => {
  await page.goto('./?cache=e2e-city-event#y=2026&lang=en');
  await waitForMap(page);
  await page.evaluate(() => window.identifyLocation({ lng: 49.807, lat: 40.397 }, null, { includeNearbyEvent: true }));
  await expect(page.locator('#panelIntro')).toContainText('opens');
  await engage(page);
  await page.locator('#langTr').click();
  await expect(page.locator('#panelIntro')).toContainText('açılıyor');
});

test('city snapshot includes project and evidence status counts', async ({ page }) => {
  await page.goto('./?cache=e2e-city-snapshot-status#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  const story = page.locator('#cityStory');
  await expect(story).toHaveAttribute('data-funded-projects', /[1-9]\d*/);
  await expect(story).toHaveAttribute('data-planned-projects', /[1-9]\d*/);
  await expect(story).toHaveAttribute('data-programmed-evidence', /[1-9]\d*/);
  await expect(page.locator('#cityStoryProjectSummary')).toContainText('Planned');
  await expect(page.locator('#cityStoryEvidenceSummary')).toContainText('Government plan');
});
test('year control advances the selected map year', async ({ page }) => {
  await page.goto('./?cache=e2e-year#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#yearSelect').selectOption('2030');
  await expect(page.locator('#yearSelect')).toHaveValue('2030');
  await expect(page).toHaveURL(/#z=whitecity&y=2030&lang=en/);
  await expect(page.locator('#panelIntro')).toContainText('2030');
});

test('growth layers use price growth and year progress', async ({ page }) => {
  await page.goto('./?cache=e2e-growth-layer&testHooks=1#y=2026&lang=en');
  await waitForMap(page);

  const atBaseline = await page.evaluate(() => window.__V3TestHooks.getLayerFeatures());
  const baselineInvestment = id => atBaseline.investments.find(feature => feature.id === id);
  const baselineHeat = id => atBaseline.heat.find(feature => feature.id === id);

  expect(baselineInvestment('whitecity')).toMatchObject({ growthPct: 140, radius: 15, yearProgress: 0 });
  expect(baselineHeat('bilgah').growthPct).toBe(150);
  expect(baselineHeat('bilgah').radius).toBeGreaterThan(baselineHeat('sabail').radius);
  expect(baselineHeat('bilgah').color).not.toBe(baselineHeat('sabail').color);

  await page.locator('#yearSelect').selectOption('2036');
  const at2036 = await page.evaluate(() => window.__V3TestHooks.getLayerFeatures());
  const futureInvestment = id => at2036.investments.find(feature => feature.id === id);

  expect(futureInvestment('whitecity').yearProgress).toBe(1);
  expect(futureInvestment('whitecity').radius).toBeGreaterThan(baselineInvestment('whitecity').radius);
  expect(futureInvestment('bilgah').radius / baselineInvestment('bilgah').radius)
    .toBeGreaterThan(futureInvestment('sabail').radius / baselineInvestment('sabail').radius);
});

test('deep-linked zone refreshes the scenario tool with its selected output', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-selection#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#accordion-scenarios .accordion-summary').click();
  await expect(page.locator('#scenarioOutput')).toContainText('White City');
  await expect(page.locator('#scenarioOutput')).not.toContainText('Start by choosing a place');
});

test('data freshness and year slider explanation are clear in both languages', async ({ page }) => {
  await page.goto('./?cache=e2e-clarity#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#dataFreshness')).toContainText('Data checked');
  await expect(page.locator('#dataFreshness')).toContainText('Scenario baseline');
  await page.locator('#accordion-time .accordion-summary').click();
  await expect(page.locator('.year-slider-hint')).toContainText('circles grow');
  await engage(page);
  await page.locator('#langTr').click();
  await expect(page.locator('#dataFreshness')).toContainText('Veriler');
  await expect(page.locator('.year-slider-hint')).toContainText('daireler');
});

test('clear JSON-load error message tells visitors to refresh', async ({ page }) => {
  await page.route('**/data/zones.json?rev=b35a571', route => route.fulfill({ status: 503, body: 'temporary failure' }));
  await page.goto('./?cache=e2e-data-error#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText('couldn’t load');
  await expect(page.locator('#mapStatus')).toContainText('refresh');
  await page.goto('./?cache=e2e-data-error-tr#lang=tr');
  await expect(page.locator('#mapStatus')).toContainText('yenileyin');
  page.__browserErrors = [];
});
test('zone selection shows JSON-backed content and proof cards', async ({ page }) => {
  await page.goto('./?cache=e2e-zone#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await expect(page.locator('#zoneBrief')).toContainText('$2,500–4,000/m² new-build');
  await expect(page.locator('#zoneBrief')).toContainText('+140% scenario');
  await expect(page.locator('#zoneBrief')).toContainText('How sure is this?');
  await expect(page.locator('#zoneBrief')).toContainText('Where this comes from:');
});

test('zone details can be closed and reopened', async ({ page }) => {
  await page.goto('./?cache=e2e-zone-close#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#closeDetails')).toBeVisible();
  await expect(page.locator('#closeDetails')).toHaveText('Close');
  await page.locator('#closeDetails').click();
  await expect(page.locator('#zoneBrief')).toBeHidden();
  await expect(page.locator('#panelGrid')).toBeHidden();
  await expect(page.locator('#closeDetails')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('Tap a circle to see what’s coming');
  await page.goto('./?cache=e2e-zone-reopen#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await expect(page.locator('#closeDetails')).toHaveText('Close');
});

test('selected drawer can collapse, reopen, and close in both languages', async ({ page }) => {
  await page.goto('./?cache=e2e-drawer-collapse#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#closeDetails')).toHaveText('Kapat');
  await page.locator('#collapseDetails').click();
  await expect(page.locator('#v2ZoneDrawer')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#zoneBrief')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#showDetails')).toHaveText('Ayrıntıları göster');
  await page.locator('#showDetails').click();
  await expect(page.locator('#v2ZoneDrawer')).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await engage(page);
  await page.locator('#langEn').click();
  await expect(page.locator('#closeDetails')).toHaveText('Close');
  await page.locator('#collapseDetails').click();
  await expect(page.locator('#showDetails')).toHaveText('Show details');
  await page.locator('#showDetails').click();
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await page.locator('#closeDetails').click();
  await expect(page.locator('#panelTitle')).toHaveText('Tap a circle to see what’s coming');
});

test('mobile selected place starts concise and can reveal full details', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?cache=e2e-mobile-summary#z=whitecity&y=2030&lang=en');
  await waitForMap(page);

  await expect(page.locator('#v2ZoneDrawer')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#zoneQuickSummary')).toBeVisible();
  await expect(page.locator('#zoneQuickSummary')).toContainText('Current price');
  await expect(page.locator('#zoneQuickSummary')).toContainText('$2,500–4,000/m² new-build');
  await expect(page.locator('#zoneQuickSummary')).toContainText('Possible upside under this scenario');
  await expect(page.locator('#zoneQuickSummary')).toContainText('+140%');
  await expect(page.locator('#zoneQuickSummary')).toContainText('Main risk');
  await expect(page.locator('#zoneQuickSummary')).toContainText('Evidence strength');
  await expect(page.locator('#panelDetailsTitle')).toBeHidden();
  await expect(page.locator('#panelGrid')).toBeHidden();
  await expect(page.locator('#zoneDetailContent')).toBeHidden();
  await expect(page.locator('#showDetails')).toHaveText('Show details');
  await expect(page.locator('#closeDetails')).toHaveText('Close');

  await page.locator('#showDetails').click();
  await expect(page.locator('#v2ZoneDrawer')).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('#panelDetailsTitle')).toHaveText('Location details');
  await expect(page.locator('#panelGrid .metric')).toHaveCount(6);
  await expect(page.locator('#zoneDetailContent')).toBeVisible();
  await expect(page.locator('.evidence-section')).toBeVisible();
  await expect(page.locator('#zoneDetailContent')).toContainText('What could go wrong?');
});

test('zone source insight switches to Turkish', async ({ page }) => {
  await page.goto('./?cache=e2e-zone-insight#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await engage(page);
  await page.locator('#langTr').click();
  await expect(page.locator('#zoneBrief')).toContainText('Bu rakamın kaynağı:');
  await expect(page.locator('#zoneBrief')).toContainText('garanti değildir');
});

test('EN and TR switch visible map language', async ({ page }) => {
  await page.goto('./?cache=e2e-language');
  await waitForMap(page);
  await engage(page);
  await page.locator('#langTr').click();
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
  await expect(page.locator('#stationMetricLabel')).toContainText('kuş uçuşu');
  await page.locator('#langEn').click();
  await expect(page.locator('#rayonLegend')).toHaveText('District borders');
});

test('fixed language entry points stay separated', async ({ page }) => {
  await page.goto('./en/?cache=e2e-fixed-en#lang=tr');
  await waitForMap(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#rayonLegend')).toHaveText('District borders');
  await expect(page.locator('.language-switch')).toHaveCount(0);
  await expect(page.locator('#howToVideoLink')).toHaveAttribute('href', 'how-to.html?lang=en');
  await expect(page.locator('#howToVideoLink').evaluate(link => link.href)).resolves.toMatch(/\/how-to\.html\?lang=en$/);

  await page.goto('./tr/?cache=e2e-fixed-tr#lang=en');
  await waitForMap(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
  await expect(page.locator('.language-switch')).toHaveCount(0);
  await expect(page.locator('#howToVideoLink')).toHaveAttribute('href', 'how-to.html?lang=tr');
  await expect(page.locator('#howToVideoLink').evaluate(link => link.href)).resolves.toMatch(/\/how-to\.html\?lang=tr$/);
});

test('silent how-to walkthrough attachment opens a localized video page', async ({ page }) => {
  await page.goto('./?cache=e2e-howto-video');
  await waitForMap(page);
  const link = page.locator('#howToVideoLink');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
  await expect(link).toHaveAttribute('href', 'how-to.html?lang=en');
  await engage(page);
  await page.locator('#langTr').click();
  await expect(link).toHaveAttribute('href', 'how-to.html?lang=tr');

  await page.goto('./how-to.html?lang=tr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.locator('#howToPageTitle')).toHaveText('Harita nasıl kullanılır?');
  const video = page.locator('#howToVideo');
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute('controls', '');
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveAttribute('preload', 'metadata');
  await expect(video).not.toHaveAttribute('autoplay', '');
  await expect(video.locator('track')).toHaveCount(0);
  const duration = await video.evaluate(element => new Promise((resolve, reject) => {
    const finish = () => Number.isFinite(element.duration) && element.duration > 0 ? resolve(element.duration) : reject(new Error('video duration is not available'));
    if (element.readyState >= 1) finish();
    else {
      element.addEventListener('loadedmetadata', finish, { once: true });
      element.addEventListener('error', () => reject(new Error('video failed to load')), { once: true });
    }
  }));
  expect(duration).toBeLessThanOrEqual(20);
});

test('deal checker returns a verdict', async ({ page }) => {
  await page.goto('./?cache=e2e-deal#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#accordion-deal .accordion-summary').click();
  await page.locator('#dealPrice').fill('200000');
  await page.locator('#dealArea').fill('70');
  await page.locator('#dealCheck').click();
  await expect(page.locator('#dealResult')).not.toBeEmpty();
  await expect(page.locator('#dealResult')).toContainText(/rough|price|range|deal/i);
});

test('deep link opens the correct zone, year, and language', async ({ page }) => {
  await page.goto('./?cache=e2e-deep-link#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#panelIntro')).toContainText('2030');
  await expect(page.locator('#yearSelect')).toHaveValue('2030');
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
  await expect(page).toHaveURL(/#z=whitecity&y=2030&lang=tr/);
});

test('all five runtime data files load as JSON', async ({ request }) => {
  for (const file of dataFiles) {
    const response = await request.get(`./data/${file}`);
    expect(response.ok(), `${file} status ${response.status()}`).toBeTruthy();
    await expect(response.json(), `${file} must contain valid JSON`).resolves.toBeTruthy();
  }
});

test('city simulation content has five bilingual checkpoints and controls', async ({ request }) => {
  const response = await request.get('./data/content.json');
  const content = await response.json();
  const years = ['2026', '2028', '2030', '2033', '2036'];
  for (const language of ['en', 'tr']) {
    expect(Object.keys(content[language].simulation.checkpoints)).toEqual(years);
    for (const year of years) expect(content[language].simulation.checkpoints[year]).not.toBe('');
    for (const key of ['pause', 'resume', 'skip', 'finish', 'progress']) {
      expect(content[language].simulation.controls[key]).not.toBe('');
    }
  }
});

test('all zones declare explicit scenario growth values', async ({ request }) => {
  const response = await request.get('./data/zones.json');
  const zones = await response.json();
  expect(zones).toHaveLength(16);
  for (const zone of zones) expect(zone.growthPct, `${zone.id} must declare growthPct`).toEqual(expect.any(Number));
  expect(Object.fromEntries(zones.map(zone => [zone.id, zone.growthPct]))).toMatchObject({ zikh: 130, mohammadi: 150, alat: 120 });
});

test('scenario calculator uses the explicit growth value for Zikh', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-growth#z=zikh&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#panelTitle')).toHaveText('Zikh (Zığ)');
  await expect(page.locator('#zoneBrief')).toContainText('+130% tracks Hovsan');
  await page.locator('#accordion-scenarios .accordion-summary').click();
  await page.locator('#scenarioOil').selectOption('bad');
  await expect(page.locator('#scenarioOutput')).toContainText('Zikh (Zığ): 105%');
});

test('weak manat scenario changes the illustrative USD sensitivity', async ({ page }) => {
  await page.goto('./?cache=e2e-scenario-currency#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#accordion-scenarios .accordion-summary').click();
  await expect(page.locator('#scenarioOutput')).toContainText('White City / Khatai: 140%');
  await page.locator('#scenarioCurrency').selectOption('weak');
  await expect(page.locator('#scenarioOutput')).toContainText('White City / Khatai: 110%');
  await expect(page.locator('#scenarioOutput')).not.toContainText('White City / Khatai: 140%');
  await expect(page.locator('#accordion-scenarios .tool-note')).toContainText('20% illustrative USD-value adjustment');
  await page.locator('#scenarioCurrency').selectOption('stable');
  await expect(page.locator('#scenarioOutput')).toContainText('White City / Khatai: 140%');
});

test('Zikh deal checker uses the explicit scenario growth in its dollar output', async ({ page }) => {
  async function checkDeal(expected) {
    await page.locator('#accordion-deal .accordion-summary').click();
    await page.locator('#dealZone').selectOption('zikh');
    await page.locator('#dealPrice').fill('60000');
    await page.locator('#dealArea').fill('100');
    await page.locator('#dealCheck').click();
    await expect(page.locator('#dealResult')).toContainText(expected);
  }

  await page.goto('./?cache=e2e-zikh-deal#z=zikh&y=2026&lang=en');
  await waitForMap(page);
  await checkDeal('$138,000');

  await page.locator('#accordion-scenarios .accordion-summary').click();
  await page.locator('#scenarioOil').selectOption('bad');
  await checkDeal('$123,000');

  await page.locator('#accordion-scenarios .accordion-summary').click();
  await page.locator('#scenarioOil').selectOption('norm');
  await page.locator('#scenarioInfra').selectOption('late');
  await checkDeal('$117,000');
});

test('a valid seventeenth zone still hydrates the investment layer', async ({ page }) => {
  await page.route('**/data/zones.json*', async route => {
    const response = await route.fetch();
    const zones = await response.json();
    zones.push({ ...zones[0], id: 'test-seventeenth-zone', coords: [49.81, 40.39] });
    await route.fulfill({ json: zones });
  });
  await page.goto('./?cache=e2e-seventeenth-zone');
  await waitForMap(page);
  await page.locator('#accordion-deal .accordion-summary').click();
  await expect(page.locator('#dealZone option')).toHaveCount(17);
});

test('an empty zone payload surfaces localized validation copy and logs its diagnostic', async ({ page }) => {
  const diagnostics = [];
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.push(message.text());
  });
  await page.route('**/data/zones.json*', route => route.fulfill({ json: [] }));
  await page.goto('./?cache=e2e-empty-zones#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText(/validate the map data/i);
  expect(diagnostics.join('\n')).toContain('received 0');
  page.__browserErrors = [];

  await page.goto('./?cache=e2e-empty-zones-tr#lang=tr');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText(/doğrulayamadık/i);
  await expect(page.locator('#mapStatus')).not.toContainText('Zone data validation failed');
  page.__browserErrors = [];
});

test('malformed administrative data fails validation before map startup', async ({ page }) => {
  await page.route('**/data/admin-absheron.geojson*', route => route.fulfill({ json: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: null, properties: {} }] } }));
  await page.goto('./?cache=e2e-invalid-admin#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText(/validate the map data/i);
  await expect(page.locator('#v2Map canvas')).toHaveCount(0);
  await expect(page.locator('#retryData')).toBeVisible();
  page.__browserErrors = [];
});

test('malformed metro data fails validation before map startup', async ({ page }) => {
  await page.route('**/data/metro.json*', route => route.fulfill({ json: { lines: [], stations: [] } }));
  await page.goto('./?cache=e2e-invalid-metro#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText(/validate the map data/i);
  await expect(page.locator('#v2Map canvas')).toHaveCount(0);
  await expect(page.locator('#retryData')).toBeVisible();
  page.__browserErrors = [];
});

test('malformed place data fails validation before map startup', async ({ page }) => {
  await page.route('**/data/places.json*', route => route.fulfill({ json: [{ id: 'broken-place', nameEn: 'Broken place', nameTr: 'Broken place', type: 'town', coords: ['not-a-number', 40.4], source: 'test' }] }));
  await page.goto('./?cache=e2e-invalid-places#lang=en');
  await expect(page.locator('#mapStatus')).toHaveClass(/error/);
  await expect(page.locator('#mapStatus')).toContainText(/validate the map data/i);
  await expect(page.locator('#v2Map canvas')).toHaveCount(0);
  await expect(page.locator('#retryData')).toBeVisible();
  page.__browserErrors = [];
});

test('Turkish entry fallback remains valid UTF-8 when content omits it', async ({ page }) => {
  await page.route('**/data/content.json*', async route => {
    const response = await route.fetch();
    const content = await response.json();
    delete content.tr.ui.entry;
    await route.fulfill({ json: content });
  });
  await page.goto('./?cache=e2e-tr-entry-fallback#z=whitecity&lang=tr');
  await waitForMap(page);
  await expect(page.locator('#zoneBrief')).toContainText('Bugünkü giriş');
  await expect(page.locator('#zoneBrief')).not.toContainText('Bug?nk? giri?');
});

test('city snapshot exposes the current project and evidence status totals', async ({ page }) => {
  await page.goto('./?cache=e2e-city-status-totals#y=2026&lang=en');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  const story = page.locator('#cityStory');
  await expect(story).toHaveAttribute('data-done-projects', '14');
  await expect(story).toHaveAttribute('data-funded-projects', '10');
  await expect(story).toHaveAttribute('data-planned-projects', '23');
  await expect(story).toHaveAttribute('data-operational-evidence', '9');
  await expect(story).toHaveAttribute('data-contracted-evidence', '2');
  await expect(story).toHaveAttribute('data-programmed-evidence', '6');
  await expect(story).toHaveAttribute('data-private-plan-evidence', '2');
});

test('selected city-event labels remain visible in English and Turkish', async ({ page }) => {
  await page.goto('./?cache=e2e-city-event-label#y=2027&lang=en');
  await waitForMap(page);
  await page.evaluate(() => window.identifyLocation({ lng: 49.8282314, lat: 40.3937251 }, null, { includeNearbyEvent: true }));
  await expect(page.locator('#panelIntro')).toContainText('Metro B-4 station (Purple Line) opens');
  await page.locator('#langTr').evaluate(button => button.click());
  await expect(page.locator('#panelIntro')).toContainText('Metro B-4 istasyonu (Mor Hat) açılıyor');
});

test('metro story, station sources, and route labels stay consistent', async ({ page }) => {
  await page.goto('./?cache=e2e-metro-consistency&testHooks=1#y=2026&lang=en');
  await waitForMap(page);
  const sourceData = await page.evaluate(async () => {
    const [metro, content] = await Promise.all([
      fetch('data/metro.json').then(response => response.json()),
      fetch('data/content.json').then(response => response.json())
    ]);
    return {
      metro,
      b4Event: content.en.events.find(event => event.en.includes('Metro B-4'))
    };
  });
  const plannedB4 = sourceData.metro.stations.find(station => station.id === 'plan-b-4');
  expect(sourceData.b4Event.y).toBe(plannedB4.builtYear);
  expect(sourceData.b4Event.ll).toEqual(plannedB4.coords);
  expect(sourceData.metro.lines.every(line => line.status === 'planned' && line.source === 'Baku 2036 scenario layer')).toBeTruthy();
  await expect(page.locator('#metroLegend')).toContainText('scenario');

  const metro = await page.evaluate(() => window.__V3TestHooks.getMetroFeatures(2026));
  expect(metro.activeStations.some(station => station.id === 'plan-b-4')).toBeFalsy();
  const imported = metro.stations.find(station => station.id.startsWith('osm-'));
  expect(imported.line).toBe('unclassified');
  expect(imported.color).toBe('#64748b');
  const planned = metro.stations.find(station => station.id === 'plan-b-4');
  expect(planned.color).toBe('#7d3c98');
  expect(metro.lines.every(line => line.status === 'planned' && line.source === 'Baku 2036 scenario layer')).toBeTruthy();
});

test('click-to-identify returns a district and metro distance', async ({ page }) => {
  await page.goto('./?cache=e2e-identify#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  const map = page.locator('#v2Map canvas');
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.locator('#rayonMetric')).not.toHaveText('—');
  await expect(page.locator('#stationMetric')).toHaveText(/\d+(\.\d+)?\s*(m|km)/);
});

test('nearest metro and year snapshots exclude future duplicate stations', async ({ page }) => {
  await page.goto('./?cache=e2e-metro-timeline#y=2026&lang=en');
  await waitForMap(page);
  await page.evaluate(() => window.identifyLocation({ lng: 49.94, lat: 40.47 }, null));
  await expect(page.locator('#stationMetric')).toHaveText('Koroğlu metro stansiyası · 5.8 km');

  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  const story = page.locator('#cityStory');
  await expect(story).toHaveAttribute('data-built-stations', '30');
  await expect(story).toHaveAttribute('data-planned-stations', '5');
  await page.locator('#cityStoryFinish').click();
  await page.locator('#yearSelect').selectOption('2030');
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await expect(page.locator('#cityStory')).toHaveAttribute('data-built-stations', '33');
  await expect(page.locator('#cityStory')).toHaveAttribute('data-planned-stations', '2');
});

test('buyer profile separates unaffordable matches from reachable planner results', async ({ page }) => {
  await page.goto('./?cache=e2e-buyer-profile#lang=en');
  await waitForMap(page);
  await page.locator('#accordion-planner .accordion-summary').click();
  await page.locator('#profileSelect').selectOption('safe');
  await expect(page.locator('#budgetOutput')).toHaveText('$25,000');
  await expect(page.locator('#budgetRange')).toHaveValue('25000');
  await expect(page.locator('#plannerResults .zone-result')).toHaveCount(2);
  await expect(page.locator('#plannerResults')).toContainText('Lokbatan');
  await expect(page.locator('#plannerResults')).toContainText('Khirdalan');
  await expect(page.locator('#plannerResults')).not.toContainText('Khojasan');
  await expect(page.locator('#plannerOutOfReach')).toContainText('Khojasan');
  await expect(page.locator('#plannerOutOfReach')).toContainText('$40,000');
  await expect(page.locator('#plannerResults')).not.toContainText('White City');
  await expect(page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('baku2036-v2-shortlist') || '{}')).sort())).resolves.toEqual(['khirdalan', 'khojasan', 'lokbatan']);
});

test('land planner output explains its rough midpoint estimate', async ({ page }) => {
  await page.goto('./?cache=e2e-buyer-profile-land#lang=en');
  await waitForMap(page);
  await page.locator('#accordion-planner .accordion-summary').click();
  await page.locator('#profileSelect').selectOption('summer');
  await expect(page.locator('#plannerResults')).toContainText('Roughly 0.6 sot');
  await expect(page.locator('#plannerResults')).toContainText('rough midpoint estimate');
  await expect(page.locator('#plannerResults')).toContainText('not a guaranteed purchasable plot');
});

test('360px toolbar stays on one row and collapses to Layers', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./?cache=e2e-mobile');
  await waitForMap(page);
  await engage(page);
  await expect(page.locator('#layersToggle')).toBeVisible();
  await expect(page.locator('#layerMenu')).toBeHidden();
  const layout = await page.locator('#mapToolbar').evaluate(element => {
    const style = getComputedStyle(element);
    return { flexWrap: style.flexWrap, width: element.getBoundingClientRect().width, scrollWidth: element.scrollWidth };
  });
  expect(layout.flexWrap).toBe('nowrap');
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
});

test('mobile zone details use one page scroll and reach their final action', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./?cache=e2e-mobile-scroll#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await expect(page.locator('#zoneQuickSummary')).toBeVisible();
  await page.locator('#showDetails').click();
  await expect(page.locator('#zoneDetailContent')).toBeVisible();
  const layout = await page.locator('#v2ZoneDrawer').evaluate(element => {
    const drawer = element.getBoundingClientRect();
    const stageElement = document.querySelector('.map-stage');
    const stage = stageElement?.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      hasStage: Boolean(stageElement),
      position: style.position,
      overflowY: style.overflowY,
      drawerTop: drawer.top,
      stageBottom: stage?.bottom || 0,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight
    };
  });
  expect(layout.hasStage).toBeTruthy();
  expect(layout.position).toBe('relative');
  expect(layout.overflowY).toBe('visible');
  expect(layout.drawerTop).toBeGreaterThanOrEqual(layout.stageBottom);
  await page.locator('#clearSelection').scrollIntoViewIfNeeded();
  await expect(page.locator('#clearSelection')).toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.scrollY > 0)).toBeTruthy();
});

test('mobile controls expose 44px touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?cache=e2e-touch-targets#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#layersToggle').evaluate(element => element.click());
  await expect(page.locator('#layerMenu')).toHaveClass(/open/);
  const selectors = [
    '.search-box', '.search-result', '#langEn', '#langTr', '.map-button:not(.layer-button):not(#layersToggle)', '#layersToggle',
    '.layer-menu .layer-button', '#collapseDetails', '#closeDetails', '.drawer-action', '#clearSelection',
    '.show-me', '.primary-action', '.secondary-action', '.city-story-actions button', '.tour-close', '#timeYear', '.howto-video-link'
  ];
  const sizes = await page.locator(selectors.join(', ')).evaluateAll(elements => elements
    .filter(element => !element.hidden && element.offsetParent !== null && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden')
    .map(element => {
      const box = element.getBoundingClientRect();
      return { id: element.id || element.className, width: Math.round(box.width), height: Math.round(box.height) };
    }));
  const undersized = sizes.filter(size => size.width < 44 || size.height < 44);
  expect(undersized, JSON.stringify(sizes)).toEqual([]);
});

test('mobile metadata remains readable without enlarging primary headings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?cache=e2e-mobile-type#z=whitecity&y=2026&lang=tr');
  await waitForMap(page);
  await page.locator('#showDetails').click();
  await expect(page.locator('#zoneDetailContent')).toBeVisible();
  const sizes = await page.evaluate(() => {
    const read = selector => Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
    return {
      metricLabel: read('.metric span'),
      drawerMetricLabel: read('.brief-metric small'),
      drawerTier: read('.brief-tier'),
      evidenceMeta: read('.evidence-card-head'),
      mapLegend: read('.map-legend'),
      dataFreshness: read('.data-freshness'),
      panelTitle: read('#panelTitle'),
      drawerTitle: read('.brief-head h3')
    };
  });
  expect(sizes).toMatchObject({
    metricLabel: 10,
    drawerMetricLabel: 10,
    drawerTier: 10,
    evidenceMeta: 10,
    mapLegend: 11,
    dataFreshness: 10,
    panelTitle: 22,
    drawerTitle: 19
  });
});
