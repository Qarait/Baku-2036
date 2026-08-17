const assert = require('node:assert/strict');
const test = require('node:test');

const { summarizeRuns } = require('../scripts/measure-performance.js');

test('summarizeRuns reports a sorted median and range for finite values', () => {
  assert.deepEqual(summarizeRuns([12, 4, 8]), { count: 3, median: 8, min: 4, max: 12 });
  assert.deepEqual(summarizeRuns([Number.NaN, 9]), { count: 1, median: 9, min: 9, max: 9 });
});
