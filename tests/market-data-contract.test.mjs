import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  validateRights,
  validateObservations,
  canonicalJson,
  digestJson
} from '../scripts/market-data/contract.mjs';

import {
  buildDuplicateReport,
  buildMissingnessReport,
  buildCoverageReport
} from '../scripts/market-data/reports.mjs';

const intendedUse = 'internal_testing';

const validRights = {
  schemaVersion: '1.0',
  rightsId: 'rights-synthetic-fixture',
  sourceId: 'source-synthetic-fixture',
  sourceName: 'Synthetic fixture source',
  acquisitionBasis: 'synthetic',
  allowedUses: [intendedUse],
  rawRedistribution: 'not_applicable',
  derivedPublication: 'not_applicable',
  retention: 'test-only',
  personalDataHandling: 'prohibited',
  reviewedAt: '2026-08-21',
  reviewer: 'release3-governance',
  status: 'approved_for_fixture_testing'
};

const validObservation = {
  schemaVersion: '1.0',
  observationId: 'observation-synthetic-001',
  sourceId: validRights.sourceId,
  sourceRecordId: 'record-synthetic-001',
  rightsId: validRights.rightsId,
  transactionType: 'asking',
  observedAt: '2026-01-15',
  propertyType: 'apartment',
  price: { amount: 250000, currency: 'AZN', basis: 'total' },
  area: { value: 100, unit: 'm2', measure: 'gross' },
  location: { geography: 'synthetic-zone-a', precision: 'zone' },
  characteristics: { bedrooms: 3 }
};

function rightsResult(records = [validRights], use = intendedUse) {
  return validateRights(records, { intendedUse: use });
}

function observationResult(records, rights = rightsResult().rightsById) {
  return validateObservations(records, rights, { intendedUse });
}

function loadFixture(fileName) {
  return JSON.parse(readFileSync(new URL(`../research/market-data/fixtures/${fileName}`, import.meta.url), 'utf8'));
}

function runMarketDataCli(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8'
  });
}

function temporaryDirectory() {
  return mkdtempSync(join(tmpdir(), 'release3-market-data-'));
}

test('loads versioned fixtures that are explicitly synthetic and not real market data', () => {
  const observations = loadFixture('synthetic-observations.json');
  const rights = loadFixture('synthetic-rights.json');

  assert.ok(Array.isArray(observations));
  assert.ok(Array.isArray(rights));
  assert.ok(observations.every((record) => record.schemaVersion === '1.0'));
  assert.ok(rights.every((record) => record.schemaVersion === '1.0'));
  assert.ok(rights.every((record) => /synthetic/i.test(record.sourceName)));
  assert.ok(rights.every((record) => /not real market data/i.test(record.sourceName)));
});

test('accepts a valid synthetic observation with approved rights', () => {
  const result = observationResult([validObservation]);

  assert.equal(result.valid, true);
  assert.deepEqual(result.records, [validObservation]);
  assert.deepEqual(result.rejected, []);
});

test('rejects a completed sale without eventDate with missing-event-date', () => {
  const sale = { ...validObservation, transactionType: 'completed_sale' };
  const result = observationResult([sale]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'missing-event-date'));
});

test('canonicalizes object key order before digesting', () => {
  const first = { b: 2, nested: { z: 3, a: 1 }, a: 1 };
  const second = { a: 1, nested: { a: 1, z: 3 }, b: 2 };

  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(digestJson(first), digestJson(second));
});

test('keeps validator outputs identical when equivalent rights and observations are reordered', () => {
  const secondRights = {
    ...validRights,
    rightsId: 'rights-synthetic-fixture-002',
    sourceId: 'source-synthetic-fixture-002'
  };
  const secondObservation = {
    ...validObservation,
    observationId: 'observation-synthetic-002',
    sourceId: secondRights.sourceId,
    rightsId: secondRights.rightsId,
    sourceRecordId: 'record-synthetic-002'
  };
  const forwardRights = rightsResult([validRights, secondRights]);
  const reverseRights = rightsResult([secondRights, validRights]);
  const forwardObservations = observationResult([validObservation, secondObservation], forwardRights.rightsById);
  const reverseObservations = observationResult([secondObservation, validObservation], reverseRights.rightsById);

  assert.deepEqual(reverseRights, forwardRights);
  assert.deepEqual(reverseObservations, forwardObservations);
});

test('rejects observations without a rights reference', () => {
  const result = observationResult([{ ...validObservation, rightsId: 'missing-rights' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'missing-rights'));
});

test('rejects observations whose source does not match their rights record', () => {
  const result = observationResult([{ ...validObservation, sourceId: 'source-synthetic-mismatch' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'rights-source-mismatch'));
});

test('rejects area values whose unit is not m2', () => {
  const result = observationResult([{ ...validObservation, area: { ...validObservation.area, unit: 'sqft' } }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'invalid-area-unit'));
});

test('rejects unsupported transaction types', () => {
  const result = observationResult([{ ...validObservation, transactionType: 'forecast' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'invalid-transaction-type'));
});

test('rejects personal-data fields in an observation payload', () => {
  const result = observationResult([{ ...validObservation, seller: 'Synthetic Seller' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'personal-data-field'));
});

test('rejects duplicate observation IDs', () => {
  const duplicate = { ...validObservation, sourceRecordId: 'record-synthetic-002' };
  const result = observationResult([validObservation, duplicate]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected.some(({ errors }) => errors.some((error) => error.code === 'duplicate-observation-id')));
});

test('rejects rights that do not allow the intended use', () => {
  const rights = { ...validRights, allowedUses: ['internal_analysis'] };
  const result = rightsResult([rights], intendedUse);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'intended-use-not-allowed'));
});

test('rejects rights metadata values outside the versioned schema enums', () => {
  const invalidFields = {
    acquisitionBasis: 'unreviewed',
    rawRedistribution: 'conditional',
    derivedPublication: 'internal_only',
    personalDataHandling: 'masked'
  };

  for (const [field, value] of Object.entries(invalidFields)) {
    const result = rightsResult([{ ...validRights, [field]: value }]);
    assert.equal(result.valid, false, field);
    assert.ok(result.errors.some((error) => error.path.endsWith(`.${field}`)), field);
  }
});

test('rejects non-approved rights and excludes them from the rights map', () => {
  const rights = { ...validRights, status: 'expired' };
  const result = rightsResult([rights]);

  assert.equal(result.valid, false);
  assert.equal(result.rightsById.has(rights.rightsId), false);
  assert.ok(result.errors.some((error) => error.code === 'invalid-rights-status'));
});

test('rejects an asking observation with an event date', () => {
  const result = observationResult([{ ...validObservation, eventDate: '2026-01-14' }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'unexpected-event-date'));
});

test('rejects unsupported characteristic and nested personal-data keys', () => {
  const result = observationResult([{
    ...validObservation,
    characteristics: { bedrooms: 3, seller: 'synthetic-person' }
  }]);

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'personal-data-field'));
  assert.ok(result.rejected[0].errors.some((error) => error.code === 'unsupported-characteristic'));
});

test('rejects invalid characteristic values', () => {
  const invalidCharacteristics = [
    { condition: 'unlisted' },
    { rooms: -1 },
    { bedrooms: 1.5 },
    { bathrooms: 'two' }
  ];

  for (const characteristics of invalidCharacteristics) {
    const result = observationResult([{ ...validObservation, characteristics }]);
    assert.equal(result.valid, false);
    assert.ok(result.rejected[0].errors.some((error) => error.code === 'invalid-characteristic-value'));
  }
});

test('rejects non-string optional location identifiers', () => {
  for (const key of ['geography', 'district', 'zoneId']) {
    const result = observationResult([{
      ...validObservation,
      location: { ...validObservation.location, [key]: 42 }
    }]);
    assert.equal(result.valid, false, key);
    assert.ok(result.rejected[0].errors.some((error) => error.code === 'invalid-location-identifier'), key);
  }
});

test('keeps rejected duplicate-ID records deterministic when input order changes', () => {
  const first = { ...validObservation, sourceRecordId: 'record-synthetic-a' };
  const second = { ...validObservation, sourceRecordId: 'record-synthetic-b' };

  assert.deepEqual(
    observationResult([first, second]).rejected,
    observationResult([second, first]).rejected
  );
});

test('reports validation errors with stable identifiers and paths only', () => {
  const result = observationResult([{ ...validObservation, seller: 'must-not-appear' }]);
  const [error] = result.errors;

  assert.match(error.path, /observation-synthetic-001/);
  assert.equal(JSON.stringify(error).includes('must-not-appear'), false);
  assert.deepEqual(Object.keys(error).sort(), ['code', 'message', 'path']);
});

test('reports exact duplicate groups by source record key', () => {
  const records = [
    validObservation,
    { ...validObservation, observationId: 'observation-synthetic-002' },
    { ...validObservation, observationId: 'observation-synthetic-003', sourceRecordId: 'record-synthetic-003' },
    { ...validObservation, observationId: 'observation-synthetic-004', sourceRecordId: 'record-synthetic-004' },
    { ...validObservation, observationId: 'observation-synthetic-005', sourceRecordId: 'record-synthetic-004' }
  ];
  const report = buildDuplicateReport(records, { inputDigest: 'digest-synthetic', schemaVersion: '1.0' });

  assert.equal(report.exactDuplicateGroupCount, 2);
  assert.ok(report.duplicateGroupCount >= report.exactDuplicateGroupCount);
  assert.deepEqual(
    report.groups.filter((group) => group.kind === 'exact-source-record'),
    [
      {
        kind: 'exact-source-record',
        keyType: 'sourceId+sourceRecordId',
        observationIds: ['observation-synthetic-001', 'observation-synthetic-002']
      },
      {
        kind: 'exact-source-record',
        keyType: 'sourceId+sourceRecordId',
        observationIds: ['observation-synthetic-004', 'observation-synthetic-005']
      }
    ]
  );
  assert.ok(report.groups.some((group) => group.kind === 'probable-normalized-fingerprint'));
  assert.equal(JSON.stringify(report).includes('record-synthetic-001'), false);
});

test('keeps report outputs identical when records are reordered', () => {
  const records = [
    validObservation,
    { ...validObservation, observationId: 'observation-synthetic-002', sourceRecordId: 'record-synthetic-002' },
    { ...validObservation, observationId: 'observation-synthetic-003', transactionType: 'completed_sale', eventDate: '2026-02-10', observedAt: '2026-02-11', sourceRecordId: 'record-synthetic-003', location: { geography: 'synthetic-zone-b', precision: 'zone' } }
  ];
  const options = {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    rejectedRecords: []
  };
  const coverageOptions = {
    ...options,
    coverageFrame: {
      periods: ['2026-01', '2026-02'],
      geographies: ['synthetic-zone-a', 'synthetic-zone-b']
    },
    rejectedCount: 0
  };
  const reordered = [...records].reverse();

  assert.deepEqual(
    buildDuplicateReport(reordered, options),
    buildDuplicateReport(records, options)
  );
  assert.deepEqual(
    buildMissingnessReport(reordered, options),
    buildMissingnessReport(records, options)
  );
  assert.deepEqual(
    buildCoverageReport(reordered, coverageOptions),
    buildCoverageReport(records, coverageOptions)
  );
});

test('reports omitted optional fields as missingness', () => {
  const record = { ...validObservation };
  delete record.characteristics;
  const report = buildMissingnessReport([record], {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    rejectedRecords: []
  });

  assert.equal(report.fields['characteristics'].missing, 1);
});

test('reports period, transaction type, and geography coverage counts', () => {
  const records = [
    validObservation,
    {
      ...validObservation,
      observationId: 'observation-synthetic-002',
      transactionType: 'completed_sale',
      eventDate: '2026-02-10',
      observedAt: '2026-02-11',
      location: { geography: 'synthetic-zone-b', precision: 'zone' }
    }
  ];
  const report = buildCoverageReport(records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    coverageFrame: {
      periods: ['2026-01', '2026-02'],
      geographies: ['synthetic-zone-a', 'synthetic-zone-b']
    },
    rejectedCount: 0
  });

  assert.deepEqual(report.transactionTypeCounts, { asking: 1, completed_sale: 1 });
  assert.deepEqual(report.periodCounts, { '2026-01': 1, '2026-02': 1 });
  assert.deepEqual(report.geographyCounts, { 'synthetic-zone-a': 1, 'synthetic-zone-b': 1 });
});

test('reports rejected records only as safe invalid missingness counts and preserves inputs', () => {
  const invalid = { ...validObservation, observationId: 'observation-synthetic-invalid', price: { ...validObservation.price, amount: 0 } };
  const result = observationResult([validObservation, invalid]);
  const validBefore = structuredClone(result.records);
  const rejectedBefore = structuredClone(result.rejected);
  const options = {
    inputDigest: digestJson([validObservation, invalid]),
    schemaVersion: '1.0',
    rejectedRecords: result.rejected
  };

  const report = buildMissingnessReport(result.records, options);

  assert.equal(report.fields['price.amount'].invalid, 1);
  assert.equal(report.fields.characteristics.missing, 0);
  assert.equal(report.breakdowns.source.__invalid__.fields['price.amount'].invalid, 1);
  assert.deepEqual(result.records, validBefore);
  assert.deepEqual(result.rejected, rejectedBefore);
  assert.equal(JSON.stringify(report).includes('observation-synthetic-invalid'), false);
  assert.equal(JSON.stringify(report).includes('250000'), false);
});

test('places dotted-ID invalid records in safe sentinel breakdowns without serializing their dimensions', () => {
  const valid = {
    ...validObservation,
    observationId: 'observation-synthetic-unknown-location',
    location: { precision: 'unknown' }
  };
  const invalid = {
    ...validObservation,
    observationId: 'observation.synthetic.invalid',
    sourceId: 'source-synthetic-breakdown',
    transactionType: 'completed_sale',
    eventDate: '2026-02-10',
    observedAt: '2026-02-11',
    propertyType: 'house',
    location: { geography: 'synthetic-zone-breakdown', precision: 'zone' },
    price: { ...validObservation.price, amount: 0 }
  };
  const result = observationResult([valid, invalid]);
  const report = buildMissingnessReport(result.records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    rejectedRecords: result.rejected
  });

  assert.equal(report.fields['location.precision'].explicitUnknown, 1);
  assert.equal(report.fields.eventDate.notApplicable, 1);
  assert.equal(report.fields['price.amount'].invalid, 1);
  for (const dimension of ['source', 'month', 'quarter', 'transactionType', 'propertyType', 'priceBasis', 'coarseLocation']) {
    assert.equal(report.breakdowns[dimension].__invalid__.fields['price.amount'].invalid, 1, dimension);
  }
  assert.equal(JSON.stringify(report).includes('observation.synthetic.invalid'), false);
  assert.equal(JSON.stringify(report).includes('source-synthetic-breakdown'), false);
  assert.equal(JSON.stringify(report).includes('synthetic-zone-breakdown'), false);
});

test('reports configured zero coverage cells and report metadata without mutating records', () => {
  const records = [
    validObservation,
    {
      ...validObservation,
      observationId: 'observation-synthetic-coverage-sale',
      transactionType: 'completed_sale',
      eventDate: '2026-02-10',
      observedAt: '2026-02-11',
      propertyType: 'house',
      location: { geography: 'synthetic-zone-b', precision: 'zone' }
    }
  ];
  const before = structuredClone(records);
  const report = buildCoverageReport(records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    coverageFrame: {
      periods: ['2026-01', '2026-02', '2026-03'],
      geographies: ['synthetic-zone-a', 'synthetic-zone-b', 'synthetic-zone-c']
    },
    rejectedCount: 2
  });

  assert.equal(report.inputRecordCount, 4);
  assert.equal(report.validRecordCount, 2);
  assert.equal(report.rejectedRecordCount, 2);
  assert.equal(report.reportableRecordCount, 2);
  assert.deepEqual(report.periodCounts, { '2026-01': 1, '2026-02': 1, '2026-03': 0 });
  assert.deepEqual(report.geographyCounts, { 'synthetic-zone-a': 1, 'synthetic-zone-b': 1, 'synthetic-zone-c': 0 });
  assert.equal(report.sourceByPeriodCounts['source-synthetic-fixture']['2026-03'], 0);
  assert.equal(report.geographyByPeriodCounts['synthetic-zone-c']['2026-03'], 0);
  assert.deepEqual(report.transactionTypeCounts, { asking: 1, completed_sale: 1 });
  assert.equal(report.inputDigest, 'digest-synthetic');
  assert.equal(report.limitation, 'Observed records are not automatically a representative sample of the Baku market.');
  assert.deepEqual(records, before);
});

test('CLI validation returns a safe successful summary for the default synthetic fixtures', () => {
  const result = runMarketDataCli('scripts/validate-market-data.mjs');
  const output = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.deepEqual(Object.keys(output).sort(), ['errors', 'inputDigest', 'recordsRead', 'rightsRecordsRead', 'schemaVersion', 'valid']);
  assert.equal(output.valid, true);
  assert.equal(output.schemaVersion, '1.0');
  assert.equal(output.recordsRead, 5);
  assert.equal(output.rightsRecordsRead, 1);
  assert.deepEqual(output.errors, []);
  assert.equal(result.stdout.includes('101000'), false);
  assert.equal(result.stdout.includes('synthetic-record-001'), false);
});

test('CLI validation exits 1 with stable safe errors for contract-invalid records', () => {
  const directory = temporaryDirectory();
  try {
    const observations = loadFixture('synthetic-observations.json');
    observations[0].price.amount = 0;
    const observationsPath = join(directory, 'observations.json');
    const rightsPath = join(directory, 'rights.json');
    writeFileSync(observationsPath, JSON.stringify(observations));
    writeFileSync(rightsPath, JSON.stringify(loadFixture('synthetic-rights.json')));

    const result = runMarketDataCli('scripts/validate-market-data.mjs', ['--observations', observationsPath, '--rights', rightsPath]);
    const output = JSON.parse(result.stdout);

    assert.equal(result.status, 1);
    assert.equal(output.valid, false);
    assert.ok(output.errors.some((error) => error.code === 'invalid-price-amount'));
    assert.equal(result.stdout.includes('"amount":0'), false);
    assert.equal(result.stdout.includes('synthetic-record-001'), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI reports write deterministic safe files for default synthetic fixtures', () => {
  const firstDirectory = temporaryDirectory();
  const secondDirectory = temporaryDirectory();
  try {
    const first = runMarketDataCli('scripts/report-market-data.mjs', ['--out-dir', firstDirectory]);
    const second = runMarketDataCli('scripts/report-market-data.mjs', ['--out-dir', secondDirectory]);

    assert.equal(first.status, 0);
    assert.equal(second.status, 0);
    assert.deepEqual(readdirSync(firstDirectory).sort(), ['coverage.json', 'duplicates.json', 'missingness.json', 'summary.json']);
    assert.deepEqual(readdirSync(secondDirectory).sort(), ['coverage.json', 'duplicates.json', 'missingness.json', 'summary.json']);

    const firstReports = Object.fromEntries(readdirSync(firstDirectory).sort().map((fileName) => [fileName, readFileSync(join(firstDirectory, fileName), 'utf8')]));
    const secondReports = Object.fromEntries(readdirSync(secondDirectory).sort().map((fileName) => [fileName, readFileSync(join(secondDirectory, fileName), 'utf8')]));
    assert.deepEqual(firstReports, secondReports);

    const reports = Object.values(firstReports);
    const parsedReports = Object.fromEntries(Object.entries(firstReports).map(([fileName, report]) => [fileName, JSON.parse(report)]));
    const digests = reports.map((report) => JSON.parse(report).inputDigest);
    assert.equal(new Set(digests).size, 1);
    for (const report of Object.values(parsedReports)) {
      assert.equal(report.schemaVersion, '1.0');
      assert.equal(typeof report.inputDigest, 'string');
      assert.equal(typeof report.counts, 'object');
      assert.equal(typeof report.dimensions, 'object');
      assert.equal(report.limitation, 'Observed records are not automatically a representative sample of the Baku market.');
    }
    assert.deepEqual(Object.keys(parsedReports['duplicates.json'].dimensions).sort(), ['exact', 'probable']);
    assert.deepEqual(Object.keys(parsedReports['missingness.json'].dimensions).sort(), ['coarseLocation', 'field', 'month', 'priceBasis', 'propertyType', 'quarter', 'source', 'transactionType']);
    assert.deepEqual(Object.keys(parsedReports['coverage.json'].dimensions).sort(), ['currency', 'geography', 'period', 'priceBasis', 'propertyType', 'source', 'transactionType']);
    assert.deepEqual(Object.keys(parsedReports['summary.json'].dimensions).sort(), ['recordStatus', 'rights', 'validation']);
    assert.ok(reports.every((report) => report.endsWith('\n')));
    assert.ok(reports.every((report) => !report.includes('101000')));
    assert.ok(reports.every((report) => !report.includes('synthetic-record-001')));
  } finally {
    rmSync(firstDirectory, { recursive: true, force: true });
    rmSync(secondDirectory, { recursive: true, force: true });
  }
});

test('CLI reports retain safe aggregate metadata and exit 1 for contract-invalid records', () => {
  const directory = temporaryDirectory();
  const outputDirectory = join(directory, 'reports');
  try {
    const observations = loadFixture('synthetic-observations.json');
    observations[0].price.amount = 0;
    const observationsPath = join(directory, 'observations.json');
    const rightsPath = join(directory, 'rights.json');
    writeFileSync(observationsPath, JSON.stringify(observations));
    writeFileSync(rightsPath, JSON.stringify(loadFixture('synthetic-rights.json')));

    const result = runMarketDataCli('scripts/report-market-data.mjs', ['--observations', observationsPath, '--rights', rightsPath, '--out-dir', outputDirectory]);
    const summary = JSON.parse(readFileSync(join(outputDirectory, 'summary.json'), 'utf8'));
    const missingness = JSON.parse(readFileSync(join(outputDirectory, 'missingness.json'), 'utf8'));

    assert.equal(result.status, 1);
    assert.equal(summary.valid, false);
    assert.equal(summary.rejectedRecordCount, 1);
    assert.equal(missingness.rejectedRecordCount, 1);
    assert.equal(missingness.fields['price.amount'].invalid, 1);
    assert.equal(JSON.stringify(summary).includes('"amount":0'), false);
    assert.equal(JSON.stringify(missingness).includes('"amount":0'), false);
    assert.equal(JSON.stringify(missingness).includes('synthetic-record-001'), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('CLI reports do not write files for malformed input', () => {
  const directory = temporaryDirectory();
  const outputDirectory = join(directory, 'reports');
  try {
    const observationsPath = join(directory, 'observations.json');
    const rightsPath = join(directory, 'rights.json');
    writeFileSync(observationsPath, '{not-json');
    writeFileSync(rightsPath, JSON.stringify(loadFixture('synthetic-rights.json')));

    const result = runMarketDataCli('scripts/report-market-data.mjs', ['--observations', observationsPath, '--rights', rightsPath, '--out-dir', outputDirectory]);

    assert.equal(result.status, 1);
    assert.equal(existsSync(outputDirectory), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('keeps restricted market-data paths ignored without creating private files', () => {
  for (const path of [
    'research/market-data/raw/',
    'research/market-data/private/',
    'research/market-data/generated/'
  ]) {
    const result = spawnSync('git', ['check-ignore', '--quiet', path], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8'
    });

    assert.equal(result.status, 0, `${path} must be ignored`);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
});

test('rechecks a reused rights map against the observation intended use', () => {
  const reusableRights = { ...validRights };
  const rights = rightsResult([reusableRights], 'internal_testing').rightsById;
  const result = validateObservations([validObservation], rights, { intendedUse: 'internal_analysis' });

  assert.equal(result.valid, false);
  assert.ok(result.rejected[0].errors.some((reportError) => reportError.code === 'rights-intended-use-not-allowed'));
  assert.equal(JSON.stringify(result.errors).includes(validRights.sourceName), false);

  const expiredRights = rightsResult([{ ...validRights }], 'internal_testing').rightsById;
  expiredRights.get(validRights.rightsId).status = 'expired';
  const expiredResult = validateObservations([validObservation], expiredRights, { intendedUse: 'internal_testing' });
  assert.equal(expiredResult.valid, false);
  assert.ok(expiredResult.rejected[0].errors.some((reportError) => reportError.code === 'invalid-rights-status'));
});

test('uses invalid sentinels for rejected missingness dimensions without serializing rejected payload values', () => {
  const restrictedSource = 'restricted-source-token-canary';
  const restrictedLocation = 'restricted-location-token-canary';
  const restrictedAddress = 'restricted-address-token-canary';
  const invalid = {
    ...validObservation,
    observationId: 'observation-synthetic-redaction-canary',
    sourceId: restrictedSource,
    price: { ...validObservation.price, basis: 'restricted-price-basis-token-canary' },
    location: { geography: restrictedLocation, precision: 'zone' },
    seller: restrictedAddress
  };
  const result = observationResult([validObservation, invalid]);
  const report = buildMissingnessReport(result.records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    rejectedRecords: result.rejected
  });

  for (const dimension of ['source', 'month', 'quarter', 'transactionType', 'propertyType', 'coarseLocation', 'priceBasis']) {
    assert.equal(report.breakdowns[dimension].__invalid__.recordCount, 0, dimension);
    assert.equal(report.breakdowns[dimension].__invalid__.rejectedRecordCount, 1, dimension);
    assert.equal(report.breakdowns[dimension].__invalid__.fields['price.basis'].invalid, 1, dimension);
  }
  const priceBasis = report.breakdowns.source.__invalid__.fields['price.basis'];
  assert.equal(priceBasis.present + priceBasis.missing + priceBasis.explicitUnknown + priceBasis.notApplicable, priceBasis.stateDenominator);
  assert.equal(priceBasis.invalid, priceBasis.invalidDenominator);
  assert.equal(priceBasis.rate, 0);
  assert.equal(priceBasis.invalidRate, 1);
  const json = JSON.stringify(report);
  for (const token of [restrictedSource, restrictedLocation, restrictedAddress, 'restricted-price-basis-token-canary']) {
    assert.equal(json.includes(token), false, token);
  }
});

test('accounts for ID-less rejected records with explicit field and invalid-record denominators', () => {
  const idless = { ...validObservation };
  delete idless.observationId;
  delete idless.schemaVersion;
  const result = observationResult([idless, null]);
  const report = buildMissingnessReport(result.records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    rejectedRecords: result.rejected
  });

  assert.deepEqual(report.counts, {
    inputRecordCount: 2,
    validRecordCount: 0,
    rejectedRecordCount: 2,
    invalidRecordCount: 2
  });
  assert.deepEqual(report.invalid, {
    rejectedRecordCount: 2,
    fieldAttributedRejectedRecordCount: 1,
    unattributedRejectedRecordCount: 1
  });
  assert.equal(report.fields.schemaVersion.invalid, 1);
  assert.equal(report.fields.observationId.invalid, 1);
  assert.equal(report.fields.schemaVersion.stateDenominator, 0);
  assert.equal(report.fields.schemaVersion.invalidDenominator, 2);
  assert.equal(report.fields.schemaVersion.rate, 0);
  assert.equal(report.fields.schemaVersion.invalidRate, 0.5);
  assert.equal(report.breakdowns.source.__invalid__.rejectedRecordCount, 2);
});

test('unions configured and observed coverage periods and emits configured property-type zero cells', () => {
  const records = [
    validObservation,
    {
      ...validObservation,
      observationId: 'observation-synthetic-april',
      sourceRecordId: 'record-synthetic-april',
      observedAt: '2026-04-15'
    }
  ];
  const report = buildCoverageReport(records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    coverageFrame: {
      periods: ['2026-Q1'],
      geographies: ['synthetic-zone-a', 'synthetic-zone-zero'],
      propertyTypes: ['commercial', 'land']
    }
  });

  assert.deepEqual(report.periodCounts, { '2026-Q1': 1, '2026-Q2': 1 });
  assert.deepEqual(report.propertyTypeCounts, { apartment: 2, commercial: 0, land: 0 });
  assert.deepEqual(report.propertyTypeByPeriodCounts, {
    apartment: { '2026-Q1': 1, '2026-Q2': 1 },
    commercial: { '2026-Q1': 0, '2026-Q2': 0 },
    land: { '2026-Q1': 0, '2026-Q2': 0 }
  });
  assert.equal(report.validRecordCount, 2);
});

test('reports price-basis missingness dimensions for valid and rejected records', () => {
  const perM2 = {
    ...validObservation,
    observationId: 'observation-synthetic-per-m2',
    sourceRecordId: 'record-synthetic-per-m2',
    price: { ...validObservation.price, basis: 'per_m2' }
  };
  const invalid = {
    ...validObservation,
    observationId: 'observation-synthetic-price-basis-invalid',
    price: { ...validObservation.price, basis: 'not-a-price-basis' }
  };
  const result = observationResult([validObservation, perM2, invalid]);
  const report = buildMissingnessReport(result.records, {
    inputDigest: 'digest-synthetic',
    schemaVersion: '1.0',
    rejectedRecords: result.rejected
  });

  assert.deepEqual(report.dimensions.priceBasis, ['__invalid__', 'per_m2', 'total']);
  assert.equal(report.breakdowns.priceBasis.total.recordCount, 1);
  assert.equal(report.breakdowns.priceBasis.per_m2.recordCount, 1);
  assert.equal(report.breakdowns.priceBasis.__invalid__.fields['price.basis'].invalid, 1);
});

test('schemas and executable validation reject whitespace identifiers and encode event and use contracts', () => {
  const observationSchema = JSON.parse(readFileSync(new URL('../research/market-data/schemas/observation.schema.json', import.meta.url), 'utf8'));
  const rightsSchema = JSON.parse(readFileSync(new URL('../research/market-data/schemas/rights-record.schema.json', import.meta.url), 'utf8'));

  for (const field of ['observationId', 'sourceId', 'sourceRecordId', 'rightsId']) {
    assert.equal(observationSchema.properties[field].pattern, '\\S', field);
  }
  for (const field of ['rightsId', 'sourceId', 'sourceName', 'retention', 'reviewer']) {
    assert.equal(rightsSchema.properties[field].pattern, '\\S', field);
  }
  assert.deepEqual(rightsSchema.properties.allowedUses.items.enum, ['internal_testing', 'internal_analysis']);
  assert.deepEqual(observationSchema.allOf, [
    {
      if: { properties: { transactionType: { const: 'completed_sale' } }, required: ['transactionType'] },
      then: { required: ['eventDate'], properties: { eventDate: { type: 'string', format: 'date' } } }
    },
    {
      if: { properties: { transactionType: { const: 'asking' } }, required: ['transactionType'] },
      then: { properties: { eventDate: { type: 'null' } } }
    }
  ]);

  const observation = observationResult([{ ...validObservation, sourceId: '   ' }]);
  const rights = rightsResult([{ ...validRights, reviewer: '   ' }]);
  assert.ok(observation.errors.some((reportError) => reportError.path.endsWith('.sourceId')));
  assert.ok(rights.errors.some((reportError) => reportError.path.endsWith('.reviewer')));
});

test('CLI default coverage frame includes observed dimensions and every contract property type', () => {
  const directory = temporaryDirectory();
  try {
    const result = runMarketDataCli('scripts/report-market-data.mjs', ['--out-dir', directory]);
    const coverage = JSON.parse(readFileSync(join(directory, 'coverage.json'), 'utf8'));

    assert.equal(result.status, 0);
    assert.deepEqual(coverage.dimensions.propertyType, ['apartment', 'commercial', 'house', 'land', 'other']);
    assert.equal(coverage.propertyTypeCounts.land, 0);
    assert.ok(Object.values(coverage.propertyTypeByPeriodCounts.land).every((count) => count === 0));
    assert.deepEqual(coverage.dimensions.period, ['2026-01', '2026-02', '2026-03', '2026-04']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
