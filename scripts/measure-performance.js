const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { chromium, webkit } = require('playwright');

const PROFILES = {
  native: { latency: 0, downloadThroughput: -1, uploadThroughput: -1, cpuRate: 1 },
  mobile: { latency: 150, downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8, cpuRate: 4 }
};
function summarizeRuns(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { count: 0, median: null, p90: null, min: null, max: null };
  const middle = Math.floor(sorted.length / 2);
  return { count: sorted.length, median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p90: sorted[Math.ceil(sorted.length * .9) - 1], min: sorted[0], max: sorted.at(-1) };
}
function parseArgs(argv) {
  const options = { browser: 'chromium', cache: 'cold', runs: 10, profile: 'native', timeout: 90000 };
  const allowed = ['browser', 'cache', 'runs', 'profile', 'timeout', 'url', 'output'];
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].slice(2), value = argv[i + 1];
    if (!argv[i].startsWith('--') || !allowed.includes(key)) throw new Error('Unknown option: ' + argv[i]);
    if (!value || value.startsWith('--')) throw new Error('Missing value: ' + argv[i]);
    options[key] = value;
  }
  options.runs = Number(options.runs);
  options.timeout = Number(options.timeout);
  if (!['chromium', 'webkit'].includes(options.browser)) throw new Error('Invalid browser');
  if (!['cold', 'warm'].includes(options.cache)) throw new Error('Invalid cache mode');
  if (!Object.hasOwn(PROFILES, options.profile)) throw new Error('Invalid profile');
  if (options.browser !== 'chromium' && options.profile !== 'native') throw new Error('CPU/network profile requires Chromium CDP');
  for (const key of ['runs', 'timeout']) if (!Number.isInteger(options[key]) || options[key] < 1) throw new Error('Invalid ' + key);
  if (!options.url || !options.output) throw new Error('--url and --output are required');
  if (!['http:', 'https:'].includes(new URL(options.url).protocol)) throw new Error('Expected HTTP(S) URL');
  return options;
}

// Runs before page scripts. These are DOM status observations, not GPU or map tile completion timestamps.
function installObservers() {
  const supported = PerformanceObserver.supportedEntryTypes || [];
  const metrics = window.__bakuBenchmark = {
    firstMapRenderSignalMs: null, overlaysReadySignalMs: null, errorSignalMs: null,
    lcp: [], longTasks: [], supported, resourceBufferFull: false
  };
  performance.setResourceTimingBufferSize(5000);
  performance.addEventListener('resourcetimingbufferfull', () => { metrics.resourceBufferFull = true; });
  for (const type of ['largest-contentful-paint', 'longtask']) {
    if (!supported.includes(type)) continue;
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (type === 'longtask') metrics.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        else metrics.lcp.push(entry.startTime);
      }
    }).observe({ type, buffered: true });
  }
  const record = status => {
    const key = { 'map-visible': 'firstMapRenderSignalMs', ready: 'overlaysReadySignalMs', error: 'errorSignalMs' }[status];
    if (key && metrics[key] === null) metrics[key] = performance.now();
  };
  new MutationObserver(records => {
    // oldValue also captures a transient map-visible state changed again in the same task.
    for (const mutation of records) if (mutation.target.id === 'mapStatus') record(mutation.oldValue);
    record(document.getElementById('mapStatus')?.dataset.status);
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-status'], attributeOldValue: true });
}
async function configurePage(context, options) {
  const page = await context.newPage();
  if (options.profile !== 'native') {
    const session = await context.newCDPSession(page);
    const profile = PROFILES[options.profile];
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latency,
      downloadThroughput: profile.downloadThroughput, uploadThroughput: profile.uploadThroughput });
    await session.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuRate });
  }
  await page.addInitScript(installObservers);
  return page;
}
async function measurePage(page, url, timeout) {
  const pageErrors = [], failedRequests = [], httpErrors = [], consoleErrors = [];
  page.__benchmarkDiagnostics = { pageErrors, failedRequests, httpErrors, consoleErrors };
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) httpErrors.push({url: response.url(), status: response.status()}); });
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) consoleErrors.push(message.text()); });
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  if (!response?.ok()) throw new Error('Navigation HTTP ' + response?.status());
  await page.waitForFunction(() => ['ready', 'error'].includes(document.getElementById('mapStatus')?.dataset.status), null, { timeout });
  const status = await page.locator('#mapStatus').getAttribute('data-status');
  if (status === 'error') throw new Error('Site reported map error');
  const result = await page.evaluate(() => {
    const m = window.__bakuBenchmark;
    const nav = performance.getEntriesByType('navigation')[0];
    const cutoff = m.overlaysReadySignalMs;
    const resources = performance.getEntriesByType('resource').filter(e => e.responseEnd <= cutoff).map(e => ({
      url: e.name, initiatorType: e.initiatorType, startTime: e.startTime,
      requestStart: e.requestStart, responseStart: e.responseStart, responseEnd: e.responseEnd,
      duration: e.duration, transferSize: e.transferSize, encodedBodySize: e.encodedBodySize,
      decodedBodySize: e.decodedBodySize
    }));
    const tasks = m.longTasks.filter(e => e.startTime < cutoff);
    return {
      firstMapRenderSignalMs: m.firstMapRenderSignalMs, overlaysReadySignalMs: cutoff,
      ttfbMs: nav.responseStart,
      fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
      lcpAtReadyMs: m.supported.includes('largest-contentful-paint') ? (m.lcp.filter(t => t <= cutoff).at(-1) ?? null) : null,
      longTaskCount: m.supported.includes('longtask') ? tasks.length : null,
      longTaskBlockingMs: m.supported.includes('longtask') ? tasks.reduce((s, e) => s + Math.max(0, Math.min(e.duration, cutoff - e.startTime) - 50), 0) : null,
      resourceTransferBytesAtReady: resources.reduce((s, e) => s + e.transferSize, 0),
      navigationTransferBytes: nav.transferSize,
      resources, longTasks: tasks, resourceBufferFull: m.resourceBufferFull,
      supportedEntryTypes: m.supported
    };
  });
  const adminResource = result.resources.find(resource =>
    /\/admin-absheron(?:-5dp)?\.geojson(?:[?#]|$)/.test(resource.url)) ?? null;
  return { ...result, adminResource, pageErrors, failedRequests, httpErrors, consoleErrors };
}
async function runMeasurement(options) {
  options = { profile: 'native', timeout: 90000, ...options };
  const browser = await (options.browser === 'webkit' ? webkit : chromium).launch({ headless: true });
  const runs = [];
  const contextOptions = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block' };
  let warmContext, warmPage;
  const version = browser.version();
  try {
    if (options.cache === 'warm') {
      warmContext = await browser.newContext(contextOptions);
      warmPage = await configurePage(warmContext, options);
      // An unreported full visit populates the browser cache before sample 1.
      await measurePage(warmPage, options.url, options.timeout);
      await warmPage.waitForLoadState('networkidle', { timeout: options.timeout });
      warmPage.removeAllListeners('pageerror');
      warmPage.removeAllListeners('requestfailed');
      warmPage.removeAllListeners('response');
      warmPage.removeAllListeners('console');
    }
    for (let i = 0; i < options.runs; i++) {
      const context = warmContext || await browser.newContext(contextOptions);
      const page = warmPage || await configurePage(context, options);
      const startedAt = new Date().toISOString();
      try {
        runs.push({ sample: i + 1, startedAt, ok: true, ...await measurePage(page, options.url, options.timeout) });
      } catch (error) {
        const observed = await page.evaluate(() => ({
          statusText: document.getElementById('mapStatus')?.textContent,
          metrics: window.__bakuBenchmark,
          resources: performance.getEntriesByType('resource').map(e => e.toJSON())
        })).catch(() => null);
        runs.push({ sample: i + 1, startedAt, ok: false, error: error.message,
          diagnostics: page.__benchmarkDiagnostics, observed });
      } finally {
        if (!warmContext) await context.close();
        else {
          page.removeAllListeners('pageerror');
          page.removeAllListeners('requestfailed');
          page.removeAllListeners('response');
          page.removeAllListeners('console');
        }
      }
      process.stderr.write('Sample ' + (i + 1) + '/' + options.runs + ': ' + (runs.at(-1).ok ? Math.round(runs.at(-1).overlaysReadySignalMs) + ' ms ready' : 'FAILED') + '\n');
    }
  } finally { await browser.close(); }
  const keys = ['ttfbMs', 'fcpMs', 'lcpAtReadyMs', 'firstMapRenderSignalMs', 'overlaysReadySignalMs', 'longTaskCount', 'longTaskBlockingMs', 'resourceTransferBytesAtReady', 'navigationTransferBytes'];
  const successful = runs.filter(r => r.ok);
  return {
    schemaVersion: 2, generatedAt: new Date().toISOString(), url: options.url,
    browser: options.browser, browserVersion: version, playwrightVersion: require('playwright/package.json').version,
    host: { platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model },
    cache: options.cache, primingVisits: options.cache === 'warm' ? 1 : 0,
    profile: options.profile, profileSettings: PROFILES[options.profile], contextOptions,
    timeoutMs: options.timeout, attempted: runs.length, succeeded: successful.length, failed: runs.length - successful.length,
    percentileMethod: 'nearest-rank; successful samples only; failures reported separately',
    limitations: [
      'Synthetic desktop host; not calibrated to a physical phone.',
      'First map render signal is not proof that basemap tiles are painted.',
      'Ready signal precedes possible worker/GPU completion; not measured selection latency.',
      'Resource timing includes completed window resources at readiness; worker requests (including PMTiles) may be absent.',
      'Zero transferSize can mean cache or restricted timing; it is not proof of a cache hit.',
      'LCP is a readiness-time snapshot, not final page LCP. Long-task blocking is not Lighthouse TBT.',
      'Native profile applies no artificial throttling. Mobile profile limits do not emulate GPU or radio behavior.'
    ],
    runs, summaries: Object.fromEntries(keys.map(k => [k, summarizeRuns(successful.map(r => r[k]))]))
  };
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runMeasurement(options);
  await fs.mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
  await fs.writeFile(options.output, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ attempted: result.attempted, failed: result.failed, summaries: result.summaries }, null, 2) + '\n');
  if (result.failed) process.exitCode = 1;
}
if (require.main === module) main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
module.exports = { parseArgs, runMeasurement, summarizeRuns, installObservers, PROFILES };
