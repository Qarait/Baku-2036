const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const RESOURCE_CATEGORIES = ['data', 'pmtiles', 'glyph', 'script', 'stylesheet', 'other'];

function summarizeRuns(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return { count: 0, median: null, p90: null, min: null, max: null };
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  const p90 = sorted[Math.ceil(sorted.length * 0.9) - 1];
  return { count: sorted.length, median, p90, min: sorted[0], max: sorted.at(-1) };
}

function classifyResource(url, initiatorType) {
  const value = String(url || '').toLowerCase();
  const initiator = String(initiatorType || '').toLowerCase();
  if (value.includes('/data/')) return 'data';
  if (value.includes('baku-absheron.pmtiles') || /\.pmtiles(?:[?#]|$)/.test(value)) return 'pmtiles';
  if (value.includes('/glyphs/') || /\.pbf(?:[?#]|$)/.test(value)) return 'glyph';
  if (initiator === 'script' || /\.(?:m?js)(?:[?#]|$)/.test(value)) return 'script';
  if (initiator === 'link' && /\.css(?:[?#]|$)/.test(value)) return 'stylesheet';
  if (/\.css(?:[?#]|$)/.test(value)) return 'stylesheet';
  return 'other';
}

function parseArgs(argv) {
  const options = { browser: 'chromium', cache: 'cold', runs: 1 };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) throw new Error('Unexpected argument: ' + key);
    if (value === undefined || value.startsWith('--')) throw new Error('Missing value for ' + key);
    options[key.slice(2)] = value;
    index += 1;
  }
  options.runs = Number(options.runs);
  if (!['chromium', 'webkit'].includes(options.browser)) throw new Error('--browser must be chromium or webkit');
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error('--runs must be a positive integer');
  if (!['cold', 'warm'].includes(options.cache)) throw new Error('--cache must be cold or warm');
  if (!options.url) throw new Error('--url is required');
  if (!options.output) throw new Error('--output is required');
  return options;
}

function markByName(marks, name) {
  return marks.find(mark => mark.name === name) || null;
}

function durationBetween(marks, startName, endName) {
  const start = markByName(marks, startName);
  const end = markByName(marks, endName);
  return start && end ? end.timeMs - start.timeMs : null;
}

function summarizeResources(resources) {
  return Object.fromEntries(RESOURCE_CATEGORIES.map(category => {
    const entries = resources.filter(resource => resource.category === category);
    const sum = key => entries.reduce((total, entry) => total + (Number.isFinite(entry[key]) ? Math.max(0, entry[key]) : 0), 0);
    return [category, {
      count: entries.length,
      totalTransferSize: sum('transferSize'),
      totalEncodedBodySize: sum('encodedBodySize'),
      totalDecodedBodySize: sum('decodedBodySize'),
      totalDuration: sum('duration')
    }];
  }));
}

async function measurePage(page, url) {
  const responses = [];
  page.on('response', response => {
    const length = Number(response.headers()['content-length']);
    responses.push({ url: response.url(), status: response.status(), contentLength: Number.isFinite(length) ? length : null });
  });
  await page.addInitScript(() => {
    window.__bakuLcpEntries = [];
    try {
      new PerformanceObserver(list => {
        window.__bakuLcpEntries.push(...list.getEntries().map(entry => entry.startTime));
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
  });
  await waitForMapReady(page, url);
  await page.waitForTimeout(250);

  const browserTimings = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint');
    const resources = performance.getEntriesByType('resource').map(entry => ({
      url: entry.name,
      initiatorType: entry.initiatorType,
      startTime: entry.startTime,
      responseStart: entry.responseStart,
      responseEnd: entry.responseEnd,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize
    }));
    return {
      ttfbMs: navigation ? navigation.responseStart - navigation.startTime : null,
      fcpMs: firstContentfulPaint?.startTime ?? null,
      lcpMs: window.__bakuLcpEntries?.at(-1) ?? null,
      marks: window.__bakuPerformance?.marks || [],
      performanceMarkNames: performance.getEntriesByType('mark').map(entry => entry.name),
      resources
    };
  });

  const marks = browserTimings.marks;
  const resources = browserTimings.resources.map(resource => ({ ...resource, category: classifyResource(resource.url, resource.initiatorType) }));
  const successfulResponses = responses.filter(response => response.status >= 200 && response.status < 400);
  const contentLengths = successfulResponses.map(response => response.contentLength).filter(Number.isFinite);
  const adminResponse = successfulResponses.find(response => /admin-absheron\.geojson/.test(response.url));
  const phaseTimings = {
    mapReadyMs: markByName(marks, 'boot-ready')?.timeMs ?? null,
    dataFetchMs: durationBetween(marks, 'data-fetch-start', 'data-fetch-end'),
    hydrationMs: durationBetween(marks, 'data-fetch-end', 'data-hydrated'),
    adminCentroidsMs: durationBetween(marks, 'admin-centroids-start', 'admin-centroids-end'),
    styleBuildMs: durationBetween(marks, 'style-build-start', 'style-build-end'),
    mapConstructorMs: durationBetween(marks, 'map-constructor-start', 'map-constructor-end'),
    mapLoadAfterConstructorMs: durationBetween(marks, 'map-constructor-end', 'map-load'),
    mapLoadMs: markByName(marks, 'map-load')?.timeMs ?? null,
    dataWaitPreprocessingMs: durationBetween(marks, 'data-fetch-start', 'map-constructor-start')
  };

  return {
    ttfbMs: browserTimings.ttfbMs,
    fcpMs: browserTimings.fcpMs,
    lcpMs: browserTimings.lcpMs,
    ...phaseTimings,
    marks,
    performanceMarkNames: browserTimings.performanceMarkNames,
    resources,
    resourceSummary: summarizeResources(resources),
    adminContentLength: adminResponse?.contentLength ?? null,
    totalContentLength: contentLengths.reduce((sum, length) => sum + length, 0),
    responseCount: successfulResponses.length
  };
}

async function waitForMapReady(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Click a location|Coğrafyayı/.test(document.getElementById('mapStatus')?.textContent || ''), null, { timeout: 30000 });
}

async function runMeasurement(options) {
  const browserType = options.browser === 'webkit' ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const runs = [];
  let warmContext;
  try {
    if (options.cache === 'warm') {
      warmContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const primePage = await warmContext.newPage();
      await waitForMapReady(primePage, options.url);
      await primePage.close();
    }
    for (let index = 0; index < options.runs; index += 1) {
      const context = options.cache === 'warm'
        ? warmContext
        : await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      runs.push(await measurePage(page, options.url));
      await page.close();
      if (options.cache === 'cold') await context.close();
    }
  } finally {
    await warmContext?.close();
    await browser.close();
  }
  const metricKeys = [
    'ttfbMs', 'fcpMs', 'lcpMs', 'mapReadyMs', 'dataFetchMs', 'hydrationMs',
    'adminCentroidsMs', 'styleBuildMs', 'mapConstructorMs', 'mapLoadAfterConstructorMs',
    'mapLoadMs', 'dataWaitPreprocessingMs', 'adminContentLength', 'totalContentLength'
  ];
  return {
    generatedAt: new Date().toISOString(),
    url: options.url,
    browser: options.browser,
    cache: options.cache,
    runs,
    summaries: Object.fromEntries(metricKeys.map(key => [key, summarizeRuns(runs.map(run => run[key]))]))
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runMeasurement(options);
  await fs.mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
  await fs.writeFile(options.output, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify(result.summaries, null, 2) + '\n');
}

if (require.main === module) main().catch(error => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});

module.exports = { classifyResource, parseArgs, runMeasurement, summarizeRuns };
