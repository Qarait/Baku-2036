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

test('root loads a rendered map without browser errors', async ({ page }) => {
  await page.goto('/?cache=e2e-root');
  await waitForMap(page);
  await expect(page).toHaveTitle(/understand property geography/);
  await expect(page.locator('#v2Map')).toHaveAttribute('aria-label', /Interactive Baku/);
});

test('one-minute tour runs through its stops and exits', async ({ page }) => {
  await page.goto('/?cache=e2e-tour');
  await waitForMap(page);
  await page.getByRole('button', { name: '▶ Show me (1 minute)' }).click();
  await expect(page.locator('#tourOverlay')).toBeVisible();
  for (let stop = 0; stop < 5; stop += 1) {
    await page.locator('#tourOverlay [data-tour-next]').click();
  }
  await expect(page.locator('#tourOverlay')).toHaveCount(0);
});

test('year control advances the selected map year', async ({ page }) => {
  await page.goto('/?cache=e2e-year#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#yearSelect').selectOption('2030');
  await expect(page.locator('#yearSelect')).toHaveValue('2030');
  await expect(page).toHaveURL(/#z=whitecity&y=2030&lang=en/);
  await expect(page.locator('#panelIntro')).toContainText('2030');
});

test('zone selection shows JSON-backed content and proof cards', async ({ page }) => {
  await page.goto('/?cache=e2e-zone#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await expect(page.locator('#zoneBrief')).toContainText('$2,500–4,000/m² new-build');
  await expect(page.locator('#zoneBrief')).toContainText('+140% scenario');
  await expect(page.locator('#zoneBrief')).toContainText('How sure is this?');
});

test('EN and TR switch visible map language', async ({ page }) => {
  await page.goto('/?cache=e2e-language');
  await waitForMap(page);
  await engage(page);
  await page.locator('#langTr').click();
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
  await expect(page.locator('#stationMetricLabel')).toContainText('kuş uçuşu');
  await page.locator('#langEn').click();
  await expect(page.locator('#rayonLegend')).toHaveText('District borders');
});

test('deal checker returns a verdict', async ({ page }) => {
  await page.goto('/?cache=e2e-deal#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#accordion-deal .accordion-summary').click();
  await page.locator('#dealPrice').fill('200000');
  await page.locator('#dealArea').fill('70');
  await page.locator('#dealCheck').click();
  await expect(page.locator('#dealResult')).not.toBeEmpty();
  await expect(page.locator('#dealResult')).toContainText(/rough|price|range|deal/i);
});

test('deep link opens the correct zone, year, and language', async ({ page }) => {
  await page.goto('/?cache=e2e-deep-link#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await expect(page.locator('#panelIntro')).toContainText('2030');
  await expect(page.locator('#yearSelect')).toHaveValue('2030');
  await expect(page.locator('#rayonLegend')).toHaveText('İlçe sınırları');
  await expect(page).toHaveURL(/#z=whitecity&y=2030&lang=tr/);
});

test('all five runtime data files load as JSON', async ({ request }) => {
  for (const file of dataFiles) {
    const response = await request.get(`/data/${file}`);
    expect(response.ok(), `${file} status ${response.status()}`).toBeTruthy();
    await expect(response.json(), `${file} must contain valid JSON`).resolves.toBeTruthy();
  }
});

test('click-to-identify returns a district and metro distance', async ({ page }) => {
  await page.goto('/?cache=e2e-identify#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  const map = page.locator('#v2Map canvas');
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(page.locator('#rayonMetric')).not.toHaveText('—');
  await expect(page.locator('#stationMetric')).toHaveText(/\d+(\.\d+)?\s*(m|km)/);
});

test('360px toolbar stays on one row and collapses to Layers', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/?cache=e2e-mobile');
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
