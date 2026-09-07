const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { runMeasurement } = require('../scripts/measure-performance.js');

test('browser instrumentation distinguishes primed cache, timestamps, resources and failures', async () => {
  let assetRequests = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/asset.js') {
      assetRequests++;
      res.writeHead(200, {'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=3600'});
      return res.end('window.fixtureAsset = true;');
    }
    res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'});
    res.end('<div id="mapStatus" data-status="loading">fixture</div><script src="/asset.js"></script><script>' +
      'setTimeout(() => { document.getElementById("mapStatus").dataset.status="map-visible"; }, 30);' +
      'setTimeout(() => { const t=performance.now(); while(performance.now()-t<80){} }, 60);' +
      'setTimeout(() => { window.fixtureReadyAt=performance.now(); document.getElementById("mapStatus").dataset.status="' +
      (req.url === '/error' ? 'error' : 'ready') + '"; }, 180);</script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const options = {url, browser:'chromium', profile:'native', runs:2, timeout:10000};
  try {
    const warm = await runMeasurement({...options, cache:'warm'});
    assert.equal(warm.failed, 0);
    assert.equal(warm.primingVisits, 1);
    assert.equal(assetRequests, 1, 'warm samples must use the primed asset cache');
    for (const run of warm.runs) {
      assert.ok(run.firstMapRenderSignalMs < run.overlaysReadySignalMs);
      assert.ok(run.longTaskCount >= 1);
      const asset = run.resources.find(r => r.url.endsWith('/asset.js'));
      assert.ok(asset);
      assert.equal(asset.transferSize, 0);
    }
    const cold = await runMeasurement({...options, cache:'cold'});
    assert.equal(cold.failed, 0);
    assert.equal(assetRequests, 3, 'each cold context must fetch the asset');
    assert.ok(cold.runs.every(r => r.resources.find(e => e.url.endsWith('/asset.js')).transferSize > 0));
    const failure = await runMeasurement({...options, url:url+'/error', runs:1, cache:'cold'});
    assert.equal(failure.failed, 1);
    assert.equal(failure.summaries.overlaysReadySignalMs.count, 0);
    assert.equal(failure.runs[0].observed.statusText, 'fixture');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
