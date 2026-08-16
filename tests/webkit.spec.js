const { test, expect } = require('@playwright/test');

async function waitForMap(page) {
  await expect(page.locator('#v2Map canvas')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#mapStatus')).toHaveText(/Click a location|Coğrafyayı/, { timeout: 30000 });
}

test('WebKit loads the map without browser errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`); });
  await page.goto('./?cache=webkit-map#lang=en');
  await waitForMap(page);
  expect(errors).toEqual([]);
});

test('WebKit loads both fixed language entry points without asset errors', async ({ page }) => {
  for (const entry of [
    { path: '/en/', hash: '#lang=tr', lang: 'en', legend: 'District borders' },
    { path: '/tr/', hash: '#lang=en', lang: 'tr', legend: 'İlçe sınırları' }
  ]) {
    const errors = [];
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`);
    });
    await page.goto(`${entry.path}?cache=webkit-fixed-${entry.lang}${entry.hash}`);
    await waitForMap(page);
    await expect(page.locator('html')).toHaveAttribute('lang', entry.lang);
    await expect(page.locator('#rayonLegend')).toHaveText(entry.legend);
    await expect(page.locator('.language-switch')).toHaveCount(0);
    expect(errors).toEqual([]);
  }
});

test('WebKit keeps the bilingual drawer collapse flow usable', async ({ page }) => {
  await page.goto('./?cache=webkit-drawer#z=whitecity&y=2030&lang=tr');
  await waitForMap(page);
  await expect(page.locator('#panelTitle')).toHaveText('White City / Xətai');
  await page.locator('#collapseDetails').click();
  await expect(page.locator('#v2ZoneDrawer')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#showDetails')).toHaveText('Ayrıntıları göster');
  await page.locator('#showDetails').click();
  await expect(page.locator('#zoneBrief')).toBeVisible();
  await page.locator('#langTr').focus();
  await expect(page.locator('body')).toHaveClass(/engaged/);
  await page.locator('#langEn').click();
  await expect(page.locator('#closeDetails')).toHaveText('Close details');
  await page.locator('#closeDetails').click();
  await expect(page.locator('#panelTitle')).toHaveText('Tap a circle to see what’s coming');
});

test('WebKit keeps the 390px safe-area and touch layout usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./?cache=webkit-mobile#z=whitecity&y=2026&lang=en');
  await waitForMap(page);
  await page.locator('#layersToggle').evaluate(element => element.click());
  await expect(page.locator('#layerMenu')).toHaveClass(/open/);
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).toContain('viewport-fit=cover');
  const selectors = [
    '.search-box', '#langEn', '#langTr', '.map-button:not(.layer-button):not(#layersToggle)', '#layersToggle',
    '.layer-menu .layer-button', '#collapseDetails', '#closeDetails', '.drawer-action', '#clearSelection'
  ];
  const sizes = await page.locator(selectors.join(', ')).evaluateAll(elements => elements
    .filter(element => !element.hidden && element.offsetParent !== null && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden')
    .map(element => {
      const box = element.getBoundingClientRect();
      return { id: element.id || element.className, width: Math.round(box.width), height: Math.round(box.height) };
    }));
  expect(sizes.filter(size => size.width < 44 || size.height < 44)).toEqual([]);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBeTruthy();
});
