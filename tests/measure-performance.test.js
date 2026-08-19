const assert = require('node:assert/strict');
const test = require('node:test');

const { classifyResource, summarizeRuns } = require('../scripts/measure-performance.js');

test('summarizeRuns reports nearest-rank p90', () => {
  assert.deepEqual(summarizeRuns([12, 4, 8, 20, 16, 24, 28, 32, 36, 40]), {
    count: 10, median: 22, p90: 36, min: 4, max: 40
  });
  assert.deepEqual(summarizeRuns([Number.NaN, 9]), {
    count: 1, median: 9, p90: 9, min: 9, max: 9
  });
});

test('classifyResource separates the measured resource classes', () => {
  assert.equal(classifyResource('http://127.0.0.1/data/admin-absheron.geojson', 'fetch'), 'data');
  assert.equal(classifyResource('pmtiles://assets/baku-absheron.pmtiles', 'other'), 'pmtiles');
  assert.equal(classifyResource('http://127.0.0.1/assets/glyphs/noto/0-255.pbf', 'other'), 'glyph');
  assert.equal(classifyResource('http://127.0.0.1/v3.js', 'script'), 'script');
  assert.equal(classifyResource('http://127.0.0.1/v3.css', 'link'), 'stylesheet');
});
