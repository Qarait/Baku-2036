const assert = require('node:assert/strict');
const test = require('node:test');
const { summarizeRuns, parseArgs } = require('../scripts/measure-performance.js');
test('reports finite samples and nearest-rank p90, including empty samples', () => {
  assert.deepEqual(summarizeRuns([12, 4, 8, null, NaN]), { count: 3, median: 8, p90: 12, min: 4, max: 12 });
  assert.equal(summarizeRuns(Array.from({length: 10}, (_, i) => i + 1)).p90, 9);
  assert.equal(summarizeRuns([2, 4]).median, 3);
  assert.deepEqual(summarizeRuns([]), { count: 0, median: null, p90: null, min: null, max: null });
});
test('rejects unsupported profiles rather than silently running unthrottled', () => {
  const base = ['--url', 'https://example.com/', '--output', 'result.json'];
  assert.throws(() => parseArgs([...base, '--profile', 'typo']));
  assert.throws(() => parseArgs([...base, '--browser', 'webkit', '--profile', 'mobile']));
  assert.throws(() => parseArgs([...base, '--unknown', '1']));
  assert.equal(parseArgs(base).runs, 10);
});
