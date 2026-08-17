const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

function summarizeRuns(values) {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (!sorted.length) return { count: 0, median: null, min: null, max: null };
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return { count: sorted.length, median, min: sorted[0], max: sorted.at(-1) };
}

function parseArgs(argv) {
  const options = { browser: 'chromium', cache: 'cold', runs: 1 };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
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
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => /Click a location|Coğrafyayı/.test(document.getElementById('mapStatus')?.textContent || ''), null, { timeout: 30000 });
  await page.waitForTimeout(250);
  const timings = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const firstContentfulPaint = paint.find(entry => entry.name === 'first-contentful-paint');
    return {
      ttfbMs: navigation ? navigation.responseStart - navigation.startTime : null,
      fcpMs: firstContentfulPaint?.startTime ?? null,
      lcpMs: window.__bakuLcpEntries?.at(-1) ?? null,
      mapReadyMs: performance.now()
    };
  });
  const successfulResponses = responses.filter(response => response.status >= 200 && response.status < 400);
  const contentLengths = successfulResponses.map(response => response.contentLength).filter(Number.isFinite);
  const adminResponse = successfulResponses.find(response => /admin-absheron\.geojson/.test(response.url));
  return {
    ...timings,
    adminContentLength: adminResponse?.contentLength ?? null,
    totalContentLength: contentLengths.reduce((sum, length) => sum + length, 0),
    responseCount: successfulResponses.length
  };
}

async function runMeasurement(options) {
  const browserType = options.browser === 'webkit' ? webkit : chromium;
  const browser = await browserType.launch({ headless: true });
  const runs = [];
  let warmContext;
  try {
    for (let index = 0; index < options.runs; index += 1) {
      const context = options.cache === 'warm' ? (warmContext ||= await browser.newContext({ viewport: { width: 390, height: 844 } })) : await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      runs.push(await measurePage(page, options.url));
      await page.close();
      if (options.cache === 'cold') await context.close();
    }
  } finally {
    await warmContext?.close();
    await browser.close();
  }
  const metricKeys = ['ttfbMs', 'fcpMs', 'lcpMs', 'mapReadyMs', 'adminContentLength', 'totalContentLength'];
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
  await fs.writeFile(options.output, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result.summaries, null, 2)}\n`);
}

if (require.main === module) main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

module.exports = { parseArgs, runMeasurement, summarizeRuns };
