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
  await expect(page.locator('#closeDetails')).toHaveText('Close details');
  await page.locator('#closeDetails').click();
  await expect(page.locator('#zoneBrief')).toBeHidden();
  await expect(page.locator('#panelGrid')).toBeHidden();
  await expect(page.locator('#closeDetails')).toBeHidden();
  await expect(page.locator('#panelTitle')).toHaveText('Tap a circle to see what’s coming');
  await page.goto('./?cache=e2e-zone-reopen#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await expect(page.locator('#closeDetails')).toHaveText('Close details');
});

test('selected drawer can collapse, reopen, and close in both languages', async ({ page }) => {
  await page.goto('./?cache=e2e-drawer-collapse#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#closeDetails')).toHaveText('Detayları kapat');
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
  await expect(page.locator('#closeDetails')).toHaveText('Close details');
  await page.locator('#collapseDetails').click();
  await expect(page.locator('#showDetails')).toHaveText('Show details');
  await page.locator('#showDetails').click();
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await page.locator('#closeDetails').click();
  await expect(page.locator('#panelTitle')).toHaveText('Tap a circle to see what’s coming');
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
test('click-to-identify returns a district and metro distance', async ({ page }) => {
  await page.goto('./?cache=e2e-identify#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  const map = page.locator('#v2Map canvas');
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.locator('#rayonMetric')).not.toHaveText('—');
  await expect(page.locator('#stationMetric')).toHaveText(/\d+(\.\d+)?\s*(m|km)/);
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
